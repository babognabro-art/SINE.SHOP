# SINE.SHOP Backend

API REST pour la plateforme e-commerce multi-rôles.

## Installation
```bash
npm install
cp .env.example .env   # Remplir les variables
npm run dev

# SINE.SHOP Backend

API REST complète pour la plateforme e-commerce multi-rôles (client, vendeur, livreur, admin).  
Construite avec Node.js, Express, MongoDB, Socket.IO et intégrations externes (Cloudinary, Stripe, Twilio, Firebase).

## Fonctionnalités
- Authentification (JWT, réinitialisation de mot de passe, vérification email)
- Gestion des rôles (Client, Vendeur, Livreur, Admin)
- CRUD produits, catégories, collections
- Panier, commandes, paiements (Stripe)
- Réservations, favoris, avis
- Messagerie en temps réel (chat)
- Notifications in-app et push
- Assistant IA (recommandations)
- Statistiques et dashboards

## Installation

```bash
git clone <repo>
cd backend
npm install
cp .env.example .env   # Remplir les variables
npm run dev