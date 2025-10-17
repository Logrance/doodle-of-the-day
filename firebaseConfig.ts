import { initializeApp } from "firebase/app";
import { initializeAuth } from "firebase/auth";
import { getReactNativePersistence } from "firebase/auth/react-native";
import { getFirestore }from "firebase/firestore";
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { getFunctions, httpsCallable } from "firebase/functions";

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

//const auth = getAuth(app);

const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});

const db = getFirestore(app);
const functions = getFunctions(app);
const getCallableFunction = (name: string) => httpsCallable(functions, name);

export { auth, db, functions, getCallableFunction };
