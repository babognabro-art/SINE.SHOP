# ⚠️ Action requise avant la synchronisation iOS — nouvel identifiant d'app

Le fichier `GoogleService-Info.plist` original (renommé
`GoogleService-Info.plist.OBSOLETE-sine.home.company` à côté de ce fichier,
conservé pour référence) a été enregistré dans Firebase sous l'identifiant
`sine.home.company`.

Depuis la confirmation de l'**Option B**, la vraie application utilise
désormais l'identifiant `com.sineshop.app` (voir `capacitor.config.ts`).
Ces deux identifiants ne correspondent plus — le fichier obsolète NE DOIT
PAS être utilisé tel quel pour l'app iOS finale.

## Marche à suivre (à faire par vous-même dans la console Firebase)

1. Ouvrez la [console Firebase](https://console.firebase.google.com/) du
   projet `sineshop-93e07` (même projet que le reste de SINE.SHOP —
   MongoDB/backend restent inchangés, seule l'app iOS enregistrée dedans
   change).
2. Allez dans **Paramètres du projet → Vos applications**.
3. Cliquez sur **Ajouter une application → iOS**.
4. Renseignez le **Bundle ID** : `com.sineshop.app` (doit être identique,
   caractère pour caractère, à `appId` dans `capacitor.config.ts`).
5. Téléchargez le nouveau `GoogleService-Info.plist` généré par Firebase
   à cette étape.
6. Remplacez ce fichier (à la racine du projet, à côté de ce README) par
   le nouveau téléchargé — en gardant exactement le nom
   `GoogleService-Info.plist` (sans suffixe).
7. Une fois `ios/` créé (`npx cap add ios`, plus tard — après Android),
   ce fichier devra être copié dans `ios/App/App/` avant chaque build
   Xcode (Capacitor ne le fait pas automatiquement).

## Et Android ?

Aucun fichier `google-services.json` n'existe encore nulle part dans le
projet — l'app Android n'a encore jamais été enregistrée dans Firebase.
Même démarche que ci-dessus, mais **Ajouter une application → Android**,
avec le même **nom de package** `com.sineshop.app`. Le fichier téléchargé
(`google-services.json`) devra être placé dans `android/app/` une fois ce
dossier créé (`npx cap add android`).

*(Ce README peut être supprimé une fois les deux étapes ci-dessus faites.)*
