# Changelog

Toutes les modifications notables de ce projet seront documentées dans ce fichier.

Le format est basé sur **Keep a Changelog**
et ce projet suit un versioning de type **SemVer**.

---

## [1.1.5] - 2026-05-02

### Modifié
- Recompacte la page shop pour mieux tenir dans le premier ecran

## [1.1.4] - 2026-05-01

### Modifié
- Refonte la presentation shop pour un rendu plus harmonieux et plus compact a l'ecran

## [1.1.3] - 2026-05-01

### Modifié
- Aligne le texte gravé du fond sur les derniers réglages validés du moteur

## [1.1.2] - 2026-04-28

### Modifié
- Compactage de la page d'accueil sur ordinateur avec un hero et un viewer plus contenus
- Réduction de la taille du titre principal pour améliorer le cadrage desktop
- Mise à jour du texte d'accueil avec une formulation en vouvoiement

## [1.1.1] - 2026-04-28

### Modifié
- Incrémentation de version après publication de `1.1.0`
- Mise à jour des métadonnées du projet pour `vaso-shop`

## [1.1.0] - 2026-04-28

### Modifié
- Transformation de `vaso-web` en première version boutique `vaso-shop`
- Remplacement de l'interface maker par un parcours simple : générer, parcourir, commander
- Affichage des informations produit utiles : seed, version, hauteur, diamètre maximal, matière

### Ajouté
- Historique simple des vases générés avec navigation précédent / suivant
- Sélection de couleur PLA via configuration dédiée
- Formulaire de précommande prêt à être relié à Formspree
- Configuration boutique séparée pour préparer la suite du projet

## [1.0.24] - 2026-03-28

### Modifié
- Correction du blocage de l'export STL lié à l'instanciation de clipper après bundling

## [1.0.23] - 2026-03-28

### Modifié
- Correction de la gravure FDM robuste
- Rétablissement du workflow de déploiement

## [1.0.22] - 2026-03-28

### Modifié
- Ajustement du texte STL pour l'impression

## [1.0.21] - 2026-03-28

### Modifié
- Le numéro de seed passe de 6 à 8 chiffres
- Correction d'un problème de capture d'écran

## [1.0.20] - 2026-03-26

### Modifié
- Le vase initial de session correspond maintenant à la seed générée aléatoirement
- Le marqueur `M` de seed modifiée s'applique maintenant si le style, la complexité, la texture ou le profil d'imprimante 3D est modifié

## [1.0.19] - 2026-03-26

### Modifié
- Ajout de l'imprimante 3D `Creality CR-10S` dans la liste des profils
- Application complète des thèmes de couleurs, vase compris

## [1.0.18] - 2026-03-26

### Modifié
- Correction du mode de vue 3D `Flat Shading`

## [1.0.17] - 2026-03-26

### Ajouté
- Affichage d'un `M` quand la seed est modifiée, sur le rendu 3D, le STL et le bandeau de capture d'écran
   
## [1.0.16] - 2026-03-26

### Ajouté
- Mise en place d'un critère d'épaisseur géométrique constante pour éviter les trous à la réduction d'échelle

## [1.0.15] - 2026-03-25

### Ajouté
- Bouton de réinitialisation de Vaso dans les options

## [1.0.14] - 2026-03-25

### Modifié
- Déplacement des paramètres avancés de STL depuis les paramètres généraux vers les options

## [1.0.13] - 2026-03-25

### Modifié
- Le programme tient maintenant compte de l'imprimante 3D sélectionnée

### Ajouté
- Ajout de plusieurs imprimantes 3D dans les presets

## [1.0.12] - 2026-03-25

### Modifié
- Suppression du mode de rendu 3D `Enhanced`, pertinent dans l'ancienne version Python
- Uniformisation du libellé `n° de seed` sur le bandeau de capture d'écran

## [1.0.11] - 2026-03-25

### Modifié
- Le titre, la version et la seed sont visibles dans le rendu 3D

## [1.0.10] - 2026-03-25

### Modifié
- Sections rétablies dans le menu des options

## [1.0.9] - 2026-03-25

### Modifié
- Le menu option sur mobile se ferme lorsqu'on appuie sur X

## [1.0.8] - 2026-03-25

### Modifié
- Le menu option sur mobile ne se ferme plus lorsqu'on change de section

## [1.0.7] - 2026-03-25

### Modifié
- Capture d'écran fonctionnelle avec titre

### Ajouté
- Bandeau d'information sur la capture d'écran

## [1.0.6] - 2026-03-25

### Ajouté
- Nom du programme, version et numéro de seed imprimés dans le vase

### Modifié
- Nettoyage de l'ancien pipeline soustractif

## [1.0.5] - 2026-03-21

### Modifié
- Correction d'un résidu de grille au milieu de la scène

## [1.0.4] - 2026-03-21

### Modifié
- Correction d'un problème de bloc noir sur mobile

## [1.0.3] - 2026-03-21

### Modifié
- Problème de bloc noir sur mobile

## [1.0.2] - 2026-03-21

### Modifié
- Amélioration de l'interface : les boutons du bas ne disparaissent plus au redimensionnement

## [1.0.1] - 2026-03-21

### Modifié
- Positionnement correct de la grille 3D à la base du vase
- Amélioration de la cohérence visuelle de la scène 3D
- Inversion de la hiérarchie visuelle des boutons principaux :
  - **"Aléatoire"** devient le bouton principal (highlight)
  - **"Exporter STL"** devient secondaire

### Amélioré
- Meilleure lisibilité de l’interface utilisateur
- Comportement plus logique orienté génération avant export

---

## [1.0.0] - Version initiale

### Fonctionnalités principales
- Génération de vases polygonaux paramétriques
- Interpolation multi-profils (2 à 10 profils)
- Aperçu 3D temps réel
- Export STL
- Génération aléatoire avec seed
- Textures paramétriques
- Interface web React + Vite
- Déploiement GitHub Pages
