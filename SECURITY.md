# 🚨 SÉCURITÉ - IMPORTANT

## Problème actuel
- Le code JavaScript est public et visible par tous
- Le PIN peut être trouvé en inspectant le code
- N'importe qui peut accéder à l'admin

## Solutions possibles

### Option 1 : Protection basique (gratuit)
- PIN masqué avec String.fromCharCode()
- Changer régulièrement le PIN
- Ajouter une deuxième couche de sécurité

### Option 2 : Backend Node.js (intermédiaire)
- Créer une API Express
- Authentification JWT
- Base de données MongoDB/SQLite

### Option 3 : Vercel Functions (payant)
- API serverless
- Variables d'environnement sécurisées
- Authentification professionnelle

### Option 4 : Firebase/Supabase (freemium)
- Service d'authentification externe
- Base de données sécurisée
- Interface d'administration

## Recommandation
Pour un tournoi, utilisez l'option 1 + changez le PIN toutes les semaines.
Pour une solution professionnelle, optez pour Firebase/Supabase.
