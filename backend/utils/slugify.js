// Génère un slug stable à partir d'un texte — retire les accents avant de
// filtrer les caractères non alphanumériques, sinon "Vêtements" devenait
// "v-tements" au lieu de "vetements" (le "ê" n'était reconnu ni comme
// lettre ni retiré, juste transformé en tiret).
function slugify(str) {
  return (str || '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // diacritiques (accents)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

module.exports = { slugify };
