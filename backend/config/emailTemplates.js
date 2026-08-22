// Moteur de templates email SINE.SH♡P — porte la maquette HTML fournie
// (en-tête bleu étoilé, cœur qui bat, variables, 4 langues) dans un vrai
// générateur côté serveur, utilisé pour TOUS les emails de la plateforme.

// =====================================================
// EXPÉDITEURS — une adresse par type d'email, tel que défini
// =====================================================
const SENDERS = {
  noreply: { email: process.env.EMAIL_FROM_NOREPLY || 'noreply@sineshophome.com', name: 'SINE.SHOP' },
  support: { email: process.env.EMAIL_FROM_SUPPORT || 'support@sineshophome.com', name: 'Support SINE.SHOP' },
  contact: { email: process.env.EMAIL_FROM_CONTACT || 'contact@sineshophome.com', name: 'Contact SINE.SHOP' },
  orders: { email: process.env.EMAIL_FROM_ORDERS || 'orders@sineshophome.com', name: 'Commandes SINE.SHOP' },
  payments: { email: process.env.EMAIL_FROM_PAYMENTS || 'payments@sineshophome.com', name: 'Paiements SINE.SHOP' },
  delivery: { email: process.env.EMAIL_FROM_DELIVERY || 'delivery@sineshophome.com', name: 'Livraison SINE.SHOP' },
  security: { email: process.env.EMAIL_FROM_SECURITY || 'security@sineshophome.com', name: 'Sécurité SINE.SHOP' },
  verification: { email: process.env.EMAIL_FROM_VERIFICATION || 'verification@sineshophome.com', name: 'Vérification SINE.SHOP' },
  notifications: { email: process.env.EMAIL_FROM_NOTIFICATIONS || 'notifications@sineshophome.com', name: 'Notifications SINE.SHOP' },
  reservations: { email: process.env.EMAIL_FROM_RESERVATIONS || 'reservations@sineshophome.com', name: 'Réservations SINE.SHOP' },
  seller: { email: process.env.EMAIL_FROM_SELLER || 'vendors@sineshophome.com', name: 'Vendeurs SINE.SHOP' },
  products: { email: process.env.EMAIL_FROM_PRODUCTS || 'products@sineshophome.com', name: 'Produits SINE.SHOP' },
  affiliation: { email: process.env.EMAIL_FROM_AFFILIATION || 'affiliation@sineshophome.com', name: 'Affiliation SINE.SHOP' },
  newsletter: { email: process.env.EMAIL_FROM_NEWSLETTER || 'newsletter@sineshophome.com', name: 'SINE.SHOP Newsletter' },
  marketing: { email: process.env.EMAIL_FROM_MARKETING || 'marketing@sineshophome.com', name: 'SINE.SHOP' },
  legal: { email: process.env.EMAIL_FROM_LEGAL || 'legal@sineshophome.com', name: 'SINE.SHOP Juridique' },
  privacy: { email: process.env.EMAIL_FROM_PRIVACY || 'privacy@sineshophome.com', name: 'SINE.SHOP Confidentialité' },
};

// Associe chaque type d'email à son expéditeur logique
const TYPE_SENDER = {
  welcome: 'noreply',
  verify: 'verification',
  password: 'noreply',
  otp: 'noreply',
  order: 'orders',
  payment_confirmed: 'payments',
  payment_failed: 'payments',
  shipped: 'delivery',
  delivered: 'delivery',
  message: 'notifications',
  favorite: 'notifications',
  new_seller: 'seller',
  promo: 'marketing',
  review: 'notifications',
  alert: 'security',
  reservation: 'reservations',
  admin_application: 'contact',
  application_received: 'noreply',
  product_published: 'products',
  kyc_approved: 'verification',
  kyc_rejected: 'verification',
  account_action_approved: 'security',
  account_action_rejected: 'security',
  account_action_submitted: 'noreply',
  security_code_reset: 'security',
  affiliation: 'affiliation',
};

// =====================================================
// TRADUCTIONS (FR/EN/ES/AR) — portées depuis la maquette fournie
// =====================================================
const TRANSLATIONS = {
  fr: {
    preheader: 'Bienvenue sur SINE.SH♡P. Votre compte est presque prêt.',
    slogan: 'SHOP • RESERVE • CONNECT',
    services_title: '✨ Pourquoi choisir SINE.SH♡P ?',
    services: ['Paiements sécurisés', 'Livraison rapide', 'Réservation facile', 'Messagerie intégrée', 'Support 24/7', 'Vendeurs vérifiés'],
    social_label: 'Suivez-nous',
    support_title: '💬 Besoin d\'aide ?',
    footer_year: '© 2026 SINE.SH♡P',
    footer_location: 'Abidjan, Côte d\'Ivoire',
    legal_cgu: 'CGU',
    legal_privacy: 'Politique de confidentialité',
    legal_preferences: 'Préférences e-mail',
    legal_unsubscribe: 'Se désabonner',
    website_url: process.env.FRONTEND_URL || 'https://www.sineshophome.com',
    variables: {
      welcome: {
        title: 'Bienvenue sur SINE.SH♡P',
        message: '<p>Bonjour <strong>{{ user_name }}</strong>,</p><p>Merci de rejoindre <strong>SINE.SH♡P</strong>. Votre compte a été créé avec succès.</p>',
        button: 'COMMENCER L\'AVENTURE',
        dynamic: '<div style="line-height:1px;">&nbsp;</div>'
      },
      verify: {
        title: 'Vérifiez votre adresse e-mail',
        message: '<p>Bonjour <strong>{{ user_name }}</strong>,</p><p>Pour finaliser votre inscription sur <strong>SINE.SH♡P</strong>, veuillez vérifier votre adresse e-mail en utilisant le code ci-dessous.</p>',
        button: 'VÉRIFIER MON ADRESSE',
        dynamic: '<div style="font-family:Courier New,monospace;font-size:2rem;font-weight:700;text-align:center;color:#0a2a44;letter-spacing:8px;padding:14px;background:#f8fafc;border-radius:12px;border:1px dashed #dce3ed;margin-bottom:12px;">{{ otp_code }}</div><div style="text-align:center;font-size:0.85rem;color:#94a3b8;">⏳ Ce code expire dans <strong>{{ expiry_minutes }}</strong></div><div style="text-align:center;font-size:0.78rem;color:#b45309;margin-top:8px;">🔒 Ce code est confidentiel. Ne le communiquez à personne, même à un membre de l\'équipe SINE.SH♡P.</div>'
      },
      password: {
        title: 'Réinitialisation du mot de passe',
        message: '<p>Bonjour <strong>{{ user_name }}</strong>,</p><p>Nous avons reçu une demande de réinitialisation de votre mot de passe <strong>SINE.SH♡P</strong>. Utilisez le code ci-dessous.</p>',
        button: 'RÉINITIALISER MON MOT DE PASSE',
        dynamic: '<div style="font-family:Courier New,monospace;font-size:2rem;font-weight:700;text-align:center;color:#0a2a44;letter-spacing:8px;padding:14px;background:#f8fafc;border-radius:12px;border:1px dashed #dce3ed;margin-bottom:12px;">{{ otp_code }}</div><div style="text-align:center;font-size:0.85rem;color:#94a3b8;">⏳ Ce code expire dans <strong>{{ expiry_minutes }}</strong></div><div style="text-align:center;font-size:0.78rem;color:#b45309;margin-top:8px;">🔒 Ce code est confidentiel. Ne le communiquez à personne, même à un membre de l\'équipe SINE.SH♡P.</div>'
      },
      security_code_reset: {
        title: '🔐 Réinitialisation du code de confidentialité',
        message: '<p>Bonjour <strong>{{ user_name }}</strong>,</p><p>Une demande de réinitialisation de votre <strong>code de confidentialité</strong> (accès administrateur SINE.SH♡P) a été effectuée. Cliquez sur le bouton ci-dessous pour en définir un nouveau.</p>',
        button: 'RÉINITIALISER MON CODE',
        dynamic: '<div style="text-align:center;font-size:0.85rem;color:#94a3b8;">⏳ Ce lien expire dans <strong>10 minutes</strong> et ne peut être utilisé qu\'une seule fois.</div><div style="text-align:center;font-size:0.78rem;color:#b45309;margin-top:8px;">🔒 Si vous n\'êtes pas à l\'origine de cette demande, ignorez cet email — votre code actuel reste inchangé.</div>'
      },
      otp: {
        title: '🔐 Code de sécurité',
        message: '<p>Bonjour <strong>{{ user_name }}</strong>,</p><p>Utilisez le code ci-dessous pour vous connecter à votre compte <strong>SINE.SH♡P</strong>.</p>',
        button: 'SE CONNECTER',
        dynamic: '<div style="font-family:Courier New,monospace;font-size:2rem;font-weight:700;text-align:center;color:#0a2a44;letter-spacing:8px;padding:14px;background:#f8fafc;border-radius:12px;border:1px dashed #dce3ed;margin-bottom:12px;">{{ otp_code }}</div><div style="text-align:center;font-size:0.85rem;color:#94a3b8;">⏳ Ce code expire dans <strong>{{ expiry_minutes }}</strong></div><div style="text-align:center;font-size:0.78rem;color:#b45309;margin-top:8px;">🔒 Ce code est confidentiel. Ne le communiquez à personne, même à un membre de l\'équipe SINE.SH♡P.</div>'
      },
      order: {
        title: '📦 Votre commande est confirmée',
        message: '<p>Bonjour <strong>{{ user_name }}</strong>,</p><p>Votre commande sur <strong>SINE.SH♡P</strong> a été confirmée.</p>',
        button: 'VOIR MA COMMANDE',
        dynamic: '<div style="display:table;width:100%;"><div style="display:table-cell;background:#f8fafc;border-radius:10px;padding:10px 14px;border:1px solid #eef2f6;"><div style="font-size:0.65rem;text-transform:uppercase;color:#94a3b8;font-weight:600;">Numéro de commande</div><div style="font-size:0.95rem;font-weight:600;color:#0a2a44;margin-top:2px;">{{ order_number }}</div></div><div style="display:table-cell;background:#f8fafc;border-radius:10px;padding:10px 14px;border:1px solid #eef2f6;"><div style="font-size:0.65rem;text-transform:uppercase;color:#94a3b8;font-weight:600;">Montant</div><div style="font-size:0.95rem;font-weight:600;color:#0a2a44;margin-top:2px;">{{ order_amount }}</div></div></div>'
      },
      payment_confirmed: {
        title: '💳 Paiement confirmé',
        message: '<p>Bonjour <strong>{{ user_name }}</strong>,</p><p>Nous confirmons la réception de votre paiement pour la commande <strong>{{ order_number }}</strong>.</p>',
        button: 'VOIR MA COMMANDE',
        dynamic: '<div style="display:table;width:100%;"><div style="display:table-cell;background:#f8fafc;border-radius:10px;padding:10px 14px;border:1px solid #eef2f6;"><div style="font-size:0.65rem;text-transform:uppercase;color:#94a3b8;font-weight:600;">Montant payé</div><div style="font-size:0.95rem;font-weight:600;color:#0a2a44;margin-top:2px;">{{ paid_amount }}</div></div><div style="display:table-cell;background:#f8fafc;border-radius:10px;padding:10px 14px;border:1px solid #eef2f6;"><div style="font-size:0.65rem;text-transform:uppercase;color:#94a3b8;font-weight:600;">Méthode</div><div style="font-size:0.95rem;font-weight:600;color:#0a2a44;margin-top:2px;">{{ payment_method }}</div></div></div>'
      },
      payment_failed: {
        title: '❌ Paiement refusé',
        message: '<p>Bonjour <strong>{{ user_name }}</strong>,</p><p>Nous avons rencontré un problème lors du traitement de votre paiement pour la commande <strong>{{ order_number }}</strong>.</p>',
        button: 'RÉESSAYER LE PAIEMENT',
        dynamic: '<div style="background:#fee2e2;border-radius:12px;padding:16px;text-align:center;"><p style="color:#dc2626;font-weight:600;">⚠️ Votre paiement n\'a pas pu être traité</p></div>'
      },
      shipped: {
        title: '📦 Votre commande a été expédiée',
        message: '<p>Bonjour <strong>{{ user_name }}</strong>,</p><p>Votre commande <strong>{{ order_number }}</strong> a été expédiée !</p>',
        button: 'SUIVRE MA LIVRAISON',
        dynamic: '<div style="display:table;width:100%;"><div style="display:table-cell;background:#f8fafc;border-radius:10px;padding:10px 14px;border:1px solid #eef2f6;"><div style="font-size:0.65rem;text-transform:uppercase;color:#94a3b8;font-weight:600;">Transporteur</div><div style="font-size:0.95rem;font-weight:600;color:#0a2a44;margin-top:2px;">{{ carrier }}</div></div><div style="display:table-cell;background:#f8fafc;border-radius:10px;padding:10px 14px;border:1px solid #eef2f6;"><div style="font-size:0.65rem;text-transform:uppercase;color:#94a3b8;font-weight:600;">Estimation</div><div style="font-size:0.95rem;font-weight:600;color:#0a2a44;margin-top:2px;">{{ estimated_delivery }}</div></div></div>'
      },
      delivered: {
        title: '🚚 Livraison effectuée',
        message: '<p>Bonjour <strong>{{ user_name }}</strong>,</p><p>Votre commande <strong>{{ order_number }}</strong> a été livrée avec succès !</p>',
        button: 'LAISSER UN AVIS',
        dynamic: '<div style="background:#dcfce7;border-radius:12px;padding:16px;text-align:center;"><p style="color:#16a34a;font-weight:600;">✅ Livraison effectuée</p></div>'
      },
      message: {
        title: '💬 Nouveau message',
        message: '<p>Bonjour <strong>{{ user_name }}</strong>,</p><p>Vous avez reçu un nouveau message de <strong>{{ sender_name }}</strong>.</p>',
        button: 'RÉPONDRE AU MESSAGE',
        dynamic: '<div style="background:#f8fafc;border-radius:12px;padding:14px 18px;border-left:4px solid #2d73ff;"><p style="font-size:0.9rem;color:#2f3a4a;">"{{ message_preview }}"</p></div>'
      },
      favorite: {
        title: '❤️ Nouveau favori',
        message: '<p>Bonjour <strong>{{ user_name }}</strong>,</p><p>Votre article <strong>"{{ product_name }}"</strong> a été ajouté aux favoris.</p>',
        button: 'VOIR MES PRODUITS',
        dynamic: '<div style="text-align:center;padding:12px 0;"><div style="font-size:3rem;">❤️</div></div>'
      },
      new_seller: {
        title: '🏪 Bienvenue, vendeur !',
        message: '<p>Bonjour <strong>{{ user_name }}</strong>,</p><p>Votre boutique <strong>{{ seller_name }}</strong> est désormais active sur SINE.SH♡P.</p>',
        button: 'GÉRER MA BOUTIQUE',
        dynamic: '<div style="background:#dcfce7;color:#16a34a;padding:10px;border-radius:30px;text-align:center;font-weight:600;">✅ Boutique vérifiée</div>'
      },
      promo: {
        title: '📢 Promotion exceptionnelle',
        message: '<p>Bonjour <strong>{{ user_name }}</strong>,</p><p>Profitez de <strong>{{ discount_percent }}% de réduction</strong> jusqu\'au {{ promo_end_date }}.</p>',
        button: 'PROFITER DE L\'OFFRE',
        dynamic: '<div style="background:linear-gradient(135deg,#fef3c7,#fde68a);border-radius:12px;padding:20px;text-align:center;"><p style="font-size:1.8rem;font-weight:700;color:#d97706;">{{ discount_percent }}% OFF</p><p>Code : <strong>{{ promo_code }}</strong></p></div>'
      },
      review: {
        title: '⭐ Donnez votre avis',
        message: '<p>Bonjour <strong>{{ user_name }}</strong>,</p><p>Vous avez récemment acheté un article sur SINE.SH♡P. Nous aimerions connaître votre avis.</p>',
        button: 'LAISSER UN AVIS',
        dynamic: '<div style="text-align:center;padding:12px 0;"><div style="font-size:3rem;">⭐</div></div>'
      },
      alert: {
        title: '🚨 Alerte de sécurité',
        message: '<p>Bonjour <strong>{{ user_name }}</strong>,</p><p>Nous avons détecté une nouvelle connexion à votre compte.</p>',
        button: 'SÉCURISER MON COMPTE',
        dynamic: '<div style="background:#fee2e2;border-radius:12px;padding:16px;"><p style="font-size:0.85rem;color:#991b1b;">Appareil : {{ device }}</p><p style="font-size:0.85rem;color:#991b1b;">Date : {{ alert_date }}</p></div>'
      },
      reservation: {
        title: '📅 Réservation confirmée',
        message: '<p>Bonjour <strong>{{ user_name }}</strong>,</p><p>Votre réservation pour <strong>{{ product_name }}</strong> est confirmée.</p>',
        button: 'VOIR MA RÉSERVATION',
        dynamic: '<div style="display:table;width:100%;"><div style="display:table-cell;background:#f8fafc;border-radius:10px;padding:10px 14px;border:1px solid #eef2f6;"><div style="font-size:0.65rem;text-transform:uppercase;color:#94a3b8;font-weight:600;">Du</div><div style="font-size:0.95rem;font-weight:600;color:#0a2a44;margin-top:2px;">{{ start_date }}</div></div><div style="display:table-cell;background:#f8fafc;border-radius:10px;padding:10px 14px;border:1px solid #eef2f6;"><div style="font-size:0.65rem;text-transform:uppercase;color:#94a3b8;font-weight:600;">Au</div><div style="font-size:0.95rem;font-weight:600;color:#0a2a44;margin-top:2px;">{{ end_date }}</div></div></div>'
      },
      affiliation: {
        title: '💸 Programme d\'affiliation SINE.SH♡P',
        message: '<p>Bonjour <strong>{{ user_name }}</strong>,</p><p>{{ affiliation_message }}</p>',
        button: 'VOIR MON ESPACE AFFILIATION',
        dynamic: '<div style="display:table;width:100%;"><div style="display:table-cell;background:#f8fafc;border-radius:10px;padding:10px 14px;border:1px solid #eef2f6;"><div style="font-size:0.65rem;text-transform:uppercase;color:#94a3b8;font-weight:600;">Montant</div><div style="font-size:0.95rem;font-weight:600;color:#0a2a44;margin-top:2px;">{{ amount }}</div></div><div style="display:table-cell;background:#f8fafc;border-radius:10px;padding:10px 14px;border:1px solid #eef2f6;"><div style="font-size:0.65rem;text-transform:uppercase;color:#94a3b8;font-weight:600;">Solde total</div><div style="font-size:0.95rem;font-weight:600;color:#0a2a44;margin-top:2px;">{{ total_balance }}</div></div></div>'
      },
      admin_application: {
        title: '🛡️ Nouvelle candidature Administrateur',
        message: '<p>Une nouvelle demande d\'accès administrateur a été soumise sur <strong>SINE.SH♡P</strong> par <strong>{{ user_name }}</strong>.</p>',
        button: 'RÉPONDRE AU CANDIDAT',
        dynamic: '<div style="display:table;width:100%;"><div style="display:table-cell;background:#f8fafc;border-radius:10px;padding:10px 14px;border:1px solid #eef2f6;"><div style="font-size:0.65rem;text-transform:uppercase;color:#94a3b8;font-weight:600;">Nom complet</div><div style="font-size:0.95rem;font-weight:600;color:#0a2a44;margin-top:2px;">{{ firstname }} {{ lastname }}</div></div><div style="display:table-cell;background:#f8fafc;border-radius:10px;padding:10px 14px;border:1px solid #eef2f6;"><div style="font-size:0.65rem;text-transform:uppercase;color:#94a3b8;font-weight:600;">Email</div><div style="font-size:0.95rem;font-weight:600;color:#0a2a44;margin-top:2px;">{{ email }}</div></div><div style="display:table-cell;background:#f8fafc;border-radius:10px;padding:10px 14px;border:1px solid #eef2f6;"><div style="font-size:0.65rem;text-transform:uppercase;color:#94a3b8;font-weight:600;">Téléphone</div><div style="font-size:0.95rem;font-weight:600;color:#0a2a44;margin-top:2px;">{{ phone }}</div></div><div style="display:table-cell;background:#f8fafc;border-radius:10px;padding:10px 14px;border:1px solid #eef2f6;"><div style="font-size:0.65rem;text-transform:uppercase;color:#94a3b8;font-weight:600;">Date de naissance</div><div style="font-size:0.95rem;font-weight:600;color:#0a2a44;margin-top:2px;">{{ birthdate }}</div></div><div style="display:table-cell;background:#f8fafc;border-radius:10px;padding:10px 14px;border:1px solid #eef2f6;"><div style="font-size:0.65rem;text-transform:uppercase;color:#94a3b8;font-weight:600;">Sexe</div><div style="font-size:0.95rem;font-weight:600;color:#0a2a44;margin-top:2px;">{{ gender }}</div></div><div style="display:table-cell;background:#f8fafc;border-radius:10px;padding:10px 14px;border:1px solid #eef2f6;"><div style="font-size:0.65rem;text-transform:uppercase;color:#94a3b8;font-weight:600;">Situation matrimoniale</div><div style="font-size:0.95rem;font-weight:600;color:#0a2a44;margin-top:2px;">{{ marital }}</div></div><div style="display:table-cell;background:#f8fafc;border-radius:10px;padding:10px 14px;border:1px solid #eef2f6;"><div style="font-size:0.65rem;text-transform:uppercase;color:#94a3b8;font-weight:600;">Enfants</div><div style="font-size:0.95rem;font-weight:600;color:#0a2a44;margin-top:2px;">{{ children }}</div></div><div style="display:table-cell;background:#f8fafc;border-radius:10px;padding:10px 14px;border:1px solid #eef2f6;"><div style="font-size:0.65rem;text-transform:uppercase;color:#94a3b8;font-weight:600;">Adresse</div><div style="font-size:0.95rem;font-weight:600;color:#0a2a44;margin-top:2px;">{{ address }}, {{ city }}, {{ country }}</div></div><div style="display:table-cell;background:#f8fafc;border-radius:10px;padding:10px 14px;border:1px solid #eef2f6;"><div style="font-size:0.65rem;text-transform:uppercase;color:#94a3b8;font-weight:600;">Niveau d\'études</div><div style="font-size:0.95rem;font-weight:600;color:#0a2a44;margin-top:2px;">{{ education }}</div></div><div style="display:table-cell;background:#f8fafc;border-radius:10px;padding:10px 14px;border:1px solid #eef2f6;"><div style="font-size:0.65rem;text-transform:uppercase;color:#94a3b8;font-weight:600;">Expérience</div><div style="font-size:0.95rem;font-weight:600;color:#0a2a44;margin-top:2px;">{{ experience }}</div></div></div><p style="margin-top:16px;font-size:0.9rem;"><strong>Compétences :</strong> {{ skills }}</p><p style="font-size:0.9rem;"><strong>Motivation :</strong> {{ motivation }}</p><p style="margin-top:16px;font-size:0.9rem;"><strong>📄 Documents fournis :</strong><br>{{ documents_html }}</p>'
      },
      application_received: {
        title: '✅ Candidature bien reçue',
        message: '<p>Bonjour <strong>{{ user_name }}</strong>,</p><p>Nous avons bien reçu votre candidature pour un poste d\'administrateur sur <strong>SINE.SH♡P</strong>. Notre équipe l\'examine et reviendra vers vous par email dans les meilleurs délais.</p>',
        button: 'RETOUR À L\'ACCUEIL',
        dynamic: '<div style="line-height:1px;">&nbsp;</div>'
      },
      product_published: {
        title: '🎉 Votre produit est en ligne',
        message: '<p>Bonjour <strong>{{ user_name }}</strong>,</p><p>Votre produit <strong>{{ product_name }}</strong> est désormais publié et visible par tous les acheteurs de <strong>SINE.SH♡P</strong>.</p>',
        button: 'GÉRER MES PRODUITS',
        dynamic: '<div style="display:table;width:100%;"><div style="display:table-cell;background:#f8fafc;border-radius:10px;padding:10px 14px;border:1px solid #eef2f6;"><div style="font-size:0.65rem;text-transform:uppercase;color:#94a3b8;font-weight:600;">Produit</div><div style="font-size:0.95rem;font-weight:600;color:#0a2a44;margin-top:2px;">{{ product_name }}</div></div><div style="display:table-cell;background:#f8fafc;border-radius:10px;padding:10px 14px;border:1px solid #eef2f6;"><div style="font-size:0.65rem;text-transform:uppercase;color:#94a3b8;font-weight:600;">Prix</div><div style="font-size:0.95rem;font-weight:600;color:#0a2a44;margin-top:2px;">{{ product_price }}</div></div></div>'
      },
      kyc_approved: {
        title: '✅ Identité vérifiée',
        message: '<p>Bonjour <strong>{{ user_name }}</strong>,</p><p>Votre pièce d\'identité a été vérifiée avec succès. Votre compte affiche désormais le badge "Vérifié" sur <strong>SINE.SH♡P</strong>.</p>',
        button: 'ACCÉDER À MON ESPACE',
        dynamic: '<div style="line-height:1px;">&nbsp;</div>'
      },
      kyc_rejected: {
        title: '❌ Vérification d\'identité refusée',
        message: '<p>Bonjour <strong>{{ user_name }}</strong>,</p><p>Nous n\'avons pas pu valider votre pièce d\'identité. Vous pouvez soumettre de nouveaux documents depuis votre espace.</p>',
        button: 'SOUMETTRE À NOUVEAU',
        dynamic: '{{ review_note_html }}'
      },
      account_action_submitted: {
        title: '📨 Votre demande a bien été reçue',
        message: '<p>Bonjour <strong>{{ user_name }}</strong>,</p><p>Nous avons bien reçu votre demande de <strong>{{ action_label }}</strong>. Elle est actuellement en cours de validation par notre équipe.</p>',
        button: 'RETOUR À LA CONNEXION',
        dynamic: '<p style="margin:0;">⏳ Vous recevrez un nouvel email dès qu\'une décision aura été prise.</p>'
      },
      account_action_approved: {
        title: '✅ Votre demande a été traitée',
        message: '<p>Bonjour <strong>{{ user_name }}</strong>,</p><p>Votre demande de <strong>{{ action_label }}</strong> a été approuvée et appliquée par notre équipe.</p>',
        button: 'RETOUR À L\'ACCUEIL',
        dynamic: '<div style="line-height:1px;">&nbsp;</div>'
      },
      account_action_rejected: {
        title: '↩️ Votre demande a été refusée',
        message: '<p>Bonjour <strong>{{ user_name }}</strong>,</p><p>Votre demande de <strong>{{ action_label }}</strong> a été examinée et refusée par notre équipe. Votre compte reste actif normalement.</p>',
        button: 'RETOUR À L\'ACCUEIL',
        dynamic: '<div style="line-height:1px;">&nbsp;</div>'
      }
    }
  },
  en: {
    preheader: 'Welcome to SINE.SH♡P. Your account is almost ready.',
    slogan: 'SHOP • RESERVE • CONNECT',
    services_title: '✨ Why choose SINE.SH♡P?',
    services: ['Secure payments', 'Fast delivery', 'Easy booking', 'Integrated messaging', '24/7 Support', 'Verified sellers'],
    social_label: 'Follow us',
    support_title: '💬 Need help?',
    footer_year: '© 2026 SINE.SH♡P',
    footer_location: 'Abidjan, Côte d\'Ivoire',
    legal_cgu: 'Terms of Use',
    legal_privacy: 'Privacy Policy',
    legal_preferences: 'Email preferences',
    legal_unsubscribe: 'Unsubscribe',
    website_url: process.env.FRONTEND_URL || 'https://www.sineshophome.com',
    variables: {
      welcome: { title: 'Welcome to SINE.SH♡P', message: '<p>Hello <strong>{{ user_name }}</strong>,</p><p>Thank you for joining <strong>SINE.SH♡P</strong>. Your account has been created successfully.</p>', button: 'START THE JOURNEY', dynamic: '<div style="line-height:1px;">&nbsp;</div>' },
      verify: { title: 'Verify your email address', message: '<p>Hello <strong>{{ user_name }}</strong>,</p><p>To finalize your registration on <strong>SINE.SH♡P</strong>, please verify your email using the code below.</p>', button: 'VERIFY MY ADDRESS', dynamic: '<div style="font-family:Courier New,monospace;font-size:2rem;font-weight:700;text-align:center;color:#0a2a44;letter-spacing:8px;padding:14px;background:#f8fafc;border-radius:12px;border:1px dashed #dce3ed;margin-bottom:12px;">{{ otp_code }}</div><div style="text-align:center;font-size:0.85rem;color:#94a3b8;">⏳ Expires in <strong>{{ expiry_minutes }}</strong></div><div style="text-align:center;font-size:0.78rem;color:#b45309;margin-top:8px;">🔒 This code is confidential. Never share it with anyone, not even SINE.SH♡P staff.</div>' },
      password: { title: 'Password reset', message: '<p>Hello <strong>{{ user_name }}</strong>,</p><p>We received a request to reset your <strong>SINE.SH♡P</strong> password. Use the code below.</p>', button: 'RESET MY PASSWORD', dynamic: '<div style="font-family:Courier New,monospace;font-size:2rem;font-weight:700;text-align:center;color:#0a2a44;letter-spacing:8px;padding:14px;background:#f8fafc;border-radius:12px;border:1px dashed #dce3ed;margin-bottom:12px;">{{ otp_code }}</div><div style="text-align:center;font-size:0.85rem;color:#94a3b8;">⏳ Expires in <strong>{{ expiry_minutes }}</strong></div><div style="text-align:center;font-size:0.78rem;color:#b45309;margin-top:8px;">🔒 This code is confidential. Never share it with anyone, not even SINE.SH♡P staff.</div>' },
      security_code_reset: { title: '🔐 Confidentiality code reset', message: '<p>Hello <strong>{{ user_name }}</strong>,</p><p>A reset request for your <strong>confidentiality code</strong> (SINE.SH♡P admin access) was made. Click the button below to set a new one.</p>', button: 'RESET MY CODE', dynamic: '<div style="text-align:center;font-size:0.85rem;color:#94a3b8;">⏳ This link expires in <strong>10 minutes</strong> and can only be used once.</div><div style="text-align:center;font-size:0.78rem;color:#b45309;margin-top:8px;">🔒 If you didn\'t request this, ignore this email — your current code stays unchanged.</div>' },
      otp: { title: '🔐 Security code', message: '<p>Hello <strong>{{ user_name }}</strong>,</p><p>Use the code below to log in to your <strong>SINE.SH♡P</strong> account.</p>', button: 'LOG IN', dynamic: '<div style="font-family:Courier New,monospace;font-size:2rem;font-weight:700;text-align:center;color:#0a2a44;letter-spacing:8px;padding:14px;background:#f8fafc;border-radius:12px;border:1px dashed #dce3ed;margin-bottom:12px;">{{ otp_code }}</div><div style="text-align:center;font-size:0.85rem;color:#94a3b8;">⏳ Expires in <strong>{{ expiry_minutes }}</strong></div><div style="text-align:center;font-size:0.78rem;color:#b45309;margin-top:8px;">🔒 This code is confidential. Never share it with anyone, not even SINE.SH♡P staff.</div>' },
      order: { title: '📦 Your order is confirmed', message: '<p>Hello <strong>{{ user_name }}</strong>,</p><p>Your order on <strong>SINE.SH♡P</strong> has been confirmed.</p>', button: 'VIEW MY ORDER', dynamic: '<div style="display:table;width:100%;"><div style="display:table-cell;background:#f8fafc;border-radius:10px;padding:10px 14px;border:1px solid #eef2f6;"><div style="font-size:0.65rem;text-transform:uppercase;color:#94a3b8;font-weight:600;">Order number</div><div style="font-size:0.95rem;font-weight:600;color:#0a2a44;margin-top:2px;">{{ order_number }}</div></div><div style="display:table-cell;background:#f8fafc;border-radius:10px;padding:10px 14px;border:1px solid #eef2f6;"><div style="font-size:0.65rem;text-transform:uppercase;color:#94a3b8;font-weight:600;">Amount</div><div style="font-size:0.95rem;font-weight:600;color:#0a2a44;margin-top:2px;">{{ order_amount }}</div></div></div>' },
      payment_confirmed: { title: '💳 Payment confirmed', message: '<p>Hello <strong>{{ user_name }}</strong>,</p><p>We confirm receipt of your payment for order <strong>{{ order_number }}</strong>.</p>', button: 'VIEW MY ORDER', dynamic: '<div style="display:table;width:100%;"><div style="display:table-cell;background:#f8fafc;border-radius:10px;padding:10px 14px;border:1px solid #eef2f6;"><div style="font-size:0.65rem;text-transform:uppercase;color:#94a3b8;font-weight:600;">Amount paid</div><div style="font-size:0.95rem;font-weight:600;color:#0a2a44;margin-top:2px;">{{ paid_amount }}</div></div><div style="display:table-cell;background:#f8fafc;border-radius:10px;padding:10px 14px;border:1px solid #eef2f6;"><div style="font-size:0.65rem;text-transform:uppercase;color:#94a3b8;font-weight:600;">Method</div><div style="font-size:0.95rem;font-weight:600;color:#0a2a44;margin-top:2px;">{{ payment_method }}</div></div></div>' },
      payment_failed: { title: '❌ Payment declined', message: '<p>Hello <strong>{{ user_name }}</strong>,</p><p>We encountered an issue processing your payment for order <strong>{{ order_number }}</strong>.</p>', button: 'RETRY PAYMENT', dynamic: '<div style="background:#fee2e2;border-radius:12px;padding:16px;text-align:center;"><p style="color:#dc2626;font-weight:600;">⚠️ Your payment could not be processed</p></div>' },
      shipped: { title: '📦 Your order has been shipped', message: '<p>Hello <strong>{{ user_name }}</strong>,</p><p>Your order <strong>{{ order_number }}</strong> has been shipped!</p>', button: 'TRACK MY DELIVERY', dynamic: '<div style="display:table;width:100%;"><div style="display:table-cell;background:#f8fafc;border-radius:10px;padding:10px 14px;border:1px solid #eef2f6;"><div style="font-size:0.65rem;text-transform:uppercase;color:#94a3b8;font-weight:600;">Carrier</div><div style="font-size:0.95rem;font-weight:600;color:#0a2a44;margin-top:2px;">{{ carrier }}</div></div><div style="display:table-cell;background:#f8fafc;border-radius:10px;padding:10px 14px;border:1px solid #eef2f6;"><div style="font-size:0.65rem;text-transform:uppercase;color:#94a3b8;font-weight:600;">Estimate</div><div style="font-size:0.95rem;font-weight:600;color:#0a2a44;margin-top:2px;">{{ estimated_delivery }}</div></div></div>' },
      delivered: { title: '🚚 Delivery completed', message: '<p>Hello <strong>{{ user_name }}</strong>,</p><p>Your order <strong>{{ order_number }}</strong> has been delivered successfully!</p>', button: 'LEAVE A REVIEW', dynamic: '<div style="background:#dcfce7;border-radius:12px;padding:16px;text-align:center;"><p style="color:#16a34a;font-weight:600;">✅ Delivery completed</p></div>' },
      message: { title: '💬 New message', message: '<p>Hello <strong>{{ user_name }}</strong>,</p><p>You have received a new message from <strong>{{ sender_name }}</strong>.</p>', button: 'REPLY TO MESSAGE', dynamic: '<div style="background:#f8fafc;border-radius:12px;padding:14px 18px;border-left:4px solid #2d73ff;"><p style="font-size:0.9rem;color:#2f3a4a;">"{{ message_preview }}"</p></div>' },
      favorite: { title: '❤️ New favorite', message: '<p>Hello <strong>{{ user_name }}</strong>,</p><p>Your item <strong>"{{ product_name }}"</strong> has been added to favorites.</p>', button: 'VIEW MY PRODUCTS', dynamic: '<div style="text-align:center;padding:12px 0;"><div style="font-size:3rem;">❤️</div></div>' },
      new_seller: { title: '🏪 Welcome, seller!', message: '<p>Hello <strong>{{ user_name }}</strong>,</p><p>Your shop <strong>{{ seller_name }}</strong> is now active on SINE.SH♡P.</p>', button: 'MANAGE MY SHOP', dynamic: '<div style="background:#dcfce7;color:#16a34a;padding:10px;border-radius:30px;text-align:center;font-weight:600;">✅ Shop verified</div>' },
      promo: { title: '📢 Special promotion', message: '<p>Hello <strong>{{ user_name }}</strong>,</p><p>Enjoy <strong>{{ discount_percent }}% off</strong> until {{ promo_end_date }}.</p>', button: 'GET THE OFFER', dynamic: '<div style="background:linear-gradient(135deg,#fef3c7,#fde68a);border-radius:12px;padding:20px;text-align:center;"><p style="font-size:1.8rem;font-weight:700;color:#d97706;">{{ discount_percent }}% OFF</p><p>Code: <strong>{{ promo_code }}</strong></p></div>' },
      review: { title: '⭐ Leave a review', message: '<p>Hello <strong>{{ user_name }}</strong>,</p><p>You recently purchased an item on SINE.SH♡P. We would like to know your opinion.</p>', button: 'LEAVE A REVIEW', dynamic: '<div style="text-align:center;padding:12px 0;"><div style="font-size:3rem;">⭐</div></div>' },
      alert: { title: '🚨 Security alert', message: '<p>Hello <strong>{{ user_name }}</strong>,</p><p>We detected a new login to your account.</p>', button: 'SECURE MY ACCOUNT', dynamic: '<div style="background:#fee2e2;border-radius:12px;padding:16px;"><p style="font-size:0.85rem;color:#991b1b;">Device: {{ device }}</p><p style="font-size:0.85rem;color:#991b1b;">Date: {{ alert_date }}</p></div>' },
      reservation: { title: '📅 Reservation confirmed', message: '<p>Hello <strong>{{ user_name }}</strong>,</p><p>Your reservation for <strong>{{ product_name }}</strong> is confirmed.</p>', button: 'VIEW MY RESERVATION', dynamic: '<div style="display:table;width:100%;"><div style="display:table-cell;background:#f8fafc;border-radius:10px;padding:10px 14px;border:1px solid #eef2f6;"><div style="font-size:0.65rem;text-transform:uppercase;color:#94a3b8;font-weight:600;">From</div><div style="font-size:0.95rem;font-weight:600;color:#0a2a44;margin-top:2px;">{{ start_date }}</div></div><div style="display:table-cell;background:#f8fafc;border-radius:10px;padding:10px 14px;border:1px solid #eef2f6;"><div style="font-size:0.65rem;text-transform:uppercase;color:#94a3b8;font-weight:600;">To</div><div style="font-size:0.95rem;font-weight:600;color:#0a2a44;margin-top:2px;">{{ end_date }}</div></div></div>' },
      affiliation: { title: '💸 SINE.SH♡P Affiliate Program', message: '<p>Hello <strong>{{ user_name }}</strong>,</p><p>{{ affiliation_message }}</p>', button: 'VIEW MY AFFILIATE SPACE', dynamic: '<div style="display:table;width:100%;"><div style="display:table-cell;background:#f8fafc;border-radius:10px;padding:10px 14px;border:1px solid #eef2f6;"><div style="font-size:0.65rem;text-transform:uppercase;color:#94a3b8;font-weight:600;">Amount</div><div style="font-size:0.95rem;font-weight:600;color:#0a2a44;margin-top:2px;">{{ amount }}</div></div><div style="display:table-cell;background:#f8fafc;border-radius:10px;padding:10px 14px;border:1px solid #eef2f6;"><div style="font-size:0.65rem;text-transform:uppercase;color:#94a3b8;font-weight:600;">Total balance</div><div style="font-size:0.95rem;font-weight:600;color:#0a2a44;margin-top:2px;">{{ total_balance }}</div></div></div>' },
      admin_application: { title: '🛡️ New Administrator application', message: '<p>A new administrator access request was submitted on <strong>SINE.SH♡P</strong> by <strong>{{ user_name }}</strong>.</p>', button: 'REPLY TO CANDIDATE', dynamic: '<div style="display:table;width:100%;"><div style="display:table-cell;background:#f8fafc;border-radius:10px;padding:10px 14px;border:1px solid #eef2f6;"><div style="font-size:0.65rem;text-transform:uppercase;color:#94a3b8;font-weight:600;">Full name</div><div style="font-size:0.95rem;font-weight:600;color:#0a2a44;margin-top:2px;">{{ firstname }} {{ lastname }}</div></div><div style="display:table-cell;background:#f8fafc;border-radius:10px;padding:10px 14px;border:1px solid #eef2f6;"><div style="font-size:0.65rem;text-transform:uppercase;color:#94a3b8;font-weight:600;">Email</div><div style="font-size:0.95rem;font-weight:600;color:#0a2a44;margin-top:2px;">{{ email }}</div></div><div style="display:table-cell;background:#f8fafc;border-radius:10px;padding:10px 14px;border:1px solid #eef2f6;"><div style="font-size:0.65rem;text-transform:uppercase;color:#94a3b8;font-weight:600;">Phone</div><div style="font-size:0.95rem;font-weight:600;color:#0a2a44;margin-top:2px;">{{ phone }}</div></div><div style="display:table-cell;background:#f8fafc;border-radius:10px;padding:10px 14px;border:1px solid #eef2f6;"><div style="font-size:0.65rem;text-transform:uppercase;color:#94a3b8;font-weight:600;">Date of birth</div><div style="font-size:0.95rem;font-weight:600;color:#0a2a44;margin-top:2px;">{{ birthdate }}</div></div><div style="display:table-cell;background:#f8fafc;border-radius:10px;padding:10px 14px;border:1px solid #eef2f6;"><div style="font-size:0.65rem;text-transform:uppercase;color:#94a3b8;font-weight:600;">Gender</div><div style="font-size:0.95rem;font-weight:600;color:#0a2a44;margin-top:2px;">{{ gender }}</div></div><div style="display:table-cell;background:#f8fafc;border-radius:10px;padding:10px 14px;border:1px solid #eef2f6;"><div style="font-size:0.65rem;text-transform:uppercase;color:#94a3b8;font-weight:600;">Marital status</div><div style="font-size:0.95rem;font-weight:600;color:#0a2a44;margin-top:2px;">{{ marital }}</div></div><div style="display:table-cell;background:#f8fafc;border-radius:10px;padding:10px 14px;border:1px solid #eef2f6;"><div style="font-size:0.65rem;text-transform:uppercase;color:#94a3b8;font-weight:600;">Children</div><div style="font-size:0.95rem;font-weight:600;color:#0a2a44;margin-top:2px;">{{ children }}</div></div><div style="display:table-cell;background:#f8fafc;border-radius:10px;padding:10px 14px;border:1px solid #eef2f6;"><div style="font-size:0.65rem;text-transform:uppercase;color:#94a3b8;font-weight:600;">Address</div><div style="font-size:0.95rem;font-weight:600;color:#0a2a44;margin-top:2px;">{{ address }}, {{ city }}, {{ country }}</div></div><div style="display:table-cell;background:#f8fafc;border-radius:10px;padding:10px 14px;border:1px solid #eef2f6;"><div style="font-size:0.65rem;text-transform:uppercase;color:#94a3b8;font-weight:600;">Education</div><div style="font-size:0.95rem;font-weight:600;color:#0a2a44;margin-top:2px;">{{ education }}</div></div><div style="display:table-cell;background:#f8fafc;border-radius:10px;padding:10px 14px;border:1px solid #eef2f6;"><div style="font-size:0.65rem;text-transform:uppercase;color:#94a3b8;font-weight:600;">Experience</div><div style="font-size:0.95rem;font-weight:600;color:#0a2a44;margin-top:2px;">{{ experience }}</div></div></div><p style="margin-top:16px;font-size:0.9rem;"><strong>Skills:</strong> {{ skills }}</p><p style="font-size:0.9rem;"><strong>Motivation:</strong> {{ motivation }}</p><p style="margin-top:16px;font-size:0.9rem;"><strong>📄 Documents provided:</strong><br>{{ documents_html }}</p>' },
      application_received: { title: '✅ Application received', message: '<p>Hello <strong>{{ user_name }}</strong>,</p><p>We have received your administrator application for <strong>SINE.SH♡P</strong>. Our team is reviewing it and will get back to you by email as soon as possible.</p>', button: 'BACK TO HOME', dynamic: '<div style="line-height:1px;">&nbsp;</div>' },
      product_published: { title: '🎉 Your product is live', message: '<p>Hello <strong>{{ user_name }}</strong>,</p><p>Your product <strong>{{ product_name }}</strong> is now published and visible to all <strong>SINE.SH♡P</strong> buyers.</p>', button: 'MANAGE MY PRODUCTS', dynamic: '<div style="display:table;width:100%;"><div style="display:table-cell;background:#f8fafc;border-radius:10px;padding:10px 14px;border:1px solid #eef2f6;"><div style="font-size:0.65rem;text-transform:uppercase;color:#94a3b8;font-weight:600;">Product</div><div style="font-size:0.95rem;font-weight:600;color:#0a2a44;margin-top:2px;">{{ product_name }}</div></div><div style="display:table-cell;background:#f8fafc;border-radius:10px;padding:10px 14px;border:1px solid #eef2f6;"><div style="font-size:0.65rem;text-transform:uppercase;color:#94a3b8;font-weight:600;">Price</div><div style="font-size:0.95rem;font-weight:600;color:#0a2a44;margin-top:2px;">{{ product_price }}</div></div></div>' },
      kyc_approved: { title: '✅ Identity verified', message: '<p>Hello <strong>{{ user_name }}</strong>,</p><p>Your ID document has been successfully verified. Your account now shows the "Verified" badge on <strong>SINE.SH♡P</strong>.</p>', button: 'GO TO MY ACCOUNT', dynamic: '<div style="line-height:1px;">&nbsp;</div>' },
      kyc_rejected: { title: '❌ Identity verification declined', message: '<p>Hello <strong>{{ user_name }}</strong>,</p><p>We were unable to validate your ID document. You can submit new documents from your account.</p>', button: 'SUBMIT AGAIN', dynamic: '{{ review_note_html }}' },
      account_action_submitted: { title: '📨 Your request has been received', message: '<p>Hello <strong>{{ user_name }}</strong>,</p><p>We have received your <strong>{{ action_label }}</strong> request. It is currently being reviewed by our team.</p>', button: 'BACK TO LOGIN', dynamic: '<p style="margin:0;">⏳ You will receive a new email as soon as a decision has been made.</p>' },
      account_action_approved: { title: '✅ Your request has been processed', message: '<p>Hello <strong>{{ user_name }}</strong>,</p><p>Your <strong>{{ action_label }}</strong> request has been approved and applied by our team.</p>', button: 'BACK TO HOME', dynamic: '<div style="line-height:1px;">&nbsp;</div>' },
      account_action_rejected: { title: '↩️ Your request has been declined', message: '<p>Hello <strong>{{ user_name }}</strong>,</p><p>Your <strong>{{ action_label }}</strong> request has been reviewed and declined by our team. Your account remains active as normal.</p>', button: 'BACK TO HOME', dynamic: '<div style="line-height:1px;">&nbsp;</div>' }
    }
  },
  es: {
    preheader: 'Bienvenido a SINE.SH♡P. Tu cuenta está casi lista.',
    slogan: 'SHOP • RESERVE • CONNECT',
    services_title: '✨ ¿Por qué elegir SINE.SH♡P?',
    services: ['Pagos seguros', 'Entrega rápida', 'Reserva fácil', 'Mensajería integrada', 'Soporte 24/7', 'Vendedores verificados'],
    social_label: 'Síguenos',
    support_title: '💬 ¿Necesitas ayuda?',
    footer_year: '© 2026 SINE.SH♡P',
    footer_location: 'Abidjan, Costa de Marfil',
    legal_cgu: 'Términos de Uso',
    legal_privacy: 'Política de Privacidad',
    legal_preferences: 'Preferencias de correo',
    legal_unsubscribe: 'Cancelar suscripción',
    website_url: process.env.FRONTEND_URL || 'https://www.sineshophome.com',
    variables: {
      welcome: { title: 'Bienvenido a SINE.SH♡P', message: '<p>Hola <strong>{{ user_name }}</strong>,</p><p>Gracias por unirte a <strong>SINE.SH♡P</strong>. Tu cuenta ha sido creada exitosamente.</p>', button: 'COMENZAR LA AVENTURA', dynamic: '<div style="line-height:1px;">&nbsp;</div>' },
      verify: { title: 'Verifica tu correo', message: '<p>Hola <strong>{{ user_name }}</strong>,</p><p>Para finalizar tu registro en <strong>SINE.SH♡P</strong>, verifica tu correo con el código a continuación.</p>', button: 'VERIFICAR MI DIRECCIÓN', dynamic: '<div style="font-family:Courier New,monospace;font-size:2rem;font-weight:700;text-align:center;color:#0a2a44;letter-spacing:8px;padding:14px;background:#f8fafc;border-radius:12px;border:1px dashed #dce3ed;margin-bottom:12px;">{{ otp_code }}</div><div style="text-align:center;font-size:0.85rem;color:#94a3b8;">⏳ Expira en <strong>{{ expiry_minutes }}</strong></div><div style="text-align:center;font-size:0.78rem;color:#b45309;margin-top:8px;">🔒 Este código es confidencial. Nunca lo compartas con nadie, ni siquiera con el equipo de SINE.SH♡P.</div>' },
      password: { title: 'Restablecer contraseña', message: '<p>Hola <strong>{{ user_name }}</strong>,</p><p>Recibimos una solicitud para restablecer tu contraseña. Usa el código a continuación.</p>', button: 'RESTABLECER MI CONTRASEÑA', dynamic: '<div style="font-family:Courier New,monospace;font-size:2rem;font-weight:700;text-align:center;color:#0a2a44;letter-spacing:8px;padding:14px;background:#f8fafc;border-radius:12px;border:1px dashed #dce3ed;margin-bottom:12px;">{{ otp_code }}</div><div style="text-align:center;font-size:0.85rem;color:#94a3b8;">⏳ Expira en <strong>{{ expiry_minutes }}</strong></div><div style="text-align:center;font-size:0.78rem;color:#b45309;margin-top:8px;">🔒 Este código es confidencial. Nunca lo compartas con nadie, ni siquiera con el equipo de SINE.SH♡P.</div>' },
      security_code_reset: { title: '🔐 Restablecimiento del código de confidencialidad', message: '<p>Hola <strong>{{ user_name }}</strong>,</p><p>Se solicitó restablecer tu <strong>código de confidencialidad</strong> (acceso administrador SINE.SH♡P). Haz clic en el botón para definir uno nuevo.</p>', button: 'RESTABLECER MI CÓDIGO', dynamic: '<div style="text-align:center;font-size:0.85rem;color:#94a3b8;">⏳ Este enlace expira en <strong>10 minutos</strong> y solo puede usarse una vez.</div><div style="text-align:center;font-size:0.78rem;color:#b45309;margin-top:8px;">🔒 Si no solicitaste esto, ignora este correo — tu código actual permanece sin cambios.</div>' },
      otp: { title: '🔐 Código de seguridad', message: '<p>Hola <strong>{{ user_name }}</strong>,</p><p>Usa el código a continuación para iniciar sesión.</p>', button: 'INICIAR SESIÓN', dynamic: '<div style="font-family:Courier New,monospace;font-size:2rem;font-weight:700;text-align:center;color:#0a2a44;letter-spacing:8px;padding:14px;background:#f8fafc;border-radius:12px;border:1px dashed #dce3ed;margin-bottom:12px;">{{ otp_code }}</div><div style="text-align:center;font-size:0.85rem;color:#94a3b8;">⏳ Expira en <strong>{{ expiry_minutes }}</strong></div><div style="text-align:center;font-size:0.78rem;color:#b45309;margin-top:8px;">🔒 Este código es confidencial. Nunca lo compartas con nadie, ni siquiera con el equipo de SINE.SH♡P.</div>' },
      order: { title: '📦 Tu pedido está confirmado', message: '<p>Hola <strong>{{ user_name }}</strong>,</p><p>Tu pedido en <strong>SINE.SH♡P</strong> ha sido confirmado.</p>', button: 'VER MI PEDIDO', dynamic: '<div style="display:table;width:100%;"><div style="display:table-cell;background:#f8fafc;border-radius:10px;padding:10px 14px;border:1px solid #eef2f6;"><div style="font-size:0.65rem;text-transform:uppercase;color:#94a3b8;font-weight:600;">Número de pedido</div><div style="font-size:0.95rem;font-weight:600;color:#0a2a44;margin-top:2px;">{{ order_number }}</div></div><div style="display:table-cell;background:#f8fafc;border-radius:10px;padding:10px 14px;border:1px solid #eef2f6;"><div style="font-size:0.65rem;text-transform:uppercase;color:#94a3b8;font-weight:600;">Monto</div><div style="font-size:0.95rem;font-weight:600;color:#0a2a44;margin-top:2px;">{{ order_amount }}</div></div></div>' },
      payment_confirmed: { title: '💳 Pago confirmado', message: '<p>Hola <strong>{{ user_name }}</strong>,</p><p>Confirmamos la recepción de tu pago para el pedido <strong>{{ order_number }}</strong>.</p>', button: 'VER MI PEDIDO', dynamic: '<div style="display:table;width:100%;"><div style="display:table-cell;background:#f8fafc;border-radius:10px;padding:10px 14px;border:1px solid #eef2f6;"><div style="font-size:0.65rem;text-transform:uppercase;color:#94a3b8;font-weight:600;">Monto pagado</div><div style="font-size:0.95rem;font-weight:600;color:#0a2a44;margin-top:2px;">{{ paid_amount }}</div></div><div style="display:table-cell;background:#f8fafc;border-radius:10px;padding:10px 14px;border:1px solid #eef2f6;"><div style="font-size:0.65rem;text-transform:uppercase;color:#94a3b8;font-weight:600;">Método</div><div style="font-size:0.95rem;font-weight:600;color:#0a2a44;margin-top:2px;">{{ payment_method }}</div></div></div>' },
      payment_failed: { title: '❌ Pago rechazado', message: '<p>Hola <strong>{{ user_name }}</strong>,</p><p>Encontramos un problema al procesar tu pago para el pedido <strong>{{ order_number }}</strong>.</p>', button: 'REINTENTAR PAGO', dynamic: '<div style="background:#fee2e2;border-radius:12px;padding:16px;text-align:center;"><p style="color:#dc2626;font-weight:600;">⚠️ Tu pago no pudo ser procesado</p></div>' },
      shipped: { title: '📦 Tu pedido ha sido enviado', message: '<p>Hola <strong>{{ user_name }}</strong>,</p><p>¡Tu pedido <strong>{{ order_number }}</strong> ha sido enviado!</p>', button: 'RASTREAR MI ENTREGA', dynamic: '<div style="display:table;width:100%;"><div style="display:table-cell;background:#f8fafc;border-radius:10px;padding:10px 14px;border:1px solid #eef2f6;"><div style="font-size:0.65rem;text-transform:uppercase;color:#94a3b8;font-weight:600;">Transportista</div><div style="font-size:0.95rem;font-weight:600;color:#0a2a44;margin-top:2px;">{{ carrier }}</div></div><div style="display:table-cell;background:#f8fafc;border-radius:10px;padding:10px 14px;border:1px solid #eef2f6;"><div style="font-size:0.65rem;text-transform:uppercase;color:#94a3b8;font-weight:600;">Estimación</div><div style="font-size:0.95rem;font-weight:600;color:#0a2a44;margin-top:2px;">{{ estimated_delivery }}</div></div></div>' },
      delivered: { title: '🚚 Entrega completada', message: '<p>Hola <strong>{{ user_name }}</strong>,</p><p>¡Tu pedido <strong>{{ order_number }}</strong> ha sido entregado exitosamente!</p>', button: 'DEJAR UNA RESEÑA', dynamic: '<div style="background:#dcfce7;border-radius:12px;padding:16px;text-align:center;"><p style="color:#16a34a;font-weight:600;">✅ Entrega completada</p></div>' },
      message: { title: '💬 Nuevo mensaje', message: '<p>Hola <strong>{{ user_name }}</strong>,</p><p>Has recibido un nuevo mensaje de <strong>{{ sender_name }}</strong>.</p>', button: 'RESPONDER AL MENSAJE', dynamic: '<div style="background:#f8fafc;border-radius:12px;padding:14px 18px;border-left:4px solid #2d73ff;"><p style="font-size:0.9rem;color:#2f3a4a;">"{{ message_preview }}"</p></div>' },
      favorite: { title: '❤️ Nuevo favorito', message: '<p>Hola <strong>{{ user_name }}</strong>,</p><p>Tu artículo <strong>"{{ product_name }}"</strong> ha sido añadido a favoritos.</p>', button: 'VER MIS PRODUCTOS', dynamic: '<div style="text-align:center;padding:12px 0;"><div style="font-size:3rem;">❤️</div></div>' },
      new_seller: { title: '🏪 ¡Bienvenido, vendedor!', message: '<p>Hola <strong>{{ user_name }}</strong>,</p><p>Tu tienda <strong>{{ seller_name }}</strong> ya está activa en SINE.SH♡P.</p>', button: 'GESTIONAR MI TIENDA', dynamic: '<div style="background:#dcfce7;color:#16a34a;padding:10px;border-radius:30px;text-align:center;font-weight:600;">✅ Tienda verificada</div>' },
      promo: { title: '📢 Promoción especial', message: '<p>Hola <strong>{{ user_name }}</strong>,</p><p>Disfruta de <strong>{{ discount_percent }}% de descuento</strong> hasta el {{ promo_end_date }}.</p>', button: 'APROVECHAR LA OFERTA', dynamic: '<div style="background:linear-gradient(135deg,#fef3c7,#fde68a);border-radius:12px;padding:20px;text-align:center;"><p style="font-size:1.8rem;font-weight:700;color:#d97706;">{{ discount_percent }}% OFF</p><p>Código: <strong>{{ promo_code }}</strong></p></div>' },
      review: { title: '⭐ Deja una reseña', message: '<p>Hola <strong>{{ user_name }}</strong>,</p><p>Recientemente compraste un artículo en SINE.SH♡P. Nos gustaría conocer tu opinión.</p>', button: 'DEJAR UNA RESEÑA', dynamic: '<div style="text-align:center;padding:12px 0;"><div style="font-size:3rem;">⭐</div></div>' },
      alert: { title: '🚨 Alerta de seguridad', message: '<p>Hola <strong>{{ user_name }}</strong>,</p><p>Detectamos un nuevo inicio de sesión en tu cuenta.</p>', button: 'ASEGURAR MI CUENTA', dynamic: '<div style="background:#fee2e2;border-radius:12px;padding:16px;"><p style="font-size:0.85rem;color:#991b1b;">Dispositivo: {{ device }}</p><p style="font-size:0.85rem;color:#991b1b;">Fecha: {{ alert_date }}</p></div>' },
      reservation: { title: '📅 Reserva confirmada', message: '<p>Hola <strong>{{ user_name }}</strong>,</p><p>Tu reserva para <strong>{{ product_name }}</strong> está confirmada.</p>', button: 'VER MI RESERVA', dynamic: '<div style="display:table;width:100%;"><div style="display:table-cell;background:#f8fafc;border-radius:10px;padding:10px 14px;border:1px solid #eef2f6;"><div style="font-size:0.65rem;text-transform:uppercase;color:#94a3b8;font-weight:600;">Desde</div><div style="font-size:0.95rem;font-weight:600;color:#0a2a44;margin-top:2px;">{{ start_date }}</div></div><div style="display:table-cell;background:#f8fafc;border-radius:10px;padding:10px 14px;border:1px solid #eef2f6;"><div style="font-size:0.65rem;text-transform:uppercase;color:#94a3b8;font-weight:600;">Hasta</div><div style="font-size:0.95rem;font-weight:600;color:#0a2a44;margin-top:2px;">{{ end_date }}</div></div></div>' },
      affiliation: { title: '💸 Programa de afiliados SINE.SH♡P', message: '<p>Hola <strong>{{ user_name }}</strong>,</p><p>{{ affiliation_message }}</p>', button: 'VER MI ESPACIO DE AFILIADO', dynamic: '<div style="display:table;width:100%;"><div style="display:table-cell;background:#f8fafc;border-radius:10px;padding:10px 14px;border:1px solid #eef2f6;"><div style="font-size:0.65rem;text-transform:uppercase;color:#94a3b8;font-weight:600;">Monto</div><div style="font-size:0.95rem;font-weight:600;color:#0a2a44;margin-top:2px;">{{ amount }}</div></div><div style="display:table-cell;background:#f8fafc;border-radius:10px;padding:10px 14px;border:1px solid #eef2f6;"><div style="font-size:0.65rem;text-transform:uppercase;color:#94a3b8;font-weight:600;">Saldo total</div><div style="font-size:0.95rem;font-weight:600;color:#0a2a44;margin-top:2px;">{{ total_balance }}</div></div></div>' },
      admin_application: { title: '🛡️ Nueva candidatura de Administrador', message: '<p>Se ha enviado una nueva solicitud de acceso administrador en <strong>SINE.SH♡P</strong> por <strong>{{ user_name }}</strong>.</p>', button: 'RESPONDER AL CANDIDATO', dynamic: '<div style="display:table;width:100%;"><div style="display:table-cell;background:#f8fafc;border-radius:10px;padding:10px 14px;border:1px solid #eef2f6;"><div style="font-size:0.65rem;text-transform:uppercase;color:#94a3b8;font-weight:600;">Nombre completo</div><div style="font-size:0.95rem;font-weight:600;color:#0a2a44;margin-top:2px;">{{ firstname }} {{ lastname }}</div></div><div style="display:table-cell;background:#f8fafc;border-radius:10px;padding:10px 14px;border:1px solid #eef2f6;"><div style="font-size:0.65rem;text-transform:uppercase;color:#94a3b8;font-weight:600;">Email</div><div style="font-size:0.95rem;font-weight:600;color:#0a2a44;margin-top:2px;">{{ email }}</div></div><div style="display:table-cell;background:#f8fafc;border-radius:10px;padding:10px 14px;border:1px solid #eef2f6;"><div style="font-size:0.65rem;text-transform:uppercase;color:#94a3b8;font-weight:600;">Teléfono</div><div style="font-size:0.95rem;font-weight:600;color:#0a2a44;margin-top:2px;">{{ phone }}</div></div><div style="display:table-cell;background:#f8fafc;border-radius:10px;padding:10px 14px;border:1px solid #eef2f6;"><div style="font-size:0.65rem;text-transform:uppercase;color:#94a3b8;font-weight:600;">Fecha de nacimiento</div><div style="font-size:0.95rem;font-weight:600;color:#0a2a44;margin-top:2px;">{{ birthdate }}</div></div><div style="display:table-cell;background:#f8fafc;border-radius:10px;padding:10px 14px;border:1px solid #eef2f6;"><div style="font-size:0.65rem;text-transform:uppercase;color:#94a3b8;font-weight:600;">Sexo</div><div style="font-size:0.95rem;font-weight:600;color:#0a2a44;margin-top:2px;">{{ gender }}</div></div><div style="display:table-cell;background:#f8fafc;border-radius:10px;padding:10px 14px;border:1px solid #eef2f6;"><div style="font-size:0.65rem;text-transform:uppercase;color:#94a3b8;font-weight:600;">Estado civil</div><div style="font-size:0.95rem;font-weight:600;color:#0a2a44;margin-top:2px;">{{ marital }}</div></div><div style="display:table-cell;background:#f8fafc;border-radius:10px;padding:10px 14px;border:1px solid #eef2f6;"><div style="font-size:0.65rem;text-transform:uppercase;color:#94a3b8;font-weight:600;">Hijos</div><div style="font-size:0.95rem;font-weight:600;color:#0a2a44;margin-top:2px;">{{ children }}</div></div><div style="display:table-cell;background:#f8fafc;border-radius:10px;padding:10px 14px;border:1px solid #eef2f6;"><div style="font-size:0.65rem;text-transform:uppercase;color:#94a3b8;font-weight:600;">Dirección</div><div style="font-size:0.95rem;font-weight:600;color:#0a2a44;margin-top:2px;">{{ address }}, {{ city }}, {{ country }}</div></div><div style="display:table-cell;background:#f8fafc;border-radius:10px;padding:10px 14px;border:1px solid #eef2f6;"><div style="font-size:0.65rem;text-transform:uppercase;color:#94a3b8;font-weight:600;">Estudios</div><div style="font-size:0.95rem;font-weight:600;color:#0a2a44;margin-top:2px;">{{ education }}</div></div><div style="display:table-cell;background:#f8fafc;border-radius:10px;padding:10px 14px;border:1px solid #eef2f6;"><div style="font-size:0.65rem;text-transform:uppercase;color:#94a3b8;font-weight:600;">Experiencia</div><div style="font-size:0.95rem;font-weight:600;color:#0a2a44;margin-top:2px;">{{ experience }}</div></div></div><p style="margin-top:16px;font-size:0.9rem;"><strong>Habilidades:</strong> {{ skills }}</p><p style="font-size:0.9rem;"><strong>Motivación:</strong> {{ motivation }}</p><p style="margin-top:16px;font-size:0.9rem;"><strong>📄 Documentos proporcionados:</strong><br>{{ documents_html }}</p>' },
      application_received: { title: '✅ Candidatura recibida', message: '<p>Hola <strong>{{ user_name }}</strong>,</p><p>Hemos recibido su candidatura de administrador para <strong>SINE.SH♡P</strong>. Nuestro equipo la está revisando y le responderá por correo lo antes posible.</p>', button: 'VOLVER AL INICIO', dynamic: '<div style="line-height:1px;">&nbsp;</div>' },
      product_published: { title: '🎉 Su producto está en línea', message: '<p>Hola <strong>{{ user_name }}</strong>,</p><p>Su producto <strong>{{ product_name }}</strong> ya está publicado y visible para todos los compradores de <strong>SINE.SH♡P</strong>.</p>', button: 'GESTIONAR MIS PRODUCTOS', dynamic: '<div style="display:table;width:100%;"><div style="display:table-cell;background:#f8fafc;border-radius:10px;padding:10px 14px;border:1px solid #eef2f6;"><div style="font-size:0.65rem;text-transform:uppercase;color:#94a3b8;font-weight:600;">Producto</div><div style="font-size:0.95rem;font-weight:600;color:#0a2a44;margin-top:2px;">{{ product_name }}</div></div><div style="display:table-cell;background:#f8fafc;border-radius:10px;padding:10px 14px;border:1px solid #eef2f6;"><div style="font-size:0.65rem;text-transform:uppercase;color:#94a3b8;font-weight:600;">Precio</div><div style="font-size:0.95rem;font-weight:600;color:#0a2a44;margin-top:2px;">{{ product_price }}</div></div></div>' },
      kyc_approved: { title: '✅ Identidad verificada', message: '<p>Hola <strong>{{ user_name }}</strong>,</p><p>Su documento de identidad ha sido verificado con éxito. Su cuenta ahora muestra la insignia "Verificado" en <strong>SINE.SH♡P</strong>.</p>', button: 'IR A MI CUENTA', dynamic: '<div style="line-height:1px;">&nbsp;</div>' },
      kyc_rejected: { title: '❌ Verificación de identidad rechazada', message: '<p>Hola <strong>{{ user_name }}</strong>,</p><p>No pudimos validar su documento de identidad. Puede enviar nuevos documentos desde su cuenta.</p>', button: 'ENVIAR DE NUEVO', dynamic: '{{ review_note_html }}' },
      account_action_submitted: { title: '📨 Su solicitud ha sido recibida', message: '<p>Hola <strong>{{ user_name }}</strong>,</p><p>Hemos recibido su solicitud de <strong>{{ action_label }}</strong>. Está siendo revisada por nuestro equipo.</p>', button: 'VOLVER AL INICIO DE SESIÓN', dynamic: '<p style="margin:0;">⏳ Recibirá un nuevo correo en cuanto se tome una decisión.</p>' },
      account_action_approved: { title: '✅ Su solicitud ha sido procesada', message: '<p>Hola <strong>{{ user_name }}</strong>,</p><p>Su solicitud de <strong>{{ action_label }}</strong> ha sido aprobada y aplicada por nuestro equipo.</p>', button: 'VOLVER AL INICIO', dynamic: '<div style="line-height:1px;">&nbsp;</div>' },
      account_action_rejected: { title: '↩️ Su solicitud ha sido rechazada', message: '<p>Hola <strong>{{ user_name }}</strong>,</p><p>Su solicitud de <strong>{{ action_label }}</strong> ha sido revisada y rechazada por nuestro equipo. Su cuenta permanece activa con normalidad.</p>', button: 'VOLVER AL INICIO', dynamic: '<div style="line-height:1px;">&nbsp;</div>' }
    }
  },
  ar: {
    preheader: 'مرحباً بك في SINE.SH♡P. حسابك جاهز تقريباً.',
    slogan: 'تسوق • احجز • تواصل',
    services_title: '✨ لماذا تختار SINE.SH♡P؟',
    services: ['مدفوعات آمنة', 'توصيل سريع', 'حجز سهل', 'رسائل مدمجة', 'دعم 24/7', 'بائعون موثقون'],
    social_label: 'تابعنا',
    support_title: '💬 هل تحتاج مساعدة؟',
    footer_year: '© 2026 SINE.SH♡P',
    footer_location: 'أبيدجان، ساحل العاج',
    legal_cgu: 'شروط الاستخدام',
    legal_privacy: 'سياسة الخصوصية',
    legal_preferences: 'تفضيلات البريد',
    legal_unsubscribe: 'إلغاء الاشتراك',
    website_url: process.env.FRONTEND_URL || 'https://www.sineshophome.com',
    variables: {
      welcome: { title: 'مرحباً بك في SINE.SH♡P', message: '<p>مرحباً <strong>{{ user_name }}</strong>،</p><p>شكراً لانضمامك إلى SINE.SH♡P. تم إنشاء حسابك بنجاح.</p>', button: 'ابدأ المغامرة', dynamic: '<div style="line-height:1px;">&nbsp;</div>' },
      verify: { title: 'تحقق من بريدك الإلكتروني', message: '<p>مرحباً <strong>{{ user_name }}</strong>،</p><p>لإكمال تسجيلك، تحقق من بريدك باستخدام الرمز أدناه.</p>', button: 'تحقق من عنواني', dynamic: '<div style="font-family:Courier New,monospace;font-size:2rem;font-weight:700;text-align:center;color:#0a2a44;letter-spacing:8px;padding:14px;background:#f8fafc;border-radius:12px;border:1px dashed #dce3ed;margin-bottom:12px;">{{ otp_code }}</div><div style="text-align:center;font-size:0.85rem;color:#94a3b8;">⏳ ينتهي خلال <strong>{{ expiry_minutes }}</strong></div><div style="text-align:center;font-size:0.78rem;color:#b45309;margin-top:8px;">🔒 هذا الرمز سري. لا تشاركه مع أي شخص، حتى مع فريق SINE.SH♡P.</div>' },
      password: { title: 'إعادة تعيين كلمة المرور', message: '<p>مرحباً <strong>{{ user_name }}</strong>،</p><p>تلقينا طلباً لإعادة تعيين كلمة المرور. استخدم الرمز أدناه.</p>', button: 'إعادة تعيين كلمة المرور', dynamic: '<div style="font-family:Courier New,monospace;font-size:2rem;font-weight:700;text-align:center;color:#0a2a44;letter-spacing:8px;padding:14px;background:#f8fafc;border-radius:12px;border:1px dashed #dce3ed;margin-bottom:12px;">{{ otp_code }}</div><div style="text-align:center;font-size:0.85rem;color:#94a3b8;">⏳ ينتهي خلال <strong>{{ expiry_minutes }}</strong></div><div style="text-align:center;font-size:0.78rem;color:#b45309;margin-top:8px;">🔒 هذا الرمز سري. لا تشاركه مع أي شخص، حتى مع فريق SINE.SH♡P.</div>' },
      security_code_reset: { title: '🔐 إعادة تعيين رمز السرية', message: '<p>مرحباً <strong>{{ user_name }}</strong>،</p><p>تم تقديم طلب لإعادة تعيين <strong>رمز السرية</strong> الخاص بك (وصول إداري SINE.SH♡P). انقر على الزر أدناه لتعيين رمز جديد.</p>', button: 'إعادة تعيين رمزي', dynamic: '<div style="text-align:center;font-size:0.85rem;color:#94a3b8;">⏳ ينتهي هذا الرابط خلال <strong>10 دقائق</strong> ويمكن استخدامه مرة واحدة فقط.</div><div style="text-align:center;font-size:0.78rem;color:#b45309;margin-top:8px;">🔒 إذا لم تطلب هذا، تجاهل هذا البريد — رمزك الحالي يبقى دون تغيير.</div>' },
      otp: { title: '🔐 رمز الأمان', message: '<p>مرحباً <strong>{{ user_name }}</strong>،</p><p>استخدم الرمز أدناه لتسجيل الدخول.</p>', button: 'تسجيل الدخول', dynamic: '<div style="font-family:Courier New,monospace;font-size:2rem;font-weight:700;text-align:center;color:#0a2a44;letter-spacing:8px;padding:14px;background:#f8fafc;border-radius:12px;border:1px dashed #dce3ed;margin-bottom:12px;">{{ otp_code }}</div><div style="text-align:center;font-size:0.85rem;color:#94a3b8;">⏳ ينتهي خلال <strong>{{ expiry_minutes }}</strong></div><div style="text-align:center;font-size:0.78rem;color:#b45309;margin-top:8px;">🔒 هذا الرمز سري. لا تشاركه مع أي شخص، حتى مع فريق SINE.SH♡P.</div>' },
      order: { title: '📦 تم تأكيد طلبك', message: '<p>مرحباً <strong>{{ user_name }}</strong>،</p><p>تم تأكيد طلبك على SINE.SH♡P.</p>', button: 'عرض طلبي', dynamic: '<div style="display:table;width:100%;"><div style="display:table-cell;background:#f8fafc;border-radius:10px;padding:10px 14px;border:1px solid #eef2f6;"><div style="font-size:0.65rem;text-transform:uppercase;color:#94a3b8;font-weight:600;">رقم الطلب</div><div style="font-size:0.95rem;font-weight:600;color:#0a2a44;margin-top:2px;">{{ order_number }}</div></div><div style="display:table-cell;background:#f8fafc;border-radius:10px;padding:10px 14px;border:1px solid #eef2f6;"><div style="font-size:0.65rem;text-transform:uppercase;color:#94a3b8;font-weight:600;">المبلغ</div><div style="font-size:0.95rem;font-weight:600;color:#0a2a44;margin-top:2px;">{{ order_amount }}</div></div></div>' },
      payment_confirmed: { title: '💳 تم تأكيد الدفع', message: '<p>مرحباً <strong>{{ user_name }}</strong>،</p><p>نؤكد استلام دفعتك للطلب <strong>{{ order_number }}</strong>.</p>', button: 'عرض طلبي', dynamic: '<div style="display:table;width:100%;"><div style="display:table-cell;background:#f8fafc;border-radius:10px;padding:10px 14px;border:1px solid #eef2f6;"><div style="font-size:0.65rem;text-transform:uppercase;color:#94a3b8;font-weight:600;">المبلغ المدفوع</div><div style="font-size:0.95rem;font-weight:600;color:#0a2a44;margin-top:2px;">{{ paid_amount }}</div></div><div style="display:table-cell;background:#f8fafc;border-radius:10px;padding:10px 14px;border:1px solid #eef2f6;"><div style="font-size:0.65rem;text-transform:uppercase;color:#94a3b8;font-weight:600;">الطريقة</div><div style="font-size:0.95rem;font-weight:600;color:#0a2a44;margin-top:2px;">{{ payment_method }}</div></div></div>' },
      payment_failed: { title: '❌ تم رفض الدفع', message: '<p>مرحباً <strong>{{ user_name }}</strong>،</p><p>واجهنا مشكلة في معالجة دفعتك للطلب <strong>{{ order_number }}</strong>.</p>', button: 'إعادة محاولة الدفع', dynamic: '<div style="background:#fee2e2;border-radius:12px;padding:16px;text-align:center;"><p style="color:#dc2626;font-weight:600;">⚠️ تعذر معالجة دفعتك</p></div>' },
      shipped: { title: '📦 تم شحن طلبك', message: '<p>مرحباً <strong>{{ user_name }}</strong>،</p><p>تم شحن طلبك <strong>{{ order_number }}</strong>!</p>', button: 'تتبع توصيلتي', dynamic: '<div style="display:table;width:100%;"><div style="display:table-cell;background:#f8fafc;border-radius:10px;padding:10px 14px;border:1px solid #eef2f6;"><div style="font-size:0.65rem;text-transform:uppercase;color:#94a3b8;font-weight:600;">الناقل</div><div style="font-size:0.95rem;font-weight:600;color:#0a2a44;margin-top:2px;">{{ carrier }}</div></div><div style="display:table-cell;background:#f8fafc;border-radius:10px;padding:10px 14px;border:1px solid #eef2f6;"><div style="font-size:0.65rem;text-transform:uppercase;color:#94a3b8;font-weight:600;">التقدير</div><div style="font-size:0.95rem;font-weight:600;color:#0a2a44;margin-top:2px;">{{ estimated_delivery }}</div></div></div>' },
      delivered: { title: '🚚 تم التسليم', message: '<p>مرحباً <strong>{{ user_name }}</strong>،</p><p>تم تسليم طلبك <strong>{{ order_number }}</strong> بنجاح!</p>', button: 'اترك تقييماً', dynamic: '<div style="background:#dcfce7;border-radius:12px;padding:16px;text-align:center;"><p style="color:#16a34a;font-weight:600;">✅ تم التسليم</p></div>' },
      message: { title: '💬 رسالة جديدة', message: '<p>مرحباً <strong>{{ user_name }}</strong>،</p><p>لقد تلقيت رسالة جديدة من <strong>{{ sender_name }}</strong>.</p>', button: 'الرد على الرسالة', dynamic: '<div style="background:#f8fafc;border-radius:12px;padding:14px 18px;border-left:4px solid #2d73ff;"><p style="font-size:0.9rem;color:#2f3a4a;">"{{ message_preview }}"</p></div>' },
      favorite: { title: '❤️ مفضلة جديدة', message: '<p>مرحباً <strong>{{ user_name }}</strong>،</p><p>تمت إضافة منتجك <strong>"{{ product_name }}"</strong> إلى المفضلة.</p>', button: 'عرض منتجاتي', dynamic: '<div style="text-align:center;padding:12px 0;"><div style="font-size:3rem;">❤️</div></div>' },
      new_seller: { title: '🏪 مرحباً بك أيها البائع!', message: '<p>مرحباً <strong>{{ user_name }}</strong>،</p><p>متجرك <strong>{{ seller_name }}</strong> أصبح نشطاً الآن على SINE.SH♡P.</p>', button: 'إدارة متجري', dynamic: '<div style="background:#dcfce7;color:#16a34a;padding:10px;border-radius:30px;text-align:center;font-weight:600;">✅ متجر موثق</div>' },
      promo: { title: '📢 عرض ترويجي خاص', message: '<p>مرحباً <strong>{{ user_name }}</strong>،</p><p>استمتع بخصم <strong>{{ discount_percent }}%</strong> حتى {{ promo_end_date }}.</p>', button: 'استفد من العرض', dynamic: '<div style="background:linear-gradient(135deg,#fef3c7,#fde68a);border-radius:12px;padding:20px;text-align:center;"><p style="font-size:1.8rem;font-weight:700;color:#d97706;">{{ discount_percent }}% OFF</p><p>الرمز: <strong>{{ promo_code }}</strong></p></div>' },
      review: { title: '⭐ اترك تقييماً', message: '<p>مرحباً <strong>{{ user_name }}</strong>،</p><p>لقد اشتريت مؤخراً منتجاً من SINE.SH♡P. نود معرفة رأيك.</p>', button: 'اترك تقييماً', dynamic: '<div style="text-align:center;padding:12px 0;"><div style="font-size:3rem;">⭐</div></div>' },
      alert: { title: '🚨 تنبيه أمني', message: '<p>مرحباً <strong>{{ user_name }}</strong>،</p><p>اكتشفنا تسجيل دخول جديد إلى حسابك.</p>', button: 'تأمين حسابي', dynamic: '<div style="background:#fee2e2;border-radius:12px;padding:16px;"><p style="font-size:0.85rem;color:#991b1b;">الجهاز: {{ device }}</p><p style="font-size:0.85rem;color:#991b1b;">التاريخ: {{ alert_date }}</p></div>' },
      reservation: { title: '📅 تم تأكيد الحجز', message: '<p>مرحباً <strong>{{ user_name }}</strong>،</p><p>تم تأكيد حجزك لـ <strong>{{ product_name }}</strong>.</p>', button: 'عرض حجزي', dynamic: '<div style="display:table;width:100%;"><div style="display:table-cell;background:#f8fafc;border-radius:10px;padding:10px 14px;border:1px solid #eef2f6;"><div style="font-size:0.65rem;text-transform:uppercase;color:#94a3b8;font-weight:600;">من</div><div style="font-size:0.95rem;font-weight:600;color:#0a2a44;margin-top:2px;">{{ start_date }}</div></div><div style="display:table-cell;background:#f8fafc;border-radius:10px;padding:10px 14px;border:1px solid #eef2f6;"><div style="font-size:0.65rem;text-transform:uppercase;color:#94a3b8;font-weight:600;">إلى</div><div style="font-size:0.95rem;font-weight:600;color:#0a2a44;margin-top:2px;">{{ end_date }}</div></div></div>' },
      affiliation: { title: '💸 برنامج الإحالة SINE.SH♡P', message: '<p>مرحباً <strong>{{ user_name }}</strong>،</p><p>{{ affiliation_message }}</p>', button: 'عرض مساحة الإحالة الخاصة بي', dynamic: '<div style="display:table;width:100%;"><div style="display:table-cell;background:#f8fafc;border-radius:10px;padding:10px 14px;border:1px solid #eef2f6;"><div style="font-size:0.65rem;text-transform:uppercase;color:#94a3b8;font-weight:600;">المبلغ</div><div style="font-size:0.95rem;font-weight:600;color:#0a2a44;margin-top:2px;">{{ amount }}</div></div><div style="display:table-cell;background:#f8fafc;border-radius:10px;padding:10px 14px;border:1px solid #eef2f6;"><div style="font-size:0.65rem;text-transform:uppercase;color:#94a3b8;font-weight:600;">الرصيد الإجمالي</div><div style="font-size:0.95rem;font-weight:600;color:#0a2a44;margin-top:2px;">{{ total_balance }}</div></div></div>' },
      admin_application: { title: '🛡️ طلب مسؤول جديد', message: '<p>تم تقديم طلب وصول مسؤول جديد على <strong>SINE.SH♡P</strong> من قبل <strong>{{ user_name }}</strong>.</p>', button: 'الرد على المتقدم', dynamic: '<div style="display:table;width:100%;"><div style="display:table-cell;background:#f8fafc;border-radius:10px;padding:10px 14px;border:1px solid #eef2f6;"><div style="font-size:0.65rem;text-transform:uppercase;color:#94a3b8;font-weight:600;">الاسم الكامل</div><div style="font-size:0.95rem;font-weight:600;color:#0a2a44;margin-top:2px;">{{ firstname }} {{ lastname }}</div></div><div style="display:table-cell;background:#f8fafc;border-radius:10px;padding:10px 14px;border:1px solid #eef2f6;"><div style="font-size:0.65rem;text-transform:uppercase;color:#94a3b8;font-weight:600;">البريد الإلكتروني</div><div style="font-size:0.95rem;font-weight:600;color:#0a2a44;margin-top:2px;">{{ email }}</div></div><div style="display:table-cell;background:#f8fafc;border-radius:10px;padding:10px 14px;border:1px solid #eef2f6;"><div style="font-size:0.65rem;text-transform:uppercase;color:#94a3b8;font-weight:600;">الهاتف</div><div style="font-size:0.95rem;font-weight:600;color:#0a2a44;margin-top:2px;">{{ phone }}</div></div><div style="display:table-cell;background:#f8fafc;border-radius:10px;padding:10px 14px;border:1px solid #eef2f6;"><div style="font-size:0.65rem;text-transform:uppercase;color:#94a3b8;font-weight:600;">تاريخ الميلاد</div><div style="font-size:0.95rem;font-weight:600;color:#0a2a44;margin-top:2px;">{{ birthdate }}</div></div><div style="display:table-cell;background:#f8fafc;border-radius:10px;padding:10px 14px;border:1px solid #eef2f6;"><div style="font-size:0.65rem;text-transform:uppercase;color:#94a3b8;font-weight:600;">الجنس</div><div style="font-size:0.95rem;font-weight:600;color:#0a2a44;margin-top:2px;">{{ gender }}</div></div><div style="display:table-cell;background:#f8fafc;border-radius:10px;padding:10px 14px;border:1px solid #eef2f6;"><div style="font-size:0.65rem;text-transform:uppercase;color:#94a3b8;font-weight:600;">الحالة الاجتماعية</div><div style="font-size:0.95rem;font-weight:600;color:#0a2a44;margin-top:2px;">{{ marital }}</div></div><div style="display:table-cell;background:#f8fafc;border-radius:10px;padding:10px 14px;border:1px solid #eef2f6;"><div style="font-size:0.65rem;text-transform:uppercase;color:#94a3b8;font-weight:600;">الأطفال</div><div style="font-size:0.95rem;font-weight:600;color:#0a2a44;margin-top:2px;">{{ children }}</div></div><div style="display:table-cell;background:#f8fafc;border-radius:10px;padding:10px 14px;border:1px solid #eef2f6;"><div style="font-size:0.65rem;text-transform:uppercase;color:#94a3b8;font-weight:600;">العنوان</div><div style="font-size:0.95rem;font-weight:600;color:#0a2a44;margin-top:2px;">{{ address }}, {{ city }}, {{ country }}</div></div><div style="display:table-cell;background:#f8fafc;border-radius:10px;padding:10px 14px;border:1px solid #eef2f6;"><div style="font-size:0.65rem;text-transform:uppercase;color:#94a3b8;font-weight:600;">المستوى التعليمي</div><div style="font-size:0.95rem;font-weight:600;color:#0a2a44;margin-top:2px;">{{ education }}</div></div><div style="display:table-cell;background:#f8fafc;border-radius:10px;padding:10px 14px;border:1px solid #eef2f6;"><div style="font-size:0.65rem;text-transform:uppercase;color:#94a3b8;font-weight:600;">الخبرة</div><div style="font-size:0.95rem;font-weight:600;color:#0a2a44;margin-top:2px;">{{ experience }}</div></div></div><p style="margin-top:16px;font-size:0.9rem;"><strong>المهارات:</strong> {{ skills }}</p><p style="font-size:0.9rem;"><strong>الدافع:</strong> {{ motivation }}</p><p style="margin-top:16px;font-size:0.9rem;"><strong>📄 المستندات المقدمة:</strong><br>{{ documents_html }}</p>' },
      application_received: { title: '✅ تم استلام طلبك', message: '<p>مرحباً <strong>{{ user_name }}</strong>،</p><p>لقد استلمنا طلبك للانضمام كمسؤول على <strong>SINE.SH♡P</strong>. يقوم فريقنا بمراجعته وسيتواصل معك عبر البريد الإلكتروني في أقرب وقت ممكن.</p>', button: 'العودة إلى الصفحة الرئيسية', dynamic: '<div style="line-height:1px;">&nbsp;</div>' },
      product_published: { title: '🎉 منتجك أصبح متاحاً الآن', message: '<p>مرحباً <strong>{{ user_name }}</strong>،</p><p>تم نشر منتجك <strong>{{ product_name }}</strong> وهو الآن مرئي لجميع مشتري <strong>SINE.SH♡P</strong>.</p>', button: 'إدارة منتجاتي', dynamic: '<div style="display:table;width:100%;"><div style="display:table-cell;background:#f8fafc;border-radius:10px;padding:10px 14px;border:1px solid #eef2f6;"><div style="font-size:0.65rem;text-transform:uppercase;color:#94a3b8;font-weight:600;">المنتج</div><div style="font-size:0.95rem;font-weight:600;color:#0a2a44;margin-top:2px;">{{ product_name }}</div></div><div style="display:table-cell;background:#f8fafc;border-radius:10px;padding:10px 14px;border:1px solid #eef2f6;"><div style="font-size:0.65rem;text-transform:uppercase;color:#94a3b8;font-weight:600;">السعر</div><div style="font-size:0.95rem;font-weight:600;color:#0a2a44;margin-top:2px;">{{ product_price }}</div></div></div>' },
      kyc_approved: { title: '✅ تم التحقق من الهوية', message: '<p>مرحباً <strong>{{ user_name }}</strong>،</p><p>تم التحقق من وثيقة هويتك بنجاح. يعرض حسابك الآن شارة "موثّق" على <strong>SINE.SH♡P</strong>.</p>', button: 'الذهاب إلى حسابي', dynamic: '<div style="line-height:1px;">&nbsp;</div>' },
      kyc_rejected: { title: '❌ تم رفض التحقق من الهوية', message: '<p>مرحباً <strong>{{ user_name }}</strong>،</p><p>لم نتمكن من التحقق من وثيقة هويتك. يمكنك إرسال مستندات جديدة من حسابك.</p>', button: 'إرسال مجدداً', dynamic: '{{ review_note_html }}' },
      account_action_submitted: { title: '📨 تم استلام طلبك', message: '<p>مرحباً <strong>{{ user_name }}</strong>،</p><p>لقد استلمنا طلبك بخصوص <strong>{{ action_label }}</strong>. يقوم فريقنا حالياً بمراجعته.</p>', button: 'العودة إلى تسجيل الدخول', dynamic: '<p style="margin:0;">⏳ ستتلقى بريداً إلكترونياً جديداً بمجرد اتخاذ قرار.</p>' },
      account_action_approved: { title: '✅ تمت معالجة طلبك', message: '<p>مرحباً <strong>{{ user_name }}</strong>،</p><p>تمت الموافقة على طلبك بخصوص <strong>{{ action_label }}</strong> وتطبيقه من قبل فريقنا.</p>', button: 'العودة إلى الصفحة الرئيسية', dynamic: '<div style="line-height:1px;">&nbsp;</div>' },
      account_action_rejected: { title: '↩️ تم رفض طلبك', message: '<p>مرحباً <strong>{{ user_name }}</strong>،</p><p>تمت مراجعة طلبك بخصوص <strong>{{ action_label }}</strong> ورفضه من قبل فريقنا. يبقى حسابك نشطاً بشكل طبيعي.</p>', button: 'العودة إلى الصفحة الرئيسية', dynamic: '<div style="line-height:1px;">&nbsp;</div>' }
    }
  }
};

// =====================================================
// SQUELETTE HTML — en-tête bleu étoilé + cœur qui bat, IDENTIQUE
// pour tous les emails, quel que soit le type ou la langue.
// =====================================================
function wrapHtml(t, vars, contentHtml, lang) {
  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  const website = t.website_url || 'https://www.sineshophome.com';
  // Reconstruit pour correspondre EXACTEMENT à template-brevo-v2.html
  // (le fichier livré séparément pour import dans Brevo) — avant ce
  // correctif, cette fonction générait une version différente et moins
  // soignée : icônes réseaux sociaux en simples caractères texte (◎, f,
  // ♪...) au lieu de vraies images, et surtout AUCUNE protection contre
  // l'inversion des couleurs en mode sombre (le bug de fond blanc→noir
  // déjà diagnostiqué et corrigé dans le fichier Brevo, mais jamais
  // reporté ici — exactement le format que l'utilisateur reçoit tant que
  // BREVO_TEMPLATE_ID n'est pas configuré).
  return `<!DOCTYPE html>
<html lang="${lang}" dir="${dir}" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>SINE.SH♡P</title>
<style>
html,body{margin:0!important;padding:0!important;width:100%!important;min-width:100%!important;height:100%!important;background-color:#ffffff!important}
body{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;font-family:Arial,Helvetica,sans-serif}
table{border-spacing:0!important;border-collapse:collapse!important;mso-table-lspace:0pt!important;mso-table-rspace:0pt!important}
td{mso-table-lspace:0pt!important;mso-table-rspace:0pt!important}
img{-ms-interpolation-mode:bicubic;border:0;height:auto;line-height:100%;outline:none;text-decoration:none}
a{text-decoration:none}
.email-wrapper{width:600px;max-width:600px;margin:0 auto;background-color:#ffffff}
@media screen and (max-width:600px){
html,body{width:100%!important;min-width:100%!important;background-color:#ffffff!important}
.email-wrapper{width:100%!important;max-width:100%!important;margin:0!important;border-radius:0!important}
.sine-header{padding:34px 22px 44px!important}
.sine-logo{font-size:36px!important}
.sine-px{padding-left:22px!important;padding-right:22px!important}
.sine-services-cell{display:block!important;width:100%!important;padding:5px 0!important}
}
@media (prefers-color-scheme: dark){
body,.email-wrapper{background-color:#ffffff!important}
}
</style>
</head>
<body bgcolor="#ffffff" style="background-color:#ffffff;margin:0;padding:0;">
<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">${escapeHtml(t.preheader || '')}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="width:100%;background-color:#ffffff;">
<tr><td align="center" valign="top" bgcolor="#ffffff" style="padding:0;margin:0;background-color:#ffffff;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" class="email-wrapper" style="width:600px;max-width:600px;margin:0 auto;background-color:#ffffff;">
<tr><td class="sine-header" align="center" style="padding:48px 40px 54px;background-color:#5fa9e8;background-image:linear-gradient(180deg,#a9dcff 0%,#78bdf1 24%,#4d9cde 50%,#2f78bf 72%,#194f91 100%);">
<div class="sine-logo" style="font-family:Georgia,'Times New Roman',serif;font-size:44px;line-height:1;font-weight:700;letter-spacing:3px;">
<span style="color:#ffffff;">SINE.</span><span style="color:#1f6fe0;">SH</span><span style="color:#ff2d3d;">♡</span><span style="color:#ffffff;">P</span>
</div>
<div style="margin-top:12px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.5;font-weight:300;color:rgba(255,255,255,.90);letter-spacing:5px;text-transform:uppercase;">${escapeHtml(t.slogan || '')}</div>
<div style="margin-top:12px;font-family:Georgia,'Times New Roman',serif;font-size:13px;line-height:1.5;color:rgba(255,255,255,.72);">La life n'a jamais été aussi simple</div>
<div style="width:70px;height:2px;margin:20px auto 0;background-color:rgba(255,255,255,.55);"></div>
</td></tr>
<tr><td class="sine-px" style="padding:40px 40px 10px;">${contentHtml}</td></tr>
<tr><td class="sine-px" style="padding:30px 40px 8px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f1f5fb" style="width:100%;background-color:#f1f5fb;border-radius:16px;"><tr><td style="padding:22px 24px;">
<div style="font-family:Georgia,'Times New Roman',serif;font-size:18px;line-height:1.4;font-weight:600;color:#0a2a44;margin-bottom:12px;">${escapeHtml(t.services_title || '')}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<tr><td class="sine-services-cell" width="50%" style="padding:5px 8px 5px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#2f3a4a;vertical-align:top;">✓&nbsp; ${escapeHtml(t.services?.[0] || '')}</td><td class="sine-services-cell" width="50%" style="padding:5px 0 5px 8px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#2f3a4a;vertical-align:top;">✓&nbsp; ${escapeHtml(t.services?.[1] || '')}</td></tr>
<tr><td class="sine-services-cell" width="50%" style="padding:5px 8px 5px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#2f3a4a;vertical-align:top;">✓&nbsp; ${escapeHtml(t.services?.[2] || '')}</td><td class="sine-services-cell" width="50%" style="padding:5px 0 5px 8px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#2f3a4a;vertical-align:top;">✓&nbsp; ${escapeHtml(t.services?.[3] || '')}</td></tr>
<tr><td class="sine-services-cell" width="50%" style="padding:5px 8px 5px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#2f3a4a;vertical-align:top;">✓&nbsp; ${escapeHtml(t.services?.[4] || '')}</td><td class="sine-services-cell" width="50%" style="padding:5px 0 5px 8px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#2f3a4a;vertical-align:top;">✓&nbsp; ${escapeHtml(t.services?.[5] || '')}</td></tr>
</table></td></tr></table></td></tr>
<tr><td align="center" bgcolor="#ffffff" style="padding:28px 40px 14px;border-top:1px solid #eef2f6;background-color:#ffffff;">
<div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.5;text-transform:uppercase;letter-spacing:2px;color:#94a3b8;margin-bottom:16px;">${escapeHtml(t.social_label || '')}</div>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tr>
<td align="center" valign="middle" style="padding:0 5px;"><a href="https://www.instagram.com/mysine.shop?igsh=Y2R4end1a2tzeWd1a2tzeWd1" target="_blank" style="display:block;width:40px;height:40px;border-radius:50%;background-color:#E1306C;text-align:center;line-height:40px;"><img src="https://cdn.simpleicons.org/instagram/ffffff" width="20" height="20" alt="Instagram" style="display:inline-block;vertical-align:middle;border:0;"></a></td>
<td align="center" valign="middle" style="padding:0 5px;"><a href="https://www.facebook.com/share/19GjJvMRHx/?mibextid=wwXIfr" target="_blank" style="display:block;width:40px;height:40px;border-radius:50%;background-color:#1877F2;text-align:center;line-height:40px;"><img src="https://cdn.simpleicons.org/facebook/ffffff" width="20" height="20" alt="Facebook" style="display:inline-block;vertical-align:middle;border:0;"></a></td>
<td align="center" valign="middle" style="padding:0 5px;"><a href="https://www.tiktok.com/@mysine.shop?_r=1&_t=ZN-98ZonRFyDzi" target="_blank" style="display:block;width:40px;height:40px;border-radius:50%;background-color:#000000;text-align:center;line-height:40px;"><img src="https://cdn.simpleicons.org/tiktok/ffffff" width="20" height="20" alt="TikTok" style="display:inline-block;vertical-align:middle;border:0;"></a></td>
<td align="center" valign="middle" style="padding:0 5px;"><a href="https://whatsapp.com/channel/0029VbCVfuMCHDypvAuz3X2A" target="_blank" style="display:block;width:40px;height:40px;border-radius:50%;background-color:#25D366;text-align:center;line-height:40px;"><img src="https://cdn.simpleicons.org/whatsapp/ffffff" width="20" height="20" alt="WhatsApp" style="display:inline-block;vertical-align:middle;border:0;"></a></td>
<td align="center" valign="middle" style="padding:0 5px;"><a href="https://x.com/mysineshop" target="_blank" style="display:block;width:40px;height:40px;border-radius:50%;background-color:#000000;text-align:center;line-height:40px;"><img src="https://cdn.simpleicons.org/x/ffffff" width="18" height="18" alt="X" style="display:inline-block;vertical-align:middle;border:0;"></a></td>
</tr></table></td></tr>
<tr><td class="sine-px" style="padding:16px 40px 32px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f8fafc" style="width:100%;background-color:#f8fafc;border-radius:12px;"><tr><td align="center" style="padding:18px 20px;font-family:Arial,Helvetica,sans-serif;">
<div style="font-size:15px;line-height:1.5;font-weight:600;color:#0a2a44;margin-bottom:8px;">${escapeHtml(t.support_title || '')}</div>
<a href="mailto:${SENDERS.support.email}" style="color:#2d73ff;font-size:14px;line-height:1.8;">${SENDERS.support.email}</a><br>
<a href="mailto:${SENDERS.contact.email}" style="color:#2d73ff;font-size:14px;line-height:1.8;">${SENDERS.contact.email}</a>
</td></tr></table></td></tr>
<tr><td align="center" bgcolor="#07152b" style="padding:28px 40px;background-color:#07152b;">
<div style="font-family:Georgia,'Times New Roman',serif;font-size:22px;line-height:1.3;font-weight:700;letter-spacing:2px;"><span style="color:rgba(255,255,255,.72);">SINE.SH</span><span style="color:#ff2d3d;">♡</span><span style="color:rgba(255,255,255,.72);">P</span></div>
<div style="margin-top:8px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:rgba(255,255,255,.40);">${escapeHtml(t.footer_year || '')} &nbsp;•&nbsp; ${escapeHtml(t.footer_location || '')}</div>
</td></tr>
<tr><td align="center" bgcolor="#07152b" style="padding:14px 40px 22px;background-color:#07152b;border-top:1px solid rgba(255,255,255,.06);">
<a href="${website}/html/cgu.html" style="color:rgba(255,255,255,.35);font-family:Arial,Helvetica,sans-serif;font-size:11px;margin:0 8px;">${escapeHtml(t.legal_cgu || '')}</a>
<a href="${website}/html/privacy.html" style="color:rgba(255,255,255,.35);font-family:Arial,Helvetica,sans-serif;font-size:11px;margin:0 8px;">${escapeHtml(t.legal_privacy || '')}</a>
</td></tr>
</table></td></tr></table>
</body></html>`;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function replaceVars(text, data) {
  let result = text;
  for (const [key, value] of Object.entries(data)) {
    result = result.replace(new RegExp('{{ ' + key + ' }}', 'g'), value ?? '');
  }
  return result;
}

// Génère {subject, html, from} pour un type d'email donné, dans la langue
// demandée (repli sur le français si la langue n'est pas couverte), avec
// les variables fournies substituées dans le contenu.
function renderEmail(type, lang, data = {}) {
  const safeLang = TRANSLATIONS[lang] ? lang : 'fr';
  const t = TRANSLATIONS[safeLang];
  const vars = t.variables[type];
  if (!vars) {
    throw new Error(`Type d'email inconnu : ${type}`);
  }

  const title = replaceVars(vars.title, data);
  const message = replaceVars(vars.message, data);
  const dynamic = replaceVars(vars.dynamic, data);
  const buttonText = replaceVars(vars.button, data);
  const buttonUrl = data.button_url || t.website_url;

  const contentHtml = `
    <h1 class="email-title">${title}</h1>
    <div class="email-message">${message}</div>
    <div>${dynamic}</div>
    <div style="text-align:center;">
      <a href="${buttonUrl}" class="btn-primary">${buttonText}</a>
    </div>
  `;

  const senderKey = TYPE_SENDER[type] || 'noreply';
  const sender = SENDERS[senderKey];
  const subject = title.replace(/<[^>]*>/g, '');

  return {
    subject,
    html: wrapHtml(t, vars, contentHtml, safeLang),
    // Paramètres prêts pour le template Brevo hébergé (templateId + params,
    // voir config/mail.js:sendTemplateMail) — mêmes noms de variables que
    // dans le fichier HTML du template ({{ params.xxx }}).
    params: {
      preheader: subject,
      title,
      message,
      dynamicContent: dynamic || '',
      complementaryContent: data.complementary_content || '',
      buttonText,
      buttonUrl,
    },
    from: sender.email,
    fromName: sender.name,
  };
}

module.exports = { renderEmail, SENDERS, TYPE_SENDER, TRANSLATIONS };
