import { initializeApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import { getFirestore }from "firebase/firestore";
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  API KEY
  authDomain: "doodle-of-the-day-a7278.firebaseapp.com",
  projectId: "doodle-of-the-day-a7278",
  storageBucket: "doodle-of-the-day-a7278.appspot.com",
  messagingSenderId: "844780326712",
  appId: "1:844780326712:web:08655971e1821c7ee2bbcd"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

//const auth = getAuth(app);

const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});

const db = getFirestore(app);


export { auth, db };
