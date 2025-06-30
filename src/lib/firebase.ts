import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// TODO: Replace the following with your app's Firebase project configuration
// See: https://firebase.google.com/docs/web/learn-more#config-object
const firebaseConfig = {
  apiKey: "AIzaSyDfMpLH9Pvg6g-nnd307AH5wxpXBDeWbZs",
  authDomain: "stokprodukharian.firebaseapp.com",
  projectId: "stokprodukharian",
  storageBucket: "stokprodukharian.appspot.com",
  messagingSenderId: "580169268436",
  appId: "1:580169268436:web:bfbd3f7e01c0b4a9e6cf41"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };