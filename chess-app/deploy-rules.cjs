const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔥 Deploying Firestore rules...');

try {
  // Check if firebase-tools is installed
  try {
    execSync('npx firebase --version', { stdio: 'ignore' });
    console.log('✅ Firebase CLI already installed');
  } catch (error) {
    console.log('⏳ Installing Firebase CLI...');
    execSync('npm install --save-dev firebase-tools', { stdio: 'inherit' });
  }

  // Create firebase.json if it doesn't exist
  const firebaseJsonPath = path.join(__dirname, 'firebase.json');
  if (!fs.existsSync(firebaseJsonPath)) {
    console.log('⏳ Creating firebase.json...');
    const firebaseConfig = {
      firestore: {
        rules: 'firestore.rules',
        indexes: 'firestore.indexes.json'
      }
    };
    fs.writeFileSync(firebaseJsonPath, JSON.stringify(firebaseConfig, null, 2));
  }

  // Create empty firestore.indexes.json if it doesn't exist
  const indexesPath = path.join(__dirname, 'firestore.indexes.json');
  if (!fs.existsSync(indexesPath)) {
    console.log('⏳ Creating firestore.indexes.json...');
    const indexesConfig = {
      indexes: [
        {
          collectionGroup: 'matchmaking_queue',
          queryScope: 'COLLECTION',
          fields: [
            { fieldPath: 'status', order: 'ASCENDING' },
            { fieldPath: 'userId', order: 'ASCENDING' },
            { fieldPath: '__name__', order: 'ASCENDING' }
          ]
        }
      ],
      fieldOverrides: []
    };
    fs.writeFileSync(indexesPath, JSON.stringify(indexesConfig, null, 2));
  }

  // Deploy the rules
  console.log('⏳ Deploying rules to Firebase...');
  console.log('✅ To deploy the rules, run the following commands:');
  console.log('  npx firebase login');
  console.log('  npx firebase deploy --only firestore:rules,firestore:indexes');
  
  // We can't auto-deploy because the user needs to login first
  // execSync('npx firebase deploy --only firestore:rules,firestore:indexes', { stdio: 'inherit' });

  console.log('✅ Firestore rules and indexes are ready to be deployed!');
} catch (error) {
  console.error('❌ Error preparing Firestore rules:', error.message);
  console.log('You can manually deploy rules by running:');
  console.log('1. npx firebase login');
  console.log('2. npx firebase deploy --only firestore:rules,firestore:indexes');
} 