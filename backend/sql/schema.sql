-- =============================================
-- SINE.SHOP - Schéma de base de données
-- Version 1.0
-- =============================================

-- Créer la base de données
CREATE DATABASE IF NOT EXISTS sine_shop;
USE sine_shop;

-- =============================================
-- TABLE : utilisateurs
-- =============================================
CREATE TABLE IF NOT EXISTS utilisateurs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(100) UNIQUE NOT NULL,
  mot_de_passe VARCHAR(255) NOT NULL,
  prenom VARCHAR(50),
  nom VARCHAR(50),
  pseudo VARCHAR(50) UNIQUE,
  telephone VARCHAR(20),
  pays VARCHAR(3),
  ville VARCHAR(50),
  adresse TEXT,
  photo VARCHAR(255),
  banniere VARCHAR(255),
  boutique VARCHAR(100),
  devise VARCHAR(10) DEFAULT 'FCFA',
  type ENUM('client', 'vendeur', 'livreur', 'administrateur') DEFAULT 'client',
  verification TINYINT(1) DEFAULT 0,
  date_inscription DATETIME DEFAULT CURRENT_TIMESTAMP,
  derniere_connexion DATETIME,
  actif TINYINT(1) DEFAULT 1,
  langue VARCHAR(5) DEFAULT 'fr',
  INDEX idx_email (email),
  INDEX idx_type (type)
);

-- =============================================
-- TABLE : catégories (pour les catégories prédéfinies)
-- =============================================
CREATE TABLE IF NOT EXISTS categories (
  id INT PRIMARY KEY AUTO_INCREMENT,
  nom VARCHAR(50) UNIQUE NOT NULL,
  emoji VARCHAR(10),
  description TEXT,
  parent_id INT NULL,
  FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE CASCADE,
  INDEX idx_parent (parent_id)
);

-- =============================================
-- TABLE : produits
-- =============================================
CREATE TABLE IF NOT EXISTS produits (
  id VARCHAR(50) PRIMARY KEY,
  vendeur_id INT NOT NULL,
  categorie VARCHAR(50),
  sous_categorie VARCHAR(50),
  type VARCHAR(30) DEFAULT 'produit',
  nom VARCHAR(255) NOT NULL,
  description TEXT,
  description_courte VARCHAR(300),
  prix DECIMAL(12,2) NOT NULL,
  ancien_prix DECIMAL(12,2),
  devise VARCHAR(10) DEFAULT 'FCFA',
  stock INT DEFAULT 0,
  unite VARCHAR(20) DEFAULT 'piece',
  marque VARCHAR(100),
  modele VARCHAR(100),
  sku VARCHAR(50),
  etat VARCHAR(20) DEFAULT 'new',
  image_principale VARCHAR(255),
  images JSON,
  videos JSON,
  documents JSON,
  variantes JSON,
  attributs JSON,
  livraison JSON,
  garantie VARCHAR(20),
  garantie_description TEXT,
  reservation TINYINT(1) DEFAULT 0,
  disponible_immediatement TINYINT(1) DEFAULT 1,
  seo_slug VARCHAR(255),
  seo_keywords TEXT,
  seo_meta_description TEXT,
  actif TINYINT(1) DEFAULT 1,
  visible VARCHAR(20) DEFAULT 'public',
  date_publication DATETIME DEFAULT CURRENT_TIMESTAMP,
  date_modification DATETIME,
  FOREIGN KEY (vendeur_id) REFERENCES utilisateurs(id) ON DELETE CASCADE,
  INDEX idx_vendeur (vendeur_id),
  INDEX idx_categorie (categorie),
  INDEX idx_actif (actif),
  INDEX idx_visible (visible),
  INDEX idx_seo_slug (seo_slug)
);

-- =============================================
-- TABLE : favoris
-- =============================================
CREATE TABLE IF NOT EXISTS favoris (
  id INT PRIMARY KEY AUTO_INCREMENT,
  utilisateur_id INT NOT NULL,
  produit_id VARCHAR(50) NOT NULL,
  date_ajout DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id) ON DELETE CASCADE,
  FOREIGN KEY (produit_id) REFERENCES produits(id) ON DELETE CASCADE,
  UNIQUE KEY unique_favori (utilisateur_id, produit_id),
  INDEX idx_user (utilisateur_id)
);

-- =============================================
-- TABLE : panier
-- =============================================
CREATE TABLE IF NOT EXISTS panier (
  id INT PRIMARY KEY AUTO_INCREMENT,
  utilisateur_id INT NOT NULL,
  produit_id VARCHAR(50) NOT NULL,
  quantite INT DEFAULT 1,
  date_ajout DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id) ON DELETE CASCADE,
  FOREIGN KEY (produit_id) REFERENCES produits(id) ON DELETE CASCADE,
  UNIQUE KEY unique_panier (utilisateur_id, produit_id),
  INDEX idx_user (utilisateur_id)
);

-- =============================================
-- TABLE : commandes
-- =============================================
CREATE TABLE IF NOT EXISTS commandes (
  id VARCHAR(50) PRIMARY KEY,
  utilisateur_id INT NOT NULL,
  total DECIMAL(12,2) NOT NULL,
  devise VARCHAR(10) DEFAULT 'FCFA',
  statut ENUM('en_attente', 'confirmée', 'expédition', 'livrée', 'annulée', 'remboursée') DEFAULT 'en_attente',
  date_creation DATETIME DEFAULT CURRENT_TIMESTAMP,
  date_livraison DATETIME,
  adresse_livraison TEXT,
  notes TEXT,
  FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id),
  INDEX idx_utilisateur (utilisateur_id),
  INDEX idx_statut (statut)
);

-- =============================================
-- TABLE : commandes_produits
-- =============================================
CREATE TABLE IF NOT EXISTS commandes_produits (
  id INT PRIMARY KEY AUTO_INCREMENT,
  commande_id VARCHAR(50) NOT NULL,
  produit_id VARCHAR(50) NOT NULL,
  quantite INT NOT NULL,
  prix_unitaire DECIMAL(12,2) NOT NULL,
  remise DECIMAL(12,2) DEFAULT 0,
  total DECIMAL(12,2) NOT NULL,
  FOREIGN KEY (commande_id) REFERENCES commandes(id) ON DELETE CASCADE,
  INDEX idx_commande (commande_id)
);

-- =============================================
-- TABLE : messages
-- =============================================
CREATE TABLE IF NOT EXISTS messages (
  id INT PRIMARY KEY AUTO_INCREMENT,
  expediteur_id INT NOT NULL,
  destinataire_id INT NOT NULL,
  produit_id VARCHAR(50) NULL,
  contenu TEXT,
  piece_jointe JSON,
  lu TINYINT(1) DEFAULT 0,
  date_envoi DATETIME DEFAULT CURRENT_TIMESTAMP,
  conversation_id VARCHAR(50),
  FOREIGN KEY (expediteur_id) REFERENCES utilisateurs(id) ON DELETE CASCADE,
  FOREIGN KEY (destinataire_id) REFERENCES utilisateurs(id) ON DELETE CASCADE,
  INDEX idx_conversation (conversation_id),
  INDEX idx_expediteur (expediteur_id),
  INDEX idx_destinataire (destinataire_id)
);

-- =============================================
-- TABLE : avis
-- =============================================
CREATE TABLE IF NOT EXISTS avis (
  id INT PRIMARY KEY AUTO_INCREMENT,
  produit_id VARCHAR(50) NOT NULL,
  utilisateur_id INT NOT NULL,
  note INT CHECK (note BETWEEN 1 AND 5),
  commentaire TEXT,
  date DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (produit_id) REFERENCES produits(id) ON DELETE CASCADE,
  FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id) ON DELETE CASCADE,
  INDEX idx_produit (produit_id),
  INDEX idx_utilisateur (utilisateur_id)
);

-- =============================================
-- TABLE : notifications
-- =============================================
CREATE TABLE IF NOT EXISTS notifications (
  id INT PRIMARY KEY AUTO_INCREMENT,
  utilisateur_id INT NOT NULL,
  type VARCHAR(50),
  message TEXT,
  lu TINYINT(1) DEFAULT 0,
  date_creation DATETIME DEFAULT CURRENT_TIMESTAMP,
  lien VARCHAR(255),
  FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id) ON DELETE CASCADE,
  INDEX idx_utilisateur (utilisateur_id),
  INDEX idx_lu (lu)
);