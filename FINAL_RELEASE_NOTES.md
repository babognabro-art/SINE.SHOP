# SINE.SHOP — version de travail finale

Cette archive contient le projet frontend + backend sans les secrets de production.

## Sécurité des secrets
- Le vrai `backend/.env` n'est pas inclus.
- Le vrai compte de service Firebase n'est pas inclus.
- Utiliser `backend/.env.example` pour renseigner les variables sur la machine/plateforme de déploiement.
- `backend/config/firebase/index.js` accepte soit le fichier de service ignoré, soit les variables `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL` et `FIREBASE_PRIVATE_KEY`.

## Authentification
- Connexion email + mot de passe conservée.
- Connexion par numéro de téléphone avec normalisation des formats (+225, 225, espaces, parenthèses, etc.).
- Le flux Google/Firebase relie un compte SINE.SHOP existant par email au lieu de créer un doublon.
- Les codes de vérification/réinitialisation expirent au plus tard après 5 minutes.

## Avis sur l'application
- Une note de 1 à 5 est obligatoire.
- Le commentaire est facultatif.
- Une seule évaluation d'application est enregistrée par compte.
- Après enregistrement, l'invite ne revient plus, y compris après changement d'appareil, car l'état est vérifié côté backend.
- L'administration dispose des routes pour consulter et masquer/réafficher les avis.

## Installation backend
```text
cd backend
npm install
npm start
```

Ne jamais copier les vraies clés dans le dépôt public.
