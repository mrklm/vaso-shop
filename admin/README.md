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
