const admin = require('firebase-admin');

let firebaseApp = null;
let firebaseEnabled = false;
let firebaseConfig = {
  projectId: process.env.FIREBASE_PROJECT_ID || '',
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL || '',
  privateKey: process.env.FIREBASE_PRIVATE_KEY || '',
};

// Vérifier les credentials
if (firebaseConfig.projectId && firebaseConfig.clientEmail && firebaseConfig.privateKey) {
  try {
    const privateKey = firebaseConfig.privateKey.replace(/\\n/g, '\n');
    
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: firebaseConfig.projectId,
        clientEmail: firebaseConfig.clientEmail,
        privateKey: privateKey,
      }),
    });
    
    firebaseEnabled = true;
    console.log('✅ Firebase service initialized successfully');
  } catch (error) {
    console.log('⚠️  Firebase service initialization error:', error.message);
    firebaseEnabled = false;
  }
} else {
  console.log('⚠️  Firebase service disabled (no credentials)');
}

const sendPushNotification = async (deviceToken, title, body, data = {}) => {
  if (!firebaseEnabled || !firebaseApp) {
    console.log(`📱 [MOCK] Push notification to: ${deviceToken}`);
    console.log(`📱 [MOCK] Title: ${title}, Body: ${body}`);
    return {
      success: true,
      mock: true,
      messageId: `mock_${Date.now()}`,
    };
  }

  try {
    const message = {
      notification: {
        title: title,
        body: body,
      },
      data: Object.keys(data).reduce((acc, key) => {
        acc[key] = String(data[key]);
        return acc;
      }, {}),
      token: deviceToken,
    };

    const response = await admin.messaging().send(message);
    console.log(`📱 Push notification sent: ${response}`);
    return response;
  } catch (error) {
    console.error('❌ Push notification error:', error.message);
    throw error;
  }
};

const sendMulticastPush = async (deviceTokens, title, body, data = {}) => {
  if (!firebaseEnabled || !firebaseApp) {
    console.log(`📱 [MOCK] Multicast push to ${deviceTokens.length} devices`);
    return {
      success: true,
      mock: true,
      messageId: `mock_${Date.now()}`,
    };
  }

  try {
    const message = {
      notification: {
        title: title,
        body: body,
      },
      data: Object.keys(data).reduce((acc, key) => {
        acc[key] = String(data[key]);
        return acc;
      }, {}),
      tokens: deviceTokens,
    };

    const response = await admin.messaging().sendEachForMulticast(message);
    console.log(`📱 Multicast push sent: ${response.successCount} successes, ${response.failureCount} failures`);
    return response;
  } catch (error) {
    console.error('❌ Multicast push error:', error.message);
    throw error;
  }
};

// Vérifie un idToken Firebase (envoyé par le frontend après une connexion
// Google/Facebook réussie côté client) et renvoie les infos de l'utilisateur
// Firebase vérifiées — email, nom, photo, fournisseur utilisé.
const verifyIdToken = async (idToken) => {
  if (!firebaseEnabled || !firebaseApp) {
    throw new Error('Firebase n\'est pas configuré côté serveur (identifiants manquants dans .env).');
  }
  const decoded = await admin.auth().verifyIdToken(idToken);
  return decoded;
};

module.exports = {
  admin,
  firebaseApp,
  sendPushNotification,
  sendMulticastPush,
  verifyIdToken,
  firebaseEnabled,
  firebaseConfig,
};