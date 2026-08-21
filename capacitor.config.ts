import type { CapacitorConfig } from '@capacitor/cli';

// appId — CONFIRMÉ PAR L'UTILISATEUR : com.sineshop.app (Option B).
// C'est l'identifiant PERMANENT de l'application sur Google Play et
// l'App Store — ne plus le changer après publication.
//
// ⚠️ Conséquence directe de ce choix (déjà signalée avant confirmation,
// rappelée ici pour mémoire) : ce nouvel identifiant NE CORRESPOND PAS à
// celui déjà enregistré dans GoogleService-Info.plist ("sine.home.company",
// resté à la racine du projet). Ce fichier doit être remplacé avant la
// première synchronisation Capacitor — voir marche à suivre juste après
// ce bloc de configuration.
const config: CapacitorConfig = {
  appId: 'com.sineshop.app',
  appName: 'SINE.SHOP',

  // Le frontend existant (html/, css/, js/, images/, index.html) reste
  // exactement où il est — Capacitor l'utilise directement comme contenu
  // de l'application, aucun fichier déplacé.
  webDir: 'frontend',

  server: {
    // Utilise https (au lieu du http par défaut) pour l'origine interne du
    // WebView Android — nécessaire pour que les API web qui exigent un
    // contexte sécurisé (géolocalisation, service worker déjà présent
    // dans frontend/sw.js...) fonctionnent normalement dans l'application.
    androidScheme: 'https',
  },
};

export default config;
