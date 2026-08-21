// =========================================================
// SINE.SHOP — CLIENT SOCKET.IO RÉUTILISABLE
// Se connecte au même backend que window.SINE.config.API_URL
// (en retirant le "/api" final), authentifié avec le token JWT
// déjà stocké par api.js. À charger après config.js et api.js,
// et après le script CDN socket.io-client.
// =========================================================
(function() {
    'use strict';

    let socket = null;
    const listenersQueue = [];

    function getSocketUrl() {
        const apiUrl = (window.SINE && window.SINE.config && window.SINE.config.API_URL) || '';
        return apiUrl.replace(/\/api\/?$/, '');
    }

    function connect() {
        if (typeof io === 'undefined') {
            console.warn('⚠️ socket.io-client non chargé — ajoutez le script CDN avant socket-client.js');
            return null;
        }
        const token = localStorage.getItem('sineToken');
        if (!token) return null;

        if (socket && socket.connected) return socket;

        socket = io(getSocketUrl(), {
            auth: { token },
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionDelay: 2000,
        });

        socket.on('connect_error', function(err) {
            console.warn('Socket connexion refusée :', err.message);
        });

        // Réattacher les écouteurs déjà enregistrés avant la connexion
        listenersQueue.forEach(([event, handler]) => socket.on(event, handler));

        return socket;
    }

    function disconnect() {
        if (socket) {
            socket.disconnect();
            socket = null;
        }
    }

    // Enregistre un écouteur — fonctionne même si connect() n'a pas encore
    // été appelé (mis en file d'attente, rejoué à la connexion).
    function on(event, handler) {
        listenersQueue.push([event, handler]);
        if (socket) socket.on(event, handler);
    }

    function off(event, handler) {
        if (socket) socket.off(event, handler);
    }

    function emit(event, payload) {
        if (socket && socket.connected) {
            socket.emit(event, payload);
        } else {
            console.warn('Socket non connecté — événement ignoré :', event);
        }
    }

    window.SineSocket = {
        connect,
        disconnect,
        on,
        off,
        emit,
        get: () => socket,
        isConnected: () => !!(socket && socket.connected),
    };
})();
