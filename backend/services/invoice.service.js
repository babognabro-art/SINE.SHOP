// Génération de factures — réécrit entièrement. La version précédente
// (héritée d'un autre projet, jamais adaptée) avait deux bugs qui
// l'auraient rendue inutilisable telle quelle :
//  - tax()/discount() utilisaient `return` seul sur sa ligne suivi de
//    l'expression sur la ligne suivante : en JavaScript, l'insertion
//    automatique de point-virgule transforme ça en `return;` (undefined)
//    — CHAQUE facture aurait affiché un total "NaN".
//  - Les noms de champs (order.products/customer/reference/discount)
//    ne correspondaient à aucun champ du vrai schéma Order de ce projet
//    (order.items/user/orderNumber — voir models/Order.js). Le fichier
//    venait visiblement d'un autre projet, jamais réellement branché ici.
//  - Dépendait de services/pdf.service.js, qui n'existe pas.
//
// Cette version lit directement les montants déjà calculés et stockés
// sur la commande (Order.subtotal/tax/discount/total — aucun recalcul,
// aucun risque de désaccord avec ce qui a été facturé au client) et
// génère un document HTML imprimable/téléchargeable, sans dépendance
// externe supplémentaire à installer.

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://www.sineshophome.com';

function generateInvoiceReference(order) {
  const year = new Date(order.createdAt || Date.now()).getFullYear();
  const short = order._id.toString().slice(-6).toUpperCase();
  return `FAC-${year}-${short}`;
}

// Construit les données structurées de la facture à partir d'une commande
// réelle et déjà peuplée (populate user/seller/items.product).
function buildInvoiceData(order) {
  const buyer = order.user || {};
  const seller = order.seller || {};

  return {
    reference: generateInvoiceReference(order),
    orderNumber: order.orderNumber || order._id,
    date: order.createdAt || new Date(),
    buyer: {
      name: `${buyer.firstName || ''} ${buyer.lastName || ''}`.trim() || 'Client',
      email: buyer.email || '',
      phone: buyer.phone || '',
      address: order.shippingAddress || {},
    },
    seller: {
      name: seller.storeName || `${seller.firstName || ''} ${seller.lastName || ''}`.trim() || 'Vendeur',
      email: seller.email || '',
    },
    items: (order.items || []).map(item => ({
      name: item.product?.name || 'Produit',
      quantity: item.quantity || 1,
      unitPrice: item.price || 0,
      total: item.total || (item.price || 0) * (item.quantity || 1),
    })),
    subtotal: order.subtotal || 0,
    shippingCost: order.shippingCost || 0,
    tax: order.tax || 0,
    discount: order.discount || 0,
    total: order.total || 0,
    currency: order.currency || 'XOF',
    paymentMethod: order.paymentMethod || '',
    paymentStatus: order.paymentStatus || 'pending',
  };
}

// Document HTML imprimable — même identité visuelle que le reste de
// SINE.SH♡P (dégradé du hero, logo, couleurs). Ouvrable directement dans
// le navigateur, imprimable en PDF nativement (Ctrl+P) sans dépendance
// serveur supplémentaire.
function renderInvoiceHTML(data) {
  const money = (n) => `${(n || 0).toLocaleString('fr-FR')} ${data.currency}`;
  const dateStr = new Date(data.date).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' });
  const addr = data.buyer.address || {};

  const rows = data.items.map(item => `
    <tr>
      <td style="padding:10px 8px;border-bottom:1px solid #eef2f6;">${item.name}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #eef2f6;text-align:center;">${item.quantity}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #eef2f6;text-align:right;">${money(item.unitPrice)}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #eef2f6;text-align:right;font-weight:600;">${money(item.total)}</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"><title>Facture ${data.reference}</title>
<style>
  body { font-family: Arial, Helvetica, sans-serif; color:#2f3a4a; max-width:700px; margin:0 auto; padding:40px 20px; }
  .header { background: linear-gradient(180deg,#78a8e5 0%,#5f90d5 15%,#3d70be 35%,#28579f 50%,#193d74 68%,#10284f 82%,#07152b 100%); padding:30px; border-radius:16px; text-align:center; color:white; margin-bottom:30px; }
  .header .logo { font-family: Georgia, serif; font-size:1.8rem; font-weight:700; }
  .header .logo .heart { color:#ff2d3d; }
  .meta { display:flex; justify-content:space-between; margin-bottom:24px; font-size:0.9rem; flex-wrap:wrap; gap:16px; }
  .meta .block { min-width:200px; }
  .meta .label { color:#94a3b8; font-size:0.7rem; text-transform:uppercase; margin-bottom:4px; }
  table { width:100%; border-collapse:collapse; margin-bottom:20px; }
  th { text-align:left; padding:10px 8px; background:#f8fafc; font-size:0.75rem; text-transform:uppercase; color:#64748b; }
  .totals { margin-left:auto; width:280px; }
  .totals div { display:flex; justify-content:space-between; padding:6px 0; font-size:0.9rem; }
  .totals .grand { font-size:1.15rem; font-weight:700; color:#0a2a44; border-top:2px solid #0a2a44; padding-top:10px; margin-top:6px; }
  .footer { text-align:center; margin-top:40px; font-size:0.75rem; color:#94a3b8; }
  .heart { display:inline-block; animation: heartbeat 1.4s ease-in-out infinite; }
  @keyframes heartbeat {
    0%, 100% { transform: scale(1); }
    15% { transform: scale(1.22); }
    30% { transform: scale(1); }
    45% { transform: scale(1.15); }
    60% { transform: scale(1); }
  }
  .invoice-actions { display:flex; gap:10px; justify-content:center; margin-bottom:24px; flex-wrap:wrap; }
  .invoice-actions button {
    padding:10px 22px; border-radius:30px; border:none; cursor:pointer;
    font-family:inherit; font-weight:600; font-size:0.85rem;
  }
  .invoice-actions .btn-print { background:#2d73ff; color:#fff; }
  .invoice-actions .btn-download { background:#f1f5fb; color:#0a2a44; }
  .invoice-actions .btn-share { background:#f1f5fb; color:#0a2a44; }
  @media print { .invoice-actions { display:none !important; } }
</style></head>
<body>
  <div class="invoice-actions">
    <button class="btn-print" onclick="window.print()">🖨️ Imprimer</button>
    <button class="btn-download" onclick="telechargerFacture()">⬇️ Télécharger</button>
    <button class="btn-share" onclick="partagerFacture()">🔗 Partager</button>
  </div>
  <div class="header">
    <div class="logo">SINE.SH<span class="heart">♡</span>P</div>
    <div style="font-size:0.8rem;opacity:0.85;margin-top:6px;">FACTURE</div>
  </div>

  <div class="meta">
    <div class="block">
      <div class="label">Facture N°</div>
      <div><strong>${data.reference}</strong></div>
      <div class="label" style="margin-top:8px;">Commande</div>
      <div>${data.orderNumber}</div>
      <div class="label" style="margin-top:8px;">Date</div>
      <div>${dateStr}</div>
    </div>
    <div class="block">
      <div class="label">Facturé à</div>
      <div><strong>${data.buyer.name}</strong></div>
      <div>${data.buyer.email}</div>
      <div>${data.buyer.phone}</div>
      ${addr.street ? `<div>${addr.street}, ${addr.city || ''}</div>` : ''}
    </div>
    <div class="block">
      <div class="label">Vendu par</div>
      <div><strong>${data.seller.name}</strong></div>
      <div>${data.seller.email}</div>
    </div>
  </div>

  <table>
    <thead><tr><th>Produit</th><th style="text-align:center;">Qté</th><th style="text-align:right;">Prix unitaire</th><th style="text-align:right;">Total</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="totals">
    <div><span>Sous-total</span><span>${money(data.subtotal)}</span></div>
    ${data.discount > 0 ? `<div><span>Remise</span><span>-${money(data.discount)}</span></div>` : ''}
    <div><span>Livraison</span><span>${money(data.shippingCost)}</span></div>
    <div><span>Taxe</span><span>${money(data.tax)}</span></div>
    <div class="grand"><span>Total</span><span>${money(data.total)}</span></div>
  </div>

  <div class="footer">
    <p>Mode de paiement : ${data.paymentMethod} — Statut : ${data.paymentStatus === 'paid' ? 'Payé' : data.paymentStatus}</p>
    <p>SINE.SH♡P — ${FRONTEND_URL}</p>
  </div>
  <script>
    function telechargerFacture() {
      const blob = new Blob([document.documentElement.outerHTML], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'facture-${data.reference}.html';
      a.click();
      URL.revokeObjectURL(url);
    }
    function partagerFacture() {
      // Cette page est ouverte depuis un blob local (pas une URL serveur
      // partageable) — on partage le texte de référence, pas de lien,
      // pour éviter de partager une URL blob: inutilisable ailleurs.
      const texte = 'Facture ${data.reference} — Commande ${data.orderNumber} — SINE.SH♡P';
      if (navigator.share) {
        navigator.share({ title: 'Facture ${data.reference}', text: texte }).catch(() => {});
      } else {
        navigator.clipboard.writeText(texte).then(() => {
          alert('Référence de la facture copiée dans le presse-papiers.');
        }).catch(() => {
          alert(texte);
        });
      }
    }
  </script>
</body></html>`;
}

// Facture complète (données + HTML) à partir d'une commande réelle.
async function build(order) {
  const data = buildInvoiceData(order);
  const html = renderInvoiceHTML(data);
  return { ...data, html };
}

module.exports = { generateInvoiceReference, buildInvoiceData, renderInvoiceHTML, build };
