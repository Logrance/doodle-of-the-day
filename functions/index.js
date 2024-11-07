const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

exports.pickDailyWinner = functions.pubsub.schedule("30 13 * * *")
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

                console.log(`Winner for room ${roomId} is: ${drawing.id}`);
              }
            }
          } else {
            console.log(`No drawings found for room ${roomId}.`);
          }
        }
      } catch (error) {
        console.error("Error picking daily winners:", error);
      }
    });

// select random word function

exports.selectRandomWord = functions.pubsub.schedule("10 13 * * *")
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

exports.assignRooms = functions.pubsub.schedule("23 13 * * *")
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

      for (let i = 0; i < totalDrawings; i++) {
        const roomId = i % numRooms;
        await db.collection("drawings").doc(drawings.docs[i].id).update({
          roomId: `room-${roomId}`,
        });
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

    const userDrawing = userDrawingSnapshot.docs[0].data();
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

    // Map and return drawing data
    const drawings = roomDrawingsSnapshot.docs.map((doc) =>
      ({id: doc.id, ...doc.data()}));
    return {drawings};
  } catch (error) {
    console.error("Error fetching room drawings:", error);
    throw new functions.https.HttpsError(
        "internal",
        "Unable to fetch room drawings.",
    );
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


exports.fetchLatestWord = functions.https.onCall(async (data, context) => {
  try {
    // Query to get the latest theme word by timestamp
    const themesTodaySnapshot = await db
        .collection("themes_today")
        .orderBy("timestamp", "desc")
        .limit(1)
        .get();

    // Check if there's a document and return the word
    if (!themesTodaySnapshot.empty) {
      const wordDoc = themesTodaySnapshot.docs[0];
      const wordData = wordDoc.data();
      return {word: wordData.word};
    } else {
      throw new functions.https.HttpsError("not-found", "No theme word found.");
    }
  } catch (error) {
    console.error("Error fetching word:", error);
    throw new functions.https.HttpsError(
        "unknown",
        "Failed to fetch theme word.",
    );
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
