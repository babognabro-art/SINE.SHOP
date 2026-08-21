// =========================================================
// SINE.SHOP — PARTAGE DE FICHE PRODUIT
// Fonction unique réutilisée sur toutes les pages produits (collections,
// search, categorie, chaussures, montres, vetements, sport, sineguy) —
// Web Share API sur mobile (ouvre le sélecteur natif WhatsApp/SMS/etc.),
// repli presse-papiers partout ailleurs.
// =========================================================
(function() {
    'use strict';

    function notify(msg, type) {
        if (typeof window.showNotification === 'function') { window.showNotification(msg, type); return; }
        if (typeof window.showToast === 'function') { window.showToast(msg, type); return; }
    }

    window.shareProduct = async function(id, cardEl) {
        const url = `${window.location.origin}/html/collections.html?produit=${id}`;
        // Le nom n'est jamais passé en argument (risque d'apostrophes dans le
        // titre du produit cassant l'attribut onclick) — récupéré depuis la
        // carte cliquée elle-même si possible, sinon titre générique.
        let title = 'Produit SINE.SH♡P';
        if (cardEl) {
            const titleEl = cardEl.closest('.product, .product-card, .cat-card')?.querySelector('h3, .product-title, .cat-title');
            if (titleEl && titleEl.textContent.trim()) title = titleEl.textContent.trim();
        }

        if (navigator.share) {
            try {
                await navigator.share({ title, text: `Regarde ce produit sur SINE.SH♡P : ${title}`, url });
            } catch (e) {
                // L'utilisateur a annulé le partage natif — pas une erreur à signaler.
            }
            return;
        }

        try {
            await navigator.clipboard.writeText(url);
            notify('🔗 Lien du produit copié !', 'success');
        } catch (e) {
            notify(url, 'info');
        }
    };
})();
