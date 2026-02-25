// ADMIN SDK VERSION - Find users in Firebase Auth but not in Firestore
// SETUP REQUIRED:
// 1. npm install firebase-admin
// 2. Download service account JSON from Firebase Console
// 3. Place it in this directory and name it: serviceAccountKey.json

import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import * as dotenv from 'dotenv';

dotenv.config();

// Try to load service account
let serviceAccount;
try {
  serviceAccount = JSON.parse(readFileSync('./serviceAccountKey.json', 'utf8'));
} catch (error) {
  console.log('\n' + '='.repeat(80));
  console.log('❌ SERVICE ACCOUNT KEY NOT FOUND');
  console.log('='.repeat(80));
  console.log('\nPlease follow these steps:');
  console.log('1. Go to Firebase Console → Project Settings → Service Accounts');
  console.log('2. Click "Generate New Private Key"');
  console.log('3. Save the downloaded JSON file as: serviceAccountKey.json');
  console.log('4. Place it in this directory');
  console.log('5. Run: npm install firebase-admin');
  console.log('6. Run this script again\n');
  process.exit(1);
}

// Initialize Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.VITE_FIREBASE_DATABASE_URL
});

const db = admin.firestore();
const auth = admin.auth();

async function findMissingUsers() {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('🔍 FINDING USERS IN AUTH BUT NOT IN FIRESTORE');
    console.log('='.repeat(80));
    
    // Step 1: Get all Firestore users
    console.log('\n📖 Step 1: Loading Firestore users...');
    const usersSnapshot = await db.collection('users').get();
    const firestoreUIDs = new Set();
    
    usersSnapshot.forEach((doc) => {
      firestoreUIDs.add(doc.id);
    });
    
    console.log(`   ✅ Found ${firestoreUIDs.size} users in Firestore`);
    
    // Step 2: Get all Auth users
    console.log('\n📖 Step 2: Loading Firebase Authentication users...');
    const authUsers = [];
    let nextPageToken;
    
    do {
      const listUsersResult = await auth.listUsers(1000, nextPageToken);
      authUsers.push(...listUsersResult.users);
      nextPageToken = listUsersResult.pageToken;
    } while (nextPageToken);
    
    console.log(`   ✅ Found ${authUsers.length} users in Authentication`);
    
    // Step 3: Find missing users
    console.log('\n🔍 Step 3: Finding missing users...\n');
    const missingUsers = authUsers.filter(user => !firestoreUIDs.has(user.uid));
    
    console.log('='.repeat(80));
    console.log(`FOUND ${missingUsers.length} USERS IN AUTH BUT NOT IN FIRESTORE`);
    console.log('='.repeat(80));
    
    if (missingUsers.length === 0) {
      console.log('\n✅ All authentication users have Firestore documents!\n');
    } else {
      console.log('\n');
      missingUsers.forEach((user, index) => {
        console.log(`${index + 1}. UID: ${user.uid}`);
        console.log(`   Email: ${user.email || 'NO EMAIL'}`);
        console.log(`   Display Name: ${user.displayName || 'NO NAME'}`);
        console.log(`   Created: ${new Date(user.metadata.creationTime).toLocaleDateString()}`);
        console.log(`   Last Login: ${user.metadata.lastSignInTime ? new Date(user.metadata.lastSignInTime).toLocaleDateString() : 'Never'}`);
        console.log(`   Disabled: ${user.disabled ? 'YES' : 'NO'}`);
        console.log('─'.repeat(80));
      });
      
      // Save to file
      const report = missingUsers.map(user => ({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        createdAt: user.metadata.creationTime,
        lastSignIn: user.metadata.lastSignInTime,
        disabled: user.disabled
      }));
      
      const fs = await import('fs');
      fs.writeFileSync('missing-users-report.json', JSON.stringify(report, null, 2));
      console.log('\n📄 Detailed report saved to: missing-users-report.json\n');
    }
    
    // Summary
    console.log('='.repeat(80));
    console.log('📊 SUMMARY');
    console.log('='.repeat(80));
    console.log(`Total Auth Users:         ${authUsers.length}`);
    console.log(`Total Firestore Users:    ${firestoreUIDs.size}`);
    console.log(`Missing from Firestore:   ${missingUsers.length}`);
    console.log('='.repeat(80) + '\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
  }
}

findMissingUsers()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
