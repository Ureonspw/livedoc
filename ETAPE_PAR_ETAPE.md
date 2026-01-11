# 📝 Guide Étape par Étape - Démarrage Rapide

## 🚀 Étape 1 : Installation (5 minutes)

```bash
cd "/Users/admin/Downloads/nettoyage ML/application/livedoc"

# Installer toutes les dépendances
npm install prisma @prisma/client next-auth zod bcryptjs
npm install @types/bcryptjs --save-dev
```

## 🗄️ Étape 2 : Configuration PostgreSQL (10 minutes)

### Option Simple : Supabase (Recommandé pour débuter)

1. Aller sur https://supabase.com
2. Créer un compte (gratuit)
3. Créer un nouveau projet
4. Dans "Settings" → "Database", copier la connection string
5. Elle ressemble à : `postgresql://postgres:[PASSWORD]@db.xxx.supabase.co:5432/postgres`

### Ou PostgreSQL Local

```bash
# Installer PostgreSQL
brew install postgresql@14

# Démarrer
brew services start postgresql@14

# Créer la base
createdb systeme_medical_ia
```

## ⚙️ Étape 3 : Créer .env (2 minutes)

Créer le fichier `.env` à la racine :

```env
DATABASE_URL="postgresql://user:password@localhost:5432/systeme_medical_ia?schema=public"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="générer-avec-openssl-rand-base64-32"
```

Pour générer le secret :
```bash
openssl rand -base64 32
```

## 🔧 Étape 4 : Générer Prisma (2 minutes)

```bash
# Générer le client Prisma
npx prisma generate

# Créer la migration (créera toutes les tables)
npx prisma migrate dev --name init
```

Si tout va bien, vous verrez :
```
✅ Migration created and applied successfully.
```

## ✅ Étape 5 : Vérifier (1 minute)

```bash
# Ouvrir Prisma Studio pour voir les tables
npx prisma studio
```

Cela ouvrira http://localhost:5555 dans votre navigateur.

## 🎯 Étape 6 : Tester la Connexion (2 minutes)

Créer un fichier de test `test-db.ts` :

```typescript
import { prisma } from './lib/prisma'

async function test() {
  try {
    await prisma.$connect()
    console.log('✅ Connexion à la base de données réussie!')
    
    // Test simple
    const count = await prisma.utilisateur.count()
    console.log(`Nombre d'utilisateurs: ${count}`)
    
    await prisma.$disconnect()
  } catch (error) {
    console.error('❌ Erreur:', error)
  }
}

test()
```

Exécuter :
```bash
npx tsx test-db.ts
```

## 📋 Résumé des Commandes

```bash
# 1. Installation
npm install prisma @prisma/client next-auth zod bcryptjs @types/bcryptjs --save-dev

# 2. Générer client
npx prisma generate

# 3. Créer migration
npx prisma migrate dev --name init

# 4. Vérifier
npx prisma studio
```

## ✅ Checklist

- [ ] Dépendances installées
- [ ] PostgreSQL configuré (local ou Supabase)
- [ ] Fichier `.env` créé avec `DATABASE_URL`
- [ ] `npx prisma generate` exécuté avec succès
- [ ] `npx prisma migrate dev` exécuté avec succès
- [ ] Tables visibles dans Prisma Studio
- [ ] Test de connexion réussi

## 🎉 Une fois terminé

Vous pouvez commencer à créer les API routes ! Le schéma est prêt et la base de données est configurée.

## 🆘 En cas d'erreur

### Erreur : "Can't reach database server"
→ Vérifier que PostgreSQL tourne et que `DATABASE_URL` est correct

### Erreur : "Migration failed"
→ Vérifier les logs, peut-être que la base existe déjà

### Erreur : "Prisma schema validation"
→ Vérifier que le schéma Prisma est valide avec `npx prisma validate`

