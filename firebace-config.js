// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCVmD5nCvSVsKtSWMFlelNFlFHXSv3LSi0",
  authDomain: "interactive-book-37270.firebaseapp.com",
  projectId: "interactive-book-37270",
  storageBucket: "interactive-book-37270.firebasestorage.app",
  messagingSenderId: "350364566140",
  appId: "1:350364566140:web:7997fb848a9b512f6b7ff9",
  measurementId: "G-QM0TNEN9XJ"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);