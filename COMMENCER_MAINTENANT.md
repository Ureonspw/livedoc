# 🚀 Commencer Maintenant - Guide Rapide

## ✅ Ce qui est déjà fait
- ✅ Schéma Prisma créé
- ✅ Dépendances installées (Prisma, NextAuth, etc.)
- ✅ Client Prisma créé (`lib/prisma.ts`)

## 🎯 Prochaines Actions (Dans l'ordre)

### 1️⃣ Configurer la Base de Données (5 min)

**Option A : Supabase (Recommandé - Gratuit, Cloud)**
1. Aller sur https://supabase.com
2. Créer un compte gratuit
3. Créer un nouveau projet
4. Settings → Database → Connection string
5. Copier la string (elle ressemble à : `postgresql://postgres:[PASSWORD]@db.xxx.supabase.co:5432/postgres`)

**Option B : PostgreSQL Local**
```bash
# Installer PostgreSQL
brew install postgresql@14

# Démarrer
brew services start postgresql@14

# Créer la base
createdb systeme_medical_ia
```

### 2️⃣ Créer le fichier .env (2 min)

Créer `.env` à la racine du projet :

```env
# Database (remplacer par votre connection string)
DATABASE_URL="postgresql://user:password@localhost:5432/systeme_medical_ia?schema=public"

# NextAuth.js
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="votre-secret-ici"

# Générer le secret avec :
# openssl rand -base64 32
```

### 3️⃣ Générer Prisma et Créer les Tables (2 min)

```bash
cd "/Users/admin/Downloads/nettoyage ML/application/livedoc"

# Générer le client Prisma
npx prisma generate

# Créer toutes les tables dans la base de données
npx prisma migrate dev --name init
```

### 4️⃣ Vérifier que ça marche (1 min)

```bash
# Ouvrir Prisma Studio (interface graphique)
npx prisma studio
```

Cela ouvrira http://localhost:5555 - vous devriez voir toutes vos tables !

## ✅ Checklist

- [ ] Base de données configurée (Supabase ou PostgreSQL local)
- [ ] Fichier `.env` créé avec `DATABASE_URL`
- [ ] `NEXTAUTH_SECRET` généré et ajouté
- [ ] `npx prisma generate` exécuté ✅
- [ ] `npx prisma migrate dev --name init` exécuté ✅
- [ ] Tables visibles dans Prisma Studio ✅

## 🎉 Une fois ces étapes terminées

Vous pourrez :
- ✅ Créer des utilisateurs
- ✅ Enregistrer des patients
- ✅ Créer des consultations
- ✅ Faire des prédictions IA
- ✅ Tout stocker en base de données

## 🆘 Besoin d'aide ?

Si vous avez une erreur :
1. Vérifier que PostgreSQL tourne (si local)
2. Vérifier que `DATABASE_URL` est correct dans `.env`
3. Vérifier les logs de `npx prisma migrate dev`

## 📝 Commandes à Retenir

```bash
# Générer le client Prisma (après modification du schéma)
npx prisma generate

# Créer une nouvelle migration
npx prisma migrate dev --name nom_migration

# Voir la base de données
npx prisma studio

# Réinitialiser la base (ATTENTION : supprime tout)
npx prisma migrate reset
```

