# ⚡ Déploiement Rapide - LIVEDOC

## 🎯 Option Recommandée : Railway

### Étape 1 : Préparer le code
```bash
cd "/Users/admin/Downloads/nettoyage ML/application/livedoc"

# Vérifier que tout est commité
git status

# Si pas encore sur GitHub, créer le repo et push
git init
git add .
git commit -m "Ready for deployment"
git remote add origin https://github.com/VOTRE-USERNAME/livedoc.git
git push -u origin main
```

### Étape 2 : Créer le projet sur Railway

1. Aller sur **https://railway.app**
2. Se connecter avec **GitHub**
3. Cliquer sur **"New Project"**
4. Sélectionner **"Deploy from GitHub repo"**
5. Choisir votre repository `livedoc`

### Étape 3 : Configurer les variables d'environnement

Dans Railway, aller dans **"Variables"** et ajouter :

```env
DATABASE_URL=votre_url_neon_postgresql
NEXTAUTH_URL=https://votre-app.railway.app
NEXTAUTH_SECRET=générer_avec_la_commande_ci_dessous
NODE_ENV=production
```

**Générer NEXTAUTH_SECRET :**
```bash
openssl rand -base64 32
```

### Étape 4 : Configurer le build

Railway détecte automatiquement Next.js grâce aux fichiers `railway.json` et `nixpacks.toml` que nous avons créés.

Si besoin, dans les **Settings** du service :
- **Root Directory** : `application/livedoc` (si votre repo est à la racine)
- Sinon, laisser vide si le repo contient directement le code

### Étape 5 : Déployer

Railway déploie automatiquement ! 🚀

- Votre app sera disponible sur : `https://votre-app.railway.app`
- Chaque push sur GitHub déclenche un nouveau déploiement

---

## 🔄 Alternative : Render

### Étape 1 : Créer le service sur Render

1. Aller sur **https://render.com**
2. Se connecter avec **GitHub**
3. Cliquer sur **"New +"** → **"Web Service"**
4. Connecter votre repository

### Étape 2 : Configurer

- **Name** : `livedoc`
- **Region** : `Frankfurt` (ou le plus proche)
- **Branch** : `main`
- **Root Directory** : `application/livedoc`
- **Environment** : `Node`
- **Build Command** : `npm install && npx prisma generate && npm run build && pip3 install --user xgboost numpy pandas scikit-learn joblib`
- **Start Command** : `npm start`

### Étape 3 : Variables d'environnement

Dans **"Environment Variables"** :
```env
DATABASE_URL=votre_url_neon_postgresql
NEXTAUTH_URL=https://votre-app.onrender.com
NEXTAUTH_SECRET=votre_secret_généré
NODE_ENV=production
PYTHON_PATH=/usr/bin/python3
```

### Étape 4 : Déployer

Cliquer sur **"Create Web Service"** et attendre le déploiement ! 🎉

---

## ✅ Vérifications Post-Déploiement

1. **Base de données** : Vérifier que Prisma peut se connecter
   ```bash
   npx prisma migrate deploy
   ```

2. **Application** : Tester l'URL de déploiement
   - Page d'accueil fonctionne ?
   - Login fonctionne ?
   - Prédictions fonctionnent ?

3. **Logs** : Vérifier les logs en cas d'erreur
   - Railway : Onglet "Deployments" → "View Logs"
   - Render : Onglet "Logs"

---

## 🆘 Problèmes Courants

### Erreur : "Cannot find module"
→ Vérifier que `npm install` est dans le build command

### Erreur : "Prisma Client not generated"
→ Ajouter `npx prisma generate` dans le build command

### Erreur : "Python/XGBoost not found"
→ Ajouter `pip3 install xgboost numpy pandas scikit-learn joblib` dans le build

### Erreur : "Database connection failed"
→ Vérifier `DATABASE_URL` et que Neon autorise les connexions externes

---

## 📊 Comparaison Rapide

| Plateforme | Gratuit | Python | Facile | Recommandé |
|------------|---------|--------|--------|------------|
| **Railway** | $5 crédit | ✅ | ⭐⭐⭐⭐⭐ | ✅ OUI |
| **Render** | 750h/mois | ✅ | ⭐⭐⭐⭐ | ✅ OUI |
| **Vercel** | Illimité* | ❌ | ⭐⭐⭐⭐⭐ | ❌ NON |

*Vercel gratuit mais limité pour Python/ML

---

## 🎉 C'est tout !

Votre application est maintenant en ligne ! 🚀

Pour toute question, consultez le guide complet : `GUIDE_DEPLOIEMENT_GRATUIT.md`
