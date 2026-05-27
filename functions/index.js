const functions = require("firebase-functions");
const admin = require("firebase-admin");
const https = require("https");
const crypto = require("crypto");

admin.initializeApp();
const db = admin.firestore();

const USERNAME_REGEX = /^[a-zA-Z0-9_]{2,20}$/;

/**
 * Throws unauthenticated if the callable context has no auth.
 * @param {object} context Firebase callable context.
 */
function requireAuth(context) {
  if (!context.auth) {
    throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated.",
    );
  }
}

/**
 * Throws unauthenticated/permission-denied unless the caller is signed in
 * with a verified email.
 * @param {object} context Firebase callable context.
 */
function requireVerifiedEmail(context) {
  requireAuth(context);
  if (!context.auth.token.email_verified) {
    throw new functions.https.HttpsError(
        "permission-denied",
        "Please verify your email before doing this.",
    );
  }
}

/**
 * Send push notifications via Expo's push API.
 * @param {Array<{to: string, title: string, body: string}>} messages
 */
async function sendExpoPushNotifications(messages) {
  if (!messages.length) return [];

  // Expo accepts up to 100 messages per request
  const chunks = [];
  for (let i = 0; i < messages.length; i += 100) {
    chunks.push(messages.slice(i, i + 100));
  }

  const allTickets = [];
  for (const chunk of chunks) {
    const payload = JSON.stringify(chunk);
    const body = await new Promise((resolve, reject) => {
      const req = https.request(
          {
            hostname: "exp.host",
            path: "/--/api/v2/push/send",
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Accept": "application/json",
            },
          },
          (res) => {
            const parts = [];
            res.on("data", (d) => parts.push(d));
            res.on("end", () => resolve(Buffer.concat(parts).toString("utf8")));
          },
      );
      req.on("error", reject);
      req.write(payload);
      req.end();
    });

    let parsed;
    try {
      parsed = JSON.parse(body);
    } catch (e) {
      console.error("Expo push: non-JSON response:", body);
      continue;
    }

    if (parsed.errors) {
      console.error(
          "Expo push: top-level errors:",
          JSON.stringify(parsed.errors),
      );
    }
    const tickets = parsed.data || [];
    tickets.forEach((ticket, i) => {
      if (ticket.status === "error") {
        const token = chunk[i] && chunk[i].to;
        console.error(
            "Expo push ticket error:",
            JSON.stringify({token, ticket}),
        );
      }
    });
    const okCount = tickets.filter((t) => t.status === "ok").length;
    console.log(
        `Expo push chunk: ${okCount}/${chunk.length} accepted.`,
    );
    allTickets.push(...tickets);
  }
  return allTickets;
}

/**
 * Fetch Expo push receipts for the given ticket IDs.
 * @param {string[]} ids
 */
async function fetchPushReceipts(ids) {
  if (!ids.length) return {};
  const payload = JSON.stringify({ids});
  const body = await new Promise((resolve, reject) => {
    const req = https.request(
        {
          hostname: "exp.host",
          path: "/--/api/v2/push/getReceipts",
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
          },
        },
        (res) => {
          const parts = [];
          res.on("data", (d) => parts.push(d));
          res.on("end", () => resolve(Buffer.concat(parts).toString("utf8")));
        },
    );
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
  let parsed;
  try {
    parsed = JSON.parse(body);
  } catch (e) {
    console.error("Expo receipts: non-JSON response:", body);
    return {};
  }
  if (parsed.errors) {
    console.error(
        "Expo receipts: top-level errors:",
        JSON.stringify(parsed.errors),
    );
  }
  return parsed.data || {};
}

exports.pickDailyWinner = functions.pubsub.schedule("00 20 * * *")
    .timeZone("Europe/London").onRun(async (context) => {
      const {startOfDay, endOfDay} = londonDayWindow(new Date());

      const drawingsRef = db.collection("drawings");

      try {
        // Query to get distinct roomIds for today
        const roomQuery = drawingsRef
            .where("date", ">=", startOfDay)
            .where("date", "<", endOfDay)
            .select("roomId", "userId");

        const roomSnapshot = await roomQuery.get();
        if (roomSnapshot.empty) {
          console.log("No rooms found for today.");
          return;
        }

        // Skip drawings without a roomId — otherwise an `undefined` entry
        // crashes the .where("roomId","==",...) below and no pushes fire.
        const roomIds = new Set();
        roomSnapshot.forEach((doc) => {
          const rid = doc.data().roomId;
          if (rid) roomIds.add(rid);
        });

        // Collect winner userIds for push notifications
        const winnerUserIds = new Set();

        // Iterate through each roomId and select the winner
        for (const roomId of roomIds) {
          console.log(`Selecting winner for room: ${roomId}`);

          // Get the drawing with the maximum votes in the room
          const maxVotesQuery = drawingsRef
              .where("roomId", "==", roomId)
              .where("date", ">=", startOfDay)
              .where("date", "<", endOfDay)
              .orderBy("votes", "desc")
              .limit(1);

          const maxVotesSnapshot = await maxVotesQuery.get();

          if (!maxVotesSnapshot.empty) {
            const maxVotes = maxVotesSnapshot.docs[0].data().votes;

            // Query all drawings with the maximum votes in the room
            const topDrawingsQuery = drawingsRef
                .where("roomId", "==", roomId)
                .where("date", ">=", startOfDay)
                .where("date", "<", endOfDay)
                .where("votes", "==", maxVotes);

            const topDrawingsSnapshot = await topDrawingsQuery.get();

            if (!topDrawingsSnapshot.empty) {
              const drawingsWithMaxVotes = topDrawingsSnapshot.docs;

              for (const drawing of drawingsWithMaxVotes) {
                const drawingData = drawing.data();
                const winnerData = {
                  id: drawing.id,
                  votes: drawingData.votes,
                  userId: drawingData.userId,
                  roomId: roomId,
                  date: admin.firestore.Timestamp.fromDate(new Date()),
                };
                if (drawingData.imageUrl) {
                  winnerData.imageUrl = drawingData.imageUrl;
                }
                if (drawingData.image) {
                  winnerData.image = drawingData.image;
                }

                // Save the winner's data to the "winners" collection
                await db.collection("winners").add(winnerData);

                const userRef = db.collection("users").doc(winnerData.userId);
                await userRef.update({
                  winCount: admin.firestore.FieldValue.increment(1),
                });

                winnerUserIds.add(winnerData.userId);
                console.log(`Winner for room ${roomId} is: ${drawing.id}`);
              }
            }
          } else {
            console.log(`No drawings found for room ${roomId}.`);
          }
        }

        // Send personalised push notifications to everyone who drew today
        const allUserIds = [
          ...new Set(
              roomSnapshot.docs.map((d) => d.data().userId).filter(Boolean),
          ),
        ];
        if (allUserIds.length > 0) {
          const userDocs = await Promise.all(
              allUserIds.map((uid) => db.collection("users").doc(uid).get()),
          );
          const messages = userDocs
              .filter((doc) => doc.exists && doc.data().expoPushToken)
              .map((doc) => {
                const isWinner = winnerUserIds.has(doc.id);
                return {
                  to: doc.data().expoPushToken,
                  title: isWinner ? "🏆 You won today!" : "Results are in!",
                  body: isWinner ?
                    "Congratulations — your doodle won today's vote!" :
                    "Did you win? Check the results now.",
                  sound: "default",
                  channelId: "default",
                  priority: "high",
                  data: {url: "doodleoftheday://home/vote"},
                };
              });
          await sendExpoPushNotifications(messages);
        }
      } catch (error) {
        console.error("Error picking daily winners:", error);
      }
    });

exports.notifyMorningTheme = functions.pubsub.schedule("00 08 * * *")
    .timeZone("Europe/London").onRun(async (context) => {
      try {
        const themeSnapshot = await db.collection("themes_today")
            .orderBy("timestamp", "desc")
            .limit(1)
            .get();
        if (themeSnapshot.empty) {
          console.log("No theme for today — skipping morning push.");
          return null;
        }
        const word = themeSnapshot.docs[0].data().word;

        const usersSnapshot = await db.collection("users").get();
        const messages = usersSnapshot.docs
            .filter((doc) => doc.data().expoPushToken)
            .map((doc) => ({
              to: doc.data().expoPushToken,
              title: `Today's theme: ${word} 🎨`,
              body: "You have until 14:00 UK to submit your doodle.",
              sound: "default",
              channelId: "default",
              priority: "high",
              data: {url: "doodleoftheday://home/draw"},
            }));
        await sendExpoPushNotifications(messages);
        console.log(`Sent morning push to ${messages.length} users.`);
      } catch (error) {
        console.error("Error sending morning push:", error);
      }
      return null;
    });

exports.notifyDrawingDeadline = functions.pubsub.schedule("30 13 * * *")
    .timeZone("Europe/London").onRun(async (context) => {
      try {
        const {startOfDay, endOfDay} = londonDayWindow(new Date());

        const drawingsSnapshot = await db.collection("drawings")
            .where("date", ">=", startOfDay)
            .where("date", "<", endOfDay)
            .select("userId")
            .get();
        const submittedUserIds = new Set(
            drawingsSnapshot.docs.map((d) => d.data().userId),
        );

        const usersSnapshot = await db.collection("users").get();
        const messages = usersSnapshot.docs
            .filter((doc) => {
              const data = doc.data();
              return data.expoPushToken && !submittedUserIds.has(doc.id);
            })
            .map((doc) => {
              const streak = doc.data().currentStreak || 0;
              const isStreak = streak > 0;
              return {
                to: doc.data().expoPushToken,
                title: isStreak ?
                  `🔥 Don't break your ${streak}-day streak!` :
                  "⏰ 30 min left to doodle",
                body: isStreak ?
                  "30 min left — submit before 14:00 UK to keep it alive." :
                  "Submit your doodle before 14:00 UK time.",
                sound: "default",
                channelId: "default",
                priority: "high",
                data: {url: "doodleoftheday://home/draw"},
              };
            });
        await sendExpoPushNotifications(messages);
        console.log(`Sent deadline push to ${messages.length} users.`);
      } catch (error) {
        console.error("Error sending deadline push:", error);
      }
      return null;
    });

// select random word function

exports.selectRandomWord = functions.pubsub.schedule("00 00 * * *")
    .timeZone("Europe/London").onRun(async (context) => {
      const themesSnapshot = await db.collection("themes").get();


      if (!themesSnapshot.empty) {
        const themeToday = themesSnapshot.docs[0];

        const themeTodayData = {
          id: themeToday.id,
          word: themeToday.data().theme,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        };


        try {
          const docRef = await db.collection("themes_today")
              .add(themeTodayData);
          console.log("Theme today written with ID:", docRef.id);
          console.log(`Today's winner is: ${themeTodayData.word}`);

          await db.collection("themes").doc(themeToday.id).delete();
          console.log(`Delete theme with ID: ${themeToday.id} from themes`);
        } catch (error) {
          console.error("Error adding document:", error);
        }
      } else {
        console.log("No themes available in the 'themes' collection");
      }

      return null;
    });

// Fetch drawings & assign room IDs

const ROOM_ADJECTIVES = [
  "Smudgy", "Inky", "Charcoal", "Pastel", "Watercolour",
  "Glossy", "Glittery", "Splattered", "Sketchy", "Doodling",
  "Whimsical", "Daydreaming", "Crayoned", "Stippled", "Hatched",
  "Smeared", "Drippy", "Velvet", "Vibrant", "Surreal",
  "Cubist", "Abstract", "Minimal", "Gilded", "Lacquered",
  "Dappled", "Marbled", "Textured", "Painterly", "Neon",
];

const ROOM_NOUNS = [
  "Doodlers", "Sketchers", "Scribblers", "Painters", "Illustrators",
  "Etchers", "Muralists", "Engravers", "Caricaturists", "Designers",
  "Animators", "Inkers", "Cartoonists", "Daubers", "Stencillers",
  "Tracers", "Easels", "Palettes", "Brushes", "Canvases",
  "Sketchbooks", "Crayons", "Markers", "Splatters", "Smudges",
  "Doodles", "Strokes", "Squiggles", "Pencils", "Pens",
];

/**
 * Pick a random "The {adjective} {noun}" room name.
 * @return {string}
 */
function generateRoomName() {
  const adj = ROOM_ADJECTIVES[
      Math.floor(Math.random() * ROOM_ADJECTIVES.length)];
  const noun = ROOM_NOUNS[
      Math.floor(Math.random() * ROOM_NOUNS.length)];
  return `The ${adj} ${noun}`;
}

exports.assignRooms = functions.pubsub.schedule("00 14 * * *")
    .timeZone("Europe/London").onRun(async (context) => {
      const {startOfDay, endOfDay} = londonDayWindow(new Date());

      const drawings = await db.collection("drawings")
          .where("date", ">=", startOfDay)
          .where("date", "<", endOfDay)
          .get();

      const totalDrawings = drawings.docs.length;
      const maxRoomSize = 10;
      const numRooms = Math.ceil(totalDrawings / maxRoomSize);

      const roomNames = {};
      for (let i = 0; i < numRooms; i++) {
        roomNames[`room-${i}`] = generateRoomName();
      }

      for (let i = 0; i < totalDrawings; i++) {
        const roomId = `room-${i % numRooms}`;
        await db.collection("drawings").doc(drawings.docs[i].id).update({
          roomId,
          roomName: roomNames[roomId],
        });
      }

      // Send "Time to vote!" push notifications to users who submitted today
      const userIds = [...new Set(drawings.docs.map((d) => d.data().userId))];
      if (userIds.length > 0) {
        const userDocs = await Promise.all(
            userIds.map((uid) => db.collection("users").doc(uid).get()),
        );
        const messages = userDocs
            .filter((doc) => doc.exists && doc.data().expoPushToken)
            .map((doc) => ({
              to: doc.data().expoPushToken,
              title: "Time to vote! 🗳️",
              body: "Voting is open — go pick your favourite doodle.",
              sound: "default",
              channelId: "default",
              priority: "high",
              data: {url: "doodleoftheday://home/vote"},
            }));
        await sendExpoPushNotifications(messages);
      }

      return {message: "Room IDs assigned to drawings successfully"};
    });

//  fetch drawings logic
exports.getRoomDrawings = functions.https.onCall(async (data, context) => {
// Ensure user is authenticated
  const userId = context.auth.uid;
  if (!userId) {
    throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be signed in.",
    );
  }

  // Anchor the day to Europe/London (not the UTC runtime) so the room window
  // matches the London-based phases the client renders against.
  const {startOfDay, endOfDay} = londonDayWindow(
      new Date(data.date || Date.now()));

  try {
  // Step 1: Fetch the user's drawing for today to get the roomId
    const userDrawingSnapshot = await db.collection("drawings")
        .where("userId", "==", userId)
        .where("date", ">=", startOfDay)
        .where("date", "<", endOfDay)
        .limit(1)
        .get();

    if (userDrawingSnapshot.empty) {
      return {drawings: []}; // No drawing found for the user today
    }

    const userDrawingDoc = userDrawingSnapshot.docs[0];
    const userDrawing = userDrawingDoc.data();
    const userRoomId = userDrawing.roomId;

    // Step 2: Query the room's drawings, excluding the user's own drawing
    const roomDrawingsSnapshot = await db.collection("drawings")
        .where("roomId", "==", userRoomId)
        .where("userId", "!=", userId)
        .where("date", ">=", startOfDay)
        .where("date", "<", endOfDay)
        .orderBy("votes", "desc")
        .orderBy("userId", "desc")
        .get();

    // During voting we must NOT reveal standings: order is stable and
    // vote-independent (sorted by doc id) and the vote count is stripped from
    // the payload entirely. Vote-ranked order and counts are revealed only at
    // the 20:00 reveal in getRoomResults. The query still orderBy("votes") to
    // reuse the existing composite index; that order is discarded here.
    const drawings = roomDrawingsSnapshot.docs
        .map((doc) => {
          const d = {id: doc.id, ...doc.data(), isYou: false};
          delete d.votes;
          return d;
        })
        .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    // Own drawing appended last (isYou → "Your drawing" badge on the client).
    const own = {id: userDrawingDoc.id, ...userDrawing, isYou: true};
    delete own.votes;
    drawings.push(own);
    return {drawings};
  } catch (error) {
    console.error("Error fetching room drawings:", error);
    throw new functions.https.HttpsError(
        "internal",
        "Unable to fetch room drawings.",
    );
  }
});

const VALID_REACTIONS = ["laugh", "love", "wow", "spark"];

exports.getRoomResults = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be signed in.",
    );
  }

  const userId = context.auth.uid;
  const {startOfDay, endOfDay} = londonDayWindow(
      new Date(data.date || Date.now()));

  try {
    const userDrawingSnap = await db.collection("drawings")
        .where("userId", "==", userId)
        .where("date", ">=", startOfDay)
        .where("date", "<", endOfDay)
        .limit(1)
        .get();

    if (userDrawingSnap.empty) {
      return {hasDrawing: false};
    }

    const userDrawingData = userDrawingSnap.docs[0].data();
    const roomId = userDrawingData.roomId;
    if (!roomId) {
      return {hasDrawing: true, roomAssigned: false};
    }

    const roomSnap = await db.collection("drawings")
        .where("roomId", "==", roomId)
        .where("date", ">=", startOfDay)
        .where("date", "<", endOfDay)
        .orderBy("votes", "desc")
        .get();

    if (roomSnap.empty) {
      return {hasDrawing: true, roomAssigned: false};
    }

    const drawingIds = roomSnap.docs.map((d) => d.id);
    const userReactionDocs = await Promise.all(
        drawingIds.map((id) =>
          db.collection("user_reactions").doc(`${userId}_${id}`).get(),
        ),
    );
    const userReactionsMap = {};
    userReactionDocs.forEach((doc, i) => {
      userReactionsMap[drawingIds[i]] = doc.exists ?
          (doc.data().types || []) : [];
    });

    // Resolve author usernames for the reveal. Identities are shown ONLY at
    // results time — getRoomDrawings keeps voting anonymous. Tapping a name on
    // the client opens getPublicProfile, which enforces blocking both ways.
    const authorIds = [...new Set(roomSnap.docs.map((d) => d.data().userId))];
    const authorDocs = await db.getAll(
        ...authorIds.map((id) => db.collection("users").doc(id)),
    );
    const usernameMap = {};
    authorDocs.forEach((doc) => {
      usernameMap[doc.id] = doc.exists ?
          (doc.data().username || "Anonymous") : "Anonymous";
    });

    const drawings = roomSnap.docs.map((d) => {
      const dData = d.data();
      return {
        id: d.id,
        userId: dData.userId,
        username: usernameMap[dData.userId] || "Anonymous",
        image: dData.image,
        imageUrl: dData.imageUrl,
        votes: dData.votes || 0,
        isYou: dData.userId === userId,
        reactions: dData.reactions || {},
        userReactions: userReactionsMap[d.id] || [],
      };
    });

    const winnerUserId = roomSnap.docs[0].data().userId;
    const winnerUsername = usernameMap[winnerUserId] || "Anonymous";

    return {
      hasDrawing: true,
      roomAssigned: true,
      totalInRoom: drawings.length,
      drawings,
      winnerUserId,
      winnerUsername,
      roomName: roomSnap.docs[0].data().roomName || null,
    };
  } catch (error) {
    console.error("Error fetching room results:", error);
    throw new functions.https.HttpsError(
        "internal",
        "Unable to fetch room results.",
    );
  }
});

exports.toggleReaction = functions.https.onCall(async (data, context) => {
  requireVerifiedEmail(context);
  const userId = context.auth.uid;
  const {drawingId, type} = data;
  if (!drawingId || !VALID_REACTIONS.includes(type)) {
    throw new functions.https.HttpsError(
        "invalid-argument",
        "Invalid reaction.",
    );
  }

  const drawingRef = db.collection("drawings").doc(drawingId);
  const userReactionRef = db.collection("user_reactions")
      .doc(`${userId}_${drawingId}`);

  try {
    return await db.runTransaction(async (tx) => {
      const drawingDoc = await tx.get(drawingRef);
      if (!drawingDoc.exists) {
        throw new functions.https.HttpsError(
            "not-found", "Drawing not found.");
      }
      if (drawingDoc.data().userId === userId) {
        throw new functions.https.HttpsError(
            "permission-denied",
            "You can't react to your own drawing.",
        );
      }
      const userReactionDoc = await tx.get(userReactionRef);

      const reactions = drawingDoc.data().reactions || {};
      const userTypes = userReactionDoc.exists ?
          (userReactionDoc.data().types || []) : [];
      const hasReacted = userTypes.includes(type);

      let newUserTypes;
      if (hasReacted) {
        reactions[type] = Math.max(0, (reactions[type] || 0) - 1);
        newUserTypes = userTypes.filter((t) => t !== type);
      } else {
        reactions[type] = (reactions[type] || 0) + 1;
        newUserTypes = [...userTypes, type];
      }

      tx.update(drawingRef, {reactions});
      if (newUserTypes.length === 0) {
        tx.delete(userReactionRef);
      } else {
        tx.set(userReactionRef, {
          userId,
          drawingId,
          types: newUserTypes,
        });
      }

      return {reactions, userReactions: newUserTypes};
    });
  } catch (error) {
    console.error("Error toggling reaction:", error);
    if (error instanceof functions.https.HttpsError) throw error;
    throw new functions.https.HttpsError(
        "internal", "Failed to toggle reaction.");
  }
});

exports.flagDrawing = functions.https.onCall(async (data, context) => {
  requireVerifiedEmail(context);
  const flaggedBy = context.auth.uid;
  const {drawingId} = data || {};
  if (typeof drawingId !== "string" || !drawingId) {
    throw new functions.https.HttpsError(
        "invalid-argument",
        "drawingId is required.",
    );
  }

  try {
    const drawingRef = db.collection("drawings").doc(drawingId);
    const drawingDoc = await drawingRef.get();
    if (!drawingDoc.exists) {
      throw new functions.https.HttpsError(
          "not-found",
          "Drawing does not exist.",
      );
    }
    const drawingData = drawingDoc.data();
    if (drawingData.userId === flaggedBy) {
      throw new functions.https.HttpsError(
          "permission-denied",
          "You cannot flag your own drawing.",
      );
    }
    // Dedupe: one flag per user per drawing.
    const flagId = `${flaggedBy}_${drawingId}`;
    const flagRef = db.collection("flags").doc(flagId);
    const existing = await flagRef.get();
    if (existing.exists) {
      return {message: "Already flagged."};
    }
    await flagRef.set({
      drawingId,
      drawingUserId: drawingData.userId,
      drawingDate: drawingData.date || null,
      drawingTheme: drawingData.theme || null,
      flaggedBy,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
    return {message: "Drawing has been flagged for review."};
  } catch (error) {
    if (error instanceof functions.https.HttpsError) throw error;
    console.error("Error flagging drawing:", error);
    throw new functions.https.HttpsError(
        "internal",
        "Failed to flag drawing. Please try again later.",
    );
  }
});

exports.handleVote = functions.https.onCall(async (data, context) => {
  requireVerifiedEmail(context);
  const currentUser = context.auth.uid;
  // Client passes the drawing id under `userId` (legacy name); accept either.
  const targetDrawingId = (data && (data.drawingId || data.userId)) || "";
  if (typeof targetDrawingId !== "string" || !targetDrawingId) {
    throw new functions.https.HttpsError(
        "invalid-argument",
        "drawingId is required.",
    );
  }

  const {startOfDay, endOfDay, startDate, dateKey} =
      londonDayWindow(new Date());

  // Caller must have submitted today; their drawing's roomId scopes who they
  // can vote for.
  const callerDrawingSnap = await db.collection("drawings")
      .where("userId", "==", currentUser)
      .where("date", ">=", startOfDay)
      .where("date", "<", endOfDay)
      .limit(1)
      .get();
  if (callerDrawingSnap.empty) {
    throw new functions.https.HttpsError(
        "failed-precondition",
        "Submit a doodle today before voting.",
    );
  }
  const callerRoomId = callerDrawingSnap.docs[0].data().roomId;
  if (!callerRoomId) {
    throw new functions.https.HttpsError(
        "failed-precondition",
        "Voting hasn't opened yet.",
    );
  }

  const voteRef = db.collection("user_votes")
      .doc(`${currentUser}_${dateKey}`);
  const drawingRef = db.collection("drawings").doc(targetDrawingId);

  try {
    await db.runTransaction(async (transaction) => {
      const [voteDoc, drawingDoc] = await Promise.all([
        transaction.get(voteRef),
        transaction.get(drawingRef),
      ]);
      if (voteDoc.exists) {
        throw new functions.https.HttpsError(
            "already-exists",
            "User has already voted today.");
      }
      if (!drawingDoc.exists) {
        throw new functions.https.HttpsError(
            "not-found",
            "Drawing does not exist.");
      }
      const drawingData = drawingDoc.data();
      if (drawingData.userId === currentUser) {
        throw new functions.https.HttpsError(
            "permission-denied",
            "You can't vote for your own drawing.",
        );
      }
      if (drawingData.roomId !== callerRoomId) {
        throw new functions.https.HttpsError(
            "permission-denied",
            "You can only vote in your own room.",
        );
      }
      const drawingDate = drawingData.date || 0;
      if (drawingDate < startOfDay || drawingDate >= endOfDay) {
        throw new functions.https.HttpsError(
            "permission-denied",
            "You can only vote on today's drawings.",
        );
      }
      transaction.update(drawingRef,
          {votes: admin.firestore.FieldValue.increment(1)});
      transaction.set(voteRef, {
        userId: currentUser,
        drawingId: targetDrawingId,
        voteDate: admin.firestore.Timestamp.fromDate(startDate),
      });
    });
    return {message: "Vote successfully cast!"};
  } catch (error) {
    if (error instanceof functions.https.HttpsError) throw error;
    console.error("Error casting vote:", error);
    throw new functions.https.HttpsError(
        "internal",
        "Failed to cast vote.");
  }
});

exports.createUserDocument = functions.https.onCall(async (data, context) => {
  requireAuth(context);
  const userId = context.auth.uid;
  const email = context.auth.token.email || null;
  const rawUsername = typeof data.username === "string" ?
      data.username.trim() : "";
  if (!USERNAME_REGEX.test(rawUsername)) {
    throw new functions.https.HttpsError(
        "invalid-argument",
        "Username must be 2–20 characters: letters, numbers, or underscore.",
    );
  }
  const usernameLower = rawUsername.toLowerCase();
  const userRef = db.collection("users").doc(userId);
  const usernameRef = db.collection("usernames").doc(usernameLower);

  try {
    await db.runTransaction(async (tx) => {
      const [existingUser, existingUsername] = await Promise.all([
        tx.get(userRef),
        tx.get(usernameRef),
      ]);
      if (existingUser.exists) {
        throw new functions.https.HttpsError(
            "already-exists",
            "User document already exists.",
        );
      }
      if (existingUsername.exists) {
        throw new functions.https.HttpsError(
            "already-exists",
            "Username is taken.",
        );
      }
      tx.set(userRef, {
        username: rawUsername,
        email,
        userId,
        winCount: 0,
        hasSeenTutorial: false,
        isVerified: false,
      });
      tx.set(usernameRef, {userId});
    });
    return {success: true};
  } catch (error) {
    if (error instanceof functions.https.HttpsError) throw error;
    throw new functions.https.HttpsError(
        "internal",
        "Failed to create user document.",
    );
  }
});

exports.addImageToDB = functions.https.onCall(async (data, context) => {
  requireVerifiedEmail(context);
  // Reject anything after 14:00 UK — otherwise the drawing lands without
  // a roomId (assignRooms ran at 14:00) and then crashes pickDailyWinner.
  const ukParts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  }).formatToParts(new Date());
  const ukH = parseInt(ukParts.find((p) => p.type === "hour").value, 10);
  const ukM = parseInt(ukParts.find((p) => p.type === "minute").value, 10);
  const ukS = parseInt(ukParts.find((p) => p.type === "second").value, 10);
  if (ukH * 3600 + ukM * 60 + ukS >= 14 * 3600) {
    throw new functions.https.HttpsError(
        "failed-precondition",
        "Drawing submissions close at 14:00 UK. Come back tomorrow!",
    );
  }
  const {imageBase64} = data || {};
  if (typeof imageBase64 !== "string" || imageBase64.length < 100) {
    throw new functions.https.HttpsError(
        "invalid-argument",
        "imageBase64 is required.",
    );
  }
  // ~1 MB base64 ≈ ~750 KB binary — covers iOS @3x snapshots (iPhone 13+
  // Pro renders ~1170×1800 PNGs straight off the device scale).
  if (imageBase64.length > 1000000) {
    throw new functions.https.HttpsError(
        "invalid-argument",
        "Drawing is too large.",
    );
  }
  const userId = context.auth.uid;
  const {startOfDay, endOfDay, dateKey} = londonDayWindow(new Date());

  try {
    const drawingQuery = await db.collection("drawings")
        .where("userId", "==", userId)
        .where("date", ">=", startOfDay)
        .where("date", "<", endOfDay)
        .get();

    if (!drawingQuery.empty) {
      throw new functions.https.HttpsError(
          "failed-precondition",
          "You have already doodled today.",
      );
    }


    // Fetch the theme of the day. themes_today gets exactly one doc per day
    // (written by selectRandomWord at London midnight) and is never pruned,
    // so the most recent by timestamp is always today's — no day-window math,
    // which sidesteps the BST boundary ambiguity entirely.
    const themeQuery = await db
        .collection("themes_today")
        .orderBy("timestamp", "desc")
        .limit(1)
        .get();

    let theme = "No theme available";
    if (!themeQuery.empty) {
      const themeDoc = themeQuery.docs[0].data();
      theme = themeDoc.word; // Assuming 'word' is the field storing the theme
    }

    // Upload bytes to Cloud Storage and store only the URL in Firestore.
    // Keeps drawing docs ~80 bytes instead of ~1 MB base64 — huge read-cost
    // and bandwidth savings at scale, plus images become CDN-cacheable.
    const buffer = Buffer.from(imageBase64, "base64");
    const drawingRef = db.collection("drawings").doc();
    const bucket = admin.storage().bucket();
    const filePath = `drawings/${userId}/${drawingRef.id}.png`;
    const token = crypto.randomBytes(16).toString("hex");
    await bucket.file(filePath).save(buffer, {
      metadata: {
        contentType: "image/png",
        metadata: {firebaseStorageDownloadTokens: token},
      },
    });
    const encodedPath = encodeURIComponent(filePath);
    const imageUrl = `https://firebasestorage.googleapis.com/v0/b/` +
        `${bucket.name}/o/${encodedPath}?alt=media&token=${token}`;

    await drawingRef.set({
      title: "Captured Image",
      done: false,
      imageUrl,
      userId,
      votes: 0,
      date: Date.now(),
      theme,
    });

    // Update streak
    const userRef = db.collection("users").doc(userId);
    const userDoc = await userRef.get();
    let usedFreeze = false;
    if (userDoc.exists) {
      const userData = userDoc.data();
      // London day key (YYYY-MM-DD), consistent with the submission window —
      // a UTC date string here would mis-bucket early-morning BST submissions
      // and could wrongly break or extend a streak.
      const todayStr = dateKey;
      const lastSubmission = userData.lastSubmissionDate;

      // Streak freezes: 1 every 7 days, capped at 1. Auto-consumed to bridge
      // a single missed day so a one-off miss doesn't reset the streak.
      const FREEZE_REFILL_DAYS = 7;
      let freezesAvailable = userData.freezesAvailable || 0;
      let lastFreezeGrantedDate = userData.lastFreezeGrantedDate || null;
      const daysSinceFreezeGrant = lastFreezeGrantedDate ?
          Math.round(
              (new Date(todayStr) - new Date(lastFreezeGrantedDate)) /
              (1000 * 60 * 60 * 24),
          ) : Infinity;
      if (freezesAvailable < 1 &&
          daysSinceFreezeGrant >= FREEZE_REFILL_DAYS) {
        freezesAvailable = 1;
        lastFreezeGrantedDate = todayStr;
      }

      let newStreak = 1;
      if (lastSubmission) {
        const diffDays = Math.round(
            (new Date(todayStr) - new Date(lastSubmission)) /
            (1000 * 60 * 60 * 24),
        );
        if (diffDays === 1) {
          newStreak = (userData.currentStreak || 0) + 1;
        } else if (diffDays === 2 && freezesAvailable > 0) {
          newStreak = (userData.currentStreak || 0) + 1;
          usedFreeze = true;
          freezesAvailable -= 1;
        }
      }

      // Palette is a permanent unlock once the user has ever reached a
      // 3-day streak. Once true, never reset.
      const newLongestStreak = Math.max(newStreak, userData.longestStreak || 0);
      const newPaletteAvailable = userData.paletteAvailable === true ||
          newLongestStreak >= 3;

      await userRef.update({
        currentStreak: newStreak,
        longestStreak: newLongestStreak,
        lastSubmissionDate: todayStr,
        paletteAvailable: newPaletteAvailable,
        freezesAvailable,
        lastFreezeGrantedDate,
      });
    }

    return {
      success: true,
      message: usedFreeze ?
        "❄️ Streak saved! You used your freeze." :
        "Drawing submitted successfully!",
    };
  } catch (error) {
    throw new functions.https.HttpsError(
        "internal",
        "Failed to submit drawing.", error);
  }
});

exports.testPushToMe = functions.https.onCall(async (data, context) => {
  requireAuth(context);
  const userId = context.auth.uid;
  const userDoc = await db.collection("users").doc(userId).get();
  const token = userDoc.exists && userDoc.data().expoPushToken;
  if (!token) {
    throw new functions.https.HttpsError(
        "failed-precondition",
        "No expoPushToken on your user document.",
    );
  }
  console.log(`testPushToMe: sending to ${userId}, token=${token}`);
  const tickets = await sendExpoPushNotifications([{
    to: token,
    title: "Test push 🧪",
    body: "If you see this, FCM is wired up correctly.",
    sound: "default",
    channelId: "default",
    priority: "high",
  }]);
  const ticket = tickets[0];
  console.log("testPushToMe ticket:", JSON.stringify(ticket));
  if (!ticket || ticket.status !== "ok") {
    return {success: false, token, ticket};
  }
  // Wait for FCM delivery, then fetch receipt to see what FCM did.
  await new Promise((r) => setTimeout(r, 8000));
  const receipts = await fetchPushReceipts([ticket.id]);
  const receipt = receipts[ticket.id];
  console.log(
      "testPushToMe receipt:",
      JSON.stringify({id: ticket.id, receipt}),
  );
  return {success: true, token, ticket, receipt};
});

exports.fetchUserAndCheckTutorial = functions.https.onCall(
    async (data, context) => {
      if (!context.auth) {
        throw new functions.https.HttpsError(
            "unauthenticated",
            "User must be authenticated.",
        );
      }

      const userId = context.auth.uid;
      const userRef = db.collection("users").doc(userId);

      try {
        const userDoc = await userRef.get();
        if (!userDoc.exists) {
          throw new functions.https.HttpsError(
              "not-found",
              "User document not found.",
          );
        }

        const userData = userDoc.data();
        return {hasSeenTutorial: !!userData.hasSeenTutorial};
      } catch (error) {
        throw new functions.https.HttpsError(
            "internal",
            "Failed to fetch tutorial status.", error);
      }
    });

exports.updateTutorialStatus = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated.",
    );
  }

  const userId = context.auth.uid;
  const userRef = db.collection("users").doc(userId);

  try {
    await userRef.update({hasSeenTutorial: true});
    return {success: true};
  } catch (error) {
    throw new functions.https.HttpsError(
        "internal",
        "Failed to update tutorial status.", error);
  }
});

/**
 * Deletes every document matching a query, in 400-doc Firestore batches.
 * @param {FirebaseFirestore.Query} query The query whose results to delete.
 */
async function deleteByQuery(query) {
  const snap = await query.get();
  if (snap.empty) return;
  const docs = snap.docs;
  for (let i = 0; i < docs.length; i += 400) {
    const batch = db.batch();
    docs.slice(i, i + 400).forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  }
}

exports.deleteUserAccount = functions.https.onCall(async (data, context) => {
  requireAuth(context);
  const uid = context.auth.uid;

  try {
    await Promise.all([
      deleteByQuery(db.collection("winners").where("userId", "==", uid)),
      deleteByQuery(db.collection("drawings").where("userId", "==", uid)),
      deleteByQuery(db.collection("user_votes").where("userId", "==", uid)),
      deleteByQuery(db.collection("flags").where("flaggedBy", "==", uid)),
      deleteByQuery(db.collection("user_reactions").where("userId", "==", uid)),
    ]);

    // Free up the username registry slot (best-effort; older accounts may not
    // have one).
    const userDoc = await db.collection("users").doc(uid).get();
    if (userDoc.exists) {
      const username = userDoc.data().username;
      if (typeof username === "string" && username) {
        const usernameLower = username.trim().toLowerCase();
        await db.collection("usernames").doc(usernameLower).delete()
            .catch((e) => console.error("Username slot delete failed:", e));
      }
    }

    // Best-effort delete of any avatar files this user owns. We try both
    // extensions since setAvatar now picks based on magic bytes.
    const bucket = admin.storage().bucket();
    await Promise.all([
      bucket.file(`avatars/${uid}.jpg`).delete().catch(() => {}),
      bucket.file(`avatars/${uid}.png`).delete().catch(() => {}),
      bucket.deleteFiles({prefix: `drawings/${uid}/`}).catch(() => {}),
    ]);

    await db.collection("users").doc(uid).delete();
    await admin.auth().deleteUser(uid);

    return {message: "Account deleted successfully"};
  } catch (error) {
    console.error("deleteUserAccount error:", error);
    throw new functions.https.HttpsError(
        "internal",
        "Error deleting account: " + (error.message || "unknown"));
  }
});

exports.updateUserVerification = functions.https.onCall(
    async (data, context) => {
      if (!context.auth) {
        throw new functions.https.HttpsError(
            "unauthenticated",
            "User must be authenticated.",
        );
      }

      const uid = context.auth.uid;

      try {
        const userRecord = await admin.auth().getUser(uid);
        if (!userRecord.emailVerified) {
          throw new functions.https.HttpsError(
              "failed-precondition",
              "User's email is not verified.",
          );
        }

        await admin.firestore().collection("users")
            .doc(uid).update({isVerified: true});

        return {message: "Verification status updated"};
      } catch (error) {
        throw new functions.https.HttpsError(
            "internal", "Error updating verification: " + error.message);
      }
    });

/**
 * Rank a user by all-time winCount without reading the whole users
 * collection — a count() aggregation of users strictly ahead. Ties share a
 * rank. Returns {rank, data} (data null if the user doc is missing).
 * @param {string} userId
 * @return {Promise<object>}
 */
async function rankByWinCount(userId) {
  const meDoc = await db.collection("users").doc(userId).get();
  if (!meDoc.exists) return {rank: null, data: null};
  const winCount = meDoc.data().winCount || 0;
  const ahead = await db.collection("users")
      .where("winCount", ">", winCount)
      .count().get();
  return {
    rank: ahead.data().count + 1,
    data: {
      id: meDoc.id,
      username: meDoc.data().username,
      winCount,
      currentStreak: meDoc.data().currentStreak || 0,
    },
  };
}

exports.getLeaderboard = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated to access the leaderboard.",
    );
  }

  const currentUserId = context.auth.uid;

  try {
    const leaderboardSnapshot = await db
        .collection("users")
        .orderBy("winCount", "desc")
        .limit(12)
        .get();

    const leaderboard = leaderboardSnapshot.docs.map((doc) => ({
      id: doc.id,
      username: doc.data().username,
      winCount: doc.data().winCount,
    }));


    let currentUserRank = null;
    let currentUserData = null;
    if (!leaderboard.find((user) => user.id === currentUserId)) {
      const ranked = await rankByWinCount(currentUserId);
      currentUserRank = ranked.rank;
      currentUserData = ranked.data;
    }

    return {
      leaderboard,
      currentUserRank,
      currentUserData,
    };
  } catch (error) {
    throw new functions.https.HttpsError(
        "internal",
        "Failed to retrieve leaderboard data.",
    );
  }
});

/**
 * Convert a London-local Y/M/D at 00:00 into the matching UTC Date.
 * Handles BST/GMT by reading the London offset at that instant.
 * @param {number} y
 * @param {number} m one-based month
 * @param {number} d
 * @return {Date}
 */
function londonMidnightToUtc(y, m, d) {
  const guess = new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
  const offsetName = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    timeZoneName: "shortOffset",
  }).formatToParts(guess).find((p) => p.type === "timeZoneName").value;
  const match = offsetName.match(/GMT([+-]\d+)/);
  const offsetHours = match ? parseInt(match[1], 10) : 0;
  return new Date(guess.getTime() - offsetHours * 3600 * 1000);
}

/**
 * Current date parts in Europe/London plus the weekday (1=Mon..7=Sun).
 * @param {Date} now
 * @return {{y: number, m: number, d: number, wd: number}}
 */
function londonDateParts(now) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).formatToParts(now);
  const get = (type) => parts.find((p) => p.type === type).value;
  const wdMap = {Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7};
  return {
    y: parseInt(get("year"), 10),
    m: parseInt(get("month"), 10),
    d: parseInt(get("day"), 10),
    wd: wdMap[get("weekday")],
  };
}

/**
 * The current "doodle day" as a [start, end) window plus formatting helpers,
 * anchored to 00:00 Europe/London (BST/GMT aware). Use this everywhere a day
 * boundary is needed: the Functions runtime is UTC, so `new Date().setHours(0)`
 * snaps to UTC midnight, which is an hour off the London day during BST and
 * silently buckets early-morning submissions/views into the wrong day.
 * @param {Date} now
 * @return {{startOfDay: number, endOfDay: number, startDate: Date,
 *   dateKey: string}}
 */
function londonDayWindow(now) {
  const {y, m, d} = londonDateParts(now);
  const start = londonMidnightToUtc(y, m, d);
  const end = londonMidnightToUtc(y, m, d + 1);
  const pad = (n) => String(n).padStart(2, "0");
  return {
    startOfDay: start.getTime(),
    endOfDay: end.getTime(),
    startDate: start,
    dateKey: `${y}-${pad(m)}-${pad(d)}`,
  };
}

/**
 * Start of the current Mon-Sun week, anchored at 00:00 Europe/London.
 * @param {Date} now
 * @return {Date}
 */
function startOfWeekLondon(now) {
  const {y, m, d, wd} = londonDateParts(now);
  return londonMidnightToUtc(y, m, d - (wd - 1));
}

/**
 * Start of the current calendar month at 00:00 Europe/London.
 * @param {Date} now
 * @return {Date}
 */
function startOfMonthLondon(now) {
  const {y, m} = londonDateParts(now);
  return londonMidnightToUtc(y, m, 1);
}

/**
 * Aggregate winners for the given range and return a leaderboard.
 * Range is one of "week", "month", or "all". For "all" we use the
 * pre-aggregated users.winCount field; for "week"/"month" we count
 * winners docs whose date falls inside the range.
 * @param {string} range
 * @param {string} currentUserId
 * @return {Promise<object>}
 */
async function buildRangedLeaderboard(range, currentUserId) {
  if (range === "all") {
    const top = await db.collection("users")
        .orderBy("winCount", "desc")
        .limit(12)
        .get();
    const leaderboard = top.docs.map((doc) => ({
      id: doc.id,
      username: doc.data().username,
      winCount: doc.data().winCount,
      currentStreak: doc.data().currentStreak || 0,
    }));
    let currentUserRank = null;
    let currentUserData = null;
    if (!leaderboard.find((u) => u.id === currentUserId)) {
      const ranked = await rankByWinCount(currentUserId);
      currentUserRank = ranked.rank;
      currentUserData = ranked.data;
    }
    return {leaderboard, currentUserRank, currentUserData};
  }

  const now = new Date();
  const start = range === "week" ?
    startOfWeekLondon(now) :
    startOfMonthLondon(now);

  const winSnap = await db.collection("winners")
      .where("date", ">=", admin.firestore.Timestamp.fromDate(start))
      .get();

  const counts = new Map();
  winSnap.docs.forEach((doc) => {
    const uid = doc.data().userId;
    if (!uid) return;
    counts.set(uid, (counts.get(uid) || 0) + 1);
  });

  const sorted = [...counts.entries()]
      .map(([id, winCount]) => ({id, winCount}))
      .sort((a, b) => b.winCount - a.winCount);

  const topEntries = sorted.slice(0, 12);
  const userDocs = await Promise.all(
      topEntries.map((e) => db.collection("users").doc(e.id).get()),
  );

  const leaderboard = topEntries.map((entry, idx) => ({
    id: entry.id,
    username: userDocs[idx].exists ?
      userDocs[idx].data().username :
      "Unknown",
    winCount: entry.winCount,
    currentStreak: userDocs[idx].exists ?
      (userDocs[idx].data().currentStreak || 0) :
      0,
  }));

  let currentUserRank = null;
  let currentUserData = null;
  if (!leaderboard.find((u) => u.id === currentUserId)) {
    const allIds = sorted.map((x) => x.id);
    const idx = allIds.indexOf(currentUserId);
    if (idx >= 0) {
      currentUserRank = idx + 1;
      const me = await db.collection("users").doc(currentUserId).get();
      if (me.exists) {
        currentUserData = {
          id: me.id,
          username: me.data().username,
          winCount: sorted[idx].winCount,
          currentStreak: me.data().currentStreak || 0,
        };
      }
    }
  }
  return {leaderboard, currentUserRank, currentUserData};
}

exports.getLeaderboardByRange = functions.https.onCall(
    async (data, context) => {
      if (!context.auth) {
        throw new functions.https.HttpsError(
            "unauthenticated",
            "User must be authenticated to access the leaderboard.",
        );
      }
      const range =
        ["week", "month", "all"].includes(data && data.range) ?
          data.range :
          "all";
      try {
        return await buildRangedLeaderboard(range, context.auth.uid);
      } catch (error) {
        console.error("getLeaderboardByRange error:", error);
        throw new functions.https.HttpsError(
            "internal",
            "Failed to retrieve leaderboard data.",
        );
      }
    });

exports.getPresence = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated.",
    );
  }

  const {startOfDay, endOfDay, startDate} = londonDayWindow(new Date());

  try {
    const drawCount = await db.collection("drawings")
        .where("date", ">=", startOfDay)
        .where("date", "<", endOfDay)
        .count().get();

    const voteCount = await db.collection("user_votes")
        .where("voteDate", "==", admin.firestore.Timestamp.fromDate(startDate))
        .count().get();

    return {
      doodlersToday: drawCount.data().count,
      votesToday: voteCount.data().count,
    };
  } catch (error) {
    console.error("Error fetching presence:", error);
    throw new functions.https.HttpsError(
        "internal", "Failed to fetch presence.");
  }
});

exports.getUserStats = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated.",
    );
  }

  const userId = context.auth.uid;

  try {
    const userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists) {
      throw new functions.https.HttpsError("not-found", "User not found.");
    }
    const userData = userDoc.data();
    // Palette is permanently unlocked once the user has ever reached a
    // 3-day streak. The OR with longestStreak backfills users who unlocked
    // (and possibly consumed) under the old consumable mechanic.
    const paletteAvailable = userData.paletteAvailable === true ||
        (userData.longestStreak || 0) >= 3;
    return {
      username: userData.username || "",
      avatarUrl: userData.avatarUrl || "",
      currentStreak: userData.currentStreak || 0,
      longestStreak: userData.longestStreak || 0,
      winCount: userData.winCount || 0,
      paletteAvailable,
      freezesAvailable: userData.freezesAvailable || 0,
      profileLink: userData.profileLink || "",
    };
  } catch (error) {
    throw new functions.https.HttpsError(
        "internal",
        "Failed to fetch user stats.", error);
  }
});

exports.setAvatar = functions.https.onCall(async (data, context) => {
  requireAuth(context);
  const userId = context.auth.uid;
  const {imageBase64} = data || {};
  if (typeof imageBase64 !== "string" || imageBase64.length < 100) {
    throw new functions.https.HttpsError(
        "invalid-argument",
        "imageBase64 is required.",
    );
  }
  if (imageBase64.length > 2000000) {
    throw new functions.https.HttpsError(
        "invalid-argument",
        "Avatar image is too large.",
    );
  }
  let buffer;
  try {
    buffer = Buffer.from(imageBase64, "base64");
  } catch (e) {
    throw new functions.https.HttpsError(
        "invalid-argument",
        "imageBase64 is not valid base64.",
    );
  }
  // Magic-byte sniff: JPEG starts with FF D8 FF; PNG starts with 89 50 4E 47.
  // We accept either and label the stored file accordingly so we don't claim
  // image/jpeg for arbitrary user-supplied bytes.
  let contentType;
  let extension;
  if (buffer.length >= 3 &&
      buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    contentType = "image/jpeg";
    extension = "jpg";
  } else if (buffer.length >= 4 &&
      buffer[0] === 0x89 && buffer[1] === 0x50 &&
      buffer[2] === 0x4E && buffer[3] === 0x47) {
    contentType = "image/png";
    extension = "png";
  } else {
    throw new functions.https.HttpsError(
        "invalid-argument",
        "Avatar must be a JPEG or PNG image.",
    );
  }
  try {
    const bucket = admin.storage().bucket();
    const filePath = `avatars/${userId}.${extension}`;
    const file = bucket.file(filePath);
    const token = crypto.randomBytes(16).toString("hex");
    await file.save(buffer, {
      metadata: {
        contentType,
        metadata: {firebaseStorageDownloadTokens: token},
      },
    });
    const encodedPath = encodeURIComponent(filePath);
    const url = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodedPath}?alt=media&token=${token}`;
    await db.collection("users").doc(userId).update({avatarUrl: url});
    return {url};
  } catch (error) {
    console.error("setAvatar error:", error);
    throw new functions.https.HttpsError(
        "internal",
        "Failed to save avatar.",
    );
  }
});

// Public, read-only profile for another user — safe fields plus the curated
// gallery. Hidden if either party has blocked the other. Badges are derived
// client-side from the returned streak/win stats (single-source unlocks.ts).
exports.getPublicProfile = functions.https.onCall(async (data, context) => {
  requireAuth(context);
  const viewerId = context.auth.uid;
  const targetId = (data && data.userId) || "";
  if (typeof targetId !== "string" || !targetId) {
    throw new functions.https.HttpsError(
        "invalid-argument", "userId is required.");
  }

  // Block check, both directions — any block hides the profile.
  const blockedRef = (a, b) => db.collection("users").doc(a)
      .collection("blocked").doc(b);
  const [iBlockedThem, theyBlockedMe] = await Promise.all([
    blockedRef(viewerId, targetId).get(),
    blockedRef(targetId, viewerId).get(),
  ]);
  if (iBlockedThem.exists || theyBlockedMe.exists) {
    return {available: false, blocked: true};
  }

  const userDoc = await db.collection("users").doc(targetId).get();
  if (!userDoc.exists) return {available: false};
  const u = userDoc.data();

  // Resolve the curated gallery: caller-owned drawings only, order preserved.
  const ids = Array.isArray(u.galleryDrawingIds) ?
      u.galleryDrawingIds.slice(0, 8) : [];
  let gallery = [];
  if (ids.length > 0) {
    const docs = await Promise.all(
        ids.map((id) => db.collection("drawings").doc(id).get()),
    );
    gallery = docs
        .filter((d) => d.exists && d.data().userId === targetId)
        .map((d) => ({
          id: d.id,
          imageUrl: d.data().imageUrl,
          image: d.data().image,
          theme: d.data().theme || null,
        }));
  }

  return {
    available: true,
    id: targetId,
    username: u.username || null,
    avatarUrl: u.avatarUrl || null,
    currentStreak: u.currentStreak || 0,
    longestStreak: u.longestStreak || 0,
    winCount: u.winCount || 0,
    profileLink: u.profileLink || null,
    gallery,
  };
});

// Set the caller's curated gallery (up to 8 of their own drawings). Written
// via callable because the users update rule only permits expoPushToken.
exports.setGalleryDrawings = functions.https.onCall(async (data, context) => {
  requireVerifiedEmail(context);
  const userId = context.auth.uid;
  const ids = (data && data.drawingIds) || [];
  if (!Array.isArray(ids) || ids.some((id) => typeof id !== "string")) {
    throw new functions.https.HttpsError(
        "invalid-argument", "drawingIds must be an array of strings.");
  }
  if (ids.length > 8) {
    throw new functions.https.HttpsError(
        "invalid-argument", "You can feature up to 8 drawings.");
  }
  const unique = [...new Set(ids)]; // de-dupe, preserve order

  // Every featured drawing must exist and belong to the caller.
  if (unique.length > 0) {
    const docs = await Promise.all(
        unique.map((id) => db.collection("drawings").doc(id).get()),
    );
    const allOwned = docs.every(
        (d) => d.exists && d.data().userId === userId);
    if (!allOwned) {
      throw new functions.https.HttpsError(
          "permission-denied", "You can only feature your own drawings.");
    }
  }

  await db.collection("users").doc(userId)
      .update({galleryDrawingIds: unique});
  return {success: true, galleryDrawingIds: unique};
});

// Set the caller's single profile link (artist website / social). Validated
// as an http(s) URL — it's shown to other users, so reject javascript:, data:
// and other unsafe schemes. An empty string clears the link.
exports.setProfileLink = functions.https.onCall(async (data, context) => {
  requireVerifiedEmail(context);
  const userId = context.auth.uid;
  let url = (data && typeof data.url === "string") ? data.url.trim() : "";
  if (url.length > 200) {
    throw new functions.https.HttpsError(
        "invalid-argument", "Link is too long.");
  }
  if (url === "") {
    await db.collection("users").doc(userId).update({profileLink: ""});
    return {success: true, profileLink: ""};
  }
  if (!/^https?:\/\//i.test(url)) url = "https://" + url;
  let parsed;
  try {
    parsed = new URL(url);
  } catch (e) {
    throw new functions.https.HttpsError(
        "invalid-argument", "Enter a valid link.");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new functions.https.HttpsError(
        "invalid-argument", "Links must start with http:// or https://.");
  }
  if (!parsed.hostname.includes(".")) {
    throw new functions.https.HttpsError(
        "invalid-argument", "Enter a valid link.");
  }
  await db.collection("users").doc(userId)
      .update({profileLink: parsed.toString()});
  return {success: true, profileLink: parsed.toString()};
});

const REPORT_TYPES = ["profile", "avatar", "drawing"];

// Record a user/content report for moderation. user_reports is closed to
// client reads/writes (rules); only this callable writes it.
exports.reportUser = functions.https.onCall(async (data, context) => {
  requireAuth(context);
  const reporterId = context.auth.uid;
  const reportedUserId = (data && data.reportedUserId) || "";
  const type = (data && data.type) || "profile";
  const reason = (data && typeof data.reason === "string") ?
      data.reason.slice(0, 500) : "";
  if (typeof reportedUserId !== "string" || !reportedUserId) {
    throw new functions.https.HttpsError(
        "invalid-argument", "reportedUserId is required.");
  }
  if (reportedUserId === reporterId) {
    throw new functions.https.HttpsError(
        "failed-precondition", "You can't report yourself.");
  }
  if (!REPORT_TYPES.includes(type)) {
    throw new functions.https.HttpsError(
        "invalid-argument", "Invalid report type.");
  }
  await db.collection("user_reports").add({
    reporterId,
    reportedUserId,
    type,
    reason,
    status: "open",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  return {success: true};
});

// Block another user. getPublicProfile hides both profiles from each other.
exports.blockUser = functions.https.onCall(async (data, context) => {
  requireAuth(context);
  const userId = context.auth.uid;
  const targetId = (data && data.userId) || "";
  if (typeof targetId !== "string" || !targetId) {
    throw new functions.https.HttpsError(
        "invalid-argument", "userId is required.");
  }
  if (targetId === userId) {
    throw new functions.https.HttpsError(
        "failed-precondition", "You can't block yourself.");
  }
  await db.collection("users").doc(userId)
      .collection("blocked").doc(targetId)
      .set({createdAt: admin.firestore.FieldValue.serverTimestamp()});
  return {success: true};
});

// Remove a block.
exports.unblockUser = functions.https.onCall(async (data, context) => {
  requireAuth(context);
  const userId = context.auth.uid;
  const targetId = (data && data.userId) || "";
  if (typeof targetId !== "string" || !targetId) {
    throw new functions.https.HttpsError(
        "invalid-argument", "userId is required.");
  }
  await db.collection("users").doc(userId)
      .collection("blocked").doc(targetId).delete();
  return {success: true};
});

// List the users the caller has blocked, with display info for the
// "Blocked users" management screen.
exports.getBlockedUsers = functions.https.onCall(async (data, context) => {
  requireAuth(context);
  const userId = context.auth.uid;
  const snap = await db.collection("users").doc(userId)
      .collection("blocked").get();
  const ids = snap.docs.map((d) => d.id);
  if (ids.length === 0) return {blocked: []};
  const docs = await Promise.all(
      ids.map((id) => db.collection("users").doc(id).get()),
  );
  const blocked = docs.map((d, i) => ({
    id: ids[i],
    username: d.exists ? (d.data().username || null) : null,
    avatarUrl: d.exists ? (d.data().avatarUrl || null) : null,
  }));
  return {blocked};
});
