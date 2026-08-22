/*=========================================================
  storage.js
  Gestion centralisée du LocalStorage / SessionStorage
=========================================================*/

"use strict";

const StorageManager = (() => {

    const PREFIX = "marketplace_";

    function cle(nom) {
        return PREFIX + nom;
    }

    function enregistrer(nom, valeur) {

        try {

            localStorage.setItem(
                cle(nom),
                JSON.stringify(valeur)
            );

            return true;

        } catch (e) {

            console.error(e);

            return false;

        }

    }

    function lire(nom, valeurParDefaut = null) {

        try {

            const data = localStorage.getItem(cle(nom));

            if (data === null)
                return valeurParDefaut;

            return JSON.parse(data);

        } catch (e) {

            console.error(e);

            return valeurParDefaut;

        }

    }

    function supprimer(nom) {

        localStorage.removeItem(
            cle(nom)
        );

    }

    function existe(nom) {

        return localStorage.getItem(
            cle(nom)
        ) !== null;

    }

    function viderTout() {

        Object.keys(localStorage)

            .filter(k => k.startsWith(PREFIX))

            .forEach(k => {

                localStorage.removeItem(k);

            });

    }

    /*=============================
      SESSION
    =============================*/

    function enregistrerSession(nom, valeur) {

        sessionStorage.setItem(

            cle(nom),

            JSON.stringify(valeur)

        );

    }

    function lireSession(nom, defaut = null) {

        const valeur = sessionStorage.getItem(

            cle(nom)

        );

        if (!valeur)
            return defaut;

        return JSON.parse(valeur);

    }

    function supprimerSession(nom) {

        sessionStorage.removeItem(

            cle(nom)

        );

    }

    return {

        enregistrer,

        lire,

        supprimer,

        existe,

        viderTout,

        enregistrerSession,

        lireSession,

        supprimerSession

    };

})();