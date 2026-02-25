// Script to find users in Firebase Auth but not in Firestore
// NOTE: This requires Firebase Admin SDK to list all auth users
// The client SDK cannot list authentication users

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import * as dotenv from 'dotenv';

dotenv.config();

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
  measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID,
  databaseURL: process.env.VITE_FIREBASE_DATABASE_URL,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

console.log('\n' + '='.repeat(80));
console.log('⚠️  FIREBASE ADMIN SDK REQUIRED');
console.log('='.repeat(80));
console.log('\nThe Firebase Client SDK cannot list all Authentication users.');
console.log('You need the Firebase Admin SDK to access the full user list.');
console.log('\nHere are your options:\n');
console.log('OPTION 1: Use Firebase Console (Easiest)');
console.log('─'.repeat(80));
console.log('1. Go to Firebase Console → Authentication → Users');
console.log('2. Click "Download" button (top right) to export all auth users to CSV');
console.log('3. Go to Firestore Database → users collection');
console.log('4. Compare the UIDs manually or use a spreadsheet\n');

console.log('OPTION 2: Use Firebase Admin SDK (Requires Node.js backend)');
console.log('─'.repeat(80));
console.log('1. Install: npm install firebase-admin');
console.log('2. Download service account key from Firebase Console → Project Settings');
console.log('3. Use the script below\n');

console.log('OPTION 3: Quick Check (Running now...)');
console.log('─'.repeat(80));
console.log('Getting all Firestore UIDs to show what we have...\n');

async function checkFirestoreUsers() {
  try {
    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(usersRef);
    
    const firestoreUIDs = new Set();
    const users = [];
    
    snapshot.forEach((doc) => {
      firestoreUIDs.add(doc.id);
      const data = doc.data();
      users.push({
        docId: doc.id,
        uid: data.uid,
        email: data.email,
        name: data.name,
        role: data.role
      });
    });
    
    console.log(`✅ Found ${firestoreUIDs.size} users in Firestore`);
    console.log('\n' + '─'.repeat(80));
    console.log('CHECKING FOR MISMATCHES IN FIRESTORE');
    console.log('─'.repeat(80));
    
    // Check for mismatches between doc ID and uid field
    let mismatches = 0;
    users.forEach((user) => {
      if (user.docId !== user.uid) {
        mismatches++;
        console.log(`\n❌ MISMATCH #${mismatches}:`);
        console.log(`   Document ID: ${user.docId}`);
        console.log(`   UID field:   ${user.uid || 'NOT SET'}`);
        console.log(`   Email:       ${user.email}`);
        console.log(`   Name:        ${user.name}`);
      }
    });
    
    if (mismatches === 0) {
      console.log('\n✅ All Firestore documents have matching UIDs');
    } else {
      console.log(`\n❌ Found ${mismatches} documents with mismatched UIDs`);
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('📋 SUMMARY');
    console.log('='.repeat(80));
    console.log(`Firebase Auth users:      1314 (as you mentioned)`);
    console.log(`Firestore users:          ${firestoreUIDs.size}`);
    console.log(`Missing from Firestore:   ${1314 - firestoreUIDs.size}`);
    console.log('\nTo find which specific UIDs are missing, use Option 1 or 2 above.');
    console.log('='.repeat(80) + '\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

checkFirestoreUsers()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
