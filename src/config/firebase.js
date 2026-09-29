import { initializeApp, getApps } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyDummyKeyForNuqootProBuild2024Safe",
  authDomain: "nuqootpro-free.firebaseapp.com",
  projectId: "nuqootpro-free",
  storageBucket: "nuqootpro-free.appspot.com",
  messagingSenderId: "100000000000",
  appId: "1:100000000000:web:abcdef1234567890"
};

let app;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

export const db = getFirestore(app);
export default app;