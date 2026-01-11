# 🚀 Guide de Déploiement Gratuit - LIVEDOC

Ce guide vous explique comment déployer votre application Next.js avec modèles Python ML sur des plateformes gratuites.

## 📋 Vue d'ensemble

Votre application est composée de :
- **Frontend + Backend** : Next.js (API Routes)
- **Base de données** : PostgreSQL (déjà sur Neon ✅)
- **Modèles ML** : Scripts Python (XGBoost) pour prédictions

## 🎯 Options de Déploiement Gratuites

### Option 1 : Railway (⭐ RECOMMANDÉ)

**Pourquoi Railway ?**
- ✅ Supporte Next.js + Python dans la même app
- ✅ Intégration facile avec Neon PostgreSQL
- ✅ Déploiement automatique depuis GitHub
- ✅ $5 crédit gratuit (environ 500h/mois)
- ✅ Support Docker si besoin

**Limites gratuites :**
- $5 crédit par mois (environ 500 heures)
- Après épuisement, l'app s'arrête (mais les données restent)

**Étapes de déploiement :**

1. **Créer un compte Railway**
   - Aller sur https://railway.app
   - Se connecter avec GitHub

2. **Créer un nouveau projet**
   - Cliquer sur "New Project"
   - Sélectionner "Deploy from GitHub repo"
   - Choisir votre repository `livedoc`

3. **Configurer le service**
   - Railway détecte automatiquement Next.js
   - Dans les settings, configurer :
     - **Build Command** : `npm install && npm run build`
     - **Start Command** : `npm start`
     - **Root Directory** : `application/livedoc` (si votre repo est à la racine)

4. **Ajouter Python au build**
   - Créer un fichier `railway.json` à la racine de `application/livedoc` :
   ```json
   {
     "build": {
       "builder": "NIXPACKS",
       "buildCommand": "npm install && npm run build && pip3 install xgboost numpy pandas scikit-learn joblib"
     }
   }
   ```

5. **Configurer les variables d'environnement**
   - Dans Railway, aller dans "Variables"
   - Ajouter :
     ```
     DATABASE_URL=votre_url_neon_postgresql
     NEXTAUTH_URL=https://votre-app.railway.app
     NEXTAUTH_SECRET=générer_avec_openssl_rand_base64_32
     NODE_ENV=production
     ```

6. **Déployer**
   - Railway déploie automatiquement à chaque push sur GitHub
   - Votre app sera disponible sur `https://votre-app.railway.app`

---

### Option 2 : Render (⭐ BON ALTERNATIF)

**Pourquoi Render ?**
- ✅ 750 heures gratuites par mois
- ✅ Supporte Next.js + Python
- ✅ Déploiement automatique depuis GitHub
- ✅ SSL gratuit

**Limites gratuites :**
- 750 heures/mois (environ 31 jours si seul service)
- L'app s'endort après 15 min d'inactivité (gratuit)
- Réveil en 30-60 secondes

**Étapes de déploiement :**

1. **Créer un compte Render**
   - Aller sur https://render.com
   - Se connecter avec GitHub

2. **Créer un nouveau Web Service**
   - Cliquer sur "New +" → "Web Service"
   - Connecter votre repository GitHub
   - Sélectionner le repository `livedoc`

3. **Configurer le service**
   - **Name** : `livedoc` (ou votre choix)
   - **Region** : Choisir le plus proche (Frankfurt pour l'Europe)
   - **Branch** : `main` ou `master`
   - **Root Directory** : `application/livedoc`
   - **Environment** : `Node`
   - **Build Command** : `npm install && npm run build`
   - **Start Command** : `npm start`

4. **Ajouter Python**
   - Dans "Advanced", ajouter un "Build Command" personnalisé :
   ```
   npm install && npm run build && pip3 install --user xgboost numpy pandas scikit-learn joblib
   ```

5. **Configurer les variables d'environnement**
   - Dans "Environment Variables", ajouter :
     ```
     DATABASE_URL=votre_url_neon_postgresql
     NEXTAUTH_URL=https://votre-app.onrender.com
     NEXTAUTH_SECRET=générer_avec_openssl_rand_base64_32
     NODE_ENV=production
     PYTHON_PATH=/usr/bin/python3
     ```

6. **Déployer**
   - Cliquer sur "Create Web Service"
   - Render déploie automatiquement
   - Votre app sera sur `https://votre-app.onrender.com`

---

### Option 3 : Vercel (⚠️ LIMITÉ pour Python)

**Pourquoi Vercel ?**
- ✅ Créé par les créateurs de Next.js
- ✅ Déploiement ultra-rapide
- ✅ Excellent pour Next.js pur
- ✅ CDN global

**Limites :**
- ❌ Support Python limité (serverless functions seulement)
- ❌ Timeout de 10 secondes sur le plan gratuit
- ❌ Les modèles ML peuvent être trop lourds

**Si vous voulez quand même essayer Vercel :**

1. **Créer un compte Vercel**
   - Aller sur https://vercel.com
   - Se connecter avec GitHub

2. **Importer le projet**
   - Cliquer sur "Add New" → "Project"
   - Importer depuis GitHub
   - Sélectionner `livedoc`

3. **Configurer**
   - **Framework Preset** : Next.js
   - **Root Directory** : `application/livedoc`
   - **Build Command** : `npm run build`
   - **Output Directory** : `.next`

4. **Variables d'environnement**
   ```
   DATABASE_URL=votre_url_neon_postgresql
   NEXTAUTH_URL=https://votre-app.vercel.app
   NEXTAUTH_SECRET=générer_avec_openssl_rand_base64_32
   ```

5. **⚠️ Problème Python sur Vercel**
   - Les scripts Python doivent être convertis en API serverless
   - Ou utiliser un service externe pour les modèles ML
   - **Recommandation** : Utiliser Railway ou Render à la place

---

## 🔧 Configuration Requise Avant Déploiement

### 1. Préparer le fichier `.env`

Créer un fichier `.env.production` (ne pas commiter) :

```env
# Base de données (Neon)
DATABASE_URL=postgresql://user:password@host.neon.tech/dbname?sslmode=require

# NextAuth
NEXTAUTH_URL=https://votre-app.railway.app
NEXTAUTH_SECRET=votre_secret_ici

# Application
NODE_ENV=production

# Python (si nécessaire)
PYTHON_PATH=/usr/bin/python3
```

### 2. Générer NEXTAUTH_SECRET

```bash
openssl rand -base64 32
```

### 3. Préparer le repository GitHub

Assurez-vous que votre code est sur GitHub :
```bash
cd "/Users/admin/Downloads/nettoyage ML/application/livedoc"
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/votre-username/livedoc.git
git push -u origin main
```

### 4. Créer un fichier `.dockerignore` (optionnel, pour Railway)

Si vous utilisez Railway avec Docker :
```
node_modules
.next
.git
.env
.env.local
*.log
```

---

## 📦 Structure des Fichiers pour Déploiement

Votre structure devrait ressembler à :
```
application/livedoc/
├── app/
├── lib/
├── prisma/
├── public/
│   └── models/          # Modèles ML
├── scripts/             # Scripts Python
├── package.json
├── next.config.ts
├── prisma/schema.prisma
└── .env                 # Variables locales (ne pas commiter)
```

---

## 🚨 Points Importants

### Base de données (Neon)
- ✅ Vous avez déjà Neon configuré
- Assurez-vous que l'URL de connexion est accessible depuis Internet
- Vérifiez que les migrations Prisma sont à jour :
  ```bash
  npx prisma migrate deploy
  ```

### Modèles Python
- Les modèles doivent être dans `public/models/`
- Les scripts Python doivent être dans `scripts/`
- Assurez-vous que les chemins sont corrects dans les API routes

### Fichiers uploadés
- Les fichiers uploadés (images) doivent être stockés ailleurs en production
- Options gratuites :
  - **Cloudinary** (gratuit jusqu'à 25GB)
  - **AWS S3** (gratuit jusqu'à 5GB)
  - **Supabase Storage** (gratuit jusqu'à 1GB)

---

## 🎯 Recommandation Finale

**Pour votre cas (Next.js + Python ML) :**

1. **Railway** (Meilleur choix)
   - Supporte tout nativement
   - Facile à configurer
   - $5 crédit gratuit

2. **Render** (Alternative)
   - 750h gratuites
   - S'endort après inactivité (mais gratuit)

3. **Vercel** (Non recommandé)
   - Trop limité pour Python/ML
   - Timeout trop court

---

## 📝 Checklist de Déploiement

- [ ] Code sur GitHub
- [ ] Base de données Neon configurée
- [ ] Variables d'environnement préparées
- [ ] NEXTAUTH_SECRET généré
- [ ] Migrations Prisma à jour
- [ ] Modèles ML dans `public/models/`
- [ ] Scripts Python testés localement
- [ ] `.env` configuré (ne pas commiter)
- [ ] Déployé sur Railway/Render
- [ ] Testé l'application en production
- [ ] Configuré le stockage des fichiers (Cloudinary/S3)

---

## 🆘 Dépannage

### Erreur : "Cannot find module 'xgboost'"
- Ajouter Python dans le build : `pip3 install xgboost numpy pandas scikit-learn joblib`

### Erreur : "Database connection failed"
- Vérifier `DATABASE_URL` dans les variables d'environnement
- Vérifier que Neon autorise les connexions depuis l'IP de Railway/Render

### Erreur : "Prisma Client not generated"
- Ajouter dans le build : `npx prisma generate`
- Ou : `npm install && npx prisma generate && npm run build`

### L'app s'endort (Render gratuit)
- C'est normal sur le plan gratuit
- Attendre 30-60 secondes au premier accès
- Ou passer au plan payant pour éviter ça

---

## 🔗 Liens Utiles

- **Railway** : https://railway.app
- **Render** : https://render.com
- **Vercel** : https://vercel.com
- **Neon** : https://neon.tech
- **Cloudinary** (stockage images) : https://cloudinary.com

---

## 💡 Astuce Pro

Pour éviter les problèmes de Python sur les plateformes, vous pourriez :
1. Convertir les modèles ML en API séparée (FastAPI sur Railway)
2. Utiliser des services ML comme Hugging Face Inference API
3. Utiliser des edge functions pour les prédictions simples

Mais pour commencer, Railway ou Render avec Python intégré fonctionne très bien ! 🚀
