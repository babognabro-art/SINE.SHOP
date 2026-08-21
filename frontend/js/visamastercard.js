/*==================================================
SINE.SHOP
VISAMASTERCARD.JS
BLOC 1
INITIALISATION
==================================================*/

"use strict";

/*=========================================
DOM
=========================================*/

const paymentForm = document.getElementById("paymentForm");

const holderName = document.getElementById("holderName");
const cardNumber = document.getElementById("cardNumber");
const expiryDate = document.getElementById("expiryDate");
const cvv = document.getElementById("cvv");

const previewName = document.getElementById("previewName");
const previewNumber = document.getElementById("previewNumber");
const previewExpiry = document.getElementById("previewExpiry");

const bankLogo = document.getElementById("bankLogo");
const bankName = document.getElementById("bankName");
const cardType = document.getElementById("cardType");
const cardStatus = document.getElementById("cardStatus");

const montantTotal = document.getElementById("montantTotal");

const commandeID = document.getElementById("commandeID");
const paymentID = document.getElementById("paymentID");
const paymentDate = document.getElementById("paymentDate");

const paymentProducts =
document.getElementById("paymentProducts");

const paymentHistory =
document.getElementById("paymentHistory");

const paymentAlert =
document.getElementById("paymentAlert");

const qrCanvas =
document.getElementById("paymentQRCode");


/*=========================================
LOCAL STORAGE
=========================================*/

const panier =
JSON.parse(localStorage.getItem("panier")) || [];

const reservations =
JSON.parse(localStorage.getItem("reservation")) || [];

const commandes =
JSON.parse(localStorage.getItem("commande")) || [];

const paiements =
JSON.parse(localStorage.getItem("paiements")) || [];


/*=========================================
OBJET PAIEMENT
=========================================*/

const paiement = {

id: "",

commande: "",

date: "",

heure: "",

nom: "",

banque: "",

typeCarte: "",

numeroCarte: "",

montant:0,

devise:"FCFA",

produits:[],

statut:"En attente"

};


/*=========================================
GÉNÉRATION ID
=========================================*/

function genererPaiementID(){

const maintenant = new Date();

const date =

maintenant.getFullYear().toString() +

String(
maintenant.getMonth()+1
).padStart(2,"0") +

String(
maintenant.getDate()
).padStart(2,"0");

const caracteres =

"ABCDEFGHJKLMNPQRSTUVWXYZ123456789";

let code = "";

for(let i=0;i<8;i++){

code +=

caracteres.charAt(

Math.floor(

Math.random()*caracteres.length

)

);

}

return `PAY-${date}-${code}`;

}


/*=========================================
DATE
=========================================*/

function afficherDate(){

const maintenant = new Date();

paymentDate.textContent =

maintenant.toLocaleDateString(

"fr-FR",

{

weekday:"long",

day:"2-digit",

month:"long",

year:"numeric"

}

);

paiement.date =
maintenant.toLocaleDateString("fr-FR");

paiement.heure =
maintenant.toLocaleTimeString("fr-FR");

}


/*=========================================
ID PAIEMENT
=========================================*/

function initialiserPaiement(){

paiement.id =
genererPaiementID();

paymentID.textContent =
paiement.id;

}


/*=========================================
ID COMMANDE
=========================================*/

function rechercherCommande(){

let id = "CMD-AUCUNE";

if(commandes.length){

id =

commandes[
commandes.length-1
].id ||

"CMD-AUCUNE";

}

commandeID.textContent = id;

paiement.commande = id;

}


/*=========================================
MONTANT TOTAL
=========================================*/

function calculerMontant(){

let total = 0;

panier.forEach(produit=>{

const prix =

Number(

String(produit.prix)
.replace(/[^\d]/g,"")

)||0;

const qte =

Number(
produit.quantite
)||1;

total += prix*qte;

});

montantTotal.textContent =

total.toLocaleString("fr-FR")

+" FCFA";

paiement.montant = total;

}


/*=========================================
QR CODE
=========================================*/

function preparerQRCode(){

if(typeof QRCode==="undefined"){

return;

}

QRCode.toCanvas(

qrCanvas,

paiement.id,

function(){}

);

}


/*=========================================
HISTORIQUE
=========================================*/

function sauvegarderHistorique(){

paiements.push({

...paiement

});

localStorage.setItem(

"paiements",

JSON.stringify(paiements)

);

}


/*=========================================
CHARGEMENT
=========================================*/

document.addEventListener(

"DOMContentLoaded",

()=>{

initialiserPaiement();

afficherDate();

rechercherCommande();

calculerMontant();

preparerQRCode();

}

);