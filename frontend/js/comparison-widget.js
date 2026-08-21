// =========================================================
// SINE.SHOP — WIDGET DE COMPARAISON FLOTTANT
// Pas une page séparée : une bannière flottante + un panneau qui
// s'ouvre par-dessus la page en cours, comme les avis. Injecte son
// propre HTML/CSS, ne nécessite aucun gabarit préalable côté page.
//
// Chargement : après config.js et api.js. Puis, une fois la session
// utilisateur connue :
//   window.ComparisonWidget.init();
// Et après chaque appel à toggleComparison() dans la page hôte :
//   window.ComparisonWidget.refresh();
//
// Recommandation : basée sur les vraies données du produit (note +
// nombre d'avis en priorité, popularité/vues en repli, prix en
// dernier repli si rien d'autre ne permet de trancher) — jamais de
// donnée inventée.
// =========================================================
(function() {
    'use strict';

    let items = [];
    let injected = false;

    function injectMarkup() {
        if (injected) return;
        injected = true;

        const style = document.createElement('style');
        style.textContent = `
            .cmp-tray {
                position: fixed; left: 50%; bottom: -120px; transform: translateX(-50%);
                width: min(94vw, 620px); background: #16202b; color: white; border-radius: 20px;
                box-shadow: 0 16px 40px rgba(0,0,0,0.3); padding: 12px 16px; z-index: 99998;
                display: flex; align-items: center; gap: 12px; transition: bottom 0.4s ease;
            }
            .cmp-tray.active { bottom: 20px; }
            .cmp-tray-thumbs { display: flex; gap: 6px; flex-shrink: 0; }
            .cmp-tray-thumbs img {
                width: 38px; height: 38px; border-radius: 10px; object-fit: cover;
                border: 2px solid rgba(255,255,255,0.2); background: white;
            }
            .cmp-tray-info { flex: 1; font-size: 0.8rem; color: rgba(255,255,255,0.7); min-width: 0; }
            .cmp-tray-btn {
                background: #2d73ff; color: white; padding: 9px 16px; border-radius: 30px;
                font-size: 0.82rem; font-weight: 700; white-space: nowrap;
            }
            .cmp-tray-btn:hover { background: #4d87ff; }
            .cmp-tray-btn:disabled { opacity: 0.5; cursor: default; }
            .cmp-tray-close {
                width: 26px; height: 26px; border-radius: 50%; background: rgba(255,255,255,0.1);
                color: white; font-size: 0.75rem; flex-shrink: 0;
            }
            .cmp-tray-close:hover { background: rgba(255,255,255,0.2); }

            .cmp-modal {
                display: none; position: fixed; inset: 0; background: rgba(10,15,22,0.6);
                z-index: 999999; align-items: center; justify-content: center; padding: 20px;
                backdrop-filter: blur(4px);
            }
            .cmp-modal.active { display: flex; }
            .cmp-modal-content {
                background: white; border-radius: 22px; max-width: 960px; width: 100%;
                max-height: 88vh; overflow-y: auto; padding: 28px; position: relative;
                font-family: "Outfit", -apple-system, BlinkMacSystemFont, sans-serif; color: #16202b;
            }
            .cmp-modal-content h2 { font-size: 1.3rem; font-weight: 700; margin-bottom: 16px; }
            .cmp-modal-close {
                position: absolute; top: 20px; right: 20px; width: 32px; height: 32px;
                border-radius: 50%; background: #f1f5f9; font-size: 0.9rem;
            }
            .cmp-modal-close:hover { background: #e2e8f0; }
            .cmp-reco {
                background: linear-gradient(135deg, #fff7ed, #fef3c7); border: 1px solid #fde68a;
                border-radius: 14px; padding: 12px 16px; margin-bottom: 18px; font-size: 0.88rem;
            }
            .cmp-grid {
                display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;
            }
            .cmp-item {
                border: 1px solid #e6ebf2; border-radius: 16px; padding: 14px; position: relative;
            }
            .cmp-item.reco { border-color: #f59e0b; box-shadow: 0 0 0 3px rgba(245,158,11,0.15); }
            .cmp-item .cmp-badge {
                position: absolute; top: -10px; left: 12px; background: #f59e0b; color: white;
                font-size: 0.65rem; font-weight: 700; padding: 3px 10px; border-radius: 20px;
            }
            .cmp-item .cmp-remove {
                position: absolute; top: 10px; right: 10px; width: 26px; height: 26px; border-radius: 50%;
                background: #f1f5f9; color: #ef4444; font-size: 0.75rem;
            }
            .cmp-item .cmp-remove:hover { background: #fee2e2; }
            .cmp-item img { width: 100%; aspect-ratio: 1/1; object-fit: contain; background: #f6f8fb; border-radius: 12px; padding: 8px; margin-bottom: 10px; }
            .cmp-item h4 { font-size: 0.9rem; font-weight: 700; min-height: 2.4em; margin-bottom: 6px; }
            .cmp-item .cmp-price { font-size: 1.1rem; font-weight: 700; color: #2d73ff; margin-bottom: 8px; }
            .cmp-item .cmp-line {
                display: flex; justify-content: space-between; gap: 8px; font-size: 0.76rem;
                padding: 6px 0; border-top: 1px solid #f1f5f9; color: #6b7c8f;
            }
            .cmp-item .cmp-line span:last-child { color: #16202b; font-weight: 600; text-align: right; }
            .cmp-item .cmp-line .ok { color: #16a34a; }
            .cmp-item .cmp-line .ko { color: #ef4444; }
            .cmp-item .cmp-add {
                width: 100%; margin-top: 12px; padding: 9px; border-radius: 12px;
                background: #2d73ff; color: white; font-weight: 700; font-size: 0.8rem;
            }
            .cmp-item .cmp-add:hover { background: #4d87ff; }
            @media (max-width: 600px) {
                .cmp-tray-info { display: none; }
            }
        `;
        document.head.appendChild(style);

        const tray = document.createElement('div');
        tray.id = 'cmpTray';
        tray.className = 'cmp-tray';
        tray.innerHTML = `
            <div class="cmp-tray-thumbs" id="cmpTrayThumbs"></div>
            <div class="cmp-tray-info"><span id="cmpTrayCount">0</span> produit(s) à comparer</div>
            <button class="cmp-tray-btn" id="cmpTrayBtn">⚖ Comparer</button>
            <button class="cmp-tray-close" id="cmpTrayClose"><i class="fa-solid fa-xmark"></i></button>
        `;
        document.body.appendChild(tray);

        const modal = document.createElement('div');
        modal.id = 'cmpModal';
        modal.className = 'cmp-modal';
        modal.innerHTML = `
            <div class="cmp-modal-content">
                <button class="cmp-modal-close" id="cmpModalClose"><i class="fa-solid fa-xmark"></i></button>
                <h2>⚖ Comparaison de produits</h2>
                <div id="cmpModalBody"></div>
            </div>
        `;
        document.body.appendChild(modal);

        document.getElementById('cmpTrayBtn').addEventListener('click', openModal);
        document.getElementById('cmpModalClose').addEventListener('click', closeModal);
        document.getElementById('cmpTrayClose').addEventListener('click', function() {
            document.getElementById('cmpTray').classList.remove('active');
        });
        modal.addEventListener('click', function(e) { if (e.target === modal) closeModal(); });
        document.addEventListener('keydown', function(e) { if (e.key === 'Escape') closeModal(); });
    }

    function getDevise() {
        const user = JSON.parse(localStorage.getItem('sineUser') || '{}');
        return user.preferredCurrency || 'XOF';
    }
    function formatPrix(montant) {
        const symboles = { 'FCFA': 'FCFA', 'XOF': 'FCFA', 'EUR': '€', 'USD': '$', 'GBP': '£', 'CAD': 'CA$', 'MAD': 'MAD' };
        const d = getDevise();
        return (montant || 0).toLocaleString('fr-FR') + ' ' + (symboles[d] || d);
    }

    function notify(msg, type) {
        if (typeof window.showNotification === 'function') { window.showNotification(msg, type); return; }
        if (typeof window.showToast === 'function') { window.showToast(msg, type); return; }
    }

    function renderTray() {
        const tray = document.getElementById('cmpTray');
        if (!tray) return;
        if (!items.length) {
            tray.classList.remove('active');
            return;
        }
        tray.classList.add('active');
        document.getElementById('cmpTrayCount').textContent = items.length;
        document.getElementById('cmpTrayThumbs').innerHTML = items.map(p =>
            `<img src="${p.images?.[0]?.url || '../images/produit.png'}" alt="" onerror="this.src='../images/produit.png'">`
        ).join('');
        const btn = document.getElementById('cmpTrayBtn');
        btn.disabled = items.length < 2;
        btn.textContent = items.length < 2 ? '⚖ Ajoutez-en 1 autre' : `⚖ Comparer (${items.length})`;
    }

    // Recommandation transparente : priorité aux avis réels (note pondérée
    // par leur nombre), repli sur la popularité (vues) si aucun produit n'a
    // d'avis, dernier repli sur le prix le plus bas. Jamais de donnée inventée.
    function computeRecommendation() {
        const withReviews = items.filter(p => (p.numReviews || 0) > 0);
        if (withReviews.length > 0) {
            const best = withReviews.reduce((a, b) => {
                const scoreA = (a.rating || 0) * Math.log(1 + (a.numReviews || 0));
                const scoreB = (b.rating || 0) * Math.log(1 + (b.numReviews || 0));
                return scoreB > scoreA ? b : a;
            });
            return { product: best, reason: `Meilleure note (${(best.rating || 0).toFixed(1)}★ sur ${best.numReviews} avis)` };
        }
        const withViews = items.filter(p => (p.views || 0) > 0);
        if (withViews.length > 0) {
            const best = withViews.reduce((a, b) => (b.views || 0) > (a.views || 0) ? b : a);
            return { product: best, reason: `Le plus demandé (${best.views} vues)` };
        }
        const best = items.reduce((a, b) => {
            const priceA = a.discountedPrice || a.price || Infinity;
            const priceB = b.discountedPrice || b.price || Infinity;
            return priceB < priceA ? b : a;
        });
        return { product: best, reason: 'Prix le plus bas (pas encore assez d\'avis ou de vues pour mieux comparer)' };
    }

    function renderModal() {
        const body = document.getElementById('cmpModalBody');
        if (items.length < 2) {
            body.innerHTML = '<p style="padding:20px;text-align:center;color:#94a3b8;">Ajoutez au moins 2 produits pour comparer.</p>';
            return;
        }

        const reco = computeRecommendation();

        body.innerHTML = `
            <div class="cmp-reco">🏆 Recommandé : <strong>${reco.product.name || 'Produit'}</strong> — ${reco.reason}</div>
            <div class="cmp-grid">
                ${items.map(p => {
                    const isReco = p._id === reco.product._id;
                    const enPromo = p.discountedPrice && p.discountedPrice < p.price;
                    const prix = enPromo ? p.discountedPrice : (p.price || 0);
                    const image = p.images?.[0]?.url || '../images/produit.png';
                    const estDispo = (p.stock || 0) > 0;
                    const vendeur = p.seller?.storeName || `${p.seller?.firstName || ''} ${p.seller?.lastName || ''}`.trim() || 'Vendeur';
                    return `
                        <div class="cmp-item ${isReco ? 'reco' : ''}">
                            ${isReco ? '<div class="cmp-badge">🏆 Recommandé</div>' : ''}
                            <button class="cmp-remove" onclick="window.ComparisonWidget.remove('${p._id}')"><i class="fa-solid fa-xmark"></i></button>
                            <img src="${image}" alt="${p.name || 'Produit'}" onerror="this.src='../images/produit.png'">
                            <h4>${p.name || 'Produit'}</h4>
                            <div class="cmp-price">${formatPrix(prix)}</div>
                            <div class="cmp-line"><span>Catégorie</span><span>${p.category?.name || '—'}</span></div>
                            <div class="cmp-line"><span>Stock</span><span class="${estDispo ? 'ok' : 'ko'}">${estDispo ? p.stock + ' dispo' : 'Rupture'}</span></div>
                            <div class="cmp-line"><span>Avis</span><span>${p.numReviews > 0 ? '⭐ ' + (p.rating || 0).toFixed(1) + ' (' + p.numReviews + ')' : 'Aucun avis'}</span></div>
                            <div class="cmp-line"><span>Vendeur</span><span>${vendeur}</span></div>
                            ${p.brand ? `<div class="cmp-line"><span>Marque</span><span>${p.brand}</span></div>` : ''}
                            <button class="cmp-add" onclick="window.ComparisonWidget.addToCart('${p._id}')">🛒 Ajouter au panier</button>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    function openModal() {
        if (items.length < 2) {
            notify('Ajoutez au moins 2 produits pour comparer.', 'warning');
            return;
        }
        renderModal();
        document.getElementById('cmpModal').classList.add('active');
        document.body.style.overflow = 'hidden';
    }
    function closeModal() {
        const modal = document.getElementById('cmpModal');
        if (modal) modal.classList.remove('active');
        document.body.style.overflow = '';
    }

    async function refresh() {
        if (!window.SineAPI) return;
        const utilisateur = JSON.parse(localStorage.getItem('sineUser') || 'null');
        if (!utilisateur) { items = []; renderTray(); return; }
        try {
            items = await window.SineAPI.getComparison();
            renderTray();
            if (document.getElementById('cmpModal')?.classList.contains('active')) {
                renderModal();
            }
        } catch (e) { /* silencieux */ }
    }

    window.ComparisonWidget = {
        init: function() {
            injectMarkup();
            refresh();
        },
        refresh: refresh,
        remove: async function(id) {
            try {
                await window.SineAPI.toggleComparison(id);
                await refresh();
                notify('Retiré de la comparaison', 'info');
            } catch (e) {
                notify(e.message || 'Erreur lors du retrait.', 'error');
            }
        },
        addToCart: async function(id) {
            try {
                await window.SineAPI.addToCart(id, 1);
                notify('🛒 Ajouté au panier', 'success');
            } catch (e) {
                notify(e.message || 'Erreur lors de l\'ajout au panier.', 'error');
            }
        }
    };
})();
