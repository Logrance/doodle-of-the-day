const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

exports.pickDailyWinner = functions.pubsub.schedule("22 15 * * *")
    .timeZone("Europe/London").onRun(async (context) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);

      const drawingsRef = db.collection("drawings");


      const maxVotesQuery = drawingsRef
          .where("date", ">=", today.getTime())
          .where("date", "<", tomorrow.getTime())
          .orderBy("votes", "desc")
          .limit(1);

      try {
        const maxVotesSnapshot = await maxVotesQuery.get();

        if (!maxVotesSnapshot.empty) {
          const maxVotes = maxVotesSnapshot.docs[0].data().votes;

          const topDrawingsQuery = drawingsRef
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
                image: drawing.data().image,
              };


              await db.collection("winners").add(winnerData);

              console.log("Winner document written with ID:", drawing.id);
              console.log(`Today's winner is: ${drawing.id}`);
            }
          } else {
            console.log("No drawings found for today.");
          }
        } else {
          console.log("No drawings found for today.");
        }
      } catch (error) {
        console.error("Error picking daily winner:", error);
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

