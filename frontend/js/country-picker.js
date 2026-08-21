/*=============================================================
  SINE.SHOP — Sélecteur de pays/indicatif avec recherche
  ==============================================================
  Remplace les listes déroulantes natives à ~22 pays codés en dur
  (jamais cherchables au clavier au-delà du premier caractère, et
  cassées par l'emoji drapeau qui précède le texte visible) par un
  vrai composant recherchable, plus de 100 pays, drapeau + nom +
  indicatif. Le <select> d'origine est conservé (masqué) pour ne
  RIEN casser du code de soumission existant qui lit
  document.getElementById('phoneCode').value — seul l'habillage
  visuel change.
=============================================================*/
(function () {
    'use strict';

    // Liste large (150+ pays) — nom en français, indicatif, ISO2, drapeau.
    const SINE_COUNTRIES = [
        { iso2: 'CI', name: 'Côte d\'Ivoire', dial: '+225', flag: '🇨🇮' },
        { iso2: 'SN', name: 'Sénégal', dial: '+221', flag: '🇸🇳' },
        { iso2: 'ML', name: 'Mali', dial: '+223', flag: '🇲🇱' },
        { iso2: 'BF', name: 'Burkina Faso', dial: '+226', flag: '🇧🇫' },
        { iso2: 'NE', name: 'Niger', dial: '+227', flag: '🇳🇪' },
        { iso2: 'TG', name: 'Togo', dial: '+228', flag: '🇹🇬' },
        { iso2: 'BJ', name: 'Bénin', dial: '+229', flag: '🇧🇯' },
        { iso2: 'GN', name: 'Guinée', dial: '+224', flag: '🇬🇳' },
        { iso2: 'GW', name: 'Guinée-Bissau', dial: '+245', flag: '🇬🇼' },
        { iso2: 'GH', name: 'Ghana', dial: '+233', flag: '🇬🇭' },
        { iso2: 'NG', name: 'Nigeria', dial: '+234', flag: '🇳🇬' },
        { iso2: 'CM', name: 'Cameroun', dial: '+237', flag: '🇨🇲' },
        { iso2: 'GA', name: 'Gabon', dial: '+241', flag: '🇬🇦' },
        { iso2: 'CG', name: 'Congo-Brazzaville', dial: '+242', flag: '🇨🇬' },
        { iso2: 'CD', name: 'RD Congo', dial: '+243', flag: '🇨🇩' },
        { iso2: 'TD', name: 'Tchad', dial: '+235', flag: '🇹🇩' },
        { iso2: 'CF', name: 'Centrafrique', dial: '+236', flag: '🇨🇫' },
        { iso2: 'MR', name: 'Mauritanie', dial: '+222', flag: '🇲🇷' },
        { iso2: 'LR', name: 'Liberia', dial: '+231', flag: '🇱🇷' },
        { iso2: 'SL', name: 'Sierra Leone', dial: '+232', flag: '🇸🇱' },
        { iso2: 'GM', name: 'Gambie', dial: '+220', flag: '🇬🇲' },
        { iso2: 'CV', name: 'Cap-Vert', dial: '+238', flag: '🇨🇻' },
        { iso2: 'ST', name: 'Sao Tomé-et-Principe', dial: '+239', flag: '🇸🇹' },
        { iso2: 'GQ', name: 'Guinée équatoriale', dial: '+240', flag: '🇬🇶' },
        { iso2: 'AO', name: 'Angola', dial: '+244', flag: '🇦🇴' },
        { iso2: 'ZA', name: 'Afrique du Sud', dial: '+27', flag: '🇿🇦' },
        { iso2: 'NA', name: 'Namibie', dial: '+264', flag: '🇳🇦' },
        { iso2: 'BW', name: 'Botswana', dial: '+267', flag: '🇧🇼' },
        { iso2: 'ZW', name: 'Zimbabwe', dial: '+263', flag: '🇿🇼' },
        { iso2: 'ZM', name: 'Zambie', dial: '+260', flag: '🇿🇲' },
        { iso2: 'MW', name: 'Malawi', dial: '+265', flag: '🇲🇼' },
        { iso2: 'MZ', name: 'Mozambique', dial: '+258', flag: '🇲🇿' },
        { iso2: 'MG', name: 'Madagascar', dial: '+261', flag: '🇲🇬' },
        { iso2: 'MU', name: 'Maurice', dial: '+230', flag: '🇲🇺' },
        { iso2: 'SC', name: 'Seychelles', dial: '+248', flag: '🇸🇨' },
        { iso2: 'KM', name: 'Comores', dial: '+269', flag: '🇰🇲' },
        { iso2: 'DJ', name: 'Djibouti', dial: '+253', flag: '🇩🇯' },
        { iso2: 'SO', name: 'Somalie', dial: '+252', flag: '🇸🇴' },
        { iso2: 'ET', name: 'Éthiopie', dial: '+251', flag: '🇪🇹' },
        { iso2: 'ER', name: 'Érythrée', dial: '+291', flag: '🇪🇷' },
        { iso2: 'SD', name: 'Soudan', dial: '+249', flag: '🇸🇩' },
        { iso2: 'SS', name: 'Soudan du Sud', dial: '+211', flag: '🇸🇸' },
        { iso2: 'KE', name: 'Kenya', dial: '+254', flag: '🇰🇪' },
        { iso2: 'UG', name: 'Ouganda', dial: '+256', flag: '🇺🇬' },
        { iso2: 'TZ', name: 'Tanzanie', dial: '+255', flag: '🇹🇿' },
        { iso2: 'RW', name: 'Rwanda', dial: '+250', flag: '🇷🇼' },
        { iso2: 'BI', name: 'Burundi', dial: '+257', flag: '🇧🇮' },
        { iso2: 'EG', name: 'Égypte', dial: '+20', flag: '🇪🇬' },
        { iso2: 'LY', name: 'Libye', dial: '+218', flag: '🇱🇾' },
        { iso2: 'TN', name: 'Tunisie', dial: '+216', flag: '🇹🇳' },
        { iso2: 'DZ', name: 'Algérie', dial: '+213', flag: '🇩🇿' },
        { iso2: 'MA', name: 'Maroc', dial: '+212', flag: '🇲🇦' },
        { iso2: 'FR', name: 'France', dial: '+33', flag: '🇫🇷' },
        { iso2: 'BE', name: 'Belgique', dial: '+32', flag: '🇧🇪' },
        { iso2: 'CH', name: 'Suisse', dial: '+41', flag: '🇨🇭' },
        { iso2: 'LU', name: 'Luxembourg', dial: '+352', flag: '🇱🇺' },
        { iso2: 'DE', name: 'Allemagne', dial: '+49', flag: '🇩🇪' },
        { iso2: 'AT', name: 'Autriche', dial: '+43', flag: '🇦🇹' },
        { iso2: 'NL', name: 'Pays-Bas', dial: '+31', flag: '🇳🇱' },
        { iso2: 'GB', name: 'Royaume-Uni', dial: '+44', flag: '🇬🇧' },
        { iso2: 'IE', name: 'Irlande', dial: '+353', flag: '🇮🇪' },
        { iso2: 'IT', name: 'Italie', dial: '+39', flag: '🇮🇹' },
        { iso2: 'ES', name: 'Espagne', dial: '+34', flag: '🇪🇸' },
        { iso2: 'PT', name: 'Portugal', dial: '+351', flag: '🇵🇹' },
        { iso2: 'GR', name: 'Grèce', dial: '+30', flag: '🇬🇷' },
        { iso2: 'PL', name: 'Pologne', dial: '+48', flag: '🇵🇱' },
        { iso2: 'RO', name: 'Roumanie', dial: '+40', flag: '🇷🇴' },
        { iso2: 'BG', name: 'Bulgarie', dial: '+359', flag: '🇧🇬' },
        { iso2: 'HU', name: 'Hongrie', dial: '+36', flag: '🇭🇺' },
        { iso2: 'CZ', name: 'Tchéquie', dial: '+420', flag: '🇨🇿' },
        { iso2: 'SK', name: 'Slovaquie', dial: '+421', flag: '🇸🇰' },
        { iso2: 'SE', name: 'Suède', dial: '+46', flag: '🇸🇪' },
        { iso2: 'NO', name: 'Norvège', dial: '+47', flag: '🇳🇴' },
        { iso2: 'DK', name: 'Danemark', dial: '+45', flag: '🇩🇰' },
        { iso2: 'FI', name: 'Finlande', dial: '+358', flag: '🇫🇮' },
        { iso2: 'IS', name: 'Islande', dial: '+354', flag: '🇮🇸' },
        { iso2: 'RU', name: 'Russie', dial: '+7', flag: '🇷🇺' },
        { iso2: 'UA', name: 'Ukraine', dial: '+380', flag: '🇺🇦' },
        { iso2: 'TR', name: 'Turquie', dial: '+90', flag: '🇹🇷' },
        { iso2: 'CY', name: 'Chypre', dial: '+357', flag: '🇨🇾' },
        { iso2: 'MT', name: 'Malte', dial: '+356', flag: '🇲🇹' },
        { iso2: 'HR', name: 'Croatie', dial: '+385', flag: '🇭🇷' },
        { iso2: 'RS', name: 'Serbie', dial: '+381', flag: '🇷🇸' },
        { iso2: 'AL', name: 'Albanie', dial: '+355', flag: '🇦🇱' },
        { iso2: 'US', name: 'États-Unis', dial: '+1', flag: '🇺🇸' },
        { iso2: 'CA', name: 'Canada', dial: '+1', flag: '🇨🇦' },
        { iso2: 'MX', name: 'Mexique', dial: '+52', flag: '🇲🇽' },
        { iso2: 'BR', name: 'Brésil', dial: '+55', flag: '🇧🇷' },
        { iso2: 'AR', name: 'Argentine', dial: '+54', flag: '🇦🇷' },
        { iso2: 'CL', name: 'Chili', dial: '+56', flag: '🇨🇱' },
        { iso2: 'CO', name: 'Colombie', dial: '+57', flag: '🇨🇴' },
        { iso2: 'PE', name: 'Pérou', dial: '+51', flag: '🇵🇪' },
        { iso2: 'VE', name: 'Venezuela', dial: '+58', flag: '🇻🇪' },
        { iso2: 'EC', name: 'Équateur', dial: '+593', flag: '🇪🇨' },
        { iso2: 'BO', name: 'Bolivie', dial: '+591', flag: '🇧🇴' },
        { iso2: 'PY', name: 'Paraguay', dial: '+595', flag: '🇵🇾' },
        { iso2: 'UY', name: 'Uruguay', dial: '+598', flag: '🇺🇾' },
        { iso2: 'CU', name: 'Cuba', dial: '+53', flag: '🇨🇺' },
        { iso2: 'DO', name: 'Rép. dominicaine', dial: '+1', flag: '🇩🇴' },
        { iso2: 'HT', name: 'Haïti', dial: '+509', flag: '🇭🇹' },
        { iso2: 'JM', name: 'Jamaïque', dial: '+1', flag: '🇯🇲' },
        { iso2: 'PA', name: 'Panama', dial: '+507', flag: '🇵🇦' },
        { iso2: 'CR', name: 'Costa Rica', dial: '+506', flag: '🇨🇷' },
        { iso2: 'GT', name: 'Guatemala', dial: '+502', flag: '🇬🇹' },
        { iso2: 'HN', name: 'Honduras', dial: '+504', flag: '🇭🇳' },
        { iso2: 'SV', name: 'Salvador', dial: '+503', flag: '🇸🇻' },
        { iso2: 'NI', name: 'Nicaragua', dial: '+505', flag: '🇳🇮' },
        { iso2: 'CN', name: 'Chine', dial: '+86', flag: '🇨🇳' },
        { iso2: 'JP', name: 'Japon', dial: '+81', flag: '🇯🇵' },
        { iso2: 'KR', name: 'Corée du Sud', dial: '+82', flag: '🇰🇷' },
        { iso2: 'IN', name: 'Inde', dial: '+91', flag: '🇮🇳' },
        { iso2: 'PK', name: 'Pakistan', dial: '+92', flag: '🇵🇰' },
        { iso2: 'BD', name: 'Bangladesh', dial: '+880', flag: '🇧🇩' },
        { iso2: 'LK', name: 'Sri Lanka', dial: '+94', flag: '🇱🇰' },
        { iso2: 'NP', name: 'Népal', dial: '+977', flag: '🇳🇵' },
        { iso2: 'ID', name: 'Indonésie', dial: '+62', flag: '🇮🇩' },
        { iso2: 'MY', name: 'Malaisie', dial: '+60', flag: '🇲🇾' },
        { iso2: 'SG', name: 'Singapour', dial: '+65', flag: '🇸🇬' },
        { iso2: 'TH', name: 'Thaïlande', dial: '+66', flag: '🇹🇭' },
        { iso2: 'VN', name: 'Vietnam', dial: '+84', flag: '🇻🇳' },
        { iso2: 'PH', name: 'Philippines', dial: '+63', flag: '🇵🇭' },
        { iso2: 'KH', name: 'Cambodge', dial: '+855', flag: '🇰🇭' },
        { iso2: 'LA', name: 'Laos', dial: '+856', flag: '🇱🇦' },
        { iso2: 'MM', name: 'Myanmar', dial: '+95', flag: '🇲🇲' },
        { iso2: 'MN', name: 'Mongolie', dial: '+976', flag: '🇲🇳' },
        { iso2: 'AE', name: 'Émirats arabes unis', dial: '+971', flag: '🇦🇪' },
        { iso2: 'SA', name: 'Arabie saoudite', dial: '+966', flag: '🇸🇦' },
        { iso2: 'QA', name: 'Qatar', dial: '+974', flag: '🇶🇦' },
        { iso2: 'KW', name: 'Koweït', dial: '+965', flag: '🇰🇼' },
        { iso2: 'BH', name: 'Bahreïn', dial: '+973', flag: '🇧🇭' },
        { iso2: 'OM', name: 'Oman', dial: '+968', flag: '🇴🇲' },
        { iso2: 'JO', name: 'Jordanie', dial: '+962', flag: '🇯🇴' },
        { iso2: 'LB', name: 'Liban', dial: '+961', flag: '🇱🇧' },
        { iso2: 'IQ', name: 'Irak', dial: '+964', flag: '🇮🇶' },
        { iso2: 'IR', name: 'Iran', dial: '+98', flag: '🇮🇷' },
        { iso2: 'IL', name: 'Israël', dial: '+972', flag: '🇮🇱' },
        { iso2: 'PS', name: 'Palestine', dial: '+970', flag: '🇵🇸' },
        { iso2: 'YE', name: 'Yémen', dial: '+967', flag: '🇾🇪' },
        { iso2: 'SY', name: 'Syrie', dial: '+963', flag: '🇸🇾' },
        { iso2: 'AF', name: 'Afghanistan', dial: '+93', flag: '🇦🇫' },
        { iso2: 'KZ', name: 'Kazakhstan', dial: '+7', flag: '🇰🇿' },
        { iso2: 'UZ', name: 'Ouzbékistan', dial: '+998', flag: '🇺🇿' },
        { iso2: 'AZ', name: 'Azerbaïdjan', dial: '+994', flag: '🇦🇿' },
        { iso2: 'GE', name: 'Géorgie', dial: '+995', flag: '🇬🇪' },
        { iso2: 'AM', name: 'Arménie', dial: '+374', flag: '🇦🇲' },
        { iso2: 'AU', name: 'Australie', dial: '+61', flag: '🇦🇺' },
        { iso2: 'NZ', name: 'Nouvelle-Zélande', dial: '+64', flag: '🇳🇿' },
        { iso2: 'FJ', name: 'Fidji', dial: '+679', flag: '🇫🇯' },
    ];

    // Style injecté une seule fois, quelle que soit la page.
    function injectStyleOnce() {
        if (document.getElementById('sineCountryPickerStyle')) return;
        const style = document.createElement('style');
        style.id = 'sineCountryPickerStyle';
        style.textContent = `
            .sine-country-picker { position: relative; }
            .scp-display {
                display: flex; align-items: center; gap: 6px;
                padding: 0.65rem 0.7rem; border-radius: 12px;
                border: 1px solid #d1d9e6; background: #1a2436;
    border-color: rgba(255,255,255,0.15);
    color: #e2e8f0;
                cursor: pointer; user-select: none; min-width: 92px;
                font-size: 0.95rem;
            }
            .scp-display i { margin-left: auto; font-size: 0.7rem; color: #94a3b8; }
            .scp-dropdown {
                position: absolute; top: calc(100% + 6px); left: 0; z-index: 999999;
                width: 280px; max-width: 88vw; background: #fff; border-radius: 14px;
                box-shadow: 0 12px 32px rgba(0,0,0,0.18); border: 1px solid #eef2f6;
                overflow: hidden;
            }
            .scp-list { max-height: 240px; overflow-y: auto; }
            .scp-item {
                display: flex; align-items: center; gap: 8px; padding: 0.55rem 0.9rem;
                cursor: pointer; font-size: 0.85rem;
            }
            .scp-item:hover { background: #f1f5fb; }
            .scp-item-name { flex: 1; color: #2f3a4a; }
            .scp-item-dial { color: #94a3b8; font-size: 0.78rem; }
            .scp-empty { padding: 1rem; text-align: center; color: #94a3b8; font-size: 0.82rem; }
        `;
        document.head.appendChild(style);
    }

    // Transforme un <select id="X"> existant (ou en crée un si absent) en
    // sélecteur de pays/indicatif recherchable, plus de 100 pays. Le select
    // d'origine reste dans le DOM (masqué) : tout code qui lit
    // document.getElementById('X').value continue de fonctionner sans
    // aucune modification.
    function attachCountryPicker(selectId, opts) {
        opts = opts || {};
        injectStyleOnce();

        let select = document.getElementById(selectId);
        if (!select) return null;

        select.innerHTML = '';
        SINE_COUNTRIES.forEach(function (c) {
            const opt = document.createElement('option');
            opt.value = c.dial;
            opt.textContent = c.flag + ' ' + c.dial + ' (' + c.name + ')';
            opt.dataset.iso2 = c.iso2;
            select.appendChild(opt);
        });
        select.style.display = 'none';

        const wrapper = document.createElement('div');
        wrapper.className = 'sine-country-picker';
        wrapper.innerHTML =
            '<div class="scp-display" tabindex="0">' +
                '<span class="scp-flag"></span><span class="scp-dial"></span>' +
                '<i class="fa-solid fa-chevron-down"></i>' +
            '</div>' +
            '<div class="scp-dropdown" style="display:none;">' +
                '<div class="scp-list"></div>' +
            '</div>';
        select.parentNode.insertBefore(wrapper, select.nextSibling);

        const display = wrapper.querySelector('.scp-display');
        const dropdown = wrapper.querySelector('.scp-dropdown');
        const list = wrapper.querySelector('.scp-list');

        // Recherche retirée volontairement (demande explicite de
        // l'utilisateur) — taper un indicatif au clavier ne fonctionnait
        // pas de façon fiable (ex: "+33" + Entrée restait bloqué sur
        // +225). La liste complète (déjà triée alphabétiquement) s'affiche
        // systématiquement, l'utilisateur fait défiler pour trouver son
        // pays — plus simple et plus prévisible qu'une recherche buguée.
        function renderList() {
            list.innerHTML = '';
            SINE_COUNTRIES.forEach(function (c) {
                const item = document.createElement('div');
                item.className = 'scp-item';
                item.innerHTML = '<span>' + c.flag + '</span>' +
                    '<span class="scp-item-name">' + c.name + '</span>' +
                    '<span class="scp-item-dial">' + c.dial + '</span>';
                item.addEventListener('click', function () {
                    select.value = c.dial;
                    updateDisplay(c);
                    dropdown.style.display = 'none';
                    select.dispatchEvent(new Event('change', { bubbles: true }));
                });
                list.appendChild(item);
            });
        }

        function updateDisplay(c) {
            display.querySelector('.scp-flag').textContent = c.flag;
            display.querySelector('.scp-dial').textContent = c.dial;
        }

        display.addEventListener('click', function () {
            const opening = dropdown.style.display === 'none';
            dropdown.style.display = opening ? 'block' : 'none';
            if (opening) renderList();
        });
        document.addEventListener('click', function (e) {
            if (!wrapper.contains(e.target)) dropdown.style.display = 'none';
        });

        // Sélection par défaut — Côte d'Ivoire sauf indication contraire.
        const defaultIso2 = opts.defaultIso2 || 'CI';
        const defaultCountry = SINE_COUNTRIES.find(function (c) { return c.iso2 === defaultIso2; }) || SINE_COUNTRIES[0];
        select.value = defaultCountry.dial;
        updateDisplay(defaultCountry);

        return { select: select, setByIso2: function (iso2) {
            const c = SINE_COUNTRIES.find(function (x) { return x.iso2 === iso2; });
            if (c) { select.value = c.dial; updateDisplay(c); }
        } };
    }

    // Tri alphabétique par nom (demande explicite : "tous les pays
    // s'affichent par ordre alphabétique") — la sélection par défaut
    // (Côte d'Ivoire) reste indépendante de cet ordre d'affichage.
    SINE_COUNTRIES.sort(function (a, b) { return a.name.localeCompare(b.name, 'fr'); });

    window.SINE_COUNTRIES = SINE_COUNTRIES;
    window.SineAttachCountryPicker = attachCountryPicker;
})();
