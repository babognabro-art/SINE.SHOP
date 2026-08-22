/*======================================================
SINE.SHOP - SYSTÈME DE TRADUCTION (i18n)
Fournit window.SINE.translate(key, lang), appelé par les pages
login.html / registerclient.html / registerdelivery.html /
registervendeur.html / registersineshopaffiliation.html /
registeradministrateur.html — qui l'appelaient déjà sans que
cette fonction n'ait jamais existé nulle part (le sélecteur de
langue ne traduisait donc rien du tout).
Charger ce fichier après config.js.
======================================================*/

"use strict";

const SINE_TRANSLATIONS = {
    "common.back": { fr: "Retour", en: "Back", es: "Volver", ar: "رجوع" },

    // ---- AUTH (login.html) ----
    "auth.login_title": { fr: "🔐 Connexion", en: "🔐 Login", es: "🔐 Iniciar sesión", ar: "🔐 تسجيل الدخول" },
    "auth.login_subtitle": { fr: "Accédez à votre espace personnel SINE.SHOP.", en: "Access your personal SINE.SHOP space.", es: "Accede a tu espacio personal de SINE.SHOP.", ar: "الوصول إلى مساحتك الشخصية في SINE.SHOP." },
    "auth.label_type": { fr: "Type de compte", en: "Account type", es: "Tipo de cuenta", ar: "نوع الحساب" },
    "auth.select_type": { fr: "Choisir...", en: "Choose...", es: "Elegir...", ar: "اختر..." },
    "auth.label_email": { fr: "Adresse e-mail", en: "Email address", es: "Correo electrónico", ar: "البريد الإلكتروني" },
    "auth.label_password": { fr: "Mot de passe", en: "Password", es: "Contraseña", ar: "كلمة المرور" },
    "auth.remember": { fr: "Se souvenir de moi", en: "Remember me", es: "Recordarme", ar: "تذكرني" },
    "auth.forgot": { fr: "Mot de passe oublié ?", en: "Forgot password?", es: "¿Olvidaste tu contraseña?", ar: "هل نسيت كلمة المرور؟" },
    "auth.btn_login": { fr: "Se connecter", en: "Log in", es: "Iniciar sesión", ar: "تسجيل الدخول" },
    "auth.or": { fr: "ou", en: "or", es: "o", ar: "أو" },
    "auth.google": { fr: "Continuer avec Google", en: "Continue with Google", es: "Continuar con Google", ar: "المتابعة باستخدام Google" },
    "auth.facebook": { fr: "Continuer avec Facebook", en: "Continue with Facebook", es: "Continuar con Facebook", ar: "المتابعة باستخدام Facebook" },
    "auth.register_link": { fr: "Vous n'avez pas encore de compte ?", en: "Don't have an account yet?", es: "¿Aún no tienes una cuenta?", ar: "ليس لديك حساب بعد؟" },
    "auth.affiliate_link": { fr: "Vous voulez devenir partenaire ?", en: "Want to become a partner?", es: "¿Quieres convertirte en socio?", ar: "هل تريد أن تصبح شريكاً؟" },
    "auth.affiliate_join": { fr: "Rejoindre le programme d'affiliation", en: "Join the affiliate program", es: "Unirse al programa de afiliados", ar: "الانضمام إلى برنامج الشراكة" },
    "auth.btn_guest": { fr: "Continuer sans se connecter", en: "Continue without logging in", es: "Continuar sin iniciar sesión", ar: "المتابعة دون تسجيل الدخول" },
    "auth.reset_title": { fr: "🔑 Réinitialisation", en: "🔑 Password reset", es: "🔑 Restablecimiento", ar: "🔑 إعادة التعيين" },
    "auth.reset_desc": { fr: "Entrez votre adresse email pour recevoir un lien de réinitialisation.", en: "Enter your email address to receive a reset link.", es: "Ingresa tu correo electrónico para recibir un enlace de restablecimiento.", ar: "أدخل بريدك الإلكتروني لتلقي رابط إعادة التعيين." },
    "auth.btn_cancel": { fr: "Annuler", en: "Cancel", es: "Cancelar", ar: "إلغاء" },
    "auth.btn_reset": { fr: "📧 Envoyer le lien", en: "📧 Send the link", es: "📧 Enviar el enlace", ar: "📧 إرسال الرابط" },

    // ---- CLIENT (registerclient.html) ----
    "client.register_title": { fr: "📝 Créer un compte client", en: "📝 Create a customer account", es: "📝 Crear una cuenta de cliente", ar: "📝 إنشاء حساب عميل" },
    "client.register_subtitle": { fr: "Inscrivez-vous pour acheter, réserver et suivre vos commandes.", en: "Sign up to buy, reserve and track your orders.", es: "Regístrate para comprar, reservar y seguir tus pedidos.", ar: "سجّل للشراء والحجز وتتبع طلباتك." },
    "client.label_firstname": { fr: "Prénom", en: "First name", es: "Nombre", ar: "الاسم الأول" },
    "client.label_lastname": { fr: "Nom", en: "Last name", es: "Apellido", ar: "اسم العائلة" },
    "client.label_email": { fr: "Adresse e-mail", en: "Email address", es: "Correo electrónico", ar: "البريد الإلكتروني" },
    "client.label_phone": { fr: "Numéro de téléphone", en: "Phone number", es: "Número de teléfono", ar: "رقم الهاتف" },
    "client.label_password": { fr: "Mot de passe", en: "Password", es: "Contraseña", ar: "كلمة المرور" },
    "client.label_confirm": { fr: "Confirmer le mot de passe", en: "Confirm password", es: "Confirmar contraseña", ar: "تأكيد كلمة المرور" },
    "client.label_timezone": { fr: "Fuseau horaire", en: "Time zone", es: "Zona horaria", ar: "المنطقة الزمنية" },
    "client.terms": { fr: "J'accepte les", en: "I accept the", es: "Acepto los", ar: "أوافق على" },
    "client.btn_register": { fr: "Créer mon compte", en: "Create my account", es: "Crear mi cuenta", ar: "إنشاء حسابي" },
    "client.or": { fr: "ou", en: "or", es: "o", ar: "أو" },
    "client.google": { fr: "Continuer avec Google", en: "Continue with Google", es: "Continuar con Google", ar: "المتابعة باستخدام Google" },
    "client.facebook": { fr: "Continuer avec Facebook", en: "Continue with Facebook", es: "Continuar con Facebook", ar: "المتابعة باستخدام Facebook" },
    "client.login_link": { fr: "Vous avez déjà un compte ?", en: "Already have an account?", es: "¿Ya tienes una cuenta?", ar: "لديك حساب بالفعل؟" },

    // ---- DELIVERER (registerdelivery.html) ----
    "deliverer.register_title": { fr: "🚚 Créer un compte livreur", en: "🚚 Create a courier account", es: "🚚 Crear una cuenta de repartidor", ar: "🚚 إنشاء حساب موصّل" },
    "deliverer.register_subtitle": { fr: "Inscrivez-vous pour effectuer des livraisons et gagner de l'argent.", en: "Sign up to make deliveries and earn money.", es: "Regístrate para hacer entregas y ganar dinero.", ar: "سجّل لتوصيل الطلبات وكسب المال." },
    "deliverer.label_firstname": { fr: "Prénom", en: "First name", es: "Nombre", ar: "الاسم الأول" },
    "deliverer.label_lastname": { fr: "Nom", en: "Last name", es: "Apellido", ar: "اسم العائلة" },
    "deliverer.label_email": { fr: "Adresse e-mail", en: "Email address", es: "Correo electrónico", ar: "البريد الإلكتروني" },
    "deliverer.label_phone": { fr: "Numéro de téléphone", en: "Phone number", es: "Número de teléfono", ar: "رقم الهاتف" },
    "deliverer.label_password": { fr: "Mot de passe", en: "Password", es: "Contraseña", ar: "كلمة المرور" },
    "deliverer.label_confirm": { fr: "Confirmer", en: "Confirm", es: "Confirmar", ar: "تأكيد" },
    "deliverer.label_timezone": { fr: "Fuseau horaire", en: "Time zone", es: "Zona horaria", ar: "المنطقة الزمنية" },
    "deliverer.label_transport": { fr: "Moyen de transport", en: "Mode of transport", es: "Medio de transporte", ar: "وسيلة النقل" },
    "deliverer.select_transport": { fr: "Sélectionnez votre véhicule", en: "Select your vehicle", es: "Selecciona tu vehículo", ar: "اختر مركبتك" },
    "deliverer.label_marque": { fr: "Marque", en: "Brand", es: "Marca", ar: "الماركة" },
    "deliverer.label_modele": { fr: "Modèle", en: "Model", es: "Modelo", ar: "الطراز" },
    "deliverer.label_plaque": { fr: "Numéro d'immatriculation", en: "License plate number", es: "Número de matrícula", ar: "رقم اللوحة" },
    "deliverer.label_zone": { fr: "Zone de livraison", en: "Delivery zone", es: "Zona de entrega", ar: "منطقة التوصيل" },
    "deliverer.select_zone": { fr: "Sélectionnez votre zone", en: "Select your zone", es: "Selecciona tu zona", ar: "اختر منطقتك" },
    "deliverer.label_zone_perso": { fr: "Précisez votre zone", en: "Specify your zone", es: "Especifica tu zona", ar: "حدد منطقتك" },
    "deliverer.terms": { fr: "J'accepte les", en: "I accept the", es: "Acepto los", ar: "أوافق على" },
    "deliverer.btn_verify": { fr: "Vérifier mon email", en: "Verify my email", es: "Verificar mi correo", ar: "تحقق من بريدي الإلكتروني" },
    "deliverer.login_link": { fr: "Vous avez déjà un compte ?", en: "Already have an account?", es: "¿Ya tienes una cuenta?", ar: "لديك حساب بالفعل؟" },
    "deliverer.or": { fr: "ou", en: "or", es: "o", ar: "أو" },
    "deliverer.google": { fr: "Continuer avec Google", en: "Continue with Google", es: "Continuar con Google", ar: "المتابعة باستخدام Google" },
    "deliverer.facebook": { fr: "Continuer avec Facebook", en: "Continue with Facebook", es: "Continuar con Facebook", ar: "المتابعة باستخدام Facebook" },

    // ---- SELLER (registervendeur.html) ----
    "seller.register_title": { fr: "📦 Créer un compte vendeur", en: "📦 Create a seller account", es: "📦 Crear una cuenta de vendedor", ar: "📦 إنشاء حساب بائع" },
    "seller.register_subtitle": { fr: "Inscrivez-vous pour vendre vos produits sur SINE.SHOP.", en: "Sign up to sell your products on SINE.SHOP.", es: "Regístrate para vender tus productos en SINE.SHOP.", ar: "سجّل لبيع منتجاتك على SINE.SHOP." },
    "seller.label_firstname": { fr: "Prénom", en: "First name", es: "Nombre", ar: "الاسم الأول" },
    "seller.label_lastname": { fr: "Nom", en: "Last name", es: "Apellido", ar: "اسم العائلة" },
    "seller.label_email": { fr: "Adresse e-mail", en: "Email address", es: "Correo electrónico", ar: "البريد الإلكتروني" },
    "seller.label_phone": { fr: "Numéro de téléphone", en: "Phone number", es: "Número de teléfono", ar: "رقم الهاتف" },
    "seller.label_password": { fr: "Mot de passe", en: "Password", es: "Contraseña", ar: "كلمة المرور" },
    "seller.label_confirm": { fr: "Confirmer", en: "Confirm", es: "Confirmar", ar: "تأكيد" },
    "seller.label_timezone": { fr: "Fuseau horaire", en: "Time zone", es: "Zona horaria", ar: "المنطقة الزمنية" },
    "seller.label_country": { fr: "Pays", en: "Country", es: "País", ar: "البلد" },
    "seller.select_country": { fr: "Sélectionnez votre pays", en: "Select your country", es: "Selecciona tu país", ar: "اختر بلدك" },
    "seller.label_city": { fr: "Ville", en: "City", es: "Ciudad", ar: "المدينة" },
    "seller.label_birthdate": { fr: "Date de naissance", en: "Date of birth", es: "Fecha de nacimiento", ar: "تاريخ الميلاد" },
    "seller.label_shop_name": { fr: "Nom de la boutique", en: "Shop name", es: "Nombre de la tienda", ar: "اسم المتجر" },
    "seller.label_shop_category": { fr: "Catégorie principale", en: "Main category", es: "Categoría principal", ar: "الفئة الرئيسية" },
    "seller.select_category": { fr: "Sélectionnez une catégorie", en: "Select a category", es: "Selecciona una categoría", ar: "اختر فئة" },
    "seller.label_shop_description": { fr: "Description de la boutique", en: "Shop description", es: "Descripción de la tienda", ar: "وصف المتجر" },
    "seller.label_shop_address": { fr: "Adresse de la boutique", en: "Shop address", es: "Dirección de la tienda", ar: "عنوان المتجر" },
    "seller.label_currency": { fr: "Devise par défaut", en: "Default currency", es: "Moneda predeterminada", ar: "العملة الافتراضية" },
    "seller.label_logo": { fr: "Logo de la boutique", en: "Shop logo", es: "Logo de la tienda", ar: "شعار المتجر" },
    "seller.upload_logo": { fr: "Déposez votre logo ou", en: "Drop your logo or", es: "Sube tu logo o", ar: "أسقط شعارك أو" },
    "seller.label_banner": { fr: "Bannière de la boutique", en: "Shop banner", es: "Banner de la tienda", ar: "بانر المتجر" },
    "seller.upload_banner": { fr: "Déposez votre bannière ou", en: "Drop your banner or", es: "Sube tu banner o", ar: "أسقط بانرك أو" },
    "seller.terms": { fr: "J'accepte les", en: "I accept the", es: "Acepto los", ar: "أوافق على" },
    "seller.login_link": { fr: "Vous avez déjà un compte ?", en: "Already have an account?", es: "¿Ya tienes una cuenta?", ar: "لديك حساب بالفعل؟" },
    "seller.verify_title": { fr: "📧 Vérification par email", en: "📧 Email verification", es: "📧 Verificación por correo", ar: "📧 التحقق عبر البريد الإلكتروني" },
    "seller.verify_desc": { fr: "Un code de vérification a été envoyé à", en: "A verification code has been sent to", es: "Se ha enviado un código de verificación a", ar: "تم إرسال رمز التحقق إلى" },
    "seller.code_instruction": { fr: "Entrez le code ci-dessous pour valider votre inscription :", en: "Enter the code below to validate your registration:", es: "Ingresa el código a continuación para validar tu registro:", ar: "أدخل الرمز أدناه لتأكيد تسجيلك:" },
    "seller.btn_verify": { fr: "Vérifier mon email", en: "Verify my email", es: "Verificar mi correo", ar: "تحقق من بريدي الإلكتروني" },
    "seller.btn_verify_code": { fr: "✅ Vérifier", en: "✅ Verify", es: "✅ Verificar", ar: "✅ تحقق" },
    "seller.resend": { fr: "📤 Renvoyer le code", en: "📤 Resend the code", es: "📤 Reenviar el código", ar: "📤 إعادة إرسال الرمز" },

    // ---- AFFILIATE (registersineshopaffiliation.html) ----
    "affiliate.title": { fr: "Devenir Partenaire SINE.SHOP", en: "Become a SINE.SHOP Partner", es: "Conviértete en socio de SINE.SHOP", ar: "كن شريكاً في SINE.SHOP" },
    "affiliate.subtitle": { fr: "Rejoignez le programme d'affiliation et gagnez des commissions sur chaque achat réalisé via vos codes promo.", en: "Join the affiliate program and earn commissions on every purchase made through your promo codes.", es: "Únete al programa de afiliados y gana comisiones por cada compra realizada con tus códigos promocionales.", ar: "انضم إلى برنامج الشراكة واكسب عمولات عن كل عملية شراء عبر أكوادك الترويجية." },
    "affiliate.benefit1": { fr: "Gagnez jusqu'à 0,35% sur les achats", en: "Earn up to 0.35% on purchases", es: "Gana hasta un 0,35% en las compras", ar: "اربح حتى 0.35% من المشتريات" },
    "affiliate.benefit2": { fr: "50 FCFA par nouvelle inscription", en: "50 FCFA per new registration", es: "50 FCFA por cada nuevo registro", ar: "50 فرنك أفريقي عن كل تسجيل جديد" },
    "affiliate.benefit3": { fr: "Suivi en temps réel de vos gains", en: "Real-time tracking of your earnings", es: "Seguimiento en tiempo real de tus ganancias", ar: "تتبع أرباحك في الوقت الفعلي" },
    "affiliate.benefit4": { fr: "Programme de fidélité et bonus", en: "Loyalty program and bonuses", es: "Programa de fidelidad y bonificaciones", ar: "برنامج ولاء ومكافآت" },
    "affiliate.step1": { fr: "Infos perso", en: "Personal info", es: "Datos personales", ar: "المعلومات الشخصية" },
    "affiliate.step2": { fr: "Compte", en: "Account", es: "Cuenta", ar: "الحساب" },
    "affiliate.step3": { fr: "Paiement", en: "Payment", es: "Pago", ar: "الدفع" },
    "affiliate.step4": { fr: "Confirmation", en: "Confirmation", es: "Confirmación", ar: "التأكيد" },
    "affiliate.label_firstname": { fr: "Prénom", en: "First name", es: "Nombre", ar: "الاسم الأول" },
    "affiliate.label_lastname": { fr: "Nom", en: "Last name", es: "Apellido", ar: "اسم العائلة" },
    "affiliate.label_email": { fr: "Adresse e-mail", en: "Email address", es: "Correo electrónico", ar: "البريد الإلكتروني" },
    "affiliate.label_phone": { fr: "Téléphone", en: "Phone", es: "Teléfono", ar: "الهاتف" },
    "affiliate.label_country": { fr: "Pays", en: "Country", es: "País", ar: "البلد" },
    "affiliate.select_country": { fr: "Sélectionner", en: "Select", es: "Seleccionar", ar: "اختر" },
    "affiliate.label_city": { fr: "Ville", en: "City", es: "Ciudad", ar: "المدينة" },
    "affiliate.label_address": { fr: "Adresse complète", en: "Full address", es: "Dirección completa", ar: "العنوان الكامل" },
    "affiliate.label_birthdate": { fr: "Date de naissance", en: "Date of birth", es: "Fecha de nacimiento", ar: "تاريخ الميلاد" },
    "affiliate.label_timezone": { fr: "Fuseau horaire", en: "Time zone", es: "Zona horaria", ar: "المنطقة الزمنية" },
    "affiliate.google": { fr: "Continuer avec Google", en: "Continue with Google", es: "Continuar con Google", ar: "المتابعة باستخدام Google" },
    "affiliate.facebook": { fr: "Continuer avec Facebook", en: "Continue with Facebook", es: "Continuar con Facebook", ar: "المتابعة باستخدام Facebook" },
    "affiliate.or": { fr: "ou", en: "or", es: "o", ar: "أو" },
    "affiliate.label_username": { fr: "Nom d'utilisateur (pseudo)", en: "Username (nickname)", es: "Nombre de usuario (apodo)", ar: "اسم المستخدم (لقب)" },
    "affiliate.username_info": { fr: "Unique, 3-20 caractères, lettres et chiffres uniquement", en: "Unique, 3-20 characters, letters and numbers only", es: "Único, 3-20 caracteres, solo letras y números", ar: "فريد، 3-20 حرفاً، أحرف وأرقام فقط" },
    "affiliate.label_password": { fr: "Mot de passe", en: "Password", es: "Contraseña", ar: "كلمة المرور" },
    "affiliate.label_confirm": { fr: "Confirmer le mot de passe", en: "Confirm password", es: "Confirmar contraseña", ar: "تأكيد كلمة المرور" },
    "affiliate.password_info": { fr: "8-16 caractères, 1 majuscule, 1 minuscule, 1 chiffre, 1 caractère spécial", en: "8-16 characters, 1 uppercase, 1 lowercase, 1 digit, 1 special character", es: "8-16 caracteres, 1 mayúscula, 1 minúscula, 1 número, 1 carácter especial", ar: "8-16 حرفاً، حرف كبير واحد، حرف صغير واحد، رقم واحد، رمز خاص واحد" },
    "affiliate.label_referral_code": { fr: "Code promo (optionnel)", en: "Promo code (optional)", es: "Código promocional (opcional)", ar: "الرمز الترويجي (اختياري)" },
    "affiliate.referral_info": { fr: "Si vous avez été invité par un partenaire, entrez son code", en: "If you were invited by a partner, enter their code", es: "Si fuiste invitado por un socio, ingresa su código", ar: "إذا دعاك شريك، أدخل رمزه" },
    "affiliate.payment_info": { fr: "Configurez vos moyens de réception pour vos commissions.", en: "Set up your payout methods for your commissions.", es: "Configura tus métodos de recepción para tus comisiones.", ar: "قم بإعداد وسائل استلام عمولاتك." },
    "affiliate.label_mtn": { fr: "MTN MoMo", en: "MTN MoMo", es: "MTN MoMo", ar: "MTN MoMo" },
    "affiliate.label_orange": { fr: "Orange Money", en: "Orange Money", es: "Orange Money", ar: "Orange Money" },
    "affiliate.label_wave": { fr: "Wave", en: "Wave", es: "Wave", ar: "Wave" },
    "affiliate.label_paypal": { fr: "PayPal", en: "PayPal", es: "PayPal", ar: "PayPal" },
    "affiliate.label_bank": { fr: "Virement bancaire (bientôt disponible)", en: "Bank transfer (coming soon)", es: "Transferencia bancaria (próximamente)", ar: "تحويل بنكي (قريباً)" },
    "affiliate.bank_info": { fr: "Disponible prochainement", en: "Available soon", es: "Disponible próximamente", ar: "متوفر قريباً" },
    "affiliate.confirm_title": { fr: "Prêt à rejoindre l'aventure !", en: "Ready to join the adventure!", es: "¡Listo para unirte a la aventura!", ar: "مستعد للانضمام إلى المغامرة!" },
    "affiliate.confirm_subtitle": { fr: "Vérifiez vos informations avant de finaliser votre inscription.", en: "Check your information before finalizing your registration.", es: "Verifica tu información antes de finalizar tu registro.", ar: "تحقق من معلوماتك قبل إتمام التسجيل." },
    "affiliate.partner_terms": { fr: "Je certifie que les informations fournies sont exactes. Je m'engage à respecter la charte du partenaire SINE.SHOP et à promouvoir la plateforme de manière éthique.", en: "I certify that the information provided is accurate. I agree to comply with the SINE.SHOP partner charter and to promote the platform ethically.", es: "Certifico que la información proporcionada es exacta. Me comprometo a respetar la carta del socio SINE.SHOP y a promover la plataforma de manera ética.", ar: "أشهد أن المعلومات المقدمة صحيحة. وألتزم باحترام ميثاق شريك SINE.SHOP والترويج للمنصة بأخلاقية." },
    "affiliate.terms": { fr: "J'accepte les", en: "I accept the", es: "Acepto los", ar: "أوافق على" },
    "affiliate.btn_prev": { fr: "← Précédent", en: "← Previous", es: "← Anterior", ar: "→ السابق" },
    "affiliate.btn_next": { fr: "Étape suivante →", en: "Next step →", es: "Siguiente paso →", ar: "الخطوة التالية ←" },
    "affiliate.btn_register": { fr: "Devenir partenaire", en: "Become a partner", es: "Convertirse en socio", ar: "كن شريكاً" },
    "affiliate.login_link": { fr: "Vous avez déjà un compte ?", en: "Already have an account?", es: "¿Ya tienes una cuenta?", ar: "لديك حساب بالفعل؟" },

    // ---- ADMIN (registeradministrateur.html) ----
    "admin.register_title": { fr: "🛡️ Créer un compte administrateur", en: "🛡️ Create an administrator account", es: "🛡️ Crear una cuenta de administrador", ar: "🛡️ إنشاء حساب مسؤول" },
    "admin.register_subtitle": { fr: "Inscrivez-vous pour gérer la plateforme SINE.SHOP.", en: "Sign up to manage the SINE.SHOP platform.", es: "Regístrate para administrar la plataforma SINE.SHOP.", ar: "سجّل لإدارة منصة SINE.SHOP." },
    "admin.label_firstname": { fr: "Prénom", en: "First name", es: "Nombre", ar: "الاسم الأول" },
    "admin.label_lastname": { fr: "Nom", en: "Last name", es: "Apellido", ar: "اسم العائلة" },
    "admin.label_email": { fr: "Adresse e-mail", en: "Email address", es: "Correo electrónico", ar: "البريد الإلكتروني" },
    "admin.label_phone": { fr: "Numéro de téléphone", en: "Phone number", es: "Número de teléfono", ar: "رقم الهاتف" },
    "admin.label_password": { fr: "Mot de passe", en: "Password", es: "Contraseña", ar: "كلمة المرور" },
    "admin.label_confirm": { fr: "Confirmer", en: "Confirm", es: "Confirmar", ar: "تأكيد" },
    "admin.label_timezone": { fr: "Fuseau horaire", en: "Time zone", es: "Zona horaria", ar: "المنطقة الزمنية" },
    "admin.select_role": { fr: "Sélectionnez un rôle", en: "Select a role", es: "Selecciona un rol", ar: "اختر دوراً" },
    "admin.label_adminrole": { fr: "Rôle", en: "Role", es: "Rol", ar: "الدور" },
    "admin.role_desc": { fr: "Sélectionnez un rôle pour voir la description", en: "Select a role to see the description", es: "Selecciona un rol para ver la descripción", ar: "اختر دوراً لرؤية الوصف" },
    "admin.label_admincode": { fr: "Code d'administration", en: "Administration code", es: "Código de administración", ar: "رمز الإدارة" },
    "admin.admin_hint": { fr: "Code sécurisé", en: "Secure code", es: "Código seguro", ar: "رمز آمن" },
    "admin.terms": { fr: "J'accepte les", en: "I accept the", es: "Acepto los", ar: "أوافق على" },
    "admin.btn_register": { fr: "Créer mon compte", en: "Create my account", es: "Crear mi cuenta", ar: "إنشاء حسابي" },
    "admin.login_link": { fr: "Vous avez déjà un compte ?", en: "Already have an account?", es: "¿Ya tienes una cuenta?", ar: "لديك حساب بالفعل؟" }
};

// Traduit une clé dans la langue demandée (repli sur le français, puis sur
// la clé elle-même si vraiment introuvable — jamais un texte vide/cassé).
function sineTranslate(key, lang) {
    const entry = SINE_TRANSLATIONS[key];
    if (!entry) return key;
    return entry[lang] || entry.fr || key;
}

// Applique la direction d'écriture (RTL pour l'arabe) au document entier —
// sans ça, le site resterait affiché de gauche à droite même en arabe.
function sineApplyDirection(lang) {
    document.documentElement.dir = (lang === 'ar') ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
}

window.SINE = window.SINE || {};
window.SINE.translate = sineTranslate;
window.SINE.applyDirection = sineApplyDirection;
