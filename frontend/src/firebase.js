// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyBhli34AEfMlZxqtAB4KmkhYeljFWByYDI",
    authDomain: "swift-stack-444307-m4.firebaseapp.com",
    projectId: "swift-stack-444307-m4",
    storageBucket: "swift-stack-444307-m4.firebasestorage.app",
    messagingSenderId: "969177867884",
    appId: "1:969177867884:web:c6455c86faad97cf155a49"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
