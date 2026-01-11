# 🚀 Prochaines Étapes - Mise en Place du Backend

## 📋 Checklist Complète

### ✅ Étape 1 : Installation des Dépendances

```bash
cd "/Users/admin/Downloads/nettoyage ML/application/livedoc"

# Installer Prisma et dépendances
npm install prisma @prisma/client
npm install next-auth
npm install zod bcryptjs
npm install @types/bcryptjs --save-dev
```

### ✅ Étape 2 : Configuration Base de Données

#### Option A : PostgreSQL Local
```bash
# Installer PostgreSQL (si pas déjà fait)
brew install postgresql@14  # macOS

# Démarrer PostgreSQL
brew services start postgresql@14

# Créer la base de données
createdb systeme_medical_ia
```

#### Option B : Supabase (Cloud, Gratuit)
1. Aller sur https://supabase.com
2. Créer un compte gratuit
3. Créer un nouveau projet
4. Copier la connection string

#### Option C : Railway (Cloud, Gratuit avec crédits)
1. Aller sur https://railway.app
2. Créer un compte
3. Créer une base PostgreSQL
4. Copier la connection string

### ✅ Étape 3 : Configuration .env

Créer le fichier `.env` à la racine du projet :

```env
# Database
NEXT_PUBLIC_SUPABASE_URL=https://saavwzburaouebmciwhd.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=sb_publishable_za0aVdQ5_81hF0aPH1zQJg_vHw76znX
# NextAuth.js
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="votre-secret-ici"  # Générer avec: openssl rand -base64 32

# Application
NODE_ENV="development"
```

### ✅ Étape 4 : Générer Prisma Client et Migrations

```bash
# Générer le client Prisma
npx prisma generate

# Créer la première migration
npx prisma migrate dev --name init

# (Optionnel) Ouvrir Prisma Studio pour voir la BD
npx prisma studio
```

### ✅ Étape 5 : Créer le Client Prisma

Créer `lib/prisma.ts` :

```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

### ✅ Étape 6 : Configuration NextAuth.js

Créer `app/api/auth/[...nextauth]/route.ts` pour l'authentification.

### ✅ Étape 7 : Créer les API Routes

Créer les routes API pour :
- `/api/auth/*` - Authentification
- `/api/patients` - Gestion patients
- `/api/consultations` - Gestion consultations
- `/api/visites` - Gestion visites
- `/api/predictions` - Prédictions IA (diabète, rénal, cardio)
- `/api/predict` - Prédiction tuberculose (déjà existante)
- `/api/validations` - Validations médicales

### ✅ Étape 8 : Créer les Pages de Gestion

- Page d'enregistrement patient
- Page salle d'attente
- Page consultation
- Page saisie données cliniques
- Page résultats prédictions
- Page validation médicale

## 🎯 Ordre Recommandé d'Implémentation

### Phase 1 : Setup (Maintenant)
1. ✅ Installer dépendances
2. ✅ Configurer PostgreSQL
3. ✅ Créer .env
4. ✅ Générer Prisma client
5. ✅ Créer migrations

### Phase 2 : Authentification (Priorité 1)
1. Configurer NextAuth.js
2. Créer API routes login/register
3. Protéger les routes
4. Tester l'authentification

### Phase 3 : Gestion Patients (Priorité 2)
1. API CRUD patients
2. Page enregistrement patient
3. Liste patients
4. Recherche patients

### Phase 4 : Salle d'Attente (Priorité 3)
1. API salle d'attente
2. Page salle d'attente
3. Gestion statuts
4. Triage

### Phase 5 : Consultations & Visites (Priorité 4)
1. API consultations
2. API visites
3. Page consultation
4. Saisie constantes vitales

### Phase 6 : Prédictions IA (Priorité 5)
1. API prédictions (diabète, rénal, cardio)
2. Intégrer modèles Python
3. Page résultats prédictions
4. Explicabilité

### Phase 7 : Validation & Suivi (Priorité 6)
1. API validations
2. Page validation médicale
3. API suivi médical
4. Page suivi

## 📝 Notes Importantes

- Commencez par l'authentification (base de tout)
- Testez chaque étape avant de passer à la suivante
- Utilisez Prisma Studio pour vérifier les données
- Gardez les migrations à jour

## 🐛 En cas de problème

- Vérifier `.env` et `DATABASE_URL`
- Vérifier que PostgreSQL tourne
- Vérifier les logs : `npx prisma migrate dev --name init`
- Utiliser Prisma Studio pour inspecter la BD

