# 🏗️ Architecture Backend - LIVEDOC

## 📋 Recommandation

### **Backend : API Routes Next.js** ✅
- **Avantages** :
  - Déjà en place (API `/api/predict`)
  - Intégration native avec Next.js
  - Pas de serveur séparé à gérer
  - Déploiement simplifié
  - TypeScript natif

### **Base de Données : PostgreSQL** ✅
- **Avantages** :
  - Relationnelle, adaptée aux données médicales structurées
  - Transactions ACID (critique pour données médicales)
  - Conformité RGPD facilitée
  - Performance élevée
  - Support JSON pour données flexibles
  - Open source et robuste

### **ORM : Prisma** ✅
- **Avantages** :
  - Excellent avec Next.js
  - Type-safe (TypeScript)
  - Migrations automatiques
  - Excellent DX (Developer Experience)
  - Support PostgreSQL natif

### **Authentification : NextAuth.js** ✅
- **Avantages** :
  - Intégration native Next.js
  - Support multiple providers
  - Gestion de sessions
  - Sécurité intégrée

## 📊 Schéma de Base de Données

### Tables Principales

#### 1. **Users** (Utilisateurs)
```sql
- id (UUID, PK)
- email (String, unique)
- password_hash (String, hashed)
- nom (String)
- prenom (String)
- role (Enum: MEDECIN, PERSONNEL, ADMINISTRATEUR)
- status (Enum: ACTIVE, INACTIVE, SUSPENDED)
- created_at (DateTime)
- updated_at (DateTime)
- last_login (DateTime)
```

#### 2. **Patients** (Patients)
```sql
- id (UUID, PK)
- numero_dossier (String, unique)
- nom (String)
- prenom (String)
- date_naissance (Date)
- sexe (Enum: M, F)
- telephone (String, optional)
- adresse (String, optional)
- created_at (DateTime)
- updated_at (DateTime)
```

#### 3. **Consultations** (Consultations médicales)
```sql
- id (UUID, PK)
- patient_id (UUID, FK -> Patients)
- medecin_id (UUID, FK -> Users)
- date_consultation (DateTime)
- symptomes (Text)
- constantes_vitales (JSON)
- notes_medecin (Text, optional)
- status (Enum: EN_ATTENTE, EN_COURS, TERMINEE, ANNULEE)
- created_at (DateTime)
- updated_at (DateTime)
```

#### 4. **Predictions** (Résultats IA)
```sql
- id (UUID, PK)
- consultation_id (UUID, FK -> Consultations)
- image_path (String)
- prediction (Integer: 0=Normal, 1=Tuberculosis)
- probability (Float)
- confidence (Float)
- confidence_level (String)
- threshold (Float)
- interpretation (Text)
- recommendation (Text, optional)
- features_detected (JSON)
- model_version (String)
- created_at (DateTime)
```

#### 5. **Validations** (Validations médicales)
```sql
- id (UUID, PK)
- prediction_id (UUID, FK -> Predictions)
- medecin_id (UUID, FK -> Users)
- validation_status (Enum: VALIDE, REJETE, MODIFIE)
- commentaire (Text, optional)
- diagnostic_final (String, optional)
- created_at (DateTime)
```

#### 6. **ActivityLogs** (Journalisation)
```sql
- id (UUID, PK)
- user_id (UUID, FK -> Users)
- action (String)
- entity_type (String)
- entity_id (UUID)
- details (JSON)
- ip_address (String)
- created_at (DateTime)
```

## 🔐 Sécurité

### Chiffrement
- Mots de passe : bcrypt (NextAuth.js)
- Données sensibles : Chiffrement au niveau application si nécessaire
- HTTPS obligatoire en production

### Conformité
- RGPD : Anonymisation possible des données
- Audit trail : Toutes les actions journalisées
- Accès contrôlé par rôles

## 🚀 Plan d'Implémentation

### Phase 1 : Setup (Maintenant)
1. Installer Prisma
2. Configurer PostgreSQL
3. Créer le schéma Prisma
4. Générer les migrations

### Phase 2 : Authentification
1. Installer NextAuth.js
2. Configurer les providers
3. Créer les API routes d'auth
4. Protéger les routes

### Phase 3 : CRUD Utilisateurs
1. API routes pour users
2. Validation avec Zod
3. Gestion des rôles

### Phase 4 : Gestion Patients
1. API routes pour patients
2. Numérotation automatique des dossiers
3. Recherche et filtres

### Phase 5 : Consultations & Prédictions
1. Lier les prédictions aux consultations
2. Historique des prédictions
3. Validation médicale

### Phase 6 : Journalisation
1. Middleware de logging
2. Dashboard d'audit
3. Rapports

## 📦 Dépendances à Installer

```bash
npm install @prisma/client prisma
npm install next-auth
npm install zod
npm install bcryptjs
npm install @types/bcryptjs
```

## 🔄 Alternatives Considérées

### Base de Données
- ❌ MongoDB : Moins adapté pour données relationnelles médicales
- ❌ SQLite : Pas assez robuste pour production
- ✅ PostgreSQL : Meilleur choix

### Backend
- ❌ Express.js séparé : Complexité inutile
- ❌ FastAPI (Python) : Déjà du Python pour ML, mais Next.js suffit
- ✅ API Routes Next.js : Optimal

### ORM
- ❌ TypeORM : Plus verbeux
- ❌ Drizzle : Plus récent mais moins mature
- ✅ Prisma : Meilleur DX et support Next.js

## 📝 Notes

- PostgreSQL peut être hébergé sur :
  - Supabase (gratuit jusqu'à 500MB)
  - Railway (gratuit avec crédits)
  - Neon (gratuit jusqu'à 512MB)
  - Local pour développement

- Pour la production, considérer :
  - Backup automatique
  - Réplication
  - Monitoring
  - Scaling horizontal si nécessaire

