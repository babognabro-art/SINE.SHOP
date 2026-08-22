const logger = require('../utils/logger');
const { verifyToken } = require('../config/jwt');

// Store des connexions actives
const activeUsers = new Map();
const activeRooms = new Map();
const callSessions = new Map();

// Configuration des sockets
module.exports = (io) => {
    // Middleware d'authentification — vérifie réellement le token JWT
    // (remplace l'ancien système qui faisait confiance à un userId envoyé
    // tel quel par le client).
    io.use((socket, next) => {
        try {
            const token = socket.handshake.auth.token;
            if (!token) {
                return next(new Error('Token manquant'));
            }

            const decoded = verifyToken(token);
            if (!decoded) {
                return next(new Error('Token invalide'));
            }
            socket.userId = decoded.id;
            socket.userRole = decoded.role;
            socket.userEmail = decoded.email;
            next();
        } catch (error) {
            return next(new Error('Token invalide'));
        }
    });

    io.on('connection', (socket) => {
        const userId = socket.userId;
        logger.info(`🔌 Socket connecté: ${userId}`);

        // Room personnelle — utilisée par SocketService (config/socket.js)
        // pour cibler cet utilisateur depuis n'importe quel contrôleur
        // (notifications, commandes, paiements, messages...).
        socket.join(`user_${userId}`);

        // Enregistrer l'utilisateur
        activeUsers.set(userId, {
            socketId: socket.id,
            userId: userId,
            role: socket.userRole,
            email: socket.userEmail,
            connectedAt: new Date()
        });

        // Notifier les autres utilisateurs
        socket.broadcast.emit('user-online', {
            userId: userId,
            email: socket.userEmail
        });

        // Informer CE socket (celui qui vient de se connecter) de qui est
        // déjà en ligne — 'user-online' seul ne prévient que des connexions
        // FUTURES, jamais de l'état déjà présent au moment où on se connecte
        // (donc un statut "en ligne" jamais affiché tant que l'autre ne se
        // reconnectait pas pendant qu'on regardait). Le frontend n'écoutait
        // d'ailleurs jusqu'ici ni l'un ni l'autre événement.
        socket.emit('online-users-list', Array.from(activeUsers.keys()));

        // =============================================
        // 1. REJOINDRE UNE SALLE (CHAT)
        // =============================================
        socket.on('join-room', ({ roomId, userId }) => {
            socket.join(roomId);
            if (!activeRooms.has(roomId)) {
                activeRooms.set(roomId, new Set());
            }
            activeRooms.get(roomId).add(userId);
            
            socket.to(roomId).emit('user-joined', {
                userId: userId,
                socketId: socket.id
            });
            
            logger.info(`📢 ${userId} a rejoint la salle ${roomId}`);
        });

        // =============================================
        // 2. QUITTER UNE SALLE
        // =============================================
        socket.on('leave-room', ({ roomId, userId }) => {
            socket.leave(roomId);
            if (activeRooms.has(roomId)) {
                activeRooms.get(roomId).delete(userId);
                if (activeRooms.get(roomId).size === 0) {
                    activeRooms.delete(roomId);
                }
            }
            socket.to(roomId).emit('user-left', { userId });
            logger.info(`📢 ${userId} a quitté la salle ${roomId}`);
        });

        // =============================================
        // 3. ENVOYER UN MESSAGE
        // NB: événement éphémère, non persisté en base — le vrai envoi de
        // message (sauvegarde + push temps réel) passe par POST /api/messages
        // (voir controllers/message.controller.js), qui appelle ensuite
        // SocketService.sendToUser(..., 'new-message', ...). Ce canal-ci
        // reste disponible pour des diffusions ponctuelles non critiques.
        // =============================================
        socket.on('send-message', ({ roomId, message, sender }) => {
            const msg = {
                id: Date.now().toString(36),
                sender: sender || userId,
                text: message,
                timestamp: new Date().toISOString()
            };
            io.to(roomId).emit('new-message', msg);
            logger.info(`💬 Message dans ${roomId}: ${message}`);
        });

        // =============================================
        // 4. DEMANDER UN APPEL VOCAL
        // =============================================
        socket.on('call-request', ({ targetUserId, callerName, callType }) => {
            const targetSocket = activeUsers.get(targetUserId);
            if (!targetSocket) {
                socket.emit('call-error', { message: 'Utilisateur hors ligne' });
                return;
            }

            const callId = Date.now().toString(36);
            callSessions.set(callId, {
                callerId: userId,
                targetId: targetUserId,
                status: 'ringing',
                startTime: new Date()
            });

            io.to(targetSocket.socketId).emit('incoming-call', {
                callId,
                callerId: userId,
                callerName: callerName || 'Appelant',
                callType: callType || 'audio',
                timestamp: new Date().toISOString()
            });

            logger.info(`📞 Appel vocal ${userId} → ${targetUserId}`);
        });

        // =============================================
        // 5. ACCEPTER UN APPEL
        // =============================================
        socket.on('call-accept', ({ callId }) => {
            const session = callSessions.get(callId);
            if (!session) {
                socket.emit('call-error', { message: 'Session d\'appel introuvable' });
                return;
            }

            const callerSocket = activeUsers.get(session.callerId);
            if (!callerSocket) {
                socket.emit('call-error', { message: 'Appelant déconnecté' });
                return;
            }

            session.status = 'connected';
            io.to(callerSocket.socketId).emit('call-connected', { callId });
            socket.emit('call-connected', { callId });

            logger.info(`📞 Appel accepté: ${callId}`);
        });

        // =============================================
        // 6. REFUSER UN APPEL
        // =============================================
        socket.on('call-reject', ({ callId }) => {
            const session = callSessions.get(callId);
            if (!session) return;

            const callerSocket = activeUsers.get(session.callerId);
            if (callerSocket) {
                io.to(callerSocket.socketId).emit('call-rejected', { callId });
            }

            callSessions.delete(callId);
            logger.info(`📞 Appel refusé: ${callId}`);
        });

        // =============================================
        // 7. RACCROCHER
        // =============================================
        socket.on('call-end', ({ callId }) => {
            const session = callSessions.get(callId);
            if (!session) return;

            const targetSocket = activeUsers.get(session.targetId);
            const callerSocket = activeUsers.get(session.callerId);

            if (targetSocket) {
                io.to(targetSocket.socketId).emit('call-ended', { callId });
            }
            if (callerSocket) {
                io.to(callerSocket.socketId).emit('call-ended', { callId });
            }

            callSessions.delete(callId);
            logger.info(`📞 Appel terminé: ${callId}`);
        });

        // =============================================
        // 8. OFFRE WEBRTC (Pour la connexion vidéo)
        // =============================================
        socket.on('webrtc-offer', ({ targetUserId, offer }) => {
            const targetSocket = activeUsers.get(targetUserId);
            if (!targetSocket) {
                socket.emit('webrtc-error', { message: 'Utilisateur hors ligne' });
                return;
            }
            io.to(targetSocket.socketId).emit('webrtc-offer', {
                from: userId,
                offer
            });
        });

        // =============================================
        // 9. RÉPONSE WEBRTC
        // =============================================
        socket.on('webrtc-answer', ({ targetUserId, answer }) => {
            const targetSocket = activeUsers.get(targetUserId);
            if (!targetSocket) return;
            io.to(targetSocket.socketId).emit('webrtc-answer', {
                from: userId,
                answer
            });
        });

        // =============================================
        // 10. CANDIDAT ICE WEBRTC
        // =============================================
        socket.on('webrtc-ice-candidate', ({ targetUserId, candidate }) => {
            const targetSocket = activeUsers.get(targetUserId);
            if (!targetSocket) return;
            io.to(targetSocket.socketId).emit('webrtc-ice-candidate', {
                from: userId,
                candidate
            });
        });

        // =============================================
        // 11. ENVOYER LA LOCALISATION
        // =============================================
        socket.on('send-location', ({ targetUserId, location }) => {
            const targetSocket = activeUsers.get(targetUserId);
            if (!targetSocket) {
                socket.emit('location-error', { message: 'Utilisateur hors ligne' });
                return;
            }
            io.to(targetSocket.socketId).emit('location-received', {
                from: userId,
                location: {
                    lat: location.lat,
                    lng: location.lng,
                    address: location.address,
                    timestamp: new Date().toISOString()
                }
            });
        });

        // =============================================
        // 12. TYPER (Indicateur de frappe)
        // =============================================
        socket.on('typing', ({ roomId, isTyping }) => {
            socket.to(roomId).emit('user-typing', {
                userId: userId,
                isTyping: isTyping
            });
        });

        // =============================================
        // 13. DÉCONNEXION
        // =============================================
        socket.on('disconnect', () => {
            logger.info(`🔌 Socket déconnecté: ${userId}`);
            
            // Supprimer l'utilisateur des salons
            for (const [roomId, users] of activeRooms) {
                if (users.has(userId)) {
                    users.delete(userId);
                    io.to(roomId).emit('user-left', { userId });
                    if (users.size === 0) {
                        activeRooms.delete(roomId);
                    }
                }
            }

            // Terminer les appels en cours
            for (const [callId, session] of callSessions) {
                if (session.callerId === userId || session.targetId === userId) {
                    const otherId = session.callerId === userId ? session.targetId : session.callerId;
                    const otherSocket = activeUsers.get(otherId);
                    if (otherSocket) {
                        io.to(otherSocket.socketId).emit('call-ended', { callId });
                    }
                    callSessions.delete(callId);
                }
            }

            // Supprimer l'utilisateur des actifs
            activeUsers.delete(userId);
            socket.broadcast.emit('user-offline', { userId });
        });
    });

    // Fonction pour obtenir les utilisateurs en ligne
    io.getOnlineUsers = () => {
        return Array.from(activeUsers.values()).map(u => ({
            userId: u.userId,
            email: u.email,
            role: u.role
        }));
    };

    return io;
};

// Utilisé par les contrôleurs (ex: message.controller.js) pour décider s'il
// faut envoyer une notification par email en plus du push temps réel — pas
// la peine de mailer quelqu'un qui a déjà la conversation ouverte.
module.exports.isUserOnline = (userId) => activeUsers.has(userId?.toString ? userId.toString() : userId);