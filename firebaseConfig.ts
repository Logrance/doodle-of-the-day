import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyD9ZI_2P-TNvVPFmqEV62szK6zPgiuBOFA",
  authDomain: "doodle-of-the-day-a7278.firebaseapp.com",
  projectId: "doodle-of-the-day-a7278",
  storageBucket: "doodle-of-the-day-a7278.appspot.com",
  messagingSenderId: "844780326712",
  appId: "1:844780326712:web:08655971e1821c7ee2bbcd"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

export { auth };