# VASO-Admin

Interface locale de gestion pour `VASO SHOP`.

## Lancement

Depuis la racine du repo :

```bash
python3 admin/vaso_admin.py
```

## Fonctions du MVP

- edition de `public/config/shop-config.json`
- gestion des tarifs S / M / L
- gestion du statut boutique et des messages
- activation, ordre et edition des couleurs PLA
- gestion de la liste hero publiee dans `public/images/hero/`
- consultation des commandes payees via l'onglet `Commandes`
- publication Git via `git add`, `git commit` et `git push`

## Fichiers pilotes

- configuration boutique : `public/config/shop-config.json`
- images hero : `public/images/hero/`

## Variables Netlify utiles pour les commandes

- `ADMIN_ORDERS_TOKEN` : jeton prive attendu par l'onglet `Commandes`
- `DISCORD_WEBHOOK_URL` : webhook Discord pour les notifications en temps reel

## Application Linux (AppImage)

Le build se trouve dans `dist-admin/VASO-Admin-x86_64.AppImage`.
Dans les propriétés du fichier, autoriser son exécution, puis double-cliquer.
Le build local cible Linux x86_64 avec glibc 2.39 ou ultérieure (Ubuntu 24.04).
Python, Tkinter et Pillow sont embarqués. Git doit être installé pour publier,
et le dépôt vaso-shop doit être présent avec ses accès Git habituels.

Au premier lancement, sélectionner le dossier du dépôt vaso-shop si nécessaire.
Son emplacement est mémorisé dans `~/.config/vaso-admin/repository.json`
(ou sous `XDG_CONFIG_HOME`). Les fichiers de boutique restent dans ce dépôt.
`VASO_SHOP_DIR` permet également d'indiquer son emplacement.
Aucun jeton, réglage personnel ou dépôt n'est inclus dans l'AppImage.

Si FUSE est indisponible :

```bash
./dist-admin/VASO-Admin-x86_64.AppImage --appimage-extract-and-run
```

### Reconstruire

Sur Ubuntu, disposer de `python3-venv`, `python3-tk` et `python3-pil.imagetk`.
Créer un environnement de build et installer PyInstaller :

```bash
python3 -m venv --system-site-packages admin/.venv-build
admin/.venv-build/bin/pip install pyinstaller==6.20.0
admin/.venv-build/bin/pip install -r admin/requirements.txt
```

Télécharger [appimagetool officiel](https://github.com/AppImage/appimagetool/releases),
le rendre exécutable, puis lancer :

```bash
PYTHON="$PWD/admin/.venv-build/bin/python" \
APPIMAGETOOL=/chemin/vers/appimagetool-x86_64.AppImage \
./admin/build-appimage.sh
```

Pour construire sans accès réseau, télécharger aussi le fichier `runtime-x86_64`
depuis les releases officielles de
[AppImage/type2-runtime](https://github.com/AppImage/type2-runtime/releases),
puis définir `APPIMAGE_RUNTIME=/chemin/vers/runtime-x86_64` lors du build.

Le build utilise les bibliothèques de la machine : pour prendre en charge une
ancienne distribution, reconstruire sur cette distribution.
