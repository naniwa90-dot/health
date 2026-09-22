import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';
import { getDatabase } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js';

const firebaseConfig = {
  apiKey: 'AIzaSyCJAIrZjJ6nt1tfdGmov2eTl-grlj_sojM',
  authDomain: 'heath-37315.firebaseapp.com',
  databaseURL: 'https://heath-37315-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: 'heath-37315',
  storageBucket: 'heath-37315.firebasestorage.app',
  messagingSenderId: '924162183473',
  appId: '1:924162183473:web:ccbe2a6662f56dad656010',
  measurementId: 'G-NZL6WG45WC'
};

const app = initializeApp(firebaseConfig);

export const db = getDatabase(app);
