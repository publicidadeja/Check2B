// src/lib/firebase.ts
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getFirestore, Firestore, connectFirestoreEmulator } from "firebase/firestore";
import { getAuth, connectAuthEmulator } from "firebase/auth"; // Import Auth and emulator connector

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "demo-api-key", // Provide default dummy values
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "demo-project.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "demo-project",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "demo-project.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "1234567890",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:1234567890:web:demoappid",
};

// Initialize Firebase
let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

const db: Firestore = getFirestore(app);
const auth = getAuth(app); // Initialize Auth

// Connect to Emulators if environment variables are set (indicating local development)
if (process.env.FIRESTORE_EMULATOR_HOST) {
  console.log(`Connecting to Firestore emulator at ${process.env.FIRESTORE_EMULATOR_HOST}`);
  const [host, portString] = process.env.FIRESTORE_EMULATOR_HOST.split(':');
  const port = parseInt(portString, 10);
   if (!isNaN(port)) {
       try {
         // Check if already connected before attempting to connect again
         // This check might be framework/library specific, adjust if needed
         // For firestore v9, direct check isn't straightforward, rely on console logs/errors
         // or potentially a flag if implementing complex connection logic.
         connectFirestoreEmulator(db, host, port);
         console.log("Firestore emulator connected.");
       } catch (error: any) {
          // Check if the error message indicates already connected
         if (error.message.includes("already connected")) {
            console.log("Firestore emulator already connected.");
         } else {
            console.error("Error connecting to Firestore emulator:", error);
         }
       }
   } else {
       console.error(`Invalid FIRESTORE_EMULATOR_HOST port: ${portString}`);
   }

}

// Connect to Auth Emulator if NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN indicates localhost/emulator
if (firebaseConfig.authDomain?.includes("localhost")) {
    const authEmulatorUrl = `http://${firebaseConfig.authDomain}`;
    console.log(`Connecting to Auth emulator at ${authEmulatorUrl}`);
     try {
         connectAuthEmulator(auth, authEmulatorUrl);
         console.log("Auth emulator connected.");
     } catch (error: any) {
        if (error.message.includes("already connected")) {
           console.log("Auth emulator already connected.");
        } else {
           console.error("Error connecting to Auth emulator:", error);
        }
     }
}


export { db, auth, app }; // Export db, auth, and app
