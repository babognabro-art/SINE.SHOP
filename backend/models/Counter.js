const mongoose = require('mongoose');

// Compteurs atomiques génériques (ex: un par catégorie, pour numéroter les
// produits dans l'ordre où ils sont publiés — voir Product.categorySequence).
// Un findOneAndUpdate avec $inc est atomique côté MongoDB : contrairement à
// un countDocuments() suivi d'un +1, deux publications simultanées dans la
// même catégorie ne peuvent jamais recevoir le même numéro.
const counterSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: { type: Number, default: 0 },
});

const Counter = mongoose.model('Counter', counterSchema);

async function nextSequence(key) {
  const counter = await Counter.findOneAndUpdate(
    { key },
    { $inc: { value: 1 } },
    { upsert: true, new: true }
  );
  return counter.value;
}

module.exports = { Counter, nextSequence };
