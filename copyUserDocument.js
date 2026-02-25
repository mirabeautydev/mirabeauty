// Script to copy user document to new ID with updated email and uid
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
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

// ========== CONFIGURATION ==========
// Replace these values with your actual data:

const OLD_DOCUMENT_ID = 'KZzBDRdm9RRafO3sBNssNp4KNay2';  // The current document ID
const NEW_DOCUMENT_ID = 'vooWszbhETR2S9sOXYLkyJizA3q2';              // The new UID from Firebase Auth
const NEW_EMAIL = 'miradarras@icloud.com';                 // The new email

// ===================================

async function copyUserDocument() {
  try {
    console.log('\n' + '='.repeat(70));
    console.log('USER DOCUMENT COPY TOOL');
    console.log('='.repeat(70));
    
    // Validate inputs
    if (NEW_DOCUMENT_ID === 'YOUR_NEW_UID_HERE') {
      console.log('\n❌ ERROR: Please edit the script and set:');
      console.log('   - NEW_DOCUMENT_ID (line 18)');
      console.log('   - NEW_EMAIL (line 19)');
      console.log('\nThen run the script again.');
      return;
    }
    
    // Step 1: Read the old document
    console.log('\n📖 Step 1: Reading old document...');
    console.log(`   Path: users/${OLD_DOCUMENT_ID}`);
    
    const oldDocRef = doc(db, 'users', OLD_DOCUMENT_ID);
    const oldDocSnap = await getDoc(oldDocRef);
    
    if (!oldDocSnap.exists()) {
      console.log(`\n❌ ERROR: Document not found at users/${OLD_DOCUMENT_ID}`);
      return;
    }
    
    const oldData = oldDocSnap.data();
    console.log('✅ Old document found!');
    console.log(`   Current email: ${oldData.email}`);
    console.log(`   Current uid: ${oldData.uid}`);
    console.log(`   Role: ${oldData.role}`);
    console.log(`   Name: ${oldData.name}`);
    
    // Step 2: Check if new document already exists
    console.log('\n🔍 Step 2: Checking if new document exists...');
    const newDocRef = doc(db, 'users', NEW_DOCUMENT_ID);
    const newDocSnap = await getDoc(newDocRef);
    
    if (newDocSnap.exists()) {
      console.log(`\n⚠️  WARNING: Document already exists at users/${NEW_DOCUMENT_ID}`);
      console.log('   It will be OVERWRITTEN. Press Ctrl+C to cancel or wait 5 seconds...');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    // Step 3: Create new document with updated fields
    console.log('\n📝 Step 3: Creating new document...');
    console.log(`   New path: users/${NEW_DOCUMENT_ID}`);
    
    const newData = {
      ...oldData,              // Copy all fields from old document
      uid: NEW_DOCUMENT_ID,    // Update uid to match new document ID
      email: NEW_EMAIL,        // Update email
    };
    
    await setDoc(newDocRef, newData);
    
    console.log('✅ New document created successfully!');
    
    // Step 4: Summary
    console.log('\n' + '='.repeat(70));
    console.log('✅ COPY COMPLETED!');
    console.log('='.repeat(70));
    console.log('\n📊 Summary:');
    console.log(`   Old document: users/${OLD_DOCUMENT_ID}`);
    console.log(`   New document: users/${NEW_DOCUMENT_ID}`);
    console.log(`   Old email:    ${oldData.email}`);
    console.log(`   New email:    ${NEW_EMAIL}`);
    console.log(`   Old uid:      ${oldData.uid}`);
    console.log(`   New uid:      ${NEW_DOCUMENT_ID}`);
    console.log('\n✅ You can now login with:');
    console.log(`   Email:    ${NEW_EMAIL}`);
    console.log(`   Password: (the one you set in Firebase Auth)`);
    console.log('\n💡 Note: The old document still exists. You can delete it manually');
    console.log('   from Firebase Console if you no longer need it.');
    console.log('='.repeat(70) + '\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
  }
}

copyUserDocument()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
