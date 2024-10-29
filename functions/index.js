const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

exports.pickDailyWinner = functions.pubsub.schedule("15 17 * * *")
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

exports.selectRandomWord = functions.pubsub.schedule("05 00 * * *")
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

exports.assignRooms = functions.pubsub.schedule("00 17 * * *")
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
