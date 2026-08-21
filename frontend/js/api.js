// ============================================================
// js/api.js — Pont réel entre le frontend et le backend SINE.SHOP
// Chargé en <script> classique (pas de type="module") pour être
// utilisable simplement sur toutes les pages : window.SineAPI.xxx()
// ============================================================
(function () {
    'use strict';

    // Utilise l'URL définie dans config.js (window.SINE.config) si dispo.
    // Repli de secours SEULEMENT si config.js n'a pas chargé du tout — ne
    // doit normalement jamais se déclencher, mais on ne prend aucun risque
    // de pointer vers un serveur local dans une application empaquetée
    // (Capacitor) : le repli va directement vers la production, jamais
    // localhost (voir le même correctif dans config.js).
    const API_URL = (window.SINE && window.SINE.config && window.SINE.config.API_URL) || 'https://api.sineshophome.com/api';

    // Clés localStorage — alignées sur celles déjà utilisées par
    // index.html / login.html (sineToken / sineUser)
    function getToken() {
        return localStorage.getItem('sineToken');
    }

    function getUser() {
        const user = localStorage.getItem('sineUser');
        return user ? JSON.parse(user) : null;
    }

    function setSession(user, token, refreshToken) {
        localStorage.setItem('sineToken', token);
        localStorage.setItem('sineUser', JSON.stringify(user));
        localStorage.setItem('isLoggedIn', 'true');
        if (refreshToken) {
            localStorage.setItem('sineRefreshToken', refreshToken);
        }
    }

    function clearSession() {
        localStorage.removeItem('sineToken');
        localStorage.removeItem('sineUser');
        localStorage.removeItem('sineRefreshToken');
        localStorage.setItem('isLoggedIn', 'false');
    }

    // Rafraîchissement silencieux du token — jusqu'ici, le refreshToken
    // était stocké à la connexion mais JAMAIS utilisé : la moindre expiration
    // du token d'accès déconnectait l'utilisateur immédiatement, malgré
    // l'existence de POST /auth/refresh-token côté backend. `refreshPromise`
    // regroupe les appels concurrents en un seul (plusieurs requêtes API en
    // parallèle qui expirent en même temps ne déclenchent qu'UN seul
    // rafraîchissement, pas un par requête).
    let refreshPromise = null;

    async function refreshSession() {
        const storedRefreshToken = localStorage.getItem('sineRefreshToken');
        if (!storedRefreshToken) return false;

        if (!refreshPromise) {
            refreshPromise = (async () => {
                try {
                    const response = await fetch(`${API_URL}/auth/refresh-token`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ refreshToken: storedRefreshToken })
                    });
                    if (!response.ok) return false;
                    const json = await response.json();
                    const data = json && json.data ? json.data : json;
                    if (!data || !data.token) return false;

                    localStorage.setItem('sineToken', data.token);
                    if (data.refreshToken) {
                        localStorage.setItem('sineRefreshToken', data.refreshToken);
                    }
                    return true;
                } catch (e) {
                    return false;
                } finally {
                    refreshPromise = null;
                }
            })();
        }
        return await refreshPromise;
    }

    // Fonction générique pour appeler l'API.
    // Le backend renvoie toujours l'enveloppe { success, message, data, timestamp }
    // -> on déballe automatiquement "data" ici, une seule fois, pour tout le monde.
    async function apiCall(endpoint, options = {}, _isRetry = false) {
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        const token = getToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const url = endpoint.startsWith('http') ? endpoint : `${API_URL}${endpoint}`;

        let response;
        try {
            response = await fetch(url, { ...options, headers });
        } catch (networkErr) {
            throw new Error('Impossible de joindre le serveur SINE.SHOP. Vérifiez votre connexion.');
        }

        // Token d'accès expiré/invalide — tenter UN rafraîchissement silencieux
        // avant d'abandonner (jamais sur la route de connexion/rafraîchissement
        // elle-même, pour éviter toute boucle).
        if (response.status === 401 && !_isRetry && !endpoint.includes('/auth/refresh-token') && !endpoint.includes('/auth/login')) {
            const refreshed = await refreshSession();
            if (refreshed) {
                return apiCall(endpoint, options, true);
            }
        }

        let json;
        try {
            json = await response.json();
        } catch (e) {
            json = null;
        }

        if (!response.ok) {
            const message = (json && json.message) || `Erreur API (${response.status})`;
            const error = new Error(message);
            error.status = response.status;
            error.errors = json && json.errors;
            throw error;
        }

        // Toutes les réponses réussies du backend sont { success, message, data, timestamp }
        return json && Object.prototype.hasOwnProperty.call(json, 'data') ? json.data : json;
    }

    // =============================================
    // AUTH — correspond exactement à backend/controllers/auth.controller.js
    // =============================================
    async function login(identifier, password) {
        const data = await apiCall('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ identifier, password })
        });

        // Comptes à privilèges déjà protégés par un code de confidentialité :
        // le backend n'a délivré aucune session, une seconde étape est requise.
        if (data.securityCodeRequired) {
            return { securityCodeRequired: true };
        }

        setSession(data.user, data.token, data.refreshToken);
        return { ...data.user, mustSetSecurityCode: !!data.mustSetSecurityCode };
    }

    async function verifySecurityCode(identifier, code) {
        // Ne termine plus la connexion ici — le code correct déclenche
        // désormais l'envoi d'un OTP (voir verifySecurityOtp ci-dessous),
        // qui est la VRAIE étape finale. Avant ce correctif, cette
        // fonction appelait setSession() avec des champs qui n'existent
        // plus dans la réponse (token/user), ce qui aurait ouvert une
        // session invalide.
        return await apiCall('/auth/verify-security-code', {
            method: 'POST',
            body: JSON.stringify({ identifier, code })
        });
    }

    async function verifySecurityOtp(identifier, otp) {
        const data = await apiCall('/auth/verify-security-otp', {
            method: 'POST',
            body: JSON.stringify({ identifier, otp })
        });
        setSession(data.user, data.token, data.refreshToken);
        return data.user;
    }

    async function forgotSecurityCode(identifier) {
        return await apiCall('/auth/forgot-security-code', {
            method: 'POST',
            body: JSON.stringify({ identifier })
        });
    }

    async function resetSecurityCode(userId, exp, sig, newCode) {
        return await apiCall('/auth/reset-security-code', {
            method: 'POST',
            body: JSON.stringify({ userId, exp, sig, newCode })
        });
    }

    async function setSecurityCode(password, newCode) {
        return await apiCall('/auth/set-security-code', {
            method: 'POST',
            body: JSON.stringify({ password, newCode })
        });
    }

    async function forgotPassword(identifier) {
        return await apiCall('/auth/forgot-password', {
            method: 'POST',
            body: JSON.stringify({ identifier })
        });
    }

    async function resetPassword(identifier, code, newPassword) {
        return await apiCall('/auth/reset-password', {
            method: 'POST',
            body: JSON.stringify({ identifier, code, newPassword })
        });
    }

    // =========================================================
    // LOGIN AVEC FIREBASE — CORRIGÉ
    // =========================================================
    async function loginWithFirebase(idToken, role = null) {
        const data = await apiCall('/auth/firebase', {
            method: 'POST',
            body: JSON.stringify({ idToken, role })
        });
        
        // =========================================================
        // ✅ FALLBACK : Si le nom est "Utilisateur" ou vide,
        // on l'extrait de l'email pour avoir un nom plus parlant
        // =========================================================
        if (data.user) {
            // Vérifie si le nom est vide ou générique
            const isGenericName = !data.user.firstName 
                || data.user.firstName === 'Utilisateur'
                || data.user.firstName === 'User'
                || data.user.firstName === 'Utilisateur'
                || data.user.firstName === 'User'
                || (data.user.firstName && data.user.firstName.toLowerCase() === 'utilisateur');
            
            if (isGenericName && data.user.email) {
                // Extrait le nom depuis l'email (ex: jean.dupont@gmail.com → jean.dupont)
                const emailPrefix = data.user.email.split('@')[0];
                
                // Sépare par . ou _ ou -
                const nameParts = emailPrefix.split(/[._-]/);
                
                const firstName = nameParts[0] || 'Client';
                const lastName = nameParts.slice(1).join(' ') || '';
                
                // ✅ Sauvegarde le nom extrait dans le profil
                try {
                    await apiCall('/users/me', {
                        method: 'PUT',
                        body: JSON.stringify({
                            firstName: firstName,
                            lastName: lastName
                        })
                    });
                    
                    // Met à jour l'objet user local
                    data.user.firstName = firstName;
                    data.user.lastName = lastName;
                    
                    console.log(`📝 Nom extrait de l'email et sauvegardé: ${firstName} ${lastName}`);
                } catch (e) {
                    console.warn('⚠️ Impossible de mettre à jour le nom:', e.message);
                    // Continue quand même, le nom reste extrait localement
                    data.user.firstName = firstName;
                    data.user.lastName = lastName;
                }
            }
            
            // Si le nom est toujours vide, on met un fallback ultime
            if (!data.user.firstName || data.user.firstName === 'Utilisateur' || data.user.firstName === 'User') {
                data.user.firstName = 'Client';
            }
            if (!data.user.lastName) {
                data.user.lastName = '';
            }
        }
        
        setSession(data.user, data.token, data.refreshToken);
        return data.user;
    }

    async function switchRole(role) {
        const data = await apiCall('/auth/switch-role', {
            method: 'POST',
            body: JSON.stringify({ role })
        });
        setSession(data.user, data.token, data.refreshToken);
        return data.user;
    }

    async function addRole(payload) {
        const data = await apiCall('/auth/add-role', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        setSession(data.user, data.token, data.refreshToken);
        return data.user;
    }

    async function register({ firstName, lastName, email, phone, password, role = 'client', ...rest }) {
        const data = await apiCall('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ firstName, lastName, email, phone, password, role, ...rest })
        });
        setSession(data.user, data.token, data.refreshToken);
        return data.user;
    }

    async function logout() {
        try {
            await apiCall('/auth/logout', { method: 'POST' });
        } catch (e) { /* on nettoie la session locale même si l'appel échoue */ }
        clearSession();
        window.location.href = '../html/index.html';
    }

    function isAuthenticated() {
        return !!getToken();
    }

    function getCurrentUser() {
        return getUser();
    }

    // Vérifie la session auprès du backend (source de vérité), et non plus
    // seulement en local. Renvoie l'utilisateur à jour, ou null si le token
    // est absent/invalide/expiré (et nettoie alors la session locale).
    async function verifySession() {
        if (!getToken()) return null;
        try {
            const data = await apiCall('/auth/me');
            const user = data.user || data;
            localStorage.setItem('sineUser', JSON.stringify(user));
            return user;
        } catch (err) {
            if (err.status === 401 || err.status === 403) {
                clearSession();
            }
            return null;
        }
    }

    async function getProfile() {
        return await apiCall('/auth/me');
    }

    async function getAvailableLivreurs(search = '') {
        const params = search ? `?search=${encodeURIComponent(search)}` : '';
        return await apiCall(`/users/livreurs${params}`);
    }

    async function updateProfile(updates) {
        const data = await apiCall('/users/me', {
            method: 'PUT',
            body: JSON.stringify(updates)
        });
        const user = data.user || data;
        localStorage.setItem('sineUser', JSON.stringify(user));
        return user;
    }

    async function updatePassword(currentPassword, newPassword) {
        return await apiCall('/users/me/password', {
            method: 'PUT',
            body: JSON.stringify({ currentPassword, newPassword })
        });
    }

    async function requestPhoneVerification() {
        return await apiCall('/users/me/phone/request-verification', { method: 'POST' });
    }

    async function confirmPhoneVerification(code) {
        return await apiCall('/users/me/phone/confirm-verification', {
            method: 'POST',
            body: JSON.stringify({ code })
        });
    }

    async function requestEmailChange(newEmail) {
        return await apiCall('/users/me/email/request-change', {
            method: 'POST',
            body: JSON.stringify({ newEmail })
        });
    }

    async function confirmEmailChange(code) {
        return await apiCall('/users/me/email/confirm-change', {
            method: 'POST',
            body: JSON.stringify({ code })
        });
    }

    async function verifyEmail(email, code) {
        return await apiCall('/auth/verify', {
            method: 'POST',
            body: JSON.stringify({ identifier: email, email, code })
        });
    }

    async function resendVerification(email) {
        return await apiCall('/auth/resend-verification', {
            method: 'POST',
            body: JSON.stringify({ identifier: email, email })
        });
    }

    // Vérification d'identité (KYC) — CNI / passeport / permis de conduire
    // + selfie. Nécessite une session (contrairement aux candidatures admin).
    async function submitKyc(formData) {
        const token = getToken();
        let response;
        try {
            response = await fetch(`${API_URL}/kyc`, {
                method: 'POST',
                headers: token ? { 'Authorization': `Bearer ${token}` } : {},
                body: formData
            });
        } catch (networkErr) {
            throw new Error('Impossible de joindre le serveur SINE.SHOP. Vérifiez votre connexion.');
        }

        let json;
        try {
            json = await response.json();
        } catch (e) {
            json = null;
        }

        if (!response.ok) {
            throw new Error((json && json.message) || `Erreur API (${response.status})`);
        }

        return json && Object.prototype.hasOwnProperty.call(json, 'data') ? json.data : json;
    }

    async function getMyKyc() {
        return await apiCall('/kyc/me');
    }

    // Gestion KYC réservée aux admins — jamais exposée côté frontend
    // malgré des endpoints backend déjà prêts et fonctionnels.
    // Solde, retrait et historique de paiement vendeur — jusqu'ici
    // totalement absents : le tableau de bord n'affichait qu'une
    // statistique "Revenus" calculée à la volée côté frontend, sans aucun
    // moyen réel de connaître le solde disponible ni de le retirer.
    async function getSellerBalance() {
        return await apiCall('/seller-payment/balance');
    }

    async function requestSellerWithdrawal(amount, method, account) {
        return await apiCall('/seller-payment/withdraw', {
            method: 'POST',
            body: JSON.stringify({ amount, method, account })
        });
    }

    async function getSellerWithdrawals() {
        return await apiCall('/seller-payment/withdrawals');
    }

    // Signalements — un vrai bouton "Signaler" existait déjà sur la
    // messagerie (assistant-ai.html) mais n'envoyait rien réellement au
    // serveur, juste un message de confirmation trompeur.
    async function createReport(targetType, targetId, reason, details) {
        return await apiCall('/reports', {
            method: 'POST',
            body: JSON.stringify({ targetType, targetId, reason, details })
        });
    }

    async function getAllReports(status) {
        const params = status ? `?status=${status}` : '';
        return await apiCall(`/reports${params}`);
    }

    async function reviewReport(id, status, resolutionNote) {
        return await apiCall(`/reports/${id}/review`, {
            method: 'PUT',
            body: JSON.stringify({ status, resolutionNote })
        });
    }

    // Litiges — porte toujours sur une commande précise, entre acheteur et
    // vendeur (distinct des signalements, qui visent un contenu ou un
    // utilisateur). Jusqu'ici totalement absent, ni backend ni frontend.
    async function createDispute(orderId, reason, description) {
        return await apiCall('/disputes', {
            method: 'POST',
            body: JSON.stringify({ orderId, reason, description })
        });
    }

    async function getMyDisputes() {
        return await apiCall('/disputes/me');
    }

    async function getAllDisputes(status) {
        const params = status ? `?status=${status}` : '';
        return await apiCall(`/disputes${params}`);
    }

    async function resolveDispute(id, status, resolution) {
        return await apiCall(`/disputes/${id}/resolve`, {
            method: 'PUT',
            body: JSON.stringify({ status, resolution })
        });
    }

    async function getAllKyc(status) {
        const params = status ? `?status=${status}` : '';
        return await apiCall(`/kyc${params}`);
    }

    async function reviewKyc(id, decision, note) {
        return await apiCall(`/kyc/${id}/review`, {
            method: 'PUT',
            body: JSON.stringify({ decision, note })
        });
    }

    async function createAffiliate() {
        return await apiCall('/affiliates/create', { method: 'POST' });
    }

    async function getAffiliateByCode(code) {
        return await apiCall(`/affiliates/code/${code}`);
    }

    async function uploadFile(file, folder = 'general') {
        const token = getToken();
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder', folder);

        const response = await fetch(`${API_URL}/upload/single`, {
            method: 'POST',
            headers: token ? { 'Authorization': `Bearer ${token}` } : {},
            body: formData
        });
        const json = await response.json();
        if (!response.ok) throw new Error(json.message || 'Erreur lors de l\'upload.');
        return json; // { url, public_id }
    }

    // Candidature "Demande d'accès Administrateur" (seler-page.html) —
    // publique, ne nécessite pas de session (le candidat n'a pas forcément
    // de compte SINE.SHOP au moment de postuler).
    async function submitAdminApplication(formData) {
        let response;
        try {
            response = await fetch(`${API_URL}/applications/admin`, {
                method: 'POST',
                body: formData // pas de Content-Type : fetch le gère pour FormData
            });
        } catch (networkErr) {
            throw new Error('Impossible de joindre le serveur SINE.SHOP. Vérifiez votre connexion.');
        }

        let json;
        try {
            json = await response.json();
        } catch (e) {
            json = null;
        }

        if (!response.ok) {
            const message = (json && json.message) || `Erreur API (${response.status})`;
            throw new Error(message);
        }

        return json && Object.prototype.hasOwnProperty.call(json, 'data') ? json.data : json;
    }

    async function getAdminApplications(status) {
        const params = status ? `?status=${encodeURIComponent(status)}` : '';
        return await apiCall(`/applications/admin${params}`);
    }

    // Génère un lien d'invitation nominatif (à usage unique) pour créer un
    // compte à privilèges donné — réservé au superadmin.
    async function createAdminInvite(role, email, applicationId) {
        return await apiCall('/admin-invites', {
            method: 'POST',
            body: JSON.stringify({ role, email, applicationId })
        });
    }

    async function getAdminInvites() {
        return await apiCall('/admin-invites');
    }

    async function getInviteByToken(token) {
        return await apiCall(`/admin-invites/${token}`);
    }

    // =============================================
    // ADMIN-FINANCE — centre financier SINE.SHOP
    // =============================================
    async function getFinanceDashboard() {
        return await apiCall('/admin-finance/dashboard');
    }
    async function getFinancialLedger(filters = {}) {
        const params = new URLSearchParams(filters).toString();
        return await apiCall(`/admin-finance/ledger?${params}`);
    }
    async function getFinanceConfigAdmin() {
        return await apiCall('/admin-finance/config');
    }
    async function updateFinanceConfigAdmin(payload) {
        return await apiCall('/admin-finance/config', { method: 'PUT', body: JSON.stringify(payload) });
    }
    async function listPaymentMethodsAdmin() {
        return await apiCall('/admin-finance/payment-methods');
    }
    async function togglePaymentMethodAdmin(provider, enabled) {
        return await apiCall(`/admin-finance/payment-methods/${provider}`, { method: 'PUT', body: JSON.stringify({ enabled }) });
    }
    async function listRefundsAdmin(filters = {}) {
        const params = new URLSearchParams(filters).toString();
        return await apiCall(`/admin-finance/refunds?${params}`);
    }
    async function updateRefundStatusAdmin(id, status, refundTransactionId) {
        return await apiCall(`/admin-finance/refunds/${id}/status`, { method: 'PUT', body: JSON.stringify({ status, refundTransactionId }) });
    }
    async function listWithdrawalsAdmin(filters = {}) {
        const params = new URLSearchParams(filters).toString();
        return await apiCall(`/admin-finance/payouts?${params}`);
    }
    async function payWithdrawalAdmin(id) {
        return await apiCall(`/admin-finance/payouts/${id}/pay`, { method: 'PUT' });
    }
    async function rejectWithdrawalAdmin(id, reason) {
        return await apiCall(`/admin-finance/payouts/${id}/reject`, { method: 'PUT', body: JSON.stringify({ reason }) });
    }

    // =============================================
    // WALLET / FIDÉLITÉ (client)
    // =============================================
    async function getMyWallet() {
        return await apiCall('/wallet');
    }
    async function payWithWallet(orderId, orderGroup) {
        return await apiCall('/wallet/pay', { method: 'POST', body: JSON.stringify({ orderId, orderGroup }) });
    }
    async function getWalletTransactions() {
        return await apiCall('/wallet/transactions');
    }
    async function getMyLoyalty() {
        return await apiCall('/loyalty');
    }
    async function previewLoyaltyRedeemable(orderId) {
        return await apiCall(`/loyalty/preview/${orderId}`);
    }
    async function getPaymentMethods() {
        return await apiCall('/payment-methods');
    }

    // =============================================
    // SCAN PAY — QR dynamique par commande (livreur)
    // =============================================
    async function getScanPayLink(orderId) {
        return await apiCall(`/scan-pay/${orderId}/link`);
    }
    async function getScanPayStatus(orderId, exp, sig) {
        return await apiCall(`/scan-pay/${orderId}/status?exp=${exp}&sig=${sig}`);
    }


    // =============================================
    // LIVREUR
    // =============================================
    async function getLivreurDeliveries(filters = {}) {
        const params = new URLSearchParams(filters).toString();
        return await apiCall(`/livreurs/deliveries?${params}`);
    }

    async function updateDeliveryStatusAsLivreur(orderId, status) {
        return await apiCall('/livreurs/delivery-status', {
            method: 'PUT',
            body: JSON.stringify({ orderId, status })
        });
    }

    async function updateLivreurLocation(latitude, longitude) {
        return await apiCall('/livreurs/location', {
            method: 'PUT',
            body: JSON.stringify({ latitude, longitude })
        });
    }

    async function sendChatMessage(query, conversationId = null, context = {}) {
        return await apiCall('/assistant/chat', {
            method: 'POST',
            body: JSON.stringify({ query, conversationId, context })
        });
    }

    async function getAiConversations(limit = 20) {
        return await apiCall(`/assistant/conversations?limit=${limit}`);
    }

    // Base de connaissances de l'assistant (voir backend/controllers/faq.controller.js)
    async function searchFaq(query) {
        return await apiCall(`/faq/search?q=${encodeURIComponent(query)}`);
    }
    async function getFaqCategories() {
        return await apiCall('/faq/categories');
    }
    async function getFaqByCategory(category) {
        return await apiCall(`/faq/category/${category}`);
    }
    async function getFaqById(id) {
        return await apiCall(`/faq/${id}`);
    }
    async function getPopularFaq() {
        return await apiCall('/faq/popular');
    }
    async function rateFaq(id, helpful) {
        return await apiCall(`/faq/${id}/rate`, {
            method: 'POST',
            body: JSON.stringify({ helpful })
        });
    }

    async function deleteConversation(id) {
        return await apiCall(`/assistant/conversation/${id}`, { method: 'DELETE' });
    }

    async function archiveConversation(id) {
        return await apiCall(`/assistant/conversation/${id}/archive`, { method: 'POST' });
    }

    async function pinConversation(id, pinned) {
        return await apiCall(`/assistant/conversation/${id}/pin`, {
            method: 'PUT',
            body: JSON.stringify({ pinned })
        });
    }

    async function deleteAllAiHistory() {
        return await apiCall('/assistant/history', { method: 'DELETE' });
    }

    async function archiveAllAiHistory() {
        return await apiCall('/assistant/history/archive', { method: 'POST' });
    }

    // =============================================
    // TICKETS SUPPORT
    // =============================================
    // Accepte désormais un FormData complet (motif + pièces jointes) au
    // lieu de seulement subject/message/priority — le formulaire de
    // contact réel (Objet+Motif+upload) n'existait pas avant.
    async function createTicket(formData) {
        let response;
        try {
            response = await fetch(`${API_URL}/tickets`, {
                method: 'POST',
                headers: getToken() ? { 'Authorization': `Bearer ${getToken()}` } : {},
                body: formData
            });
        } catch (networkErr) {
            throw new Error('Impossible de joindre le serveur SINE.SHOP. Vérifiez votre connexion.');
        }
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.message || 'Erreur lors de l\'envoi du message.');
        return data.data;
    }

    async function getMyTickets() {
        return await apiCall('/tickets/me');
    }

    async function getAllTickets(filters = {}) {
        const params = new URLSearchParams(filters).toString();
        return await apiCall(`/tickets?${params}`);
    }

    async function getTicketStats() {
        return await apiCall('/tickets/stats');
    }

    async function getTicket(id) {
        return await apiCall(`/tickets/${id}`);
    }

    async function updateTicketStatus(id, status) {
        return await apiCall(`/tickets/${id}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status })
        });
    }

    async function addTicketResponse(id, message) {
        return await apiCall(`/tickets/${id}/responses`, {
            method: 'POST',
            body: JSON.stringify({ message })
        });
    }

    // =============================================
    // ADMIN
    // =============================================
    async function getAdminDashboard() {
        return await apiCall('/admin/dashboard');
    }

    async function getAdminUsers(filters = {}) {
        const params = new URLSearchParams(filters).toString();
        return await apiCall(`/admin/users?${params}`);
    }

    async function updateUserStatus(userId, status) {
        return await apiCall(`/admin/users/${userId}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status })
        });
    }

    async function adminDeleteUser(userId) {
        return await apiCall(`/admin/users/${userId}`, { method: 'DELETE' });
    }

    async function getSystemStats() {
        return await apiCall('/admin/system/stats');
    }

    // Toutes les commandes de la plateforme — jusqu'ici aucune route
    // n'existait pour ça (getOrders filtre toujours sur l'utilisateur
    // connecté), donc le bouton "Commandes" du menu admin n'avait rien à
    // appeler et affichait juste un message vide.
    async function getAllOrdersAdmin(filters = {}) {
        const params = new URLSearchParams(filters).toString();
        return await apiCall(`/admin/orders?${params}`);
    }

    // =============================================
    // VENDEUR
    // =============================================
    async function getSellerProfile(id) {
        return await apiCall(id ? `/sellers/profile/${id}` : '/sellers/profile');
    }

    async function updateSellerProfile(formData) {
        const token = getToken();
        const response = await fetch(`${API_URL}/sellers/profile`, {
            method: 'PUT',
            headers: token ? { 'Authorization': `Bearer ${token}` } : {},
            body: formData
        });
        const json = await response.json();
        if (!response.ok) throw new Error(json.message || 'Erreur API');
        return json.data;
    }

    async function getSellerStats(id) {
        return await apiCall(id ? `/sellers/stats/${id}` : '/sellers/stats');
    }

    async function getSellerOrders(filters = {}) {
        const params = new URLSearchParams(filters).toString();
        return await apiCall(`/orders/seller/orders?${params}`);
    }

    // Assignation d'un livreur à une commande — l'endpoint backend existait
    // déjà et fonctionne (notification socket au livreur incluse), mais
    // aucune page ne l'appelait : impossible pour un vendeur d'assigner un
    // livreur à ses propres commandes depuis son espace.
    async function getAvailableLivreurs() {
        return await apiCall('/livreurs/available');
    }

    async function assignLivreurToOrder(orderId, livreurId) {
        return await apiCall('/livreurs/assign', {
            method: 'POST',
            body: JSON.stringify({ orderId, livreurId })
        });
    }

    async function getSellerDashboard() {
        return await apiCall('/dashboard/seller');
    }

    async function trackOrder(orderId) {
        return await apiCall(`/orders/${orderId}/track`);
    }

    async function createPayment(orderId, method, currency) {
        return await apiCall('/payments', {
            method: 'POST',
            body: JSON.stringify({ orderId, method, currency })
        });
    }

    async function confirmPayment(paymentIntentId) {
        return await apiCall('/payments/confirm', {
            method: 'POST',
            body: JSON.stringify({ paymentIntentId })
        });
    }

    async function getPaymentHistory(filters = {}) {
        const params = new URLSearchParams(filters).toString();
        return await apiCall(`/payments/history?${params}`);
    }

    // =============================================
    // RÉSERVATIONS
    // =============================================
    async function createReservation(payload) {
        return await apiCall('/reservations', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
    }

    async function getMyReservations(filters = {}) {
        const params = new URLSearchParams(filters).toString();
        return await apiCall(`/reservations?${params}`);
    }

    async function getReservationDetails(id) {
        return await apiCall(`/reservations/${id}`);
    }

    async function cancelReservation(id) {
        return await apiCall(`/reservations/${id}/cancel`, { method: 'PUT' });
    }

    async function getSellerReservations(filters = {}) {
        const params = new URLSearchParams(filters).toString();
        return await apiCall(`/reservations/seller?${params}`);
    }

    async function getSellerFavoriteStats() {
        return await apiCall('/favorites/seller-stats');
    }

    async function updateReservationStatus(id, status) {
        return await apiCall(`/reservations/${id}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status })
        });
    }

    // =============================================
    // NOTIFICATIONS
    // =============================================
    async function getNotifications(filters = {}) {
        const params = new URLSearchParams(filters).toString();
        return await apiCall(`/notifications?${params}`);
    }

    async function markNotificationRead(id) {
        return await apiCall(`/notifications/${id}/read`, { method: 'PUT' });
    }

    async function markAllNotificationsRead() {
        return await apiCall('/notifications/read-all', { method: 'PUT' });
    }

    async function deleteNotification(id) {
        return await apiCall(`/notifications/${id}`, { method: 'DELETE' });
    }

    // =============================================
    // MESSAGES
    // =============================================
    async function startConversation(recipientId) {
        return await apiCall('/messages/start', {
            method: 'POST',
            body: JSON.stringify({ recipientId })
        });
    }

    async function getConversations(filters = {}) {
        const params = new URLSearchParams(filters).toString();
        return await apiCall(`/messages/conversations?${params}`);
    }

    async function getMessages(conversationId) {
        return await apiCall(`/messages/${conversationId}`);
    }

    async function sendMessage(payload) {
        return await apiCall('/messages', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
    }

    // Suppression asymétrique d'un message (masqué uniquement pour soi,
    // jamais pour l'autre) — ne pas confondre avec la messagerie de
    // l'assistant IA plus haut dans ce fichier (autre système, autre route).
    async function deleteMessage(messageId) {
        return await apiCall(`/messages/${messageId}`, { method: 'DELETE' });
    }

    async function editMessage(messageId, content) {
        return await apiCall(`/messages/${messageId}/edit`, {
            method: 'PUT',
            body: JSON.stringify({ content })
        });
    }

    async function reactToMessage(messageId, emoji) {
        return await apiCall(`/messages/${messageId}/react`, {
            method: 'PUT',
            body: JSON.stringify({ emoji })
        });
    }

    // NB: nommées différemment de deleteConversation/archiveConversation
    // (déjà utilisées plus haut pour l'historique de l'assistant IA) pour
    // éviter exactement la même collision de nom déjà corrigée une fois
    // dans ce fichier (voir getAiConversations).
    async function archiveMessageConversation(conversationId, archived = true) {
        return await apiCall(`/messages/conversation/${conversationId}/archive`, {
            method: 'PUT',
            body: JSON.stringify({ archived })
        });
    }

    async function deleteMessageConversation(conversationId) {
        return await apiCall(`/messages/conversation/${conversationId}`, { method: 'DELETE' });
    }

    async function setChatBackground(conversationId, background) {
        return await apiCall(`/messages/conversation/${conversationId}/background`, {
            method: 'PUT',
            body: JSON.stringify({ background })
        });
    }

    async function toggleBlockUser(userId, blocked = true) {
        return await apiCall(`/messages/block/${userId}`, {
            method: 'PUT',
            body: JSON.stringify({ blocked })
        });
    }

    async function deleteAccount() {
        const data = await apiCall('/users/me', { method: 'DELETE' });
        clearSession();
        return data;
    }

    // Demande de masquage/fermeture/suppression de compte — jamais immédiat
    // de la part de l'utilisateur : une vraie demande part vers l'équipe
    // admin (voir backend/controllers/accountAction.controller.js). Pour
    // 'delete_permanent' uniquement, la session est terminée dès l'envoi
    // (le compte lui-même n'est supprimé qu'après validation admin).
    async function submitAccountActionRequest(requestType, reason) {
        const data = await apiCall('/account-actions', {
            method: 'POST',
            body: JSON.stringify({ requestType, reason })
        });
        if (requestType === 'delete_permanent') {
            clearSession();
        }
        return data;
    }

    async function getAccountActionRequests(status) {
        const params = status ? `?status=${status}` : '';
        return await apiCall(`/account-actions${params}`);
    }

    async function reviewAccountActionRequest(id, decision, reviewNote) {
        return await apiCall(`/account-actions/${id}/review`, {
            method: 'PUT',
            body: JSON.stringify({ decision, reviewNote })
        });
    }

    async function getAffiliateStats() {
        return await apiCall('/affiliates/stats');
    }

    async function getAffiliateReferrals(filters = {}) {
        const params = new URLSearchParams(filters).toString();
        return await apiCall(`/affiliates/referrals?${params}`);
    }

    async function updatePayoutMethods(methods) {
        return await apiCall('/affiliates/payout-methods', {
            method: 'PUT',
            body: JSON.stringify(methods)
        });
    }

    async function createWithdrawal(payload) {
        return await apiCall('/affiliates/withdrawals', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
    }

    async function getMyWithdrawals() {
        return await apiCall('/affiliates/withdrawals');
    }

    // =============================================
    // PRODUITS
    // =============================================
    async function getProducts(filters = {}) {
        const params = new URLSearchParams(filters).toString();
        const data = await apiCall(`/products?${params}`);
        return data.products || [];
    }

    // Comparaison de produits — synchronisée côté serveur (User.comparisonList),
    // plus jamais en localStorage.
    async function getComparison() {
        return await apiCall('/comparison');
    }
    async function toggleComparison(productId) {
        return await apiCall(`/comparison/${productId}`, { method: 'POST' });
    }
    async function clearComparison() {
        return await apiCall('/comparison', { method: 'DELETE' });
    }

    async function getCategories() {
        return await apiCall('/categories');
    }

    async function createCategory(payload) {
        return await apiCall('/categories', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
    }

    async function getProduct(id) {
        return await apiCall(`/products/${id}`);
    }

    async function getSellerProducts(sellerId, filters = {}) {
        const params = new URLSearchParams(filters).toString();
        const data = await apiCall(`/products/seller/${sellerId}?${params}`);
        return data.products || [];
    }

    async function createProduct(formData) {
        const token = getToken();
        const response = await fetch(`${API_URL}/products`, {
            method: 'POST',
            headers: token ? { 'Authorization': `Bearer ${token}` } : {},
            body: formData // pas de Content-Type: fetch le gère pour FormData
        });
        const json = await response.json();
        if (!response.ok) throw new Error(json.message || 'Erreur API');
        return json.data;
    }

    async function updateProduct(id, formData) {
        const token = getToken();
        const response = await fetch(`${API_URL}/products/${id}`, {
            method: 'PUT',
            headers: token ? { 'Authorization': `Bearer ${token}` } : {},
            body: formData
        });
        const json = await response.json();
        if (!response.ok) throw new Error(json.message || 'Erreur API');
        return json.data;
    }

    async function deleteProduct(id) {
        return await apiCall(`/products/${id}`, { method: 'DELETE' });
    }

    // =============================================
    // PANIER — routes réelles : voir backend/routes/cart.routes.js
    // =============================================
    async function getCart() {
        return await apiCall('/cart');
    }

    async function addToCart(productId, quantity = 1, selectedAttributes = {}) {
        return await apiCall('/cart/add', {
            method: 'POST',
            body: JSON.stringify({ productId, quantity, selectedAttributes })
        });
    }

    async function updateCartItem(productId, quantity) {
        return await apiCall('/cart/update', {
            method: 'PUT',
            body: JSON.stringify({ productId, quantity })
        });
    }

    async function updateCartItemAttributes(productId, selectedAttributes) {
        return await apiCall('/cart/update-attributes', {
            method: 'PUT',
            body: JSON.stringify({ productId, selectedAttributes })
        });
    }

    async function removeFromCart(productId) {
        return await apiCall(`/cart/delete/${productId}`, { method: 'DELETE' });
    }

    // Diminue la quantité de 1 (ou retire l'article si elle tombe à 0) — voir PUT /cart/remove/:productId
    async function decrementCartItem(productId) {
        return await apiCall(`/cart/remove/${productId}`, { method: 'PUT' });
    }

    async function clearCart() {
        return await apiCall('/cart/clear', { method: 'DELETE' });
    }

    async function getCartTotal() {
        return await apiCall('/cart/total');
    }

    // =============================================
    // FAVORIS
    // =============================================
    async function getFavorites() {
        const data = await apiCall('/favorites');
        return data.favorites || [];
    }

    async function toggleFavorite(productId) {
        return await apiCall('/favorites', {
            method: 'POST',
            body: JSON.stringify({ productId })
        });
    }

    async function removeFavorite(productId) {
        return await apiCall(`/favorites/${productId}`, { method: 'DELETE' });
    }

    // =============================================
    // COMMANDES
    // =============================================
    async function createOrder(payload) {
        return await apiCall('/orders', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
    }

    async function getMyOrders(filters = {}) {
        const params = new URLSearchParams(filters).toString();
        return await apiCall(`/orders?${params}`);
    }

    async function getOrderDetails(id) {
        return await apiCall(`/orders/${id}`);
    }

    async function getOrderGroup(orderGroup) {
        return await apiCall(`/orders/group/${orderGroup}`);
    }

    // Facture HTML — endpoint distinct des autres (renvoie du HTML, pas du
    // JSON), donc ne passe pas par apiCall(). Récupère le document avec le
    // bon en-tête d'authentification puis l'ouvre dans un nouvel onglet,
    // prêt à être imprimé/enregistré en PDF par le navigateur.
    async function downloadOrderInvoice(orderId) {
        const token = getToken();
        const response = await fetch(`${API_URL}/orders/${orderId}/invoice`, {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        if (!response.ok) {
            throw new Error('Impossible de récupérer la facture.');
        }
        const html = await response.text();
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
    }

    async function cancelOrder(id) {
        return await apiCall(`/orders/${id}/cancel`, { method: 'PUT' });
    }

    // =============================================
    // AVIS
    // =============================================
    async function getReviews(productId) {
        return await apiCall(`/reviews/product/${productId}`);
    }

    // Modération des avis — réservé au staff (moderator/admin/superadmin).
    // Backend jusqu'ici prêt (champ Review.status) mais jamais exposé.
    async function getPendingReviews() {
        return await apiCall('/reviews/pending');
    }

    async function moderateReview(id, status) {
        return await apiCall(`/reviews/${id}/moderate`, {
            method: 'PUT',
            body: JSON.stringify({ status })
        });
    }

    async function addReview(productId, rating, comment, title) {
        return await apiCall(`/reviews`, {
            method: 'POST',
            body: JSON.stringify({ productId, rating, comment, title })
        });
    }


    // =============================================
    // AVIS DE L'APPLICATION — une seule soumission par compte
    // =============================================
    async function getMyAppReview() {
        return await apiCall('/app-reviews/me');
    }

    async function getAppSettings() {
        return await apiCall('/app-settings');
    }

    async function updateAppSettings(updates) {
        return await apiCall('/app-settings', {
            method: 'PUT',
            body: JSON.stringify(updates)
        });
    }

    async function submitAppReview(rating, comment = '') {
        return await apiCall('/app-reviews', {
            method: 'POST',
            body: JSON.stringify({ rating, comment })
        });
    }

    // =========================================================
    // EXPOSITION GLOBALE — utilisable depuis n'importe quelle page
    // =========================================================
    window.SineAPI = {
        // Auth
        getToken, getUser, isAuthenticated, getCurrentUser,
        login, loginWithFirebase, register, logout, verifySession, getProfile, getAvailableLivreurs, 
        updateProfile, updatePassword,
        requestPhoneVerification, confirmPhoneVerification, requestEmailChange, confirmEmailChange,
        switchRole, addRole,
        verifyEmail, resendVerification, createAffiliate, getAffiliateByCode, uploadFile,
        verifySecurityCode, verifySecurityOtp, forgotSecurityCode, resetSecurityCode, setSecurityCode, 
        forgotPassword, resetPassword, submitAdminApplication,
        getAdminApplications, createAdminInvite, getAdminInvites, getInviteByToken,
        
        // Finance Admin
        getFinanceDashboard, getFinancialLedger, getFinanceConfigAdmin, updateFinanceConfigAdmin,
        listPaymentMethodsAdmin, togglePaymentMethodAdmin, listRefundsAdmin, updateRefundStatusAdmin,
        listWithdrawalsAdmin, payWithdrawalAdmin, rejectWithdrawalAdmin,
        
        // Wallet & Loyalty
        getMyWallet, payWithWallet, getWalletTransactions, getMyLoyalty, previewLoyaltyRedeemable, getPaymentMethods,
        getScanPayLink, getScanPayStatus,
        
        // KYC
        submitKyc, getMyKyc, getAllKyc, reviewKyc,
        
        // Seller Payment
        getSellerBalance, requestSellerWithdrawal, getSellerWithdrawals,
        
        // Reports & Disputes
        createReport, getAllReports, reviewReport,
        createDispute, getMyDisputes, getAllDisputes, resolveDispute,
        
        // Affiliate
        getAffiliateStats, getAffiliateReferrals, updatePayoutMethods, createWithdrawal, getMyWithdrawals,
        
        // Products
        getProducts, getProduct, getSellerProducts, getCategories, createCategory, createProduct, updateProduct, deleteProduct,
        getComparison, toggleComparison, clearComparison,
        
        // Cart
        getCart, addToCart, updateCartItem, updateCartItemAttributes, removeFromCart, decrementCartItem, clearCart, getCartTotal,
        
        // Favorites
        getFavorites, toggleFavorite, removeFavorite,
        
        // Orders
        createOrder, getMyOrders, getOrderDetails, getOrderGroup, downloadOrderInvoice, cancelOrder,
        
        // Reviews
        getReviews, addReview, getPendingReviews, moderateReview, getMyAppReview, submitAppReview, getAppSettings, updateAppSettings,
        
        // Seller
        getSellerProfile, updateSellerProfile, getSellerStats, getSellerOrders, getSellerDashboard,
        getAvailableLivreurs, assignLivreurToOrder,
        
        // Admin
        getAdminDashboard, getAdminUsers, updateUserStatus, adminDeleteUser, getSystemStats, getAllOrdersAdmin,
        
        // Tickets
        createTicket, getMyTickets, getAllTickets, getTicketStats, getTicket, updateTicketStatus, addTicketResponse,
        
        // Assistant AI
        sendChatMessage, getAiConversations, deleteConversation, archiveConversation, pinConversation, deleteAllAiHistory, archiveAllAiHistory,
        searchFaq, getFaqCategories, getFaqByCategory, getFaqById, getPopularFaq, rateFaq,
        
        // Livreur
        getLivreurDeliveries, updateDeliveryStatusAsLivreur, updateLivreurLocation,
        
        // Notifications
        getNotifications, markNotificationRead, markAllNotificationsRead, deleteNotification,
        
        // Messages
        startConversation, getConversations, getMessages, sendMessage,
        deleteMessage, editMessage, reactToMessage, archiveMessageConversation, deleteMessageConversation, 
        setChatBackground, toggleBlockUser,
        
        // Reservations
        createReservation, getMyReservations, getReservationDetails, cancelReservation, getSellerReservations, 
        getSellerFavoriteStats, updateReservationStatus, deleteAccount,
        
        // Account Actions
        submitAccountActionRequest, getAccountActionRequests, reviewAccountActionRequest,
        
        // Tracking & Payments
        trackOrder, createPayment, confirmPayment, getPaymentHistory,
    };

})();