// =====================================================
// BLOC 3
// AFFICHAGE UNIVERSEL DU PANIER
// Compatible avec toutes les catégories SINE.SHOP
// =====================================================

// -----------------------------------------------------
// Afficher le panier
// -----------------------------------------------------

function afficherPanier(){

    const panierContainer =

    document.getElementById(

        "panierProduit"

    );



    if(!panierContainer){

        return;

    }



    panierContainer.innerHTML = "";



    //------------------------------------------
    // Aucun produit
    //------------------------------------------

    if(panierEstVide()){

        panierContainer.innerHTML = `

        <div class="panier-vide">

            <h2>

                🛒 Votre panier est vide

            </h2>

            <p>

                Ajoutez des produits

                depuis la boutique.

            </p>

        </div>

        `;

        mettreAJourResume();

        return;

    }



    //------------------------------------------
    // Produits
    //------------------------------------------

    panier.forEach(function(article,index){

        panierContainer.innerHTML += `

        <div class="cart-item">

            <div class="cart-image">

                <img

                    src="${article.image}"

                    alt="${article.nom}"

                    class="mini-img"

                >

            </div>



            <div class="cart-info">

                <h3>

                    ${article.nom}

                </h3>



                <p>

                    Prix :

                    ${formatPrix(article.prix)}

                    FCFA

                </p>



                <div

                    id="options-${index}"

                    class="zone-options">

                </div>



                <div class="cart-quantite">

                    <button

                        onclick="modifierQuantite(${index},-1)">

                        −

                    </button>



                    <span>

                        ${article.quantite}

                    </span>



                    <button

                        onclick="modifierQuantite(${index},1)">

                        +

                    </button>

                </div>

            </div>



            <div class="cart-actions">

                <button

                    onclick="supprimerDuPanier(${index})">

                    🗑️

                </button>

            </div>

        </div>

        `;

    });



    //------------------------------------------
    // Afficher les options
    //------------------------------------------

    afficherToutesLesOptions();



    //------------------------------------------
    // Mettre à jour le résumé
    //------------------------------------------

    mettreAJourResume();

}




// =====================================================
// BLOC 4
// OPTIONS UNIVERSELLES
// =====================================================


// -----------------------------------------------------
// Afficher toutes les options
// -----------------------------------------------------

function afficherToutesLesOptions(){

    panier.forEach(function(article,index){

        afficherOptionsProduit(

            article,

            index

        );

    });

}



// -----------------------------------------------------
// Afficher les options d'un produit
// -----------------------------------------------------

function afficherOptionsProduit(

    article,

    index

){

    const zone = document.getElementById(

        "options-" + index

    );



    if(!zone){

        return;

    }



    let html = "";



    //------------------------------------
    // Taille
    //------------------------------------

    if(

        Array.isArray(article.tailles)

        &&

        article.tailles.length

    ){

        html += `

        <div class="option-produit">

            <label>

                Taille

            </label>

            <select

                onchange="changerTaille(

                    ${index},

                    this.value

                )">

                ${article.tailles.map(function(taille){

                    return `

                    <option

                        value="${taille}"

                        ${article.taille===taille

                        ? "selected"

                        : ""}>

                        ${taille}

                    </option>

                    `;

                }).join("")}

            </select>

        </div>

        `;

    }



    //------------------------------------
    // Couleur
    //------------------------------------

    if(

        Array.isArray(article.couleurs)

        &&

        article.couleurs.length

    ){

        html += `

        <div class="option-produit">

            <label>

                Couleur

            </label>

            <select

                onchange="changerCouleur(

                    ${index},

                    this.value

                )">

                ${article.couleurs.map(function(couleur){

                    return `

                    <option

                        value="${couleur}"

                        ${article.couleur===couleur

                        ? "selected"

                        : ""}>

                        ${couleur}

                    </option>

                    `;

                }).join("")}

            </select>

        </div>

        `;

    }



    //------------------------------------
    // Pointure
    //------------------------------------

    if(

        Array.isArray(article.pointures)

        &&

        article.pointures.length

    ){

        html += `

        <div class="option-produit">

            <label>

                Pointure

            </label>

            <select

                onchange="changerPointure(

                    ${index},

                    this.value

                )">

                ${article.pointures.map(function(pointure){

                    return `

                    <option

                        value="${pointure}"

                        ${article.pointure===pointure

                        ? "selected"

                        : ""}>

                        ${pointure}

                    </option>

                    `;

                }).join("")}

            </select>

        </div>

        `;

    }



    //------------------------------------
    // Modèle
    //------------------------------------

    if(

        Array.isArray(article.modeles)

        &&

        article.modeles.length

    ){

        html += `

        <div class="option-produit">

            <label>

                Modèle

            </label>

            <select

                onchange="changerModele(

                    ${index},

                    this.value

                )">

                ${article.modeles.map(function(modele){

                    return `

                    <option

                        value="${modele}"

                        ${article.modele===modele

                        ? "selected"

                        : ""}>

                        ${modele}

                    </option>

                    `;

                }).join("")}

            </select>

        </div>

        `;

    }



    //------------------------------------
    // Format (Food)
    //------------------------------------

    if(

        Array.isArray(article.optionsFood)

        &&

        article.optionsFood.length

    ){

        html += `

        <div class="option-produit">

            <label>

                Format

            </label>

            <select

                onchange="changerOptionFood(

                    ${index},

                    this.value

                )">

                ${article.optionsFood.map(function(option){

                    return `

                    <option

                        value="${option}"

                        ${article.optionFood===option

                        ? "selected"

                        : ""}>

                        ${option}

                    </option>

                    `;

                }).join("")}

            </select>

        </div>

        `;

    }



    zone.innerHTML = html;

}





// =====================================================
// BLOC 5
// GESTION DU PANIER
// Quantités + Suppression
// =====================================================


// -----------------------------------------------------
// Modifier la quantité
// variation = +1 ou -1
// -----------------------------------------------------

function modifierQuantite(index, variation){

    if(

        index < 0 ||

        index >= panier.length

    ){

        return;

    }



    panier[index].quantite += variation;



    //----------------------------------
    // Minimum = 1
    //----------------------------------

    if(

        panier[index].quantite < 1

    ){

        panier[index].quantite = 1;

    }



    sauvegarderPanier();

    afficherPanier();

}



// -----------------------------------------------------
// Supprimer un produit
// -----------------------------------------------------

function supprimerDuPanier(index){

    if(

        index < 0 ||

        index >= panier.length

    ){

        return;

    }



    if(

        !confirm(

            "Supprimer ce produit du panier ?"

        )

    ){

        return;

    }



    panier.splice(

        index,

        1

    );



    sauvegarderPanier();

    afficherPanier();

}



// -----------------------------------------------------
// Vider complètement le panier
// -----------------------------------------------------

function viderPanier(){

    if(

        panierEstVide()

    ){

        return;

    }



    if(

        !confirm(

            "Voulez-vous vraiment vider votre panier ?"

        )

    ){

        return;

    }



    panier = [];



    sauvegarderPanier();

    afficherPanier();

}



// -----------------------------------------------------
// Mettre à jour le résumé
// -----------------------------------------------------

function mettreAJourResume(){

    const nbArticles =

        document.getElementById(

            "nombreArticles"

        );



    const total =

        document.getElementById(

            "total-panier"

        );



    if(nbArticles){

        nbArticles.textContent =

            compterArticles();

    }



    if(total){

        total.textContent =

            formatPrix(

                calculerTotal()

            )

            + " FCFA";

    }

}





// =====================================================
// BLOC 6
// PRÉPARATION DE LA COMMANDE
// =====================================================


// -----------------------------------------------------
// Copier le panier vers la commande
// -----------------------------------------------------

function preparerCommande(){

    if(

        panierEstVide()

    ){

        alert(

            "Votre panier est vide."

        );

        return false;

    }



    //----------------------------------
    // Origine
    //----------------------------------

    localStorage.setItem(

        "origineCommande",

        "panier"

    );



    //----------------------------------
    // Sauvegarde complète
    //----------------------------------

    localStorage.setItem(

        "commande",

        JSON.stringify(panier)

    );



    return true;

}



// -----------------------------------------------------
// Aller vers la page commande
// -----------------------------------------------------

function envoyerVersCommande(){

    if(

        !preparerCommande()

    ){

        return;

    }



    window.location.href =

    "../html/commande.html";

}



// -----------------------------------------------------
// Confirmation depuis un formulaire
// -----------------------------------------------------

function confirmerCommande(event){

    if(event){

        event.preventDefault();

    }



    envoyerVersCommande();

}




document.addEventListener(

    "DOMContentLoaded",

    function(){

        const formulaire =

        document.getElementById(

            "panierForm"

        );



        if(formulaire){

            formulaire.addEventListener(

                "submit",

                confirmerCommande

            );

        }

    }

);

