import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

// PASTE YOUR CONFIG OBJECT HERE (From Firebase Console)
const firebaseConfig = {
  apiKey: "AIzaSyC2cimY00PUrpR3hDgpxTdnLLPMnbBicb4",
  authDomain: "anti-drawing.firebaseapp.com",
  databaseURL: "https://anti-drawing-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "anti-drawing",
  storageBucket: "anti-drawing.firebasestorage.app",
  messagingSenderId: "54882143792",
  appId: "1:54882143792:web:fdd91310b8e151805f27f5",
  measurementId: "G-PP92J3C69J"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);