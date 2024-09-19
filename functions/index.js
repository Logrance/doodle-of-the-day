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

