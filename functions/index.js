const functions = require("firebase-functions");
const admin = require("firebase-admin");
const https = require("https");

admin.initializeApp();
const db = admin.firestore();

/**
 * Send push notifications via Expo's push API.
 * @param {Array<{to: string, title: string, body: string}>} messages
 */
async function sendExpoPushNotifications(messages) {
  if (!messages.length) return;

  // Expo accepts up to 100 messages per request
  const chunks = [];
  for (let i = 0; i < messages.length; i += 100) {
    chunks.push(messages.slice(i, i + 100));
  }

  for (const chunk of chunks) {
    const payload = JSON.stringify(chunk);
    await new Promise((resolve, reject) => {
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
            res.resume();
            res.on("end", resolve);
          },
      );
      req.on("error", reject);
      req.write(payload);
      req.end();
    });
  }
}

exports.pickDailyWinner = functions.pubsub.schedule("00 20 * * *")
    .timeZone("Europe/London").onRun(async (context) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);

      const drawingsRef = db.collection("drawings");

      try {
        // Query to get distinct roomIds for today
        const roomQuery = drawingsRef
            .where("date", ">=", today.getTime())
            .where("date", "<", tomorrow.getTime())
            .select("roomId");

        const roomSnapshot = await roomQuery.get();
        if (roomSnapshot.empty) {
          console.log("No rooms found for today.");
          return;
        }

        // Extract unique roomIds
        const roomIds = new Set();
        roomSnapshot.forEach((doc) => {
          roomIds.add(doc.data().roomId);
        });

        // Collect winner userIds for push notifications
        const winnerUserIds = new Set();

        // Iterate through each roomId and select the winner
        for (const roomId of roomIds) {
          console.log(`Selecting winner for room: ${roomId}`);

          // Get the drawing with the maximum votes in the room
          const maxVotesQuery = drawingsRef
              .where("roomId", "==", roomId)
              .where("date", ">=", today.getTime())
              .where("date", "<", tomorrow.getTime())
              .orderBy("votes", "desc")
              .limit(1);

          const maxVotesSnapshot = await maxVotesQuery.get();

          if (!maxVotesSnapshot.empty) {
            const maxVotes = maxVotesSnapshot.docs[0].data().votes;

            // Query all drawings with the maximum votes in the room
            const topDrawingsQuery = drawingsRef
                .where("roomId", "==", roomId)
                .where("date", ">=", today.getTime())
                .where("date", "<", tomorrow.getTime())
                .where("votes", "==", maxVotes);

            const topDrawingsSnapshot = await topDrawingsQuery.get();

            if (!topDrawingsSnapshot.empty) {
              const drawingsWithMaxVotes = topDrawingsSnapshot.docs;

              for (const drawing of drawingsWithMaxVotes) {
                const winnerData = {
                  id: drawing.id,
                  votes: drawing.data().votes,
                  userId: drawing.data().userId,
                  roomId: roomId,
                  image: drawing.data().image,
                  date: admin.firestore.Timestamp.fromDate(new Date()),
                };

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
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const startOfDay = today.getTime();
        const endOfDay = startOfDay + 24 * 60 * 60 * 1000;

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
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const drawings = await db.collection("drawings")
          .where("date", ">=", today.getTime())
          .where("date", "<", today.getTime() + (24 * 60 * 60 * 1000))
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

  // Get the provided date or default to today
  const today = new Date(data.date || Date.now());
  today.setHours(0, 0, 0, 0);
  const startOfDay = today.getTime();
  const endOfDay = startOfDay + 24 * 60 * 60 * 1000;

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

    // Map other drawings, then append the user's own with an isYou flag.
    const drawings = roomDrawingsSnapshot.docs.map((doc) =>
      ({id: doc.id, ...doc.data(), isYou: false}));
    drawings.push({id: userDrawingDoc.id, ...userDrawing, isYou: true});
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
  const today = new Date(data.date || Date.now());
  today.setHours(0, 0, 0, 0);
  const startOfDay = today.getTime();
  const endOfDay = startOfDay + 24 * 60 * 60 * 1000;

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

    const drawings = roomSnap.docs.map((d) => {
      const dData = d.data();
      return {
        id: d.id,
        image: dData.image,
        votes: dData.votes || 0,
        isYou: dData.userId === userId,
        reactions: dData.reactions || {},
        userReactions: userReactionsMap[d.id] || [],
      };
    });

    const winnerUserId = roomSnap.docs[0].data().userId;
    const winnerUserDoc = await db.collection("users")
        .doc(winnerUserId).get();
    const winnerUsername = winnerUserDoc.exists ?
        winnerUserDoc.data().username : "Anonymous";

    return {
      hasDrawing: true,
      roomAssigned: true,
      totalInRoom: drawings.length,
      drawings,
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
  if (!context.auth) {
    throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be signed in.",
    );
  }

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
  // Check if the request is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated to flag content.",
    );
  }

  const {drawingId, image} = data;
  const flaggedBy = context.auth.uid;

  // Validate the data
  if (!drawingId || !image) {
    throw new functions.https.HttpsError(
        "invalid-argument",
        "The function must be called with a drawingId and image.",
    );
  }

  try {
    // Create a reference for a new document in the 'flags' collection
    const flagRef = db.collection("flags").doc();

    // Set the document data
    await flagRef.set({
      drawingId,
      image,
      flaggedBy,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {message: "Drawing has been flagged for review."};
  } catch (error) {
    console.error("Error flagging drawing:", error);
    throw new functions.https.HttpsError(
        "internal",
        "Failed to flag drawing. Please try again later.",
    );
  }
});

exports.handleVote = functions.https.onCall(async (data, context) => {
  const {userId} = data;
  const currentUser = context.auth.uid;

  if (!currentUser) {
    throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated.",
    );
  }

  try {
    // Date key for today's vote record
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dateKey = today.toISOString().split("T")[0];

    // Reference to the user's vote for today
    const voteRef = db.collection("user_votes")
        .doc(`${currentUser}_${dateKey}`);
    const voteDoc = await voteRef.get();

    // Check if the user has already voted today
    if (voteDoc.exists) {
      throw new functions.https.HttpsError(
          "already-exists",
          "User has already voted today.");
    }

    // Proceed to cast the vote
    const drawingRef = db.collection("drawings").doc(userId);
    await db.runTransaction(async (transaction) => {
      const drawingDoc = await transaction.get(drawingRef);

      if (!drawingDoc.exists) {
        throw new functions.https.HttpsError(
            "not-found",
            "Drawing does not exist.");
      }

      if (drawingDoc.data().userId === currentUser) {
        throw new functions.https.HttpsError(
            "permission-denied",
            "You can't vote for your own drawing.",
        );
      }

      // Increment the vote count for the drawing
      transaction.update(drawingRef,
          {votes: admin.firestore.FieldValue.increment(1)});

      // Store the vote in 'user_votes' collection
      transaction.set(voteRef, {
        userId: currentUser,
        drawingId: userId,
        voteDate: admin.firestore.Timestamp.fromDate(today),
      });
    });

    return {message: "Vote successfully cast!"};
  } catch (error) {
    console.error("Error casting vote:", error);
    throw new functions.https.HttpsError(
        "unknown",
        "Already voted");
  }
});

exports.createUserDocument = functions.https.onCall(async (data, context) => {
  const {username, email, userId} = data;

  if (!context.auth) {
    throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated.",
    );
  }

  try {
    await db.collection("users").doc(userId).set({
      username,
      email,
      userId,
      winCount: 0,
      hasSeenTutorial: false,
      isVerified: false,
    });
    return {success: true};
  } catch (error) {
    throw new functions.https.HttpsError(
        "internal",
        "Failed to create user document.",
    );
  }
});

exports.addImageToDB = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated to submit a drawing.",
    );
  }

  const {imageBase64} = data;
  const userId = context.auth.uid;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startOfDay = today.getTime();
  const endOfDay = startOfDay + 24 * 60 * 60 * 1000;

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


    const startOfDayTwo = admin.firestore.Timestamp.fromDate(
        new Date(new Date().setUTCHours(-1, 0, 0, 0)));

    const endOfDayTwo = admin.firestore.Timestamp.fromDate(
        new Date(new Date().setUTCHours(23, 59, 59, 999)));

    // Fetch the theme of the day
    const themeQuery = await db
        .collection("themes_today")
        .where("timestamp", ">=", startOfDayTwo)
        .where("timestamp", "<", endOfDayTwo)
        .limit(1)
        .get();

    let theme = "No theme available";
    if (!themeQuery.empty) {
      const themeDoc = themeQuery.docs[0].data();
      theme = themeDoc.word; // Assuming 'word' is the field storing the theme
    }

    await db.collection("drawings").add({
      title: "Captured Image",
      done: false,
      image: imageBase64,
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
      const todayStr = new Date().toISOString().split("T")[0];
      const lastSubmission = userData.lastSubmissionDate;

      const paletteWasAvailable = userData.paletteAvailable || false;

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
      let consecutive = false;
      if (lastSubmission) {
        const diffDays = Math.round(
            (new Date(todayStr) - new Date(lastSubmission)) /
            (1000 * 60 * 60 * 24),
        );
        if (diffDays === 1) {
          newStreak = (userData.currentStreak || 0) + 1;
          consecutive = true;
        } else if (diffDays === 2 && freezesAvailable > 0) {
          newStreak = (userData.currentStreak || 0) + 1;
          consecutive = true;
          usedFreeze = true;
          freezesAvailable -= 1;
        }
      }

      // Palette unlocks the day after hitting a streak multiple of 3.
      // Using it (submitting while it was available) consumes it.
      // Breaking the streak forfeits any pending unlock.
      let newPaletteAvailable = false;
      let newPaletteUnlockedOn = null;
      if (consecutive) {
        if (newStreak % 3 === 0) {
          newPaletteAvailable = true; // Unlocked, gated to next day by date
          newPaletteUnlockedOn = todayStr;
        } else if (paletteWasAvailable) {
          newPaletteAvailable = false; // Consumed today
          newPaletteUnlockedOn = null;
        }
      }

      await userRef.update({
        currentStreak: newStreak,
        longestStreak: Math.max(newStreak, userData.longestStreak || 0),
        lastSubmissionDate: todayStr,
        paletteAvailable: newPaletteAvailable,
        paletteUnlockedOn: newPaletteUnlockedOn,
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

exports.deleteUserAccount = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated.",
    );
  }

  const uid = context.auth.uid;

  try {
    const batch = db.batch();
    const winnersQuerySnapshot = await db.collection("winners")
        .where("userId", "==", uid).get();
    winnersQuerySnapshot.forEach((doc) => batch.delete(doc.ref));
    const drawingsQuerySnapshot = await db.collection("drawings")
        .where("userId", "==", uid).get();
    drawingsQuerySnapshot.forEach((doc) => batch.delete(doc.ref));
    const votesQuerySnapshot = await db.collection("user_votes")
        .where("userId", "==", uid).get();
    votesQuerySnapshot.forEach((doc) => batch.delete(doc.ref));
    const flagsQuerySnapshot = await db.collection("flags")
        .where("flaggedBy", "==", uid).get();
    flagsQuerySnapshot.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    // Delete user from Firestore
    await admin.firestore().collection("users").doc(uid).delete();
    // Delete user from Authentication
    await admin.auth().deleteUser(uid);

    return {message: "Account deleted successfully"};
  } catch (error) {
    throw new functions.https.HttpsError(
        "internal",
        "Error deleting account: " + error.message);
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
      const allUsersSnapshot = await db
          .collection("users")
          .orderBy("winCount", "desc")
          .get();

      const allUsers = allUsersSnapshot.docs.map((doc) => doc.id);
      currentUserRank = allUsers.indexOf(currentUserId) + 1;

      const currentUserDoc = allUsersSnapshot.docs.find(
          (doc) => doc.id === currentUserId,
      );
      if (currentUserDoc) {
        currentUserData = {
          id: currentUserDoc.id,
          username: currentUserDoc.data().username,
          winCount: currentUserDoc.data().winCount,
        };
      }
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
    }));
    let currentUserRank = null;
    let currentUserData = null;
    if (!leaderboard.find((u) => u.id === currentUserId)) {
      const all = await db.collection("users")
          .orderBy("winCount", "desc")
          .get();
      const ids = all.docs.map((d) => d.id);
      currentUserRank = ids.indexOf(currentUserId) + 1;
      const me = all.docs.find((d) => d.id === currentUserId);
      if (me) {
        currentUserData = {
          id: me.id,
          username: me.data().username,
          winCount: me.data().winCount,
        };
      }
    }
    return {leaderboard, currentUserRank, currentUserData};
  }

  const now = new Date();
  const start = new Date(now);
  if (range === "week") start.setDate(now.getDate() - 7);
  else start.setDate(now.getDate() - 30);
  start.setHours(0, 0, 0, 0);

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

exports.fetchUserDrawings = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated",
    );
  }

  const userId = context.auth.uid;

  try {
    const first = admin.firestore()
        .collection("drawings")
        .where("userId", "==", userId)
        .orderBy("date", "desc")
        .limit(5);

    const querySnapshot = await first.get();

    if (querySnapshot.empty) {
      return {drawings: []};
    }

    const lastDoc = querySnapshot.docs[querySnapshot.docs.length -1];

    // Map over the documents and return their data
    const drawings = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return {
      drawings,
      lastDoc: lastDoc ? lastDoc.id : null,
    };
  } catch (error) {
    throw new functions.https.HttpsError(
        "unknown",
        "Failed to fetch user drawings", error);
  }
});

exports.fetchNextUserDrawings = functions.https.onCall(
    async (data, context) => {
      if (!context.auth) {
        throw new functions.https.HttpsError(
            "unauthenticated",
            "User must be authenticated",
        );
      }

      const userId = context.auth.uid;
      const lastDocId = data.lastDoc;
      const lastDocSnapshot = await admin.firestore()
          .collection("drawings")
          .doc(lastDocId)
          .get();

      try {
        const nextQuery = admin.firestore()
            .collection("drawings")
            .where("userId", "==", userId)
            .orderBy("date", "desc")
            .startAfter(lastDocSnapshot)
            .limit(5);

        if (querySnapshotNext.empty) {
          return {drawings: [], lastDoc: null};
        }


        const querySnapshotNext = await nextQuery.get();

        const newDrawings = nextQuery.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        return {
          drawings: newDrawings,
          lastDoc: querySnapshotNext.docs[querySnapshotNext.docs.length -1]};
      } catch (error) {
        throw new functions.https.HttpsError(
            "unknown",
            "Failed to fetch user drawings", error);
      }
    });

exports.getPresence = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated.",
    );
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startOfDay = today.getTime();
  const endOfDay = startOfDay + 24 * 60 * 60 * 1000;

  try {
    const drawCount = await db.collection("drawings")
        .where("date", ">=", startOfDay)
        .where("date", "<", endOfDay)
        .count().get();

    const voteCount = await db.collection("user_votes")
        .where("voteDate", "==", admin.firestore.Timestamp.fromDate(today))
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
    const todayStr = new Date().toISOString().split("T")[0];
    const unlockedOn = userData.paletteUnlockedOn || null;
    const paletteAvailable = (userData.paletteAvailable || false) &&
        unlockedOn !== todayStr;
    return {
      currentStreak: userData.currentStreak || 0,
      longestStreak: userData.longestStreak || 0,
      winCount: userData.winCount || 0,
      paletteAvailable,
      freezesAvailable: userData.freezesAvailable || 0,
    };
  } catch (error) {
    throw new functions.https.HttpsError(
        "internal",
        "Failed to fetch user stats.", error);
  }
});
