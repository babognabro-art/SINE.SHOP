/*======================================================
SINE.SHOP - MOTEUR CENTRAL DES PRODUITS v4.0
Réécrit pour être branché sur le vrai backend (window.SineAPI,
voir js/api.js) au lieu d'un schéma de champs en français fictif
et d'une logique "local d'abord, API en best-effort silencieux".
Ce fichier doit être chargé APRÈS js/config.js et js/api.js.
======================================================*/

"use strict";

// =====================================================
// CONFIGURATION GLOBALE
// =====================================================
const CONFIG = {
    VERSION: '4.0',
    COMMISSION_RATE: 0.03,
    MAX_IMAGES: 10,
    MAX_VIDEOS: 3,
    DEVISES: {
        'XOF': { symbole: 'FCFA', taux: 1 },
        'FCFA': { symbole: 'FCFA', taux: 1 },
        'EUR': { symbole: '€', taux: 0.00152 },
        'USD': { symbole: '$', taux: 0.00165 },
        'GBP': { symbole: '£', taux: 0.00132 },
        'CAD': { symbole: 'CA$', taux: 0.00225 },
        'MAD': { symbole: 'MAD', taux: 0.0106 }
    },
    TAUX_DEVISE: {
        'XOF': 1,
        'FCFA': 1,
        'EUR': 0.00152,
        'USD': 0.00165,
        'GBP': 0.00132,
        'CAD': 0.00225,
        'MAD': 0.0106
    }
};

// =====================================================
// CATÉGORIES — pour l'affichage (icônes/emoji) uniquement.
// Les vraies catégories viennent de la base de données
// (voir window.SineAPI.getCategories()) ; ce dictionnaire sert
// juste à associer une icône à un nom de catégorie connu.
// =====================================================
const CATEGORIES = {
    'vetements': { nom: 'Vêtements', emoji: '👕', icon: 'fa-tshirt' },
    'chaussures': { nom: 'Chaussures', emoji: '👟', icon: 'fa-shoe-prints' },
    'montres': { nom: 'Montres', emoji: '⌚', icon: 'fa-clock' },
    'sport': { nom: 'Sport', emoji: '⚽', icon: 'fa-futbol' },
    'sineguy': { nom: 'SINEGUY', emoji: '💎', icon: 'fa-gem' },
    'electronique': { nom: 'Électronique', emoji: '📱', icon: 'fa-mobile-screen' },
    'maison': { nom: 'Maison', emoji: '🏠', icon: 'fa-house' },
    'beaute': { nom: 'Beauté', emoji: '💄', icon: 'fa-spa' },
    'alimentation': { nom: 'Alimentation', emoji: '🍎', icon: 'fa-apple-whole' },
    'service': { nom: 'Service', emoji: '🛠️', icon: 'fa-tools' },
    'auto': { nom: 'Automobile', emoji: '🚗', icon: 'fa-car' },
    'immobilier': { nom: 'Immobilier', emoji: '🏢', icon: 'fa-building' },
    'livres': { nom: 'Livres', emoji: '📚', icon: 'fa-book' },
    'jeux': { nom: 'Jeux & Consoles', emoji: '🎮', icon: 'fa-gamepad' },
    'billets': { nom: 'Billets', emoji: '🎟️', icon: 'fa-ticket' },
    'formation': { nom: 'Formation', emoji: '🎓', icon: 'fa-graduation-cap' },
    'abonnement': { nom: 'Abonnement', emoji: '📋', icon: 'fa-clipboard' }
};

// =====================================================
// REGISTRES (état en mémoire, rafraîchi depuis le backend)
// =====================================================
let produits = [];
let favoris = [];       // tableau d'objets favoris réels (avec .product peuplé)
let panier = null;      // objet cart réel { items, totalPrice, totalItems }
let commandes = [];
let reservations = [];
let utilisateurCourant = null;
let deviseUtilisateur = 'XOF';
let langueUtilisateur = 'fr';

// =====================================================
// API — délègue entièrement à window.SineAPI (js/api.js),
// qui pointe vers le vrai backend. Les noms de méthodes en
// français sont conservés pour ne pas casser les pages qui
// les appellent déjà, mais chaque appel est maintenant réel.
// =====================================================
const API = {
    async getProduits(params = {}) {
        return await window.SineAPI.getProducts(params);
    },
    async getProduit(id) {
        return await window.SineAPI.getProduct(id);
    },
    async createProduit(formData) {
        return await window.SineAPI.createProduct(formData);
    },
    async updateProduit(id, formData) {
        return await window.SineAPI.updateProduct(id, formData);
    },
    async deleteProduit(id) {
        return await window.SineAPI.deleteProduct(id);
    },

    async getCommandes(params = {}) {
        const data = await window.SineAPI.getMyOrders(params);
        return data.orders || [];
    },
    async getCommande(id) {
        return await window.SineAPI.getOrderDetails(id);
    },
    async createCommande(commande) {
        return await window.SineAPI.createOrder(commande);
    },
    async cancelCommande(id) {
        return await window.SineAPI.cancelOrder(id);
    },
    async getTracking(orderId) {
        return await window.SineAPI.trackOrder(orderId);
    },

    async getReservations(params = {}) {
        const data = await window.SineAPI.getMyReservations(params);
        return data.reservations || [];
    },
    async createReservation(reservation) {
        return await window.SineAPI.createReservation(reservation);
    },

    async initiatePayment(data) {
        // data attendu : { orderId, method, currency }
        return await window.SineAPI.createPayment(data.orderId, data.method, data.currency);
    },
    async confirmPayment(paymentIntentId) {
        return await window.SineAPI.confirmPayment(paymentIntentId);
    },
    async getPaymentHistory(params = {}) {
        return await window.SineAPI.getPaymentHistory(params);
    },

    async getFavoris() {
        const data = await window.SineAPI.getFavorites();
        return data.favorites || data || [];
    },
    async toggleFavori(productId) {
        return await window.SineAPI.toggleFavorite(productId);
    },
    async removeFavori(productId) {
        return await window.SineAPI.removeFavorite(productId);
    },

    async getPanier() {
        const data = await window.SineAPI.getCart();
        return data.cart || data;
    },
    async addToCart(productId, quantite = 1, selectedAttributes = {}) {
        return await window.SineAPI.addToCart(productId, quantite, selectedAttributes);
    },
    async updateCartItem(productId, quantite) {
        return await window.SineAPI.updateCartItem(productId, quantite);
    },
    async removeFromCart(productId) {
        return await window.SineAPI.removeFromCart(productId);
    },
    async clearCart() {
        return await window.SineAPI.clearCart();
    },

    async getProfile() {
        return await window.SineAPI.getProfile();
    },
    async updateProfile(data) {
        return await window.SineAPI.updateProfile(data);
    },
    async getCategories() {
        return await window.SineAPI.getCategories();
    }
};

// =====================================================
// DEVISE - FORMATAGE ET CONVERSION
// =====================================================
function getDeviseUtilisateur() {
    const user = JSON.parse(localStorage.getItem('sineUser') || '{}');
    return user.preferredCurrency || 'XOF';
}

function getDeviseSymbole(devise) {
    const symboles = {
        'FCFA': 'FCFA', 'XOF': 'FCFA', 'EUR': '€', 'USD': '$',
        'GBP': '£', 'CAD': 'CA$', 'MAD': 'MAD'
    };
    return symboles[devise] || devise;
}

function convertirDevise(montant, deviseSource, deviseCible) {
    if (deviseSource === deviseCible) return montant;
    const tauxSource = CONFIG.TAUX_DEVISE[deviseSource] || 1;
    const tauxCible = CONFIG.TAUX_DEVISE[deviseCible] || 1;
    return montant * (tauxCible / tauxSource);
}

function formatPrix(montant, devise = null) {
    if (montant === undefined || montant === null) return '0 ' + (devise || 'FCFA');
    const deviseEffective = devise || getDeviseUtilisateur();
    const montantConverti = convertirDevise(montant, 'XOF', deviseEffective);
    const symbole = getDeviseSymbole(deviseEffective);
    return montantConverti.toLocaleString('fr-FR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }) + ' ' + symbole;
}

// =====================================================
// LANGUE - TRADUCTION
// =====================================================
const TRADUCTIONS = {
    fr: {
        en_stock: '✅ En stock', rupture: '❌ Rupture', ajouter_panier: 'Ajouter au panier',
        voir: 'Voir', favoris: 'Favoris', commander: 'Commander', total: 'Total',
        sous_total: 'Sous-total', livraison: 'Livraison', livraison_gratuite: 'Livraison gratuite',
        paiement: 'Paiement', confirmation: 'Confirmation', suivi: 'Suivi', annuler: 'Annuler',
        retour: 'Retour', continuer: 'Continuer', valider: 'Valider', en_attente: 'En attente',
        confirmee: 'Confirmée', preparation: 'En préparation', expedition: 'Expédiée',
        livree: 'Livrée', annulee: 'Annulée', poids: 'Poids', dimensions: 'Dimensions',
        garanti: 'Garantie', vendeur: 'Vendeur', client: 'Client', telephone: 'Téléphone',
        adresse: 'Adresse', email: 'Email', description: 'Description', specifications: 'Spécifications',
        avis: 'Avis', note: 'Note', prix: 'Prix', quantite: 'Quantité', stock: 'Stock',
        disponible: 'Disponible', indisponible: 'Indisponible', promotion: 'Promotion', nouveau: 'Nouveau'
    },
    en: {
        en_stock: '✅ In stock', rupture: '❌ Out of stock', ajouter_panier: 'Add to cart',
        voir: 'View', favoris: 'Favorites', commander: 'Order', total: 'Total',
        sous_total: 'Subtotal', livraison: 'Delivery', livraison_gratuite: 'Free delivery',
        paiement: 'Payment', confirmation: 'Confirmation', suivi: 'Tracking', annuler: 'Cancel',
        retour: 'Back', continuer: 'Continue', valider: 'Validate', en_attente: 'Pending',
        confirmee: 'Confirmed', preparation: 'Processing', expedition: 'Shipped',
        livree: 'Delivered', annulee: 'Cancelled', poids: 'Weight', dimensions: 'Dimensions',
        garanti: 'Warranty', vendeur: 'Seller', client: 'Client', telephone: 'Phone',
        adresse: 'Address', email: 'Email', description: 'Description', specifications: 'Specifications',
        avis: 'Reviews', note: 'Rating', prix: 'Price', quantite: 'Quantity', stock: 'Stock',
        disponible: 'Available', indisponible: 'Unavailable', promotion: 'Promotion', nouveau: 'New'
    },
    es: {
        en_stock: '✅ En stock', rupture: '❌ Agotado', ajouter_panier: 'Añadir al carrito',
        voir: 'Ver', favoris: 'Favoritos', commander: 'Pedir', total: 'Total',
        sous_total: 'Subtotal', livraison: 'Entrega', livraison_gratuite: 'Entrega gratuita',
        paiement: 'Pago', confirmation: 'Confirmación', suivi: 'Seguimiento', annuler: 'Cancelar',
        retour: 'Volver', continuer: 'Continuar', valider: 'Validar', en_attente: 'Pendiente',
        confirmee: 'Confirmado', preparation: 'Preparando', expedition: 'Enviado',
        livree: 'Entregado', annulee: 'Cancelado', poids: 'Peso', dimensions: 'Dimensiones',
        garanti: 'Garantía', vendeur: 'Vendedor', client: 'Cliente', telephone: 'Teléfono',
        adresse: 'Dirección', email: 'Email', description: 'Descripción', specifications: 'Especificaciones',
        avis: 'Opiniones', note: 'Calificación', prix: 'Precio', quantite: 'Cantidad', stock: 'Stock',
        disponible: 'Disponible', indisponible: 'No disponible', promotion: 'Promoción', nouveau: 'Nuevo'
    }
    // NB: langue arabe pas encore traduite ici (voir dossier des pages
    // register/compte pour le même manque côté préférence utilisateur).
};

function getLangue() {
    const user = JSON.parse(localStorage.getItem('sineUser') || '{}');
    return user.preferredLanguage || 'fr';
}

function traduction(key) {
    const lang = getLangue();
    return TRADUCTIONS[lang]?.[key] || TRADUCTIONS.fr[key] || key;
}

// =====================================================
// NOTIFICATION
// =====================================================
function showNotification(message, type = 'info', duration = 4000) {
    const notif = document.getElementById('notificationToast') || document.getElementById('notification');
    if (!notif) {
        console.log('🔔', message);
        return;
    }
    notif.textContent = message;
    notif.className = 'notification-toast show ' + type;
    clearTimeout(notif._timeout);
    notif._timeout = setTimeout(() => {
        notif.classList.remove('show');
    }, duration);
}

// =====================================================
// PRODUITS - FONCTIONS MÉTIER
// Champs alignés sur le vrai schéma backend/models/Product.js :
// name, price, discountedPrice, category (objet peuplé {_id,name}),
// seller (objet peuplé), stock, weight, images[], isAvailable.
// =====================================================
function getProduitsVisibles() {
    return produits.filter(p => p.isAvailable !== false);
}

function getProduitsParCategorie(categorieNomOuIdOuSlug) {
    const cible = (categorieNomOuIdOuSlug || '').toString().toLowerCase();
    return getProduitsVisibles().filter(p =>
        p.category?._id === categorieNomOuIdOuSlug ||
        p.category?.slug === cible ||
        (p.category?.name || '').toLowerCase() === cible
    );
}

function getProduitsParVendeur(vendeurId) {
    return produits.filter(p => p.seller?._id === vendeurId);
}

function getProduitsEnStock() {
    return getProduitsVisibles().filter(p => (p.stock || 0) > 0);
}

function getProduitsEnPromotion() {
    return getProduitsVisibles().filter(p => p.discountedPrice && p.discountedPrice < p.price);
}

function getProduitsRecherche(query) {
    const q = (query || '').toLowerCase().trim();
    if (!q) return getProduitsVisibles();
    return getProduitsVisibles().filter(p => {
        const nom = (p.name || '').toLowerCase();
        const desc = (p.description || '').toLowerCase();
        const cat = (p.category?.name || '').toLowerCase();
        const vendeur = (p.seller?.storeName || `${p.seller?.firstName || ''} ${p.seller?.lastName || ''}`).toLowerCase();
        return nom.includes(q) || desc.includes(q) || cat.includes(q) || vendeur.includes(q);
    });
}

// =====================================================
// PANIER - FONCTIONS MÉTIER
// Chaque action appelle réellement le backend, puis met à jour
// l'état local à partir de la vraie réponse (plus d'écriture
// locale optimiste suivie d'un appel API "au mieux").
// =====================================================
function getPanierItems() {
    return panier?.items || [];
}

function getPanierTotal() {
    return panier?.totalPrice || 0;
}

function getPanierPoidsTotal() {
    return (panier?.items || []).reduce((sum, item) => sum + (item.product?.weight || 0) * (item.quantity || 1), 0);
}

function getPanierNombreItems() {
    return panier?.totalItems || (panier?.items || []).reduce((sum, item) => sum + (item.quantity || 1), 0);
}

async function ajouterAuPanier(productId, quantite = 1) {
    try {
        await API.addToCart(productId, quantite);
        panier = await API.getPanier();
        showNotification('🛒 Produit ajouté au panier', 'success');
        return true;
    } catch (error) {
        showNotification('❌ ' + (error.message || 'Erreur lors de l\'ajout au panier.'), 'error');
        return false;
    }
}

async function retirerDuPanier(productId) {
    try {
        await API.removeFromCart(productId);
        panier = await API.getPanier();
        return true;
    } catch (error) {
        showNotification('❌ ' + (error.message || 'Erreur lors du retrait du panier.'), 'error');
        return false;
    }
}

async function viderPanier() {
    try {
        await API.clearCart();
        panier = await API.getPanier();
        return true;
    } catch (error) {
        showNotification('❌ ' + (error.message || 'Erreur lors du vidage du panier.'), 'error');
        return false;
    }
}

// =====================================================
// FAVORIS - FONCTIONS MÉTIER
// =====================================================
function getFavorisIds() {
    return favoris.map(f => f.product?._id || f.product).filter(Boolean);
}

function isFavori(productId) {
    return getFavorisIds().includes(productId);
}

async function toggleFavori(productId) {
    try {
        if (isFavori(productId)) {
            await API.removeFavori(productId);
            showNotification('❤️ Retiré des favoris', 'warning');
        } else {
            await API.toggleFavori(productId);
            showNotification('❤️ Ajouté aux favoris', 'success');
        }
        favoris = await API.getFavoris();
        return true;
    } catch (error) {
        showNotification('❌ ' + (error.message || 'Erreur favoris.'), 'error');
        return false;
    }
}

// =====================================================
// COMMANDES - FONCTIONS MÉTIER
// =====================================================
async function creerCommande(commandeData) {
    try {
        const commande = await API.createCommande(commandeData);
        commandes.unshift(commande);
        panier = await API.getPanier();
        showNotification('✅ Commande créée avec succès', 'success');
        return commande;
    } catch (error) {
        showNotification('❌ Erreur lors de la création de la commande : ' + error.message, 'error');
        throw error;
    }
}

function getCommandesClient() {
    // Déjà scopées à l'utilisateur connecté côté backend.
    return commandes;
}

function getStatusCommandeLabel(status) {
    const labels = {
        'pending': traduction('en_attente'), 'confirmed': traduction('confirmee'),
        'processing': traduction('preparation'), 'shipped': traduction('expedition'),
        'delivered': traduction('livree'), 'cancelled': traduction('annulee')
    };
    return labels[status] || status;
}

function getStatusCommandeClasse(status) {
    return ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'].includes(status) ? status : 'pending';
}

// =====================================================
// RÉSERVATIONS - FONCTIONS MÉTIER
// =====================================================
async function creerReservation(reservationData) {
    try {
        const reservation = await API.createReservation(reservationData);
        reservations.unshift(reservation);
        showNotification('✅ Réservation créée avec succès', 'success');
        return reservation;
    } catch (error) {
        showNotification('❌ Erreur lors de la création de la réservation : ' + error.message, 'error');
        throw error;
    }
}

// =====================================================
// PAIEMENTS - FONCTIONS MÉTIER
// =====================================================
async function initierPaiement(paymentData) {
    try {
        const result = await API.initiatePayment(paymentData);
        showNotification('💳 Paiement initié avec succès', 'success');
        return result;
    } catch (error) {
        showNotification('❌ Erreur lors de l\'initiation du paiement : ' + error.message, 'error');
        throw error;
    }
}

// =====================================================
// SUIVI LIVRAISON - FONCTIONS MÉTIER
// =====================================================
async function getSuiviCommande(orderId) {
    try {
        return await API.getTracking(orderId);
    } catch (error) {
        console.error('Erreur suivi:', error);
        return null;
    }
}

// =====================================================
// CALCUL FRAIS DE LIVRAISON BASÉ SUR LE POIDS
// =====================================================
function calculerFraisLivraison(poidsTotal, devise = 'XOF') {
    const tauxBase = 1000;
    const poidsBase = poidsTotal || 0;
    let montant = poidsBase * tauxBase;
    if (montant < 1000) montant = 1000;
    if (montant > 15000) montant = 15000;
    const deviseEffective = devise || getDeviseUtilisateur();
    return convertirDevise(montant, 'XOF', deviseEffective);
}

// =====================================================
// INITIALISATION
// =====================================================
async function initialiserMoteur() {
    if (!window.SineAPI) {
        console.error('❌ produits.js nécessite js/config.js et js/api.js, chargés avant lui.');
        return false;
    }

    try {
        utilisateurCourant = JSON.parse(localStorage.getItem('sineUser') || 'null');
        deviseUtilisateur = getDeviseUtilisateur();
        langueUtilisateur = getLangue();

        const results = await Promise.allSettled([
            API.getProduits({ limit: 200 }),
            window.SineAPI.isAuthenticated() ? API.getFavoris() : Promise.resolve([]),
            window.SineAPI.isAuthenticated() ? API.getPanier() : Promise.resolve(null),
            window.SineAPI.isAuthenticated() ? API.getCommandes() : Promise.resolve([]),
        ]);

        produits = results[0].status === 'fulfilled' ? results[0].value : [];
        favoris = results[1].status === 'fulfilled' ? results[1].value : [];
        panier = results[2].status === 'fulfilled' ? results[2].value : null;
        commandes = results[3].status === 'fulfilled' ? results[3].value : [];

        console.log('✅ Moteur SINE.SHOP v' + CONFIG.VERSION + ' initialisé (branché sur le vrai backend)');
        console.log('📦 Produits:', produits.length, '❤️ Favoris:', favoris.length,
            '🛒 Panier:', getPanierNombreItems(), '📋 Commandes:', commandes.length);

        return true;
    } catch (error) {
        console.error('❌ Erreur initialisation moteur:', error);
        return false;
    }
}

// =====================================================
// EXPORT GLOBAL
// Les collections (produits/panier/favoris/commandes) sont
// exposées via des getters pour toujours refléter l'état actuel
// (un objet littéral figerait leur valeur au moment du chargement).
// =====================================================
window.SINE = window.SINE || {};
Object.assign(window.SINE, {
    CONFIG,
    CATEGORIES,

    get produits() { return produits; },
    getProduitsVisibles, getProduitsParCategorie, getProduitsParVendeur,
    getProduitsEnStock, getProduitsEnPromotion, getProduitsRecherche,

    get panier() { return panier; },
    getPanierItems, getPanierTotal, getPanierPoidsTotal, getPanierNombreItems,
    ajouterAuPanier, retirerDuPanier, viderPanier,

    get favoris() { return favoris; },
    getFavorisIds, isFavori, toggleFavori,

    get commandes() { return commandes; },
    creerCommande, getCommandesClient, getStatusCommandeLabel, getStatusCommandeClasse,

    get reservations() { return reservations; },
    creerReservation,

    initierPaiement,
    getSuiviCommande,

    getDeviseUtilisateur, getDeviseSymbole, convertirDevise, formatPrix,
    getLangue, traduction,
    showNotification, calculerFraisLivraison,

    API,
    initialiserMoteur
});

// =====================================================
// AUTO-INITIALISATION
// =====================================================
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialiserMoteur);
} else {
    initialiserMoteur();
}
