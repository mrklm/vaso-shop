# Changelog

Toutes les modifications notables de ce projet seront documentées dans ce fichier.

Le format est basé sur **Keep a Changelog**
et ce projet suit un versioning de type **SemVer**.

---

## [1.1.120] - 2026-09-04

### Modifié
- Réduit la hauteur de l'étape de sélection du contenant en supprimant les étirements verticaux inutiles.
- Réaligne le carrousel des contenants avec le schéma de compatibilité.

## [1.1.119] - 2026-08-31

### Modifié
- Place la hauteur sur une ligne dédiée dans le panier, entre le numéro du vase et les diamètres.
- Adoucit l'affichage de la sélection du contenant lorsque le vase impose uniquement le mode soliflore.
- Désactive la modification du contenant dans le panier pour les vases déjà ajoutés en soliflore.

## [1.1.118] - 2026-08-31

### Ajouté
- Ajoute un bouton d'activation de la manipulation 3D dans l'aperçu du vase.
- Ajoute des icônes ON/OFF dédiées pour signaler l'état de la vue 3D.

### Modifié
- Verrouille l'interaction 3D par défaut afin de laisser le scroll de page naturel.
- Aligne les icônes 3D pour éviter tout déplacement visuel au changement d'état.

## [1.1.117] - 2026-08-31

### Modifié
- Aère la carte Atelier Vaso avec des sections dédiées à la situation géographique et au matériau.
- Déplace le texte de présentation des modèles générés dans la colonne de droite de l'écran de génération.
- Ajuste la colonne Modèle actuel pour conserver une présentation lisible sur un écran complet.

## [1.1.116] - 2026-08-30

### Ajouté
- Ajoute des miniatures de vases réelles dans le panier à partir de la capture 3D du modèle sélectionné.

### Modifié
- Ajuste le cadrage des miniatures pour mieux conserver le vase entier dans le cadre du panier.

## [1.1.115] - 2026-08-30

### Ajouté
- Ajoute un panier persistant avec quantité, suppression, modification du contenant et modification de la couleur.
- Ajoute une icône de panier dédiée et les visuels Atelier Vaso dans l'écran d'accueil.

### Modifié
- Revoit le parcours boutique pour intégrer le panier avant les coordonnées et le paiement.
- Adapte la sélection du contenant selon la compatibilité réelle du vase : soliflore imposé ou choix Eco-Cup / soliflore.
- Clarifie les dimensions dans le panier avec les libellés hauteur et diamètre.
- Ajuste les textes, espacements et boutons des écrans d'accueil, de contenant, de couleur et de coordonnées.
- Prépare le paiement Stripe et le webhook à recevoir plusieurs articles dans une même commande.

## [1.1.114] - 2026-08-30

### Modifié
- Déplace les boutons de validation des étapes de commande vers le bas de chaque carte d'étape.
- Conserve l'alignement horizontal des actions tout en rendant la progression plus visible après lecture du contenu.

## [1.1.113] - 2026-08-30

### Corrigé
- Renforce l'amplitude minimale de la texture LowPoly pour qu'elle reste visible avec les zooms fins.

### Tests
- Ajoute un test vérifiant que le relief LowPoly reste mesurable en zoom Très fin.

## [1.1.112] - 2026-08-29

### Ajouté
- Synchronise le moteur Vaso avec Vaso Web 1.0.80 pour générer une vraie texture LowPoly en géométrie facettée.

### Modifié
- Affiche automatiquement les vases LowPoly avec des faces plates dans l'aperçu 3D boutique.
- Conserve les options boutique de forçage et de suppression du support tube à essai avec le moteur mis à jour.

### Corrigé
- Déplace la gravure des vases avec support tube à essai sous la face extérieure de la base, en soustraction de matière.
- Préserve la finesse de la gravure extérieure sous la base sur les vases LowPoly.
- Corrige le raccord du patch de gravure LowPoly pour conserver un STL étanche à l'export.

### Tests
- Ajoute un test d'export LowPoly avec support tube à essai et numéro de vase modifié.
- Met à jour les tests de gravure pour valider le numéro sous la base.

## [1.1.111] - 2026-08-15

### Modifié
- Clarifie les libellés des options de contenants pour indiquer que chaque vase VASO reste prévu pour un contenant étanche compatible.
- Précise que le mode soliflore force l'ajout du support tube à essai dans le STL, même lorsqu'un Eco-Cup est compatible.

## [1.1.110] - 2026-08-14

### Modifié
- Applique une enveloppe minimale compatible tube à essai à tous les vases générés et réglés manuellement.
- Relève la hauteur minimale des paramètres à 115 mm pour garantir l'usage soliflore.
- Calibre l'ouverture haute minimale pour tube à essai à 29 mm pour un tube de 25 mm.

## [1.1.109] - 2026-08-14

### Modifié
- Adoucit la transition du carrousel des contenants avec un fondu croisé plus lent et un mouvement discret.

## [1.1.108] - 2026-08-14

### Ajouté
- Ajoute un réglage de position d'affichage des contenants dans VASO Admin local.
- Définit l'ordre par défaut du carrousel des contenants : Eco-Cup 50 cl, Eco-Cup 25 cl, Eco-Cup 12,5 cl, puis tube à essai.

## [1.1.107] - 2026-08-14

### Modifié
- Ajuste l'alignement et le rythme du carrousel des contenants dans la validation du modèle.
- Place le bouton de validation au-dessus du contenant compatible et conserve le schéma affiché pour les choix soliflore Oui et Non.

## [1.1.106] - 2026-08-14

### Modifié
- Replace les illustrations des contenants dans la colonne titre de la validation du modèle avec un défilement automatique.

## [1.1.105] - 2026-08-14

### Ajouté
- Ajoute les illustrations JPG des contenants Eco-Cup 50 cl et tube à essai dans la validation du modèle.

## [1.1.104] - 2026-08-12

### Modifié
- Retire la mention des contenants compatibles du bloc Attention pour la réserver au bloc soliflore.

## [1.1.103] - 2026-08-12

### Modifié
- Scinde l'avertissement PLA et le choix soliflore en deux blocs distincts dans la validation du modèle.
- Clarifie le texte sur les contenants compatibles Eco-Cup et le passage en mode soliflore avec tube à essai.

## [1.1.102] - 2026-08-11

### Modifié
- Affiche le tube à essai avec une base plate dans la visualisation en coupe.
- Clarifie la mention du support pour tube à essai en verre dans la validation du modèle.

## [1.1.101] - 2026-08-11

### Modifié
- Aligne les contenants tube à essai sur les formats 100 mm et 120 mm en diamètre 25,4 mm.
- Corrige les supports tube à essai compensés pour qu'ils partent de la base du vase.
- Remplace la signature de gravure par le N° de vase et masque les caractères situés sous le support.
- Aligne la prévisualisation boutique sur la gravure exportée pour les vases avec support tube à essai.

## [1.1.100] - 2026-07-13

### Modifié
- Réduit la taille des inscriptions exportées sur les vases avec support tube à essai.

## [1.1.99] - 2026-07-13

### Modifié
- Replace les inscriptions des vases avec support tube à essai sur le fond intérieur, au-dessus et au-dessous du support.

## [1.1.98] - 2026-07-12

### Ajouté
- Ajoute le choix obligatoire d'usage soliflore avec support tube à essai dans la validation du modèle

### Modifié
- Remplace le support tube par une bague fendue en trois sections et décale la gravure du N° de vase
- Fiabilise l'affichage 3D du vase lors des générations successives

## [1.1.97] - 2026-06-09

### Modifié
- Replace le tube à essai en haut de l'aperçu en coupe avec un fond arrondi
- Renomme la couleur Terracotta sans la mention lie de vin

## [1.1.96] - 2026-06-09

### Ajouté
- Génère un support haut automatique pour les vases compatibles tube à essai

### Modifié
- Remplace la structure basse par un anneau de maintien avec trois bras inclinés vers la paroi

## [1.1.95] - 2026-06-09

### Modifié
- Remplace le tube à essai compatible par un format 75 × 12 mm

## [1.1.94] - 2026-06-08

### Modifié
- Injecte le secret GitHub Actions `VITE_MONDIAL_RELAY_BRAND` dans le build GitHub Pages

## [1.1.93] - 2026-06-08

### Ajouté
- Branche le widget Mondial Relay v4 dans le parcours de commande en point relais

### Modifié
- Rend le code Brand Mondial Relay configurable via `VITE_MONDIAL_RELAY_BRAND`
- Réactive le mode de livraison en point relais dans la configuration publique

## [1.1.92] - 2026-05-16

### Modifié
- Clarifie les dimensions du contenant et centre son titre dans la vue dédiée

## [1.1.91] - 2026-05-16

### Modifié
- Réduit encore la vue contenant et la centre sous le bouton de validation du modele

## [1.1.90] - 2026-05-16

### Modifié
- Réduit la taille de la vue contenant dans l'etape 1

## [1.1.89] - 2026-05-16

### Ajouté
- Ajoute une vue en coupe du contenant compatible dans l'etape 1 de validation du modele

## [1.1.88] - 2026-05-16

### Modifié
- Replace l'avertissement PLA sous les caracteristiques du modele dans l'etape 1

## [1.1.87] - 2026-05-16

### Modifié
- Deplace l'avertissement PLA dans l'etape 1 et inverse nom/prenom dans les coordonnees

## [1.1.86] - 2026-05-16

### Modifié
- Ajuste le texte d'introduction du parcours de commande

## [1.1.85] - 2026-05-16

### Ajouté
- Ajoute dans VASO-Admin une option pour ignorer le déploiement Netlify sur un commit

## [1.1.84] - 2026-05-16

### Ajouté
- Analyse automatiquement le plus grand contenant étanche compatible et l'affiche dans le shop et les commandes

## [1.1.83] - 2026-05-14

### Modifié
- Corrige l'authentification du bouton de test Discord dans VASO-Admin

## [1.1.82] - 2026-05-14

### Modifié
- Ameliore l'onglet Tarifs et passe le mot de passe admin en session unique

## [1.1.81] - 2026-05-14

### Ajouté
- Ajoute un bouton de test Discord dans VASO-Admin avec une fonction Netlify dédiée

## [1.1.80] - 2026-05-14

### Ajouté
- Ajoute l'horodatage des commandes dans la notification Discord

## [1.1.79] - 2026-05-13

### Modifié
- Met a jour la documentation du shop et complete les captures README

## [1.1.78] - 2026-05-13

### Modifié
- Reecrit le README de Vaso-Shop et remplace les captures par les vues du shop actuel

## [1.1.77] - 2026-05-13

### Modifié
- Raccourcit la mention copyright finale et harmonise Klm

## [1.1.76] - 2026-05-13

### Ajouté
- Remplace la note Stripe finale par une mention copyright centree

## [1.1.75] - 2026-05-13

### Ajouté
- Rend editable dans VASO-Admin le texte PLA affiche dans le bloc Modele actuel

## [1.1.74] - 2026-05-13

### Modifié
- Transforme le choix de livraison en combo et garde visibles les modes temporairement indisponibles

## [1.1.73] - 2026-05-13

### Ajouté
- Cases pour desactiver temporairement les modes de livraison dans Vaso_Admin

## [1.1.72] - 2026-05-13

### Modifié
- Simplifie la page de paiement confirme pour coller au fonctionnement reel de l'atelier

## [1.1.71] - 2026-05-13

### Modifié
- Place la France en premier dans la liste des pays de commande

## [1.1.70] - 2026-05-13

### Modifié
- Met la France en avant dans le choix du pays avec un raccourci visuel en un clic

## [1.1.69] - 2026-05-13

### Modifié
- Fiabilise l'acces de VASO-Admin a l'historique prive des commandes Netlify

## [1.1.68] - 2026-05-13

### Ajouté
- Affiche les commandes payees dans VASO-Admin via un historique prive Netlify

## [1.1.67] - 2026-05-13

### Ajouté
- Envoie une notification Discord automatique apres chaque commande Stripe validee

## [1.1.66] - 2026-05-13

### Modifié
- Passe Netlify en backend Stripe uniquement avec une page publique de renvoi vers GitHub Pages

## [1.1.65] - 2026-05-13

### Modifié
- Force la redirection publique Netlify vers GitHub Pages meme quand le build du shop existe

## [1.1.64] - 2026-05-13

### Modifié
- Corrige la redirection Netlify publique vers GitHub Pages sans casser les fonctions Stripe

## [1.1.63] - 2026-05-13

### Modifié
- Redirige l'URL Netlify publique vers GitHub Pages tout en gardant les fonctions Stripe

## [1.1.62] - 2026-05-13

### Modifié
- Fait remonter les details complets de commande Stripe dans le webhook Netlify

## [1.1.61] - 2026-05-10

### Modifié
- Durcit le checkout Stripe et limite les donnees personnelles exposees

## [1.1.60] - 2026-05-10

### Modifié
- Verrouille le viewer principal sur une teinte neutre, independamment du choix de couleur

## [1.1.59] - 2026-05-09

### Modifié
- Fiabilise le bouton Sauvegarder de VASO-Admin avec de meilleurs retours Git

## [1.1.58] - 2026-05-09

### Modifié
- Affine encore le rendu du noir, du jaune RAL 1016 et de l'orange fluo dans le mini aperçu couleur

## [1.1.57] - 2026-05-09

### Modifié
- Separe les reglages mailto dans VASO-Admin et rend editable la note sous l'aperçu couleur

## [1.1.56] - 2026-05-09

### Modifié
- Affine plusieurs teintes du mini aperçu couleur sans toucher aux pastilles PLA

## [1.1.55] - 2026-05-09

### Modifié
- Ajuste encore le rendu Blanc neige et ajoute une note sous l'aperçu couleur

## [1.1.54] - 2026-05-08

### Modifié
- Blanchit encore les aperçus Naturel et Blanc neige du mini viewer couleur

## [1.1.53] - 2026-05-08

### Modifié
- Eclaircit le rendu des aperçus couleur clairs sans toucher aux pastilles PLA

## [1.1.52] - 2026-05-08

### Modifié
- Ajuste encore les teintes d'aperçu PLA pour mieux coller aux couleurs attendues

## [1.1.51] - 2026-05-08

### Modifié
- Reserve le rendu translucide au seul apercu couleur sans affecter le viewer principal

## [1.1.50] - 2026-05-08

### Modifié
- Ajuste la palette PLA du shop et ajoute un vrai rendu translucide au viewer

## [1.1.49] - 2026-05-08

### Modifié
- Ajoute un aperçu 3D tournant de la couleur sélectionnée dans la commande

## [1.1.48] - 2026-05-08

### Modifié
- Affine VASO-Admin avec un onglet Publication simplifie et des champs Boutique mieux calibres

## [1.1.47] - 2026-05-08

### Modifié
- Ajoute un contact mailto configurable avec sujet, corps et reprise automatique du vase

## [1.1.46] - 2026-05-08

### Modifié
- Agrandit et recentre l'aperçu hero de VASO-Admin avec une liste mieux équilibrée

## [1.1.45] - 2026-05-08

### Modifié
- Clarifie la saisie du prix dans VASO-Admin avec euros, centimes et aperçu final

## [1.1.44] - 2026-05-08

### Modifié
- Restaure un aperçu hero au bon format dans VASO-Admin

## [1.1.43] - 2026-05-08

### Modifié
- Corrige le chemin des images hero dans l'aperçu de VASO-Admin

## [1.1.42] - 2026-05-08

### Modifié
- Fiabilise l'aperçu hero de VASO-Admin avec ou sans ImageTk

## [1.1.41] - 2026-05-08

### Modifié
- Ajoute la gestion des imprimantes et prepare Pillow pour l'aperçu hero de VASO-Admin

## [1.1.40] - 2026-05-08

### Modifié
- Enrichit l'onglet Hero de VASO-Admin avec aperçu, animation et réglages de transition

## [1.1.39] - 2026-05-08

### Modifié
- Ajoute un sélecteur de thème persistant à VASO-Admin

## [1.1.38] - 2026-05-08

### Modifié
- Oriente le shop vers GitHub Pages en public et Netlify pour le paiement


## [1.1.37] - 2026-05-08

### Modifié
- Ajoute une base VASO-Admin et rend la boutique pilotable par JSON

## [1.1.36] - 2026-05-07

### Modifié
- Supprime le suffixe M de la seed gravee dans le shop


## [1.1.35] - 2026-05-05

### Modifié
- Ajoute les modes de livraison, calcule les frais selon le pays et envoie le total à Stripe

## [1.1.34] - 2026-05-05

### Modifié
- Clarifie le récapitulatif de commande avec prix affiché avant le paiement Stripe
## [1.1.33] - 2026-05-05

### Modifié
- Adoucit encore le défilement de la galerie photo du hero

## [1.1.32] - 2026-05-05

### Modifié
- Prépare le webhook Stripe et allège la galerie photo du hero

## [1.1.31] - 2026-05-05

### Modifié
- Branche Stripe Checkout via Netlify et ajoute les pages de retour paiement

## [1.1.30] - 2026-05-05

### Modifié
- Clarifie les titres de commande et ajoute une liste de pays

## [1.1.29] - 2026-05-05

### Modifié
- Aligne le contact atelier et relance le scroll vers les coordonnees

## [1.1.28] - 2026-05-05

### Modifié
- Centre le bloc Atelier Vaso et reformule l'appel au contact

## [1.1.27] - 2026-05-05

### Modifié
- Aligne le moteur STL sur vaso-web et restaure le diametre minimum du modele

## [1.1.26] - 2026-05-05

### Modifié
- Integre l'atelier au bloc live et clarifie l'avertissement PLA

## [1.1.25] - 2026-05-05

### Modifié
- Echange les cartes du modele actuel et des modeles generes en direct

## [1.1.24] - 2026-05-05

### Modifié
- Allège le surtitre du hero et harmonise la carte Atelier Vaso

## [1.1.23] - 2026-05-05

### Modifié
- Agrandit les sigles Vaso et replace le repere de version

## [1.1.22] - 2026-05-04

### Modifié
- Renomme l'atelier et rend le sigle Vaso plus visible

## [1.1.21] - 2026-05-04

### Modifié
- Ajoute le sigle Vaso devant le surtitre du hero et le bloc atelier

## [1.1.20] - 2026-05-03

### Modifié
- Ajoute un repere de version tres discret a cote du surtitre du shop

## [1.1.19] - 2026-05-03

### Modifié
- Complete les coordonnees client avec ville, code postal et pays

## [1.1.18] - 2026-05-03

### Modifié
- Ajoute le diametre min a la validation du modele

## [1.1.17] - 2026-05-03

### Modifié
- Passe la commande aux pastilles cliquables et aligne le moteur sur les correctifs de couture et du suffixe M

## [1.1.16] - 2026-05-03

### Modifié
- Externalise les couleurs PLA et clarifie l'avertissement decoratif du vase

## [1.1.15] - 2026-05-03

### Modifié
- Transforme la commande en parcours par etapes avec defilement automatique et une etape Stripe preparee

## [1.1.14] - 2026-05-03

### Modifié
- Recompose la page de commande dans le meme esprit que le hero et prepare une structure claire pour l'integration de Stripe

## [1.1.13] - 2026-05-02

### Modifié
- Affine l'alignement de la grande bulle, allegue son contour et place le badge de commande a droite du titre du modele actuel

## [1.1.12] - 2026-05-02

### Modifié
- Recompose le hero avec une galerie photo plus ample, des transitions plus douces et un bloc atelier déporté à droite

## [1.1.11] - 2026-05-02

### Modifié
- Adoucit les transitions de la galerie du hero et reduit legerement les images dans la bulle

## [1.1.10] - 2026-05-02

### Modifié
- Ajoute une galerie photo au hero, integre le descriptif PLA au bloc matiere et fiabilise le deploiement Pages

## [1.1.9] - 2026-05-02

### Modifié
- Affine les textes du shop, clarifie le parcours de commande et retire une mention de finition redondante

## [1.1.8] - 2026-05-02

### Modifié
- Affine le haut de page shop avec des bulles imagees et un texte plus clair sur le modele

## [1.1.7] - 2026-05-02

### Modifié
- Reorganise le haut de page shop avec des reperes visuels empiles a droite du titre

## [1.1.6] - 2026-05-02

### Modifié
- Recompose le hero shop avec un bandeau plus compact et des reperes visuels circulaires

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
