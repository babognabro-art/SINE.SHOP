// fix-user-names.js
// ⚠️ À exécuter une seule fois pour corriger les noms des utilisateurs Firebase

const mongoose = require('mongoose');
const User = require('./models/User'); // ← Adapter le chemin selon ta structure

// ⚠️ Mets ta vraie chaîne de connexion MongoDB
const MONGODB_URI = 'mongodb://localhost:27017/sineshop'; // ← À MODIFIER

async function fixUserNames() {
    try {
        // Connexion à MongoDB
        await mongoose.connect(MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('✅ Connecté à MongoDB');

        // Trouve tous les utilisateurs avec le nom générique
        const users = await User.find({
            firstName: "Utilisateur",
            lastName: ".",
            firebaseUid: { $exists: true } // Seulement les comptes Google/Facebook
        });

        console.log(`📊 ${users.length} utilisateurs à corriger...`);

        let count = 0;
        for (const user of users) {
            // Extrait le nom depuis l'email
            const emailParts = user.email.split('@')[0];
            if (emailParts) {
                // Sépare par . _ ou -
                const nameParts = emailParts.split(/[._-]/);
                
                // Capitalise la première lettre
                const firstName = nameParts[0] || 'Utilisateur';
                const lastName = nameParts.slice(1).join(' ') || '';
                
                // Met à jour l'utilisateur
                user.firstName = firstName.charAt(0).toUpperCase() + firstName.slice(1);
                user.lastName = lastName ? lastName.charAt(0).toUpperCase() + lastName.slice(1) : '';
                
                await user.save();
                count++;
                console.log(`✅ ${count}. ${user.email} → ${user.firstName} ${user.lastName}`);
            }
        }

        console.log(`\n✅ ${count} utilisateurs mis à jour avec succès !`);
        process.exit(0);

    } catch (error) {
        console.error('❌ Erreur:', error);
        process.exit(1);
    }
}

// Exécute le script
fixUserNames();