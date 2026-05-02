import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage"; // <--- Import this

const firebaseConfig = {
  // ... your existing config keys ...
  apiKey: "AIzaSyC2cimY00PUrpR3hDgpxTdnLLPMnbBicb4",
  authDomain: "anti-drawing.firebaseapp.com",
  databaseURL: "https://anti-drawing-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "anti-drawing",
  storageBucket: "anti-drawing.firebasestorage.app",
  messagingSenderId: "54882143792",
  appId: "1:54882143792:web:fdd91310b8e151805f27f5",
  measurementId: "G-PP92J3C69J"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const storage = getStorage(app); // <--- Export this