// ============================================================
// CONFIGURATION GLOBALE SINE.SHOP
// ============================================================

// Détection de l'environnement Capacitor
const isCapacitor = typeof window !== 'undefined' && window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function' && window.Capacitor.isNativePlatform();
const isLocalhost = typeof location !== 'undefined' && (location.hostname === 'localhost' || location.hostname === '127.0.0.1');

const SINE_CONFIG = {
    // API — bascule automatiquement entre local (tests) et production.
    API_URL: isCapacitor
        ? 'https://api.sineshophome.com/api'
        : isLocalhost
            ? 'http://localhost:5000/api'
            : 'https://api.sineshophome.com/api',

    // Firebase — configuration UNIQUE pour toutes les plateformes
    // ⚠️ IMPORTANT : On utilise la clé WEB pour le code JavaScript (web + Capacitor)
    // Les clés iOS (GoogleService-Info.plist) et Android (google-services.json)
    // sont utilisées UNIQUEMENT par les SDK natifs, pas par le code JS.
    FIREBASE: {
        apiKey: "AIzaSyCWwRhR5aKOFfB9fpzKECXHOL-1p3E2c08",
        authDomain: "auth.sineshophome.com",
        projectId: "sineshop-93e07",
        storageBucket: "sineshop-93e07.firebasestorage.app",
        messagingSenderId: "1019753827763",
        appId: "1:1019753827763:web:06da91079e7e8261260fc6",
        measurementId: "G-2K3K8VXS5S"
    },
    
    // Bannière "Ouvrir dans l'app" (façon Alibaba)
    APP_LINKS: {
        APP_SCHEME: 'sineshop://open',
        APP_STORE_URL: 'https://apps.apple.com/app/id0000000000',
        PLAY_STORE_URL: 'https://play.google.com/store/apps/details?id=com.sineshop.app',
    },

    // Devises supportées
    CURRENCIES: {
        XOF: { symbol: 'FCFA', rate: 1 },
        EUR: { symbol: '€', rate: 0.00152 },
        USD: { symbol: '$', rate: 0.00165 },
        GBP: { symbol: '£', rate: 0.00132 },
        CAD: { symbol: 'CA$', rate: 0.00225 },
        MAD: { symbol: 'MAD', rate: 0.0106 },
        NGN: { symbol: '₦', rate: 0.75 }
    },
    
    // Langues supportées
    LANGUAGES: {
        fr: 'Français',
        en: 'English',
        es: 'Español',
        ar: 'العربية'
    },
    
    // Fuseaux horaires supportés
    TIMEZONES: [
        'Africa/Dakar',
        'Africa/Abidjan',
        'Africa/Casablanca',
        'Africa/Lagos',
        'Africa/Nairobi',
        'Africa/Johannesburg',
        'Africa/Cairo',
        'Europe/Paris',
        'Europe/London',
        'America/New_York',
        'America/Los_Angeles',
        'Asia/Dubai',
        'Asia/Tokyo',
        'Asia/Shanghai'
    ]
};

// ============================================================
// GESTION DE LA LANGUE GLOBALE
// ============================================================

let currentLanguage = localStorage.getItem('sine_language') || 'fr';
let currentCurrency = localStorage.getItem('sine_currency') || 'XOF';
let currentTimezone = localStorage.getItem('sine_timezone') || Intl.DateTimeFormat().resolvedOptions().timeZone;

// Détection automatique du fuseau horaire
function detectTimezone() {
    try {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (tz && SINE_CONFIG.TIMEZONES.includes(tz)) {
            currentTimezone = tz;
            localStorage.setItem('sine_timezone', tz);
        }
    } catch (e) {
        console.warn('Timezone detection failed:', e);
    }
    return currentTimezone;
}

// Langues supportées
const SUPPORTED_LANGS = ['fr', 'en', 'es', 'ar'];

function detectLanguage() {
    try {
        const user = JSON.parse(localStorage.getItem('sineUser') || 'null');
        if (user?.preferredLanguage && SUPPORTED_LANGS.includes(user.preferredLanguage)) {
            return user.preferredLanguage;
        }
    } catch (e) { /* pas de compte connecté ou données invalides */ }

    try {
        const browserLangs = navigator.languages || [navigator.language || 'fr'];
        for (const bl of browserLangs) {
            const code = bl.slice(0, 2).toLowerCase();
            if (SUPPORTED_LANGS.includes(code)) return code;
        }
    } catch (e) { /* navigator indisponible */ }

    return 'fr';
}

// ============================================================
// TRADUCTIONS GLOBALES (version simplifiée pour l'exemple)
// ============================================================

const TRANSLATIONS = {
    fr: {
        // Navigation
        'nav.home': 'Accueil',
        'nav.products': 'Produits',
        'nav.cart': 'Panier',
        'nav.wallet': 'SINE.SHOP Wallet',
        'wallet.title': 'SINE.SHOP Wallet',
        'wallet.subtitle': "Votre portefeuille et vos points de fidélité, séparés et sécurisés.",
        'wallet.available': 'Solde disponible',
        'wallet.loyalty': 'Fidélité SINE.SHOP',
        'wallet.loyaltyNote': "⚠️ Les points de fidélité ne sont ni retirables ni transférables — utilisables uniquement pour réduire une commande éligible.",
        'wallet.recharge': 'Recharger mon portefeuille',
        'wallet.history': 'Historique',
        'nav.orders': 'Commandes',
        'nav.profile': 'Profil',
        'nav.favorites': 'Favoris',
        'nav.messages': 'Messages',
        'nav.notifications': 'Notifications',
        'nav.settings': 'Paramètres',
        'nav.publish': 'Publier',
        'nav.clients': 'Clients',
        'nav.verification': 'Vérification',
        'auth.login_title': '🔐 Connexion',
        'auth.login_subtitle': 'Accédez à votre espace personnel SINE.SHOP.',
        'auth.label_identifier': 'Email ou numéro de téléphone',
        'auth.label_password': 'Mot de passe',
        'auth.remember': 'Se souvenir de moi',
        'auth.btn_login': 'Se connecter',
        'auth.btn_guest': 'Continuer sans se connecter',
        'auth.or': 'ou',
        'auth.google': 'Continuer avec Google',
        'auth.facebook': 'Continuer avec Facebook',
        'auth.register_link': 'Vous n\'avez pas encore de compte ?',
        'auth.affiliate_link': 'Vous voulez devenir partenaire ?',
        'auth.affiliate_join': 'Rejoindre le programme d\'affiliation',
        'auth.reset_title': '🔑 Réinitialisation',
        'auth.reset_desc': 'Entrez votre adresse email pour recevoir un lien de réinitialisation.',
        'auth.reset_step1_btn': '📧 Envoyer le code',
        'auth.btn_cancel': 'Annuler',
        'auth.resend_code': 'Renvoyer le code',
        'auth.reset_step2_title': '🔑 Nouveau mot de passe',
        'auth.reset_step2_desc': 'Entrez le code reçu et votre nouveau mot de passe.',
        'auth.label_code': 'Code reçu',
        'auth.label_new_password': 'Nouveau mot de passe',
        'auth.label_confirm_password': 'Confirmer le mot de passe',
        'auth.reset_step2_btn': '✅ Réinitialiser mon mot de passe',
        'auth.security_code_title': '🛡️ Code de confidentialité',
        'auth.security_code_desc': 'Ce compte est protégé par un code de confidentialité. Saisissez-le pour continuer.',
        'auth.label_security_code': 'Code de confidentialité',
        'auth.btn_verify_code': 'Valider',
        // ... (le reste des traductions est identique à votre fichier original)
    },
    // Les autres langues (en, es, ar) sont identiques à votre fichier original
    // Je les ai omises ici pour la lisibilité, mais gardez-les dans votre fichier final
};

// ============================================================
// FONCTIONS DE TRADUCTION
// ============================================================

function translate(key, lang = currentLanguage) {
    const translations = TRANSLATIONS[lang] || TRANSLATIONS.fr;
    return translations[key] || key;
}

function applyLanguage(lang) {
    currentLanguage = lang;
    localStorage.setItem('sine_language', lang);
    
    // Appliquer à tous les éléments avec data-translate
    document.querySelectorAll('[data-translate]').forEach(el => {
        const key = el.getAttribute('data-translate');
        const translation = translate(key, lang);
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') {
            el.placeholder = translation;
        } else {
            el.textContent = translation;
        }
    });
    
    // Mettre à jour les sélecteurs de langue
    document.querySelectorAll('.lang-select, #langSelect, #headerLangSelect').forEach(el => {
        if (el.value !== lang) el.value = lang;
    });

    applyDirection(lang);
    
    window.dispatchEvent(new CustomEvent('languageChanged', { detail: { language: lang } }));
}

function applyDirection(lang) {
    const isRtl = lang === 'ar';
    document.documentElement.setAttribute('dir', isRtl ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', lang);
    document.body?.classList.toggle('rtl-active', isRtl);
}

// ============================================================
// FONCTIONS DE DEVISE
// ============================================================

function convertCurrency(amount, fromCurrency = 'XOF', toCurrency = currentCurrency) {
    if (!amount || amount === 0) return 0;
    if (fromCurrency === toCurrency) return amount;
    
    const fromRate = SINE_CONFIG.CURRENCIES[fromCurrency]?.rate || 1;
    const toRate = SINE_CONFIG.CURRENCIES[toCurrency]?.rate || 1;
    
    return Math.round((amount * (toRate / fromRate)) * 100) / 100;
}

function formatCurrency(amount, currency = currentCurrency) {
    const symbol = SINE_CONFIG.CURRENCIES[currency]?.symbol || currency;
    const converted = convertCurrency(amount, 'XOF', currency);
    return `${symbol} ${converted.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}`;
}

function setCurrency(currency) {
    currentCurrency = currency;
    localStorage.setItem('sine_currency', currency);
    
    document.querySelectorAll('.currency-select, #headerDeviseSelect').forEach(el => {
        if (el.value !== currency) el.value = currency;
    });
    
    window.dispatchEvent(new CustomEvent('currencyChanged', { detail: { currency } }));
}

// ============================================================
// FONCTIONS DE FUSEAU HORAIRE
// ============================================================

function getCurrentTime(timezone = currentTimezone) {
    try {
        return new Date().toLocaleString('fr-FR', { timeZone: timezone });
    } catch (e) {
        return new Date().toLocaleString('fr-FR');
    }
}

function formatTime(date, timezone = currentTimezone) {
    try {
        return new Date(date).toLocaleString('fr-FR', { timeZone: timezone });
    } catch (e) {
        return new Date(date).toLocaleString('fr-FR');
    }
}

function setTimezone(timezone) {
    if (SINE_CONFIG.TIMEZONES.includes(timezone)) {
        currentTimezone = timezone;
        localStorage.setItem('sine_timezone', timezone);
        window.dispatchEvent(new CustomEvent('timezoneChanged', { detail: { timezone } }));
        return true;
    }
    return false;
}

// ============================================================
// EXPORT
// ============================================================

window.SINE = {
    config: SINE_CONFIG,
    translate,
    applyLanguage,
    applyDirection,
    convertCurrency,
    formatCurrency,
    setCurrency,
    getCurrentTime,
    formatTime,
    setTimezone,
    detectTimezone,
    detectLanguage,
    isCapacitor,
    isLocalhost,
    get currentLanguage() { return currentLanguage; },
    get currentCurrency() { return currentCurrency; },
    get currentTimezone() { return currentTimezone; }
};

// Détection automatique au chargement
detectTimezone();

console.log('✅ SINE.SHOP Config loaded');
console.log('🌐 Language:', currentLanguage);
console.log('💱 Currency:', currentCurrency);
console.log('🕐 Timezone:', currentTimezone);
console.log('📱 Capacitor:', isCapacitor);
console.log('🏠 Localhost:', isLocalhost);