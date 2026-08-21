// =========================================================
// SINE.SHOP — DÉTECTION DE CATÉGORIE + CHAMPS DE VARIANTES
// Extrait de vendeur.html (formulaire de publication) pour être
// réutilisé partout où les mêmes champs doivent apparaître selon le
// type de produit — notamment panier.html (modification des variantes
// d'un article déjà ajouté). Une seule source de vérité : si une
// catégorie est ajoutée/modifiée ici, les deux pages en bénéficient.
// =========================================================
(function() {
    'use strict';

    function detecterTypeCategorie(nomCategorie) {
        const n = (nomCategorie || '').toLowerCase();
        if (n.includes('vêtement') || n.includes('vetement')) return 'vetements';
        if (n.includes('chauss')) return 'chaussures';
        if (n.includes('électro') || n.includes('electro') || n.includes('smartphone') || n.includes('téléphone') || n.includes('telephone') || n.includes('ordinateur') || n.includes('tablette')) return 'electronique';
        if (n.includes('montre')) return 'montres';
        if (n.includes('maison') || n.includes('déco') || n.includes('deco')) return 'maison';
        if (n.includes('sport')) return 'sport';
        if (n.includes('beaut') || n.includes('cosmét') || n.includes('cosmet')) return 'beaute';
        if (n.includes('aliment') || n.includes('nourri') || n.includes('épicerie') || n.includes('epicerie') || n.includes('snack') || n.includes('boisson') || n.includes('glace') || n.includes('panini')) return 'alimentation';
        if (n.includes('auto') || n.includes('voiture') || n.includes('moto')) return 'auto';
        if (n.includes('livre')) return 'livres';
        if (n.includes('jeu') || n.includes('console')) return 'jeux';
        if (n.includes('service') || n.includes('coaching') || n.includes('réparation') || n.includes('reparation')) return 'service';
        if (n.includes('billet') || n.includes('ticket') || n.includes('concert') || n.includes('événement') || n.includes('evenement') || n.includes('spectacle')) return 'billets';
        if (n.includes('électroménager') || n.includes('electromenager')) return 'electromenager';
        return 'autre';
    }

    // Champs spécifiques affichés selon le type de catégorie détecté —
    // stockés dans Product.attributes côté fiche produit (vendeur.html),
    // et dans Cart.items[].selectedAttributes côté panier (panier.html).
    const CATEGORY_FIELDS = {
        vetements: [
            { key: 'taille', label: 'Taille(s) disponible(s)', type: 'select', multi: true, options: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Unique'] },
            { key: 'couleur', label: 'Couleur', type: 'text' },
            { key: 'matiere', label: 'Matière', type: 'text' },
            { key: 'genre', label: 'Genre', type: 'select', options: ['Homme', 'Femme', 'Unisexe', 'Enfant'] },
        ],
        chaussures: [
            { key: 'pointure', label: 'Pointure(s) disponible(s)', type: 'select', multi: true, options: ['36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46'] },
            { key: 'couleur', label: 'Couleur', type: 'text' },
            { key: 'matiere', label: 'Matière', type: 'text' },
            { key: 'genre', label: 'Genre', type: 'select', options: ['Homme', 'Femme', 'Unisexe', 'Enfant'] },
        ],
        electronique: [
            { key: 'modele', label: 'Modèle', type: 'text' },
            { key: 'stockage', label: 'Stockage (Go)', type: 'text' },
            { key: 'etat', label: 'État', type: 'select', options: ['Neuf, scellé', 'Neuf, carton ouvert', 'Comme neuf', 'Bon état', 'État correct'] },
            { key: 'couleur', label: 'Couleur', type: 'text' },
            { key: 'garantie', label: 'Garantie', type: 'text' },
        ],
        montres: [
            { key: 'mouvement', label: 'Mouvement', type: 'select', options: ['Quartz', 'Automatique', 'Mécanique', 'Connectée'] },
            { key: 'matiereBracelet', label: 'Matière du bracelet', type: 'text' },
            { key: 'etat', label: 'État', type: 'select', options: ['Neuf', 'Occasion'] },
        ],
        maison: [
            { key: 'matiere', label: 'Matière', type: 'text' },
            { key: 'dimensionsTexte', label: 'Dimensions', type: 'text' },
            { key: 'couleur', label: 'Couleur', type: 'text' },
        ],
        sport: [
            { key: 'taille', label: 'Taille', type: 'text' },
            { key: 'discipline', label: 'Discipline', type: 'text' },
            { key: 'etat', label: 'État', type: 'select', options: ['Neuf', 'Occasion'] },
        ],
        beaute: [
            { key: 'typePeauCheveux', label: 'Type de peau / cheveux', type: 'text' },
            { key: 'volume', label: 'Volume / Contenance', type: 'text' },
            { key: 'dateExpiration', label: 'Date de péremption', type: 'text' },
        ],
        alimentation: [
            { key: 'poidsNet', label: 'Poids net / Contenance', type: 'text' },
            { key: 'dateExpiration', label: 'Date de péremption', type: 'text' },
            { key: 'conservation', label: 'Conservation', type: 'select', options: ['Ambiant', 'Réfrigéré', 'Congelé'] },
        ],
        auto: [
            { key: 'compatibilite', label: 'Marque / Modèle compatible', type: 'text' },
            { key: 'annee', label: 'Année', type: 'text' },
            { key: 'etat', label: 'État', type: 'select', options: ['Neuf', 'Occasion'] },
        ],
        livres: [
            { key: 'auteur', label: 'Auteur', type: 'text' },
            { key: 'edition', label: 'Édition', type: 'text' },
            { key: 'langue', label: 'Langue', type: 'text' },
            { key: 'etat', label: 'État', type: 'select', options: ['Neuf', 'Occasion'] },
        ],
        jeux: [
            { key: 'plateforme', label: 'Plateforme', type: 'text' },
            { key: 'etat', label: 'État', type: 'select', options: ['Neuf, scellé', 'Occasion'] },
        ],
        service: [
            { key: 'delai', label: 'Durée / Délai', type: 'text' },
            { key: 'zoneCouverture', label: 'Zone de couverture', type: 'text' },
        ],
        billets: [
            { key: 'dateEvenement', label: "Date de l'événement", type: 'text' },
            { key: 'lieu', label: 'Lieu', type: 'text' },
            { key: 'categoriePlace', label: 'Catégorie de place', type: 'text' },
        ],
        electromenager: [
            { key: 'puissance', label: 'Puissance (W)', type: 'text' },
            { key: 'etat', label: 'État', type: 'select', options: ['Neuf', 'Occasion'] },
            { key: 'garantie', label: 'Garantie', type: 'text' },
        ],
        autre: [
            { key: 'couleur', label: 'Couleur', type: 'text' },
            { key: 'etat', label: 'État', type: 'select', options: ['Neuf', 'Occasion'] },
            { key: 'infosSupplementaires', label: 'Informations supplémentaires', type: 'text' },
        ],
    };

    window.SineCategoryFields = { detecterTypeCategorie, CATEGORY_FIELDS };
})();
