import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-analytics.js";

import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  updateDoc,
  doc,
  deleteDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-storage.js";

import {
  getAuth,
  onAuthStateChanged,
  GoogleAuthProvider,
  FacebookAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js";

// Configuration Firebase - identique pour toutes les plateformes
const firebaseConfig = {
  apiKey: "AIzaSyCWwRhR5aKOFfB9fpzKECXHOL-1p3E2c08",
  authDomain: "auth.sineshophome.com",
  projectId: "sineshop-93e07",
  storageBucket: "sineshop-93e07.firebasestorage.app",
  messagingSenderId: "1019753827763",
  appId: "1:1019753827763:web:06da91079e7e8261260fc6",
  measurementId: "G-2K3K8VXS5S"
};

// ✅ CORRECTIF : Vérifier si Firebase est déjà initialisé
function getFirebaseApp() {
  if (getApps().length === 0) {
    return initializeApp(firebaseConfig);
  }
  return getApp();
}

export const app = getFirebaseApp();
export const analytics = getAnalytics(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);

const googleProvider = new GoogleAuthProvider();
const facebookProvider = new FacebookAuthProvider();

// Les popups Firebase (signInWithPopup) sont notoirement peu fiables sur
// mobile — bloquées par le navigateur, ou cassées dans les navigateurs
// intégrés (webview Facebook/Instagram, certains Safari iOS) : c'est ce
// qui produisait "Sorry, something went wrong" au clic sur Google/Facebook
// depuis un téléphone, alors que ça fonctionnait très bien sur ordinateur
// (où les popups posent rarement problème). Sur mobile, on bascule donc
// sur signInWithRedirect (la page quitte puis revient avec le résultat,
// pas de popup à bloquer) ; sur desktop, le popup reste utilisé (plus
// rapide, ne quitte pas la page).
function estMobile() {
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

// Connexion réelle via popup (desktop) ou redirection (mobile) Firebase —
// renvoie le idToken Firebase à envoyer au backend (voir POST
// /api/auth/firebase), qui le vérifie avec firebase-admin et délivre en
// retour un vrai token de session SINE.SHOP. Sur mobile, cette fonction ne
// renvoie rien directement (la page est quittée) — le résultat est
// récupéré au retour via completeRedirectSignIn().
async function signInWithGoogle() {
  if (estMobile()) {
    await signInWithRedirect(auth, googleProvider);
    return null;
  }
  const result = await signInWithPopup(auth, googleProvider);
  const idToken = await result.user.getIdToken();
  return { idToken, firebaseUser: result.user };
}

async function signInWithFacebook() {
  if (estMobile()) {
    await signInWithRedirect(auth, facebookProvider);
    return null;
  }
  const result = await signInWithPopup(auth, facebookProvider);
  const idToken = await result.user.getIdToken();
  return { idToken, firebaseUser: result.user };
}

// À appeler au chargement de chaque page utilisant la connexion sociale —
// si l'utilisateur revient tout juste d'une redirection Google/Facebook
// (mobile), récupère le résultat ; sinon renvoie null sans rien faire.
async function completeRedirectSignIn() {
  try {
    const result = await getRedirectResult(auth);
    if (!result) return null;
    const idToken = await result.user.getIdToken();
    return { idToken, firebaseUser: result.user };
  } catch (error) {
    console.error('Erreur de finalisation de connexion (redirection):', error);
    return null;
  }
}

// Exposé sur window car les pages login/register utilisent des scripts
// classiques (non-module) — un module ES ne partage pas son scope avec eux.
window.SineFirebaseAuth = { signInWithGoogle, signInWithFacebook, completeRedirectSignIn };