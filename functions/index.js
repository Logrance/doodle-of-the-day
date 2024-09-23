const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

exports.pickDailyWinner = functions.pubsub.schedule("05 23 * * *")
    .timeZone("Europe/London").onRun(async (context) => {
      const drawingsRef = db.collection("drawings");
      const query = drawingsRef.orderBy("votes", "desc").limit(1);

      const snapshot = await query.get();

      if (!snapshot.empty) {
        const winner = snapshot.docs[0];
        const winnerData = {
          id: winner.id,
          votes: winner.data().votes,
          userId: winner.data().userId,
          image: winner.data().image,
        };

        db.collection("winners").add(winnerData)
            .then((docRef) => {
              console.log("Winner document written with ID:", docRef.id);
              console.log(`Today's winner is: ${winner.id}`);
            })
            .catch((error) => {
              console.error("Error adding document:", error);
            });
      }
    });

// select random word function

exports.selectRandomWord = functions.pubsub.schedule("35 23 * * *")
    .timeZone("Europe/London").onRun(async (context) => {
      const themesSnapshot = await db.collection("themes").get();


      if (!themesSnapshot.empty) {
        const themeToday = themesSnapshot.docs[0];

        const themeTodayData = {
          id: themeToday.id,
          word: themeToday.data().theme,
        };


        try {
          const docRef = await db.collection("themes_today")
              .add(themeTodayData);
          console.log("Theme today written with ID:", docRef.id);
          console.log(`Today's winner is: ${themeTodayData.word}`);
        } catch (error) {
          console.error("Error adding document:", error);
        }
      } else {
        console.log("No themes available in the 'themes' collection");
      }

      return null;
    });

