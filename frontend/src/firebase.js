// src/firebase.js

import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBhli34AEfMlZxqtAB4KmkhYeljFWByYDI",
  authDomain: "swift-stack-444307-m4.firebaseapp.com",
  projectId: "swift-stack-444307-m4",
  storageBucket: "swift-stack-444307-m4.firebasestorage.app",
  messagingSenderId: "969177867884",
  appId: "1:969177867884:web:c6455c86faad97cf155a49"
};

// Fix duplicate app issue
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const db = getFirestore(app);
export const auth = getAuth(app);
