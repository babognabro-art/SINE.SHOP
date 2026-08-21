// =========================================================
// SINE.SHOP — MODULE PARTAGÉ : MESSAGERIE ENRICHIE + APPELS
// Utilisé par client.html, vendeur.html, livreur.html (et toute
// autre page qui inclut le même bloc HTML : voir la section
// #messages, #callOverlay et #shareModal de client.html pour le
// gabarit exact à reprendre).
//
// Chargement : après config.js, api.js, socket.io CDN et
// socket-client.js. Puis, dans le script de la page :
//
//   const chat = window.initSineChat({
//       getCurrentUser: () => currentUser,
//       getConversations: () => allConversations,
//       setConversations: (list) => { allConversations = list; },
//       notify: showNotification,
//       onUnreadCountChange: (count) => { document.getElementById('messagesBadge').textContent = count; }
//   });
//   // puis, une fois les conversations chargées (dans loadData()) :
//   chat.refreshConversationList();
//
// NB appels WebRTC : signalisation déjà prête côté backend
// (backend/sockets/index.js), non testable en conditions réelles
// dans cet environnement (il faudrait deux navigateurs connectés
// en simultané) — suit le schéma standard, à valider une fois
// déployé.
// =========================================================
(function() {
    'use strict';

    function initSineChat(config) {
        const getCurrentUser = config.getCurrentUser;
        const getConversations = config.getConversations;
        const setConversations = config.setConversations;
        const notify = config.notify || function() {};
        const onUnreadCountChange = config.onUnreadCountChange || function() {};
        // Optionnel — uniquement fourni par vendeur.html : liste de ses
        // propres produits publiés, pour la fonctionnalité "Proposer des
        // produits" depuis la messagerie.
        const getMyProducts = config.getMyProducts || function() { return []; };

        let activeConversation = null;
        let chatMessages = [];
        let typingActive = false;
        let typingStopTimer = null;
        let pendingShare = null;

        function myId() {
            const u = getCurrentUser();
            return u ? (u.id || u._id) : null;
        }

        function getMyUnreadCount(conv) {
            if (!conv || !conv.unreadCounts) return 0;
            const uid = myId();
            return (conv.unreadCounts[uid]) || 0;
        }

        function getOtherParticipant(conv) {
            const uid = myId();
            return (conv?.participants || []).find(p => (p._id || p) !== uid);
        }

        function roleLabel(role) {
            return { seller: 'Vendeur', livreur: 'Livreur', affiliate: 'Partenaire', client: 'Client' }[role] || '';
        }

        function escapeHtml(str) {
            const div = document.createElement('div');
            div.textContent = str || '';
            return div.innerHTML;
        }

        function formatMessagePreview(msg) {
            if (!msg) return '';
            switch (msg.type) {
                case 'image': return '📷 Photo';
                case 'video': return '🎬 Vidéo';
                case 'file': return '📎 Fichier';
                case 'location': return '📍 Localisation';
                case 'share': return '🔗 Partage';
                default: return (msg.content || '').substring(0, 40);
            }
        }

        function updateUnreadBadge() {
            const count = getConversations().filter(c => getMyUnreadCount(c) > 0).length;
            onUnreadCountChange(count);
        }

        // Vue "Archives" — le bouton "Archiver" existait déjà (menuArchive)
        // et fonctionnait bien côté serveur (Conversation.archivedFor), mais
        // AUCUNE page n'exposait la moindre façon de revoir une conversation
        // archivée ensuite : elle disparaissait purement et simplement de la
        // vue de l'utilisateur, sans meilleur moyen de la retrouver qu'un
        // appel API direct. Construit ici une vraie bascule + liste dédiée.
        let vueArchivesActive = false;
        let archivedConversationsCache = [];

        function renderConversationList() {
            const container = document.getElementById('chatConvListItems');
            if (!container) return;

            if (vueArchivesActive) {
                if (!archivedConversationsCache.length) {
                    container.innerHTML = '<div class="empty-state"><span class="icon">📦</span>Aucune conversation archivée</div>';
                    return;
                }
                container.innerHTML = archivedConversationsCache.map(conv => {
                    const other = getOtherParticipant(conv);
                    const name = other ? (other.storeName || `${other.firstName || ''} ${other.lastName || ''}`.trim()) : 'Utilisateur';
                    const avatar = other?.profilePicture || '../images/profil.png';
                    const preview = formatMessagePreview(conv.lastMessage);
                    return `
                        <div class="chat-conv-item">
                            <img src="${avatar}" alt="" onerror="this.src='../images/profil.png'">
                            <div class="conv-info">
                                <div class="conv-name">${escapeHtml(name)}</div>
                                <div class="conv-preview">${escapeHtml(preview)}</div>
                            </div>
                            <button onclick="event.stopPropagation();window.SineChatActive.unarchiveConversation('${conv._id}')" title="Désarchiver" style="background:none;border:none;cursor:pointer;color:#2d73ff;"><i class="fa-solid fa-box-open"></i></button>
                        </div>
                    `;
                }).join('');
                return;
            }

            const conversations = getConversations();
            if (!conversations.length) {
                container.innerHTML = '<div class="empty-state"><span class="icon">💬</span>Aucune conversation</div>';
                return;
            }
            container.innerHTML = conversations.map(conv => {
                const other = getOtherParticipant(conv);
                const name = other ? (other.storeName || `${other.firstName || ''} ${other.lastName || ''}`.trim()) : 'Utilisateur';
                const avatar = other?.profilePicture || '../images/profil.png';
                const preview = formatMessagePreview(conv.lastMessage);
                const unread = getMyUnreadCount(conv);
                const isActive = activeConversation && activeConversation._id === conv._id;
                return `
                    <div class="chat-conv-item ${isActive ? 'active' : ''}" onclick="window.SineChatActive.openConversation('${conv._id}')">
                        <img src="${avatar}" alt="" onerror="this.src='../images/profil.png'">
                        <div class="conv-info">
                            <div class="conv-name">${escapeHtml(name)}</div>
                            <div class="conv-preview">${escapeHtml(preview)}</div>
                        </div>
                        ${unread > 0 ? `<span class="conv-badge">${unread}</span>` : ''}
                    </div>
                `;
            }).join('');
        }

        async function toggleArchivesView() {
            vueArchivesActive = !vueArchivesActive;
            const btn = document.getElementById('btnToggleArchives');
            if (btn) btn.innerHTML = vueArchivesActive
                ? '<i class="fa-solid fa-arrow-left"></i> Retour aux conversations'
                : '<i class="fa-solid fa-box-archive"></i> Archives';
            if (vueArchivesActive) {
                try {
                    const data = await window.SineAPI.getConversations({ archived: 'true' });
                    archivedConversationsCache = data.conversations || [];
                } catch (e) {
                    notify(e.message || 'Erreur lors du chargement des archives.', 'error');
                    archivedConversationsCache = [];
                }
            }
            renderConversationList();
        }

        async function unarchiveConversation(convId) {
            try {
                await window.SineAPI.archiveMessageConversation(convId, false);
                archivedConversationsCache = archivedConversationsCache.filter(c => c._id !== convId);
                notify('📤 Conversation désarchivée.', 'success');
                renderConversationList();
                refreshConversationList();
            } catch (e) {
                notify(e.message || 'Erreur lors du désarchivage.', 'error');
            }
        }

        async function refreshConversationList() {
            try {
                const data = await window.SineAPI.getConversations();
                setConversations(data.conversations || []);
                if (!vueArchivesActive) renderConversationList();
                updateUnreadBadge();
            } catch (e) { /* silencieux */ }
        }

        async function openConversation(convId) {
            const conv = getConversations().find(c => c._id === convId);
            if (!conv) return;

            if (activeConversation && activeConversation._id !== convId) {
                window.SineSocket.emit('leave-room', { roomId: activeConversation._id, userId: myId() });
            }

            activeConversation = conv;
            renderConversationList();

            const other = getOtherParticipant(conv);
            document.getElementById('chatOtherName').textContent = other ? (other.storeName || `${other.firstName || ''} ${other.lastName || ''}`.trim()) : 'Utilisateur';
            document.getElementById('chatOtherAvatar').src = other?.profilePicture || '../images/profil.png';
            document.getElementById('chatOtherStatus').textContent = other?.role ? roleLabel(other.role) : '';
            updateOtherStatusDisplay();

            document.getElementById('chatThread').classList.add('active');
            document.getElementById('chatConvList').classList.add('hidden-mobile');

            applyChatBackground(conv);

            window.SineSocket.emit('join-room', { roomId: convId, userId: myId() });

            try {
                const data = await window.SineAPI.getMessages(convId);
                chatMessages = data.messages || [];
                renderMessages();
                if (conv.unreadCounts) conv.unreadCounts[myId()] = 0;
                renderConversationList();
                updateUnreadBadge();
            } catch (e) {
                notify('Erreur de chargement des messages.', 'error');
            }
        }

        function closeThreadMobile() {
            document.getElementById('chatThread').classList.remove('active');
            document.getElementById('chatConvList').classList.remove('hidden-mobile');
        }

        function shareLinkFor(type, id, metadata) {
            if (type === 'product') return '../html/collections.html?produit=' + id;
            // NB: confirmation.html attend type=commande (pas "order") et
            // suivi.html attend ?commande= (jamais ?livreur=) — les deux liens
            // étaient cassés depuis toujours, corrigés içi.
            if (type === 'order') return '../html/confirmation.html?id=' + id + '&type=commande';
            if (type === 'livreur') return '../html/suivi.html?commande=' + id;
            // Proposition de produits envoyée par le vendeur — l'URL complète
            // (avec le panier encodé) est déjà construite au moment de l'envoi,
            // stockée dans metadata.bundleUrl (pas un simple ID à interpoler).
            if (type === 'products-bundle') return metadata?.bundleUrl || '#';
            return '#';
        }
        function shareLabelFor(type) {
            return { product: 'Fiche produit', order: 'Reçu de commande', livreur: 'Suivi de livraison', invoice: 'Facture', 'products-bundle': 'Proposition de produits', 'livreur-suggestion': 'Livreur suggéré' }[type] || 'Partage';
        }

        // Le vendeur choisit des produits parmi les siens et les envoie
        // directement dans la conversation active — au clic, le client se
        // retrouve sur panier.html avec ces produits déjà ajoutés à SON
        // panier (voir panier.html::chargerPanier, param ?propose=).
        async function sendProductsProposal(items) {
            if (!activeConversation || !items.length) return;
            const bundleUrl = '../html/panier.html?propose=' + encodeURIComponent(btoa(JSON.stringify(items)));
            const firstProduct = getMyProducts().find(p => p._id === items[0].productId);
            try {
                const msg = await window.SineAPI.sendMessage({
                    conversationId: activeConversation._id,
                    content: `${items.length} produit${items.length > 1 ? 's' : ''} proposé${items.length > 1 ? 's' : ''}`,
                    type: 'share',
                    metadata: {
                        shareType: 'products-bundle',
                        bundleUrl,
                        previewTitle: items.length === 1 ? (firstProduct?.name || 'Produit proposé') : `${items.length} produits proposés`,
                        previewImage: firstProduct?.images?.[0] || ''
                    }
                });
                chatMessages.push(msg);
                renderMessages();
                refreshConversationList();
                notify('🛒 Proposition envoyée.', 'success');
            } catch (e) {
                notify(e.message || 'Erreur lors de l\'envoi de la proposition.', 'error');
            }
        }

        // Suggérer un livreur SINE.SHOP (ayant un compte actif) dans la
        // conversation active — recherche + envoi direct. Fonctionnalité
        // demandée à la fois pour vendeur.html et le client (client.html a
        // sa propre copie, voir plus bas dans ce fichier).
        async function openLivreurSuggestModal() {
            document.getElementById('suggestLivreurModal').style.display = 'flex';
            await refreshLivreurSuggestList('');
        }

        async function refreshLivreurSuggestList(search) {
            const list = document.getElementById('suggestLivreurList');
            try {
                const data = await window.SineAPI.getAvailableLivreurs(search);
                const livreurs = data || [];
                if (!livreurs.length) {
                    list.innerHTML = '<p style="color:#94a3b8;font-size:0.85rem;">Aucun livreur disponible.</p>';
                    return;
                }
                list.innerHTML = livreurs.map(l => `
                    <div class="chat-conv-item" onclick="window.SineChatActive.sendLivreurSuggestion('${l._id}', '${escapeHtml(`${l.firstName || ''} ${l.lastName || ''}`.trim())}', '${l.profilePicture || ''}', '${l.vehicleType || ''}', '${l.address?.city || ''}')">
                        <img src="${l.profilePicture || '../images/profil.png'}" alt="" onerror="this.src='../images/profil.png'">
                        <div class="conv-info">
                            <div class="conv-name">${escapeHtml(`${l.firstName || ''} ${l.lastName || ''}`.trim())}</div>
                            <div class="conv-preview">${escapeHtml(l.vehicleType || '')} ${l.address?.city ? '· ' + escapeHtml(l.address.city) : ''}</div>
                        </div>
                    </div>
                `).join('');
            } catch (e) {
                list.innerHTML = '<p style="color:#94a3b8;font-size:0.85rem;">Erreur de chargement.</p>';
            }
        }

        async function sendLivreurSuggestion(livreurId, name, avatar, vehicleType, city) {
            document.getElementById('suggestLivreurModal').style.display = 'none';
            if (!activeConversation) return;
            try {
                const msg = await window.SineAPI.sendMessage({
                    conversationId: activeConversation._id,
                    content: `Livreur suggéré : ${name}`,
                    type: 'share',
                    metadata: {
                        shareType: 'livreur-suggestion',
                        previewTitle: name,
                        previewImage: avatar || '',
                        vehicleType: vehicleType || '',
                        city: city || ''
                    }
                });
                chatMessages.push(msg);
                renderMessages();
                refreshConversationList();
                notify('🚴 Livreur suggéré.', 'success');
            } catch (e) {
                notify(e.message || 'Erreur lors de l\'envoi.', 'error');
            }
        }

        function renderBubble(msg) {
            const uid = myId();
            const senderId = msg.sender?._id || msg.sender;
            const mine = senderId === uid;
            const time = msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '';
            const canEdit = mine && msg.type === 'text' && (Date.now() - new Date(msg.createdAt).getTime()) < 10 * 60 * 1000;
            let body = '';

            switch (msg.type) {
                case 'image':
                    body = `<img class="chat-media" src="${msg.attachments?.[0] || ''}" alt="Photo" onclick="window.SineChatLightbox && window.SineChatLightbox('${msg.attachments?.[0] || ''}')">`;
                    break;
                case 'video':
                    body = `<video class="chat-media" src="${msg.attachments?.[0] || ''}" controls></video>`;
                    break;
                case 'audio':
                    body = `<div class="chat-voice-note"><i class="fa-solid fa-microphone" style="opacity:0.6;"></i><audio src="${msg.attachments?.[0] || ''}" controls></audio></div>`;
                    break;
                case 'file':
                    body = `<a class="chat-file-link" href="${msg.attachments?.[0] || ''}" target="_blank"><i class="fa-regular fa-file"></i> ${escapeHtml(msg.content || 'Fichier')}</a>`;
                    break;
                case 'location': {
                    const lat = msg.metadata?.lat, lng = msg.metadata?.lng;
                    body = `<a class="chat-location" href="https://www.google.com/maps?q=${lat},${lng}" target="_blank"><i class="fa-solid fa-location-dot"></i> Localisation partagée</a>`;
                    break;
                }
                case 'share': {
                    const shareType = msg.metadata?.shareType;
                    const title = msg.metadata?.previewTitle || 'Élément partagé';
                    const img = msg.metadata?.previewImage || '../images/produit.png';
                    if (shareType === 'livreur-suggestion') {
                        // Pas de page profil livreur publique — carte
                        // informative non cliquable (nom, véhicule, ville).
                        body = `<div class="chat-share-card">
                                    <img src="${img || '../images/profil.png'}" alt="" onerror="this.src='../images/profil.png'">
                                    <div><div class="share-title">${escapeHtml(title)}</div><div class="share-sub">🚴 ${escapeHtml(msg.metadata?.vehicleType || 'Livreur')}${msg.metadata?.city ? ' · ' + escapeHtml(msg.metadata.city) : ''}</div></div>
                                </div>`;
                        break;
                    }
                    // Une facture exige d'être connecté pour la récupérer (pas
                    // une simple URL publique) — clic spécial plutôt qu'un lien.
                    const clickAction = shareType === 'invoice'
                        ? `window.SineAPI.downloadOrderInvoice('${msg.metadata?.shareId}')`
                        : `window.location.href='${shareLinkFor(shareType, msg.metadata?.shareId, msg.metadata)}'`;
                    body = `<div class="chat-share-card" onclick="${clickAction}">
                                <img src="${img}" alt="" onerror="this.src='../images/produit.png'">
                                <div><div class="share-title">${escapeHtml(title)}</div><div class="share-sub">${shareLabelFor(shareType)}</div></div>
                            </div>`;
                    break;
                }
                default:
                    body = escapeHtml(msg.content || '');
            }

            const forwardedTag = msg.forwardedFrom
                ? `<div class="chat-bubble-forwarded"><i class="fa-solid fa-share"></i> Transféré</div>` : '';
            const editedTag = msg.isEdited ? `<span class="edited-tag">(modifié)</span>` : '';
            // Coche lu/non-lu — la donnée (Message.isRead) existait déjà et
            // était correctement mise à jour côté serveur, mais jamais
            // affichée : rien ne la lisait côté frontend.
            const readTag = mine ? `<i class="fa-solid ${msg.isRead ? 'fa-check-double' : 'fa-check'}" style="font-size:0.68rem;margin-left:4px;color:${msg.isRead ? '#2d73ff' : 'inherit'};opacity:${msg.isRead ? '1' : '0.6'};"></i>` : '';

            const actions = [];
            actions.push(`<button onclick="window.SineChatActive.toggleReactionPicker('${msg._id}')" title="Réagir"><i class="fa-regular fa-face-smile"></i></button>`);
            if (msg.type === 'text') actions.push(`<button onclick="window.SineChatActive.copyMessage('${msg._id}')" title="Copier"><i class="fa-regular fa-copy"></i></button>`);
            if (msg.type === 'text') actions.push(`<button onclick="window.SineChatActive.translateMessage('${msg._id}')" title="Traduire"><i class="fa-solid fa-language"></i></button>`);
            if (msg.type === 'text') actions.push(`<button onclick="window.SineChatActive.readMessageAloud('${msg._id}')" title="Écouter"><i class="fa-solid fa-volume-high"></i></button>`);
            actions.push(`<button onclick="window.SineChatActive.openForwardModal('${msg._id}')" title="Transférer"><i class="fa-solid fa-share"></i></button>`);
            if (canEdit) actions.push(`<button onclick="window.SineChatActive.startEditMessage('${msg._id}')" title="Modifier"><i class="fa-solid fa-pen"></i></button>`);
            actions.push(`<button class="danger" onclick="window.SineChatActive.deleteMessageForMe('${msg._id}')" title="Supprimer pour moi"><i class="fa-solid fa-trash-can"></i></button>`);

            // Affichage des réactions déjà posées (regroupées par emoji, avec
            // compteur) — clic pour réagir/retirer sa propre réaction.
            let reactionsHtml = '';
            if (msg.reactions && msg.reactions.length) {
                const groups = {};
                msg.reactions.forEach(r => {
                    const emoji = r.emoji;
                    if (!groups[emoji]) groups[emoji] = 0;
                    groups[emoji]++;
                });
                reactionsHtml = `<div class="chat-reactions">${Object.entries(groups).map(([emoji, count]) =>
                    `<span class="chat-reaction-pill" onclick="window.SineChatActive.sendReaction('${msg._id}','${emoji}')">${emoji} ${count > 1 ? count : ''}</span>`
                ).join('')}</div>`;
            }
            const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];
            const reactionPicker = `<div class="chat-reaction-picker" id="reactionPicker-${msg._id}">
                ${REACTION_EMOJIS.map(e => `<button onclick="window.SineChatActive.sendReaction('${msg._id}','${e}')">${e}</button>`).join('')}
            </div>`;

            return `<div class="chat-bubble-row ${mine ? 'mine' : ''}">
                <div class="chat-bubble-wrap">
                    <div class="chat-msg-actions">${actions.join('')}</div>
                    ${reactionPicker}
                    <div class="chat-bubble" data-msg-id="${msg._id}">${forwardedTag}${body}<span class="chat-time">${time}${editedTag}${readTag}</span></div>
                    ${reactionsHtml}
                </div>
            </div>`;
        }

        function findMessage(id) {
            return chatMessages.find(m => m._id === id);
        }

        // Réactions emoji — mini-picker affiché/masqué par message, envoi de
        // la réaction au serveur, mise à jour optimiste de l'affichage.
        function toggleReactionPicker(id) {
            document.querySelectorAll('.chat-reaction-picker.open').forEach(el => {
                if (el.id !== `reactionPicker-${id}`) el.classList.remove('open');
            });
            document.getElementById(`reactionPicker-${id}`)?.classList.toggle('open');
        }

        async function sendReaction(id, emoji) {
            document.getElementById(`reactionPicker-${id}`)?.classList.remove('open');
            try {
                const result = await window.SineAPI.reactToMessage(id, emoji);
                const msg = findMessage(id);
                if (msg) msg.reactions = result.reactions || [];
                renderMessages();
            } catch (e) {
                notify(e.message || 'Erreur lors de la réaction.', 'error');
            }
        }

        function copyMessage(id) {
            const msg = findMessage(id);
            if (!msg) return;
            navigator.clipboard.writeText(msg.content || '').then(() => {
                notify('📋 Message copié.', 'success');
            }).catch(() => notify('Impossible de copier.', 'error'));
        }

        // Traduction à la volée façon Alibaba — via MyMemory (service public
        // gratuit, aucune clé API requise ; volume limité, donc pas garanti
        // pour un usage très intensif, mais suffisant pour une messagerie).
        // La traduction s'affiche SOUS le message d'origine, jamais à sa place.
        async function translateMessage(id) {
            const bubble = document.querySelector(`.chat-bubble[data-msg-id="${id}"]`);
            const msg = findMessage(id);
            if (!bubble || !msg) return;

            const existing = bubble.querySelector('.chat-translation');
            if (existing) { existing.remove(); return; }

            const target = (getCurrentUser()?.preferredLanguage || 'fr').toLowerCase();
            const loadingEl = document.createElement('div');
            loadingEl.className = 'chat-translation';
            loadingEl.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Traduction...';
            bubble.appendChild(loadingEl);

            try {
                const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(msg.content || '')}&langpair=auto|${target}`);
                const data = await res.json();
                const translated = data?.responseData?.translatedText;
                loadingEl.innerHTML = translated
                    ? `<i class="fa-solid fa-language"></i> ${escapeHtml(translated)}`
                    : 'Traduction indisponible pour le moment.';
            } catch (e) {
                loadingEl.textContent = 'Traduction indisponible pour le moment.';
            }
        }

        // Lecture audio du message (synthèse vocale, voix féminine si
        // disponible) — n'existait pas du tout.
        function readMessageAloud(id) {
            const msg = findMessage(id);
            if (!msg || !msg.content) return;
            if (!window.speechSynthesis) { notify('Lecture audio non supportée par ce navigateur.', 'error'); return; }
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(msg.content);
            const lang = (getCurrentUser()?.preferredLanguage || 'fr').toLowerCase();
            utterance.lang = { fr: 'fr-FR', en: 'en-US', es: 'es-ES', ar: 'ar-SA' }[lang] || 'fr-FR';
            const voices = window.speechSynthesis.getVoices();
            const voixFeminine = voices.find(v => v.lang.startsWith(utterance.lang.slice(0, 2)) && /female|femme|women/i.test(v.name))
                || voices.find(v => v.lang.startsWith(utterance.lang.slice(0, 2)));
            if (voixFeminine) utterance.voice = voixFeminine;
            utterance.pitch = 1.1;
            window.speechSynthesis.speak(utterance);
        }

        function deleteMessageForMe(id) {
            if (!confirm('Retirer ce message de votre vue ? Il restera visible pour votre interlocuteur.')) return;
            window.SineAPI.deleteMessage(id).then(() => {
                chatMessages = chatMessages.filter(m => m._id !== id);
                renderMessages();
            }).catch(e => notify(e.message || 'Erreur lors de la suppression.', 'error'));
        }

        let editingMessageId = null;

        function startEditMessage(id) {
            const msg = findMessage(id);
            if (!msg) return;
            editingMessageId = id;
            const input = document.getElementById('chatInput');
            input.value = msg.content || '';
            autoResizeTextarea(input);
            input.focus();
            document.getElementById('chatEditBar').classList.add('active');
        }

        function cancelEdit() {
            editingMessageId = null;
            document.getElementById('chatInput').value = '';
            document.getElementById('chatEditBar').classList.remove('active');
        }

        let pendingForwardId = null;

        function openForwardModal(id) {
            pendingForwardId = id;
            const conversations = getConversations();
            if (!conversations.length) {
                notify('Aucune conversation pour l\'instant.', 'warning');
                return;
            }
            const picker = document.getElementById('forwardConvPicker');
            picker.innerHTML = conversations.map(conv => {
                const other = getOtherParticipant(conv);
                const name = other ? (other.storeName || `${other.firstName || ''} ${other.lastName || ''}`.trim()) : 'Utilisateur';
                return `<div class="chat-conv-item" onclick="window.SineChatActive.confirmForward('${conv._id}')">
                    <img src="${other?.profilePicture || '../images/profil.png'}" alt="" onerror="this.src='../images/profil.png'">
                    <div class="conv-info"><div class="conv-name">${escapeHtml(name)}</div></div>
                </div>`;
            }).join('');
            document.getElementById('forwardModal').classList.add('open');
        }

        async function confirmForward(conversationId) {
            if (!pendingForwardId) return;
            const original = findMessage(pendingForwardId);
            document.getElementById('forwardModal').classList.remove('open');
            try {
                await window.SineAPI.sendMessage({
                    conversationId,
                    content: original?.content || '',
                    type: original?.type || 'text',
                    attachments: original?.attachments || [],
                    metadata: original?.metadata,
                    forwardedFrom: pendingForwardId,
                });
                notify('↪️ Message transféré.', 'success');
                if (activeConversation && activeConversation._id === conversationId) {
                    refreshConversationList();
                    openConversation(conversationId);
                }
            } catch (e) {
                notify(e.message || 'Erreur lors du transfert.', 'error');
            }
            pendingForwardId = null;
        }

        function renderMessages() {
            const container = document.getElementById('chatMessages');
            if (!container) return;
            container.innerHTML = chatMessages.map(renderBubble).join('');
            container.scrollTop = container.scrollHeight;
        }

        function autoResizeTextarea(el) {
            el.style.height = 'auto';
            el.style.height = Math.min(el.scrollHeight, 100) + 'px';
        }

        async function sendChatText() {
            const input = document.getElementById('chatInput');
            const content = input.value.trim();
            if (!content || !activeConversation) return;

            if (editingMessageId) {
                const id = editingMessageId;
                input.value = '';
                autoResizeTextarea(input);
                document.getElementById('chatEditBar').classList.remove('active');
                editingMessageId = null;
                try {
                    const updated = await window.SineAPI.editMessage(id, content);
                    const idx = chatMessages.findIndex(m => m._id === id);
                    if (idx !== -1) chatMessages[idx] = updated;
                    renderMessages();
                } catch (e) {
                    notify(e.message || 'Erreur lors de la modification.', 'error');
                }
                return;
            }

            input.value = '';
            autoResizeTextarea(input);
            try {
                const msg = await window.SineAPI.sendMessage({ conversationId: activeConversation._id, content, type: 'text' });
                chatMessages.push(msg);
                renderMessages();
                refreshConversationList();
            } catch (e) {
                notify(e.message || 'Erreur d\'envoi.', 'error');
            }
        }

        function emitTyping() {
            if (!activeConversation) return;
            if (!typingActive) {
                typingActive = true;
                window.SineSocket.emit('typing', { roomId: activeConversation._id, isTyping: true });
            }
            clearTimeout(typingStopTimer);
            typingStopTimer = setTimeout(() => {
                typingActive = false;
                window.SineSocket.emit('typing', { roomId: activeConversation._id, isTyping: false });
            }, 2000);
        }

        // Prévisualisation avant envoi — avant, choisir un fichier l'envoyait
        // immédiatement. Le fichier s'affiche maintenant dans la barre de
        // discussion et ne part que sur clic Envoyer (ou s'annule).
        let fichierEnAttente = null;

        function afficherApercuPieceJointe(file, type) {
            fichierEnAttente = { file, type };
            let apercu = document.getElementById('chatAttachPreview');
            if (!apercu) {
                apercu = document.createElement('div');
                apercu.id = 'chatAttachPreview';
                apercu.style.cssText = 'display:flex;align-items:center;gap:10px;padding:8px 12px;background:#f1f5f9;border-radius:12px;margin-bottom:8px;';
                document.querySelector('.chat-compose')?.insertAdjacentElement('beforebegin', apercu);
            }
            const url = URL.createObjectURL(file);
            let miniature = '';
            if (type === 'image') miniature = `<img src="${url}" style="width:44px;height:44px;object-fit:cover;border-radius:8px;">`;
            else if (type === 'video') miniature = `<video src="${url}" style="width:44px;height:44px;object-fit:cover;border-radius:8px;"></video>`;
            else miniature = `<i class="fa-regular fa-file" style="font-size:1.4rem;color:#64748b;"></i>`;
            apercu.innerHTML = `
                ${miniature}
                <span style="flex:1;font-size:0.85rem;font-weight:600;color:#0f172a;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${file.name}</span>
                <button type="button" id="btnEnvoyerPieceJointe" style="padding:6px 14px;border-radius:20px;background:#2d73ff;color:#fff;font-weight:600;font-size:0.8rem;">Envoyer</button>
                <button type="button" id="btnAnnulerPieceJointe" style="padding:6px 10px;border-radius:20px;background:#e2e8f0;color:#334155;font-weight:600;font-size:0.8rem;">✕</button>
            `;
            apercu.style.display = 'flex';
            document.getElementById('btnEnvoyerPieceJointe').onclick = async function() {
                if (!fichierEnAttente) return;
                const { file: f, type: t } = fichierEnAttente;
                annulerApercuPieceJointe();
                await sendAttachment(f, t);
            };
            document.getElementById('btnAnnulerPieceJointe').onclick = annulerApercuPieceJointe;
        }

        function annulerApercuPieceJointe() {
            fichierEnAttente = null;
            const apercu = document.getElementById('chatAttachPreview');
            if (apercu) apercu.style.display = 'none';
        }

        async function sendAttachment(file, type) {
            if (!file || !activeConversation) return;
            try {
                notify('📤 Envoi en cours...', 'info');
                const res = await window.SineAPI.uploadFile(file, 'messages');
                const msg = await window.SineAPI.sendMessage({
                    conversationId: activeConversation._id,
                    content: file.name,
                    type,
                    attachments: [res.url]
                });
                chatMessages.push(msg);
                renderMessages();
                refreshConversationList();
            } catch (e) {
                notify(e.message || 'Erreur lors de l\'envoi du fichier.', 'error');
            }
        }

        function shareLocation() {
            if (!activeConversation) return;
            if (!navigator.geolocation) { notify('Géolocalisation non supportée.', 'error'); return; }
            navigator.geolocation.getCurrentPosition(async function(pos) {
                try {
                    const msg = await window.SineAPI.sendMessage({
                        conversationId: activeConversation._id,
                        content: 'Localisation partagée',
                        type: 'location',
                        metadata: { lat: String(pos.coords.latitude), lng: String(pos.coords.longitude) }
                    });
                    chatMessages.push(msg);
                    renderMessages();
                    refreshConversationList();
                } catch (e) {
                    notify(e.message || 'Erreur d\'envoi de la localisation.', 'error');
                }
            }, function() {
                notify('Impossible d\'obtenir votre position.', 'error');
            });
        }

        function shareItem(shareType, shareId, previewTitle, previewImage) {
            pendingShare = { shareType, shareId, previewTitle, previewImage };
            const conversations = getConversations();
            if (!conversations.length) {
                notify('Aucune conversation pour l\'instant — écrivez d\'abord à quelqu\'un.', 'warning');
                return;
            }
            const picker = document.getElementById('shareConvPicker');
            picker.innerHTML = conversations.map(conv => {
                const other = getOtherParticipant(conv);
                const name = other ? (other.storeName || `${other.firstName || ''} ${other.lastName || ''}`.trim()) : 'Utilisateur';
                return `<div class="chat-conv-item" onclick="window.SineChatActive.confirmShare('${conv._id}')">
                    <img src="${other?.profilePicture || '../images/profil.png'}" alt="" onerror="this.src='../images/profil.png'">
                    <div class="conv-info"><div class="conv-name">${escapeHtml(name)}</div></div>
                </div>`;
            }).join('');
            document.getElementById('shareModal').style.display = 'flex';
        }

        async function confirmShare(conversationId) {
            if (!pendingShare) return;
            document.getElementById('shareModal').style.display = 'none';
            try {
                await window.SineAPI.sendMessage({
                    conversationId,
                    content: pendingShare.previewTitle,
                    type: 'share',
                    metadata: {
                        shareType: pendingShare.shareType,
                        shareId: pendingShare.shareId,
                        previewTitle: pendingShare.previewTitle,
                        previewImage: pendingShare.previewImage || ''
                    }
                });
                notify('✅ Partagé !', 'success');
                if (activeConversation && activeConversation._id === conversationId) {
                    const data = await window.SineAPI.getMessages(conversationId);
                    chatMessages = data.messages || [];
                    renderMessages();
                }
                refreshConversationList();
            } catch (e) {
                notify(e.message || 'Erreur lors du partage.', 'error');
            }
            pendingShare = null;
        }

        // =========================================================
        // SONNERIES D'APPEL — 4 mélodies composées moi-même (Web Audio API,
        // synthèse pure, aucun fichier externe requis) : une pour la personne
        // qui APPELLE (tonalité de retour, discrète, en boucle tant que ça
        // sonne côté destinataire) et une pour la personne qui REÇOIT
        // (sonnerie plus présente), déclinées séparément pour le vocal et la
        // vidéo afin qu'on distingue au son le type d'appel qui arrive.
        // =========================================================
        let ringtoneAudioCtx = null;
        let ringtoneTimeoutId = null;
        let ringtoneStopped = true;

        function getRingtoneAudioCtx() {
            if (!ringtoneAudioCtx) ringtoneAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
            return ringtoneAudioCtx;
        }

        function playTone(ctx, freq, startTime, duration, volume) {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(volume, startTime + 0.02);
            gain.gain.linearRampToValueAtTime(volume, Math.max(startTime + 0.02, startTime + duration - 0.03));
            gain.gain.linearRampToValueAtTime(0, startTime + duration);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(startTime);
            osc.stop(startTime + duration);
        }

        // Chaque mélodie : suite de [fréquence, durée] — fréquence 0 = silence.
        const RINGTONES = {
            // Vocal — celui qui APPELLE : tonalité de retour classique, sobre,
            // deux bips espacés (façon tonalité téléphonique traditionnelle).
            'outgoing-voice': { notes: [[440, 0.4], [0, 0.35], [440, 0.4], [0, 1.85]], volume: 0.12 },
            // Vocal — celui qui REÇOIT : petite mélodie montante 3 notes, plus
            // enjouée pour bien signaler l'appel entrant.
            'incoming-voice': { notes: [[523.25, 0.16], [659.25, 0.16], [783.99, 0.3], [0, 0.55]], volume: 0.17 },
            // Vidéo — celui qui APPELLE : variante distincte du vocal (notes
            // différentes) pour qu'on distingue à l'oreille vocal vs vidéo.
            'outgoing-video': { notes: [[493.88, 0.35], [0, 0.3], [622.25, 0.35], [0, 1.7]], volume: 0.12 },
            // Vidéo — celui qui REÇOIT : petit carillon descendant, distinct de
            // la sonnerie entrante vocale.
            'incoming-video': { notes: [[783.99, 0.18], [659.25, 0.18], [523.25, 0.3], [0, 0.55]], volume: 0.17 },
        };

        function playRingtone(key) {
            stopRingtone();
            const config = RINGTONES[key];
            if (!config) return;
            ringtoneStopped = false;
            let ctx;
            try { ctx = getRingtoneAudioCtx(); } catch (e) { return; }
            const total = config.notes.reduce((s, n) => s + n[1], 0);
            function scheduleLoop() {
                if (ringtoneStopped) return;
                let t = ctx.currentTime + 0.05;
                config.notes.forEach(([freq, dur]) => {
                    if (freq > 0) playTone(ctx, freq, t, dur, config.volume);
                    t += dur;
                });
                ringtoneTimeoutId = setTimeout(scheduleLoop, total * 1000);
            }
            scheduleLoop();
        }

        function stopRingtone() {
            ringtoneStopped = true;
            if (ringtoneTimeoutId) { clearTimeout(ringtoneTimeoutId); ringtoneTimeoutId = null; }
        }

        // =========================================================
        // APPELS VOCAUX / VIDÉO (WebRTC)
        // =========================================================
        let localStream = null;
        let peerConnection = null;
        let currentCallId = null;
        let currentCallPartner = null;
        let isCaller = false;
        const ICE_SERVERS = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

        let currentCallType = 'audio';
        let callDurationInterval = null;
        let callDurationSeconds = 0;

        function showCallOverlay(state) {
            const overlay = document.getElementById('callOverlay');
            overlay.classList.add('active');
            overlay.classList.toggle('voice-mode', currentCallType !== 'video');
            document.getElementById('callName').textContent = currentCallPartner?.name || '—';
            document.getElementById('callAvatar').src = currentCallPartner?.avatar || '../images/profil.png';
            document.getElementById('callIncomingActions').style.display = state === 'incoming' ? 'flex' : 'none';
            document.getElementById('callControls').style.display = (state === 'calling' || state === 'connecting') ? 'flex' : 'none';
            const labels = { calling: 'Appel en cours...', incoming: 'Appel entrant...', connecting: 'Connexion...' };
            document.getElementById('callStatus').textContent = labels[state] || '';
        }

        function startCallDurationTimer() {
            callDurationSeconds = 0;
            clearInterval(callDurationInterval);
            const el = document.getElementById('callDuration');
            callDurationInterval = setInterval(() => {
                callDurationSeconds++;
                const m = String(Math.floor(callDurationSeconds / 60)).padStart(2, '0');
                const s = String(callDurationSeconds % 60).padStart(2, '0');
                el.textContent = `${m}:${s}`;
            }, 1000);
        }

        function endCallLocal() {
            stopRingtone();
            if (peerConnection) { peerConnection.close(); peerConnection = null; }
            if (localStream) { localStream.getTracks().forEach(t => t.stop()); localStream = null; }
            clearInterval(callDurationInterval);
            document.getElementById('callDuration').textContent = '00:00';
            document.getElementById('callOverlay').classList.remove('active', 'voice-mode');
            document.getElementById('callVideos').classList.remove('active', 'size-medium', 'size-full');
            videoSizeIndex = 0;
            const resizeIcon = document.querySelector('#btnResizeVideo i');
            if (resizeIcon) resizeIcon.className = 'fa-solid fa-expand';
            document.getElementById('localVideo').srcObject = null;
            document.getElementById('remoteVideo').srcObject = null;
            currentCallId = null;
            currentCallPartner = null;
            isCaller = false;
        }

        function setupPeerConnection() {
            peerConnection = new RTCPeerConnection(ICE_SERVERS);
            localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

            document.getElementById('localVideo').srcObject = localStream;
            if (localStream.getVideoTracks().length > 0) {
                document.getElementById('callVideos').classList.add('active');
            }

            const remoteStream = new MediaStream();
            document.getElementById('remoteVideo').srcObject = remoteStream;

            peerConnection.ontrack = function(event) {
                event.streams[0].getTracks().forEach(track => remoteStream.addTrack(track));
                document.getElementById('callVideos').classList.add('active');
                document.getElementById('callStatus').textContent = 'En communication';
            };

            peerConnection.onicecandidate = function(event) {
                if (event.candidate && currentCallPartner) {
                    window.SineSocket.emit('webrtc-ice-candidate', { targetUserId: currentCallPartner.id, candidate: event.candidate });
                }
            };
        }

        async function createAndSendOffer() {
            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);
            window.SineSocket.emit('webrtc-offer', { targetUserId: currentCallPartner.id, offer });
        }

        async function startCall(type) {
            if (!activeConversation) return;
            const other = getOtherParticipant(activeConversation);
            if (!other) return;

            currentCallType = type;
            currentCallPartner = { id: other._id, name: other.storeName || `${other.firstName || ''} ${other.lastName || ''}`.trim(), avatar: other.profilePicture || '../images/profil.png' };
            isCaller = true;

            try {
                localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: type === 'video' });
            } catch (e) {
                notify('Impossible d\'accéder au micro/caméra.', 'error');
                return;
            }

            showCallOverlay('calling');
            playRingtone(type === 'video' ? 'outgoing-video' : 'outgoing-voice');
            const user = getCurrentUser();
            window.SineSocket.emit('call-request', {
                targetUserId: currentCallPartner.id,
                callerName: `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
                callType: type
            });
        }

        async function acceptCall() {
            stopRingtone();
            try {
                localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
            } catch (e) {
                try {
                    localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
                } catch (e2) {
                    notify('Impossible d\'accéder au micro/caméra.', 'error');
                    return;
                }
            }
            window.SineSocket.emit('call-accept', { callId: currentCallId });
            showCallOverlay('connecting');
            setupPeerConnection();
        }

        function rejectCall() {
            window.SineSocket.emit('call-reject', { callId: currentCallId });
            endCallLocal();
        }

        function hangup() {
            if (currentCallId) window.SineSocket.emit('call-end', { callId: currentCallId });
            endCallLocal();
        }

        function toggleMic(btn) {
            if (!localStream) return;
            const track = localStream.getAudioTracks()[0];
            if (!track) return;
            track.enabled = !track.enabled;
            btn.classList.toggle('active-toggle', !track.enabled);
        }

        function toggleCam(btn) {
            if (!localStream) return;
            const track = localStream.getVideoTracks()[0];
            if (!track) return;
            track.enabled = !track.enabled;
            btn.classList.toggle('active-toggle', !track.enabled);
        }

        // =========================================================
        // FOND DE DISCUSSION — propre à chaque participant (voir
        // Conversation.chatBackgrounds côté backend). Un fond prédéfini
        // ("preset:ocean") ou l'URL Cloudinary d'une photo importée.
        // =========================================================
        function applyChatBackground(conv) {
            const el = document.getElementById('chatMessages');
            const stored = conv?.chatBackgrounds?.[myId()];
            if (!stored) {
                el.dataset.bg = 'default';
                el.style.backgroundImage = '';
                return;
            }
            if (stored.startsWith('preset:')) {
                el.dataset.bg = stored.replace('preset:', '');
                el.style.backgroundImage = '';
            } else {
                el.dataset.bg = 'custom';
                el.style.backgroundImage = `url('${stored}')`;
            }
        }

        async function applyBgPreset(preset) {
            if (!activeConversation) return;
            const value = preset === 'default' ? null : `preset:${preset}`;
            try {
                await window.SineAPI.setChatBackground(activeConversation._id, value);
                if (!activeConversation.chatBackgrounds) activeConversation.chatBackgrounds = {};
                activeConversation.chatBackgrounds[myId()] = value;
                applyChatBackground(activeConversation);
                document.getElementById('bgConvModal').classList.remove('open');
                notify('🖼️ Fond mis à jour.', 'success');
            } catch (e) {
                notify(e.message || 'Erreur lors du changement de fond.', 'error');
            }
        }

        async function uploadCustomBg(file) {
            if (!file || !activeConversation) return;
            try {
                notify('📤 Envoi de la photo...', 'info');
                const res = await window.SineAPI.uploadFile(file, 'chat-backgrounds');
                await window.SineAPI.setChatBackground(activeConversation._id, res.url);
                if (!activeConversation.chatBackgrounds) activeConversation.chatBackgrounds = {};
                activeConversation.chatBackgrounds[myId()] = res.url;
                applyChatBackground(activeConversation);
                document.getElementById('bgConvModal').classList.remove('open');
                notify('🖼️ Fond mis à jour.', 'success');
            } catch (e) {
                notify(e.message || 'Erreur lors de l\'envoi de la photo.', 'error');
            }
        }

        // =========================================================
        // MENU ⋮ DE LA DISCUSSION (à propos, fond, archiver, supprimer,
        // bloquer)
        // =========================================================
        function toggleThreadDropdown(e) {
            e.stopPropagation();
            document.getElementById('chatThreadDropdown').classList.toggle('open');
        }

        function openAboutModal() {
            document.getElementById('chatThreadDropdown').classList.remove('open');
            if (!activeConversation) return;
            const other = getOtherParticipant(activeConversation);
            document.getElementById('aboutAvatar').src = other?.profilePicture || '../images/profil.png';
            document.getElementById('aboutName').textContent = other ? (other.storeName || `${other.firstName || ''} ${other.lastName || ''}`.trim()) : 'Utilisateur';
            document.getElementById('aboutRole').textContent = other?.role ? roleLabel(other.role) : '';
            document.getElementById('aboutMsgCount').textContent = chatMessages.length;
            document.getElementById('aboutStartDate').textContent = activeConversation.createdAt
                ? new Date(activeConversation.createdAt).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })
                : '—';
            document.getElementById('aboutConvModal').classList.add('open');
        }

        function openBgModal() {
            document.getElementById('chatThreadDropdown').classList.remove('open');
            document.getElementById('bgConvModal').classList.add('open');
        }

        async function archiveCurrentConversation() {
            document.getElementById('chatThreadDropdown').classList.remove('open');
            if (!activeConversation) return;
            try {
                await window.SineAPI.archiveMessageConversation(activeConversation._id, true);
                notify('📦 Conversation archivée.', 'success');
                closeThreadMobile();
                setConversations(getConversations().filter(c => c._id !== activeConversation._id));
                renderConversationList();
                activeConversation = null;
            } catch (e) {
                notify(e.message || 'Erreur lors de l\'archivage.', 'error');
            }
        }

        async function deleteCurrentConversation() {
            document.getElementById('chatThreadDropdown').classList.remove('open');
            if (!activeConversation) return;
            if (!confirm('Supprimer cette discussion de votre liste ? Votre interlocuteur continuera de la voir normalement.')) return;
            try {
                await window.SineAPI.deleteMessageConversation(activeConversation._id);
                notify('🗑️ Discussion supprimée de votre liste.', 'success');
                closeThreadMobile();
                setConversations(getConversations().filter(c => c._id !== activeConversation._id));
                renderConversationList();
                activeConversation = null;
            } catch (e) {
                notify(e.message || 'Erreur lors de la suppression.', 'error');
            }
        }

        async function toggleBlockCurrentUser() {
            document.getElementById('chatThreadDropdown').classList.remove('open');
            if (!activeConversation) return;
            const other = getOtherParticipant(activeConversation);
            if (!other) return;
            const name = other.storeName || `${other.firstName || ''} ${other.lastName || ''}`.trim();
            if (!confirm(`Bloquer ${name} ? Vous ne pourrez plus échanger de messages tant que vous ne le débloquez pas.`)) return;
            try {
                await window.SineAPI.toggleBlockUser(other._id, true);
                notify(`🚫 ${name} a été bloqué(e).`, 'success');
            } catch (e) {
                notify(e.message || 'Erreur lors du blocage.', 'error');
            }
        }

        // =========================================================
        // MESSAGES VOCAUX (MediaRecorder)
        // =========================================================
        let mediaRecorder = null;
        let recordedChunks = [];

        async function startRecording() {
            if (!activeConversation) return;
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                recordedChunks = [];
                mediaRecorder = new MediaRecorder(stream);
                mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) recordedChunks.push(e.data); };
                mediaRecorder.start();
                document.getElementById('chatRecordingIndicator').classList.add('active');
            } catch (e) {
                notify('Impossible d\'accéder au micro.', 'error');
            }
        }

        function cancelRecording() {
            if (mediaRecorder && mediaRecorder.state !== 'inactive') {
                mediaRecorder.stream.getTracks().forEach(t => t.stop());
                mediaRecorder.onstop = null;
                mediaRecorder.stop();
            }
            recordedChunks = [];
            document.getElementById('chatRecordingIndicator').classList.remove('active');
        }

        function stopRecordingAndSend() {
            if (!mediaRecorder || mediaRecorder.state === 'inactive') return;
            mediaRecorder.onstop = async function() {
                mediaRecorder.stream.getTracks().forEach(t => t.stop());
                document.getElementById('chatRecordingIndicator').classList.remove('active');
                const blob = new Blob(recordedChunks, { type: 'audio/webm' });
                if (blob.size < 500) { notify('Enregistrement trop court.', 'warning'); return; }
                const file = new File([blob], `vocal-${Date.now()}.webm`, { type: 'audio/webm' });
                await sendAttachment(file, 'audio');
            };
            mediaRecorder.stop();
        }

        // =========================================================
        // STATUT EN LIGNE — l'infrastructure existait déjà côté serveur
        // (broadcasts 'user-online'/'user-offline'), mais RIEN côté
        // frontend ne l'écoutait ni ne l'affichait.
        // =========================================================
        const onlineUserIds = new Set();

        function updateOtherStatusDisplay() {
            if (!activeConversation) return;
            const other = getOtherParticipant(activeConversation);
            if (!other) return;
            const statusEl = document.getElementById('chatOtherStatus');
            if (!statusEl) return;
            const enLigne = onlineUserIds.has((other._id || '').toString());
            statusEl.textContent = enLigne ? '🟢 En ligne' : roleLabel(other.role);
        }

        window.SineSocket.on('online-users-list', function(list) {
            (list || []).forEach(id => onlineUserIds.add(id));
            updateOtherStatusDisplay();
        });
        window.SineSocket.on('user-online', function(data) {
            if (data?.userId) onlineUserIds.add(data.userId);
            updateOtherStatusDisplay();
        });
        window.SineSocket.on('user-offline', function(data) {
            if (data?.userId) onlineUserIds.delete(data.userId);
            updateOtherStatusDisplay();
        });

        // =========================================================
        // ÉVÉNEMENTS SOCKET (une seule fois par instance du module)
        // =========================================================
        window.SineSocket.on('user-typing', function(data) {
            if (!activeConversation) return;
            const el = document.getElementById('chatTyping');
            if (data.isTyping) {
                el.textContent = 'En train d\'écrire...';
                el.style.display = 'block';
            } else {
                el.style.display = 'none';
            }
        });

        window.SineSocket.on('new-message', function(data) {
            const convId = data.conversation;
            if (activeConversation && activeConversation._id === convId) {
                chatMessages.push(data.message);
                renderMessages();
            } else {
                notify('💬 Nouveau message', 'info');
            }
            refreshConversationList();
        });

        window.SineSocket.on('message-edited', function(data) {
            const msg = data.message;
            if (!activeConversation || !msg) return;
            const idx = chatMessages.findIndex(m => m._id === msg._id);
            if (idx !== -1) {
                chatMessages[idx] = msg;
                renderMessages();
            }
        });

        window.SineSocket.on('message-reaction', function(data) {
            const msg = findMessage(data.messageId);
            if (msg) {
                msg.reactions = data.reactions || [];
                renderMessages();
            }
        });

        window.SineSocket.on('incoming-call', function(data) {
            currentCallId = data.callId;
            isCaller = false;
            currentCallType = data.callType || 'audio';
            const caller = getConversations().map(getOtherParticipant).find(p => p && p._id === data.callerId);
            currentCallPartner = caller
                ? { id: caller._id, name: caller.storeName || `${caller.firstName || ''} ${caller.lastName || ''}`.trim(), avatar: caller.profilePicture || '../images/profil.png' }
                : { id: data.callerId, name: data.callerName || 'Appel entrant', avatar: '../images/profil.png' };
            showCallOverlay('incoming');
            playRingtone(currentCallType === 'video' ? 'incoming-video' : 'incoming-voice');
        });

        window.SineSocket.on('call-connected', function(data) {
            currentCallId = data.callId;
            stopRingtone();
            startCallDurationTimer();
            if (isCaller) {
                showCallOverlay('connecting');
                setupPeerConnection();
                createAndSendOffer();
            }
        });
        window.SineSocket.on('call-rejected', function() { notify('Appel refusé.', 'info'); endCallLocal(); });
        window.SineSocket.on('call-ended', function() { notify('Appel terminé.', 'info'); endCallLocal(); });
        window.SineSocket.on('call-error', function(data) { notify(data.message || 'Erreur d\'appel.', 'error'); endCallLocal(); });

        window.SineSocket.on('webrtc-offer', async function(data) {
            if (!peerConnection) setupPeerConnection();
            await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            window.SineSocket.emit('webrtc-answer', { targetUserId: data.from, answer });
        });
        window.SineSocket.on('webrtc-answer', async function(data) {
            if (peerConnection) await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
        });
        window.SineSocket.on('webrtc-ice-candidate', async function(data) {
            if (peerConnection && data.candidate) {
                try { await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate)); } catch (e) {}
            }
        });

        // =========================================================
        // LIAISON DOM (boutons/inputs du gabarit HTML partagé)
        // =========================================================
        document.getElementById('btnBackThread').addEventListener('click', closeThreadMobile);

        document.getElementById('btnSendMessage').addEventListener('click', sendChatText);
        document.getElementById('chatInput').addEventListener('input', function() {
            autoResizeTextarea(this);
            emitTyping();
        });
        document.getElementById('chatInput').addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatText(); }
        });

        document.getElementById('btnAttach').addEventListener('click', function(e) {
            e.stopPropagation();
            document.getElementById('chatAttachMenu').classList.toggle('open');
        });
        document.addEventListener('click', function() {
            document.getElementById('chatAttachMenu').classList.remove('open');
            const picker = document.getElementById('chatEmojiPicker');
            if (picker) picker.classList.remove('open');
        });

        // Sélecteur d'emojis — palette simple insérée dans le champ de texte.
        const EMOJI_LIST = ['😀','😂','😍','😘','🥰','😎','🤔','😢','😭','😡','👍','👎','🙏','👏','💪','🔥','❤️','💯','🎉','✅','❌','⭐','😅','😉','🙌','👋','🤝','😴','🥳','😱'];
        const emojiPicker = document.getElementById('chatEmojiPicker');
        const btnEmoji = document.getElementById('btnEmoji');
        if (emojiPicker && btnEmoji) {
            emojiPicker.innerHTML = EMOJI_LIST.map(e => `<button type="button">${e}</button>`).join('');
            btnEmoji.addEventListener('click', function(e) {
                e.stopPropagation();
                emojiPicker.classList.toggle('open');
            });
            emojiPicker.addEventListener('click', function(e) {
                e.stopPropagation();
                if (e.target.tagName !== 'BUTTON') return;
                const input = document.getElementById('chatInput');
                input.value += e.target.textContent;
                input.focus();
                autoResizeTextarea(input);
            });
        }

        document.getElementById('btnAttachPhoto').addEventListener('click', () => document.getElementById('chatFilePhoto').click());
        document.getElementById('btnAttachVideo').addEventListener('click', () => document.getElementById('chatFileVideo').click());
        document.getElementById('btnAttachFile').addEventListener('click', () => document.getElementById('chatFileDoc').click());
        document.getElementById('chatFilePhoto').addEventListener('change', function() { if (this.files[0]) afficherApercuPieceJointe(this.files[0], 'image'); this.value = ''; });
        document.getElementById('chatFileVideo').addEventListener('change', function() { if (this.files[0]) afficherApercuPieceJointe(this.files[0], 'video'); this.value = ''; });
        document.getElementById('chatFileDoc').addEventListener('change', function() { if (this.files[0]) afficherApercuPieceJointe(this.files[0], 'file'); this.value = ''; });
        document.getElementById('btnAttachLocation').addEventListener('click', function() {
            document.getElementById('chatAttachMenu').classList.remove('open');
            shareLocation();
        });

        // "Proposer des produits" — uniquement présent sur vendeur.html.
        document.getElementById('btnAttachProducts')?.addEventListener('click', function() {
            document.getElementById('chatAttachMenu').classList.remove('open');
            if (!activeConversation) return;
            const produits = getMyProducts();
            const list = document.getElementById('proposeProductsList');
            if (!produits.length) {
                list.innerHTML = '<p style="color:#94a3b8;font-size:0.85rem;">Aucun produit publié pour l\'instant.</p>';
            } else {
                list.innerHTML = produits.map(p => `
                    <label style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #f1f5f9;">
                        <input type="checkbox" class="propose-product-check" value="${p._id}" style="width:18px;height:18px;">
                        <img src="${p.images?.[0] || '../images/produit.png'}" style="width:40px;height:40px;object-fit:cover;border-radius:8px;" onerror="this.src='../images/produit.png'">
                        <div style="flex:1;">
                            <div style="font-size:0.85rem;font-weight:600;">${escapeHtml(p.name || 'Produit')}</div>
                            <div style="font-size:0.75rem;color:#64748b;">${(p.price || 0).toLocaleString('fr-FR')} FCFA</div>
                        </div>
                        <input type="number" class="propose-product-qty" value="1" min="1" style="width:50px;padding:4px;border-radius:8px;border:1px solid #e2e8f0;">
                    </label>
                `).join('');
            }
            document.getElementById('proposeProductsModal').style.display = 'flex';
        });
        document.getElementById('btnSendProductsProposal')?.addEventListener('click', function() {
            const checked = Array.from(document.querySelectorAll('.propose-product-check:checked'));
            if (!checked.length) { notify('Sélectionnez au moins un produit.', 'warning'); return; }
            const items = checked.map(cb => {
                const qtyInput = cb.closest('label').querySelector('.propose-product-qty');
                return { productId: cb.value, quantity: parseInt(qtyInput.value, 10) || 1 };
            });
            document.getElementById('proposeProductsModal').style.display = 'none';
            sendProductsProposal(items);
        });

        // "Suggérer un livreur" — présent sur vendeur.html (et potentiellement
        // livreur.html même si peu pertinent), avec recherche en direct.
        document.getElementById('btnAttachLivreur')?.addEventListener('click', function() {
            document.getElementById('chatAttachMenu').classList.remove('open');
            openLivreurSuggestModal();
        });
        let livreurSearchTimeout = null;
        document.getElementById('suggestLivreurSearch')?.addEventListener('input', function() {
            clearTimeout(livreurSearchTimeout);
            const value = this.value;
            livreurSearchTimeout = setTimeout(() => refreshLivreurSuggestList(value), 300);
        });

        document.getElementById('btnCallAudio').addEventListener('click', () => startCall('audio'));
        document.getElementById('btnCallVideo').addEventListener('click', () => startCall('video'));
        document.getElementById('btnAcceptCall').addEventListener('click', acceptCall);
        document.getElementById('btnRejectCall').addEventListener('click', rejectCall);
        document.getElementById('btnHangup').addEventListener('click', hangup);
        document.getElementById('btnToggleMic').addEventListener('click', function() { toggleMic(this); });
        document.getElementById('btnToggleCam').addEventListener('click', function() { toggleCam(this); });

        // Taille de la fenêtre vidéo — cycle normal → moyen → plein écran.
        // L'interlocuteur (remoteVideo) reste toujours en grand, ma propre
        // caméra (localVideo) reste toujours la vignette, à toutes les tailles.
        const VIDEO_SIZES = ['', 'size-medium', 'size-full'];
        let videoSizeIndex = 0;
        document.getElementById('btnResizeVideo')?.addEventListener('click', function() {
            const el = document.getElementById('callVideos');
            videoSizeIndex = (videoSizeIndex + 1) % VIDEO_SIZES.length;
            VIDEO_SIZES.forEach(c => c && el.classList.remove(c));
            if (VIDEO_SIZES[videoSizeIndex]) el.classList.add(VIDEO_SIZES[videoSizeIndex]);
            const icon = this.querySelector('i');
            icon.className = videoSizeIndex === 2 ? 'fa-solid fa-compress' : 'fa-solid fa-expand';
        });

        // Menu ⋮ de la discussion
        document.getElementById('btnThreadMenu').addEventListener('click', toggleThreadDropdown);
        document.addEventListener('click', function() {
            document.getElementById('chatThreadDropdown').classList.remove('open');
        });
        document.getElementById('menuAbout').addEventListener('click', openAboutModal);
        document.getElementById('menuChangeBg').addEventListener('click', openBgModal);
        document.getElementById('menuArchive').addEventListener('click', archiveCurrentConversation);
        document.getElementById('menuDeleteConv').addEventListener('click', deleteCurrentConversation);
        document.getElementById('menuBlock').addEventListener('click', toggleBlockCurrentUser);
        document.getElementById('btnToggleArchives')?.addEventListener('click', toggleArchivesView);

        // Sélecteur de fond de discussion
        document.querySelectorAll('.bg-preset-swatch').forEach(btn => {
            btn.addEventListener('click', () => applyBgPreset(btn.dataset.bg));
        });
        document.getElementById('btnUploadCustomBg').addEventListener('click', () => document.getElementById('chatBgFileInput').click());
        document.getElementById('chatBgFileInput').addEventListener('change', function() {
            uploadCustomBg(this.files[0]);
            this.value = '';
        });

        // Modification de message
        document.getElementById('btnCancelEdit').addEventListener('click', cancelEdit);

        // Message vocal (maintenir/relâcher, façon messagerie usuelle)
        const btnRecord = document.getElementById('btnRecordVoice');
        btnRecord.addEventListener('click', function() {
            if (!mediaRecorder || mediaRecorder.state === 'inactive') startRecording();
        });
        document.getElementById('btnStopRecording').addEventListener('click', stopRecordingAndSend);
        document.getElementById('btnCancelRecording').addEventListener('click', cancelRecording);

        const api = {
            refreshConversationList,
            renderConversationList,
            openConversation,
            confirmShare,
            shareItem,
            copyMessage,
            translateMessage,
            readMessageAloud,
            deleteMessageForMe,
            startEditMessage,
            openForwardModal,
            confirmForward,
            unarchiveConversation,
            toggleReactionPicker,
            sendReaction,
            sendProductsProposal,
            sendLivreurSuggestion,
        };

        // Utilisé par les onclick="" inline générés dans le HTML rendu ci-dessus
        window.SineChatActive = api;

        return api;
    }

    window.initSineChat = initSineChat;
})();
