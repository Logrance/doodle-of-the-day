const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

exports.pickDailyWinner = functions.pubsub.schedule("47 23 * * *")
    .timeZone("Europe/London").onRun(async (context) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);

      const drawingsRef = db.collection("drawings");


      const query = drawingsRef
          .where("date", ">=", today.getTime())
          .where("date", "<", tomorrow.getTime())
          .orderBy("votes", "desc")
          .limit(1);

      try {
        const snapshot = await query.get();

        if (!snapshot.empty) {
          const winner = snapshot.docs[0];
          const winnerData = {
            id: winner.id,
            votes: winner.data().votes,
            userId: winner.data().userId,
            image: winner.data().image,
          };

          // Save the winner's data to the "winners" collection
          await db.collection("winners").add(winnerData);

          console.log("Winner document written with ID:", winner.id);
          console.log(`Today's winner is: ${winner.id}`);
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

