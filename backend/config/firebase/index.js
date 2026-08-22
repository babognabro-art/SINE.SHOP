const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Le service account réel reste hors du dépôt/ZIP. En production, les
// identifiants peuvent être fournis soit par le fichier ignoré
// config/firebase/service-account.json, soit par les variables FIREBASE_*.
let serviceAccount = null;
const serviceAccountPath = path.join(__dirname, 'service-account.json');

if (fs.existsSync(serviceAccountPath)) {
  try {
    serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
  } catch (error) {
    console.warn('⚠️ Firebase service-account.json illisible:', error.message);
  }
}

if (!serviceAccount && process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
  serviceAccount = {
    project_id: process.env.FIREBASE_PROJECT_ID,
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  };
}

let firebaseApp = null;
let firebaseEnabled = false;

if (serviceAccount && serviceAccount.project_id && serviceAccount.client_email && serviceAccount.private_key) {
  try {
    firebaseApp = admin.apps.length
      ? admin.app()
      : admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          databaseURL: `https://${serviceAccount.project_id}-default-rtdb.firebaseio.com`,
          storageBucket: `${serviceAccount.project_id}.appspot.com`,
        });
    firebaseEnabled = true;
    console.log(`✅ Firebase initialized: ${serviceAccount.project_id}`);
  } catch (error) {
    console.log('⚠️ Firebase initialization error:', error.message);
  }
} else {
  console.log('⚠️ Firebase service disabled (credentials not provided)');
}

module.exports = {
  admin,
  firebaseApp,
  firebaseEnabled,
  projectId: serviceAccount?.project_id || process.env.FIREBASE_PROJECT_ID || '',
};
