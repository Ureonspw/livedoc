# 🚀 Guide de Migration - Schéma Prisma

## 📋 Résumé des corrections

Votre schéma SQL était bon dans l'ensemble, mais il manquait :
- ✅ Prédiction tuberculose (déjà dans l'app mais pas en BD)
- ✅ 14 champs du dataset maladie rénale
- ✅ 4 champs du dataset cardiovasculaire
- ✅ Table pour images radiographie
- ✅ Table validation médicale
- ✅ Table journalisation (activity logs)
- ✅ Numéro de dossier patient unique
- ✅ Statuts et priorités manquants

## 🔧 Installation

```bash
# Installer Prisma
npm install prisma @prisma/client

# Initialiser Prisma (déjà fait, mais au cas où)
npx prisma init
```

## 🗄️ Configuration Base de Données

### Option 1 : PostgreSQL Local
```bash
# Installer PostgreSQL
brew install postgresql@14  # macOS
# ou
sudo apt-get install postgresql  # Linux

# Créer la base de données
createdb systeme_medical_ia

# Configurer .env
DATABASE_URL="postgresql://votre_user:votre_password@localhost:5432/systeme_medical_ia?schema=public"
```

### Option 2 : Supabase (Gratuit, Cloud)
1. Aller sur https://supabase.com
2. Créer un compte gratuit
3. Créer un nouveau projet
4. Copier la connection string dans `.env`

### Option 3 : Railway (Gratuit avec crédits)
1. Aller sur https://railway.app
2. Créer un compte
3. Créer une base PostgreSQL
4. Copier la connection string

## 🚀 Migration

```bash
# 1. Générer le client Prisma
npx prisma generate

# 2. Créer la migration
npx prisma migrate dev --name init

# 3. (Optionnel) Voir la base de données
npx prisma studio
```

## 📊 Vérification

Après la migration, vous devriez avoir ces tables :
- ✅ utilisateur
- ✅ patient
- ✅ salle_attente
- ✅ consultation
- ✅ constantes_vitales
- ✅ donnees_cliniques_ia
- ✅ image_radiographie
- ✅ prediction_ia
- ✅ explicabilite_ia
- ✅ validation
- ✅ suivi_medical
- ✅ activity_log

## 🔄 Utilisation dans le code

```typescript
// lib/prisma.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

```typescript
// Exemple d'utilisation
import { prisma } from '@/lib/prisma'

// Créer un patient
const patient = await prisma.patient.create({
  data: {
    numero_dossier: 'PAT-2025-0001',
    nom: 'Dupont',
    prenom: 'Jean',
    sexe: 'HOMME',
    date_naissance: new Date('1980-01-01'),
  }
})

// Créer une consultation
const consultation = await prisma.consultation.create({
  data: {
    id_patient: patient.id_patient,
    id_medecin: 1,
    motif: 'Toux persistante',
  }
})
```

## 📝 Notes importantes

1. **Numéro de dossier** : Format `PAT-YYYY-XXXX` (à générer automatiquement)
2. **Mots de passe** : Toujours hasher avec bcrypt avant stockage
3. **Images** : Stocker le chemin, pas le fichier dans la BD
4. **JSON** : Utilisé pour `features_detected` et `details` (flexible)
5. **Cascade** : Les suppressions en cascade sont configurées

## 🐛 Dépannage

### Erreur de connexion
```bash
# Vérifier que PostgreSQL tourne
pg_isready

# Vérifier la connection string dans .env
echo $DATABASE_URL
```

### Erreur de migration
```bash
# Réinitialiser (ATTENTION : supprime les données)
npx prisma migrate reset

# Ou créer une nouvelle migration
npx prisma migrate dev --name fix_schema
```

## ✅ Checklist

- [ ] PostgreSQL installé et configuré
- [ ] `.env` créé avec `DATABASE_URL`
- [ ] `npx prisma generate` exécuté
- [ ] `npx prisma migrate dev` exécuté
- [ ] Tables créées (vérifier avec `npx prisma studio`)
- [ ] Client Prisma importé dans le code

