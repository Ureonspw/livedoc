# ✅ Schéma Final - Tous les Modèles IA Intégrés

## 🎯 Ce qui a été fait

J'ai créé un schéma Prisma complet qui respecte **votre structure SQL originale** tout en ajoutant :

### ✅ Tous les Modèles IA Supportés

1. **Diabète** - Prédiction basée sur données cliniques
2. **Maladie Rénale** - Prédiction basée sur données cliniques  
3. **Cardiovasculaire** - Prédiction basée sur données cliniques
4. **Tuberculose** - Prédiction basée sur images radiographie

### ✅ Structure Respectée

- ✅ Table `visite` conservée (comme dans votre SQL)
- ✅ Toutes vos tables originales présentes
- ✅ Relations identiques à votre schéma SQL

### ✅ Champs Complets des Datasets

#### Dataset Diabète (8 champs) ✅
- nombre_grossesses
- taux_glucose
- pression_arterielle
- epaisseur_pli_cutane
- taux_insuline
- imc
- fonction_pedigree_diabete
- age

#### Dataset Maladie Rénale (22 champs) ✅
- uree_sanguine, creatinine_serique, sodium, potassium
- hemoglobine, volume_cellulaire_packe
- globules_blancs, globules_rouges
- **+ 14 champs ajoutés** : gravite_specifique, albumine, sucre, globules_rouges_urine, pus_cells, pus_cells_clumps, bacteries, glucose_sang, hypertension, diabete_mellitus, maladie_coronaire, appetit, oedeme_pieds, anemie

#### Dataset Cardiovasculaire (12 champs) ✅
- cholesterol, pression_systolique, pression_diastolique
- fumeur, consommation_alcool, activite_physique
- **+ 4 champs ajoutés** : genre, taille_cm, poids_kg, glucose_cardio

#### Dataset Tuberculose ✅
- Table `ImageRadiographie` pour stocker les images
- Champs spécifiques dans `PredictionIA` : interpretation, recommendation, features_detected, niveau_confiance

### ✅ Tables Ajoutées (Améliorations)

1. **ImageRadiographie** - Pour les radiographies tuberculose
2. **Validation** - Validation médicale des prédictions
3. **ActivityLog** - Journalisation (sécurité médicale)

## 📊 Workflow Complet

```
Patient 
  ↓
Salle d'attente (statut: EN_ATTENTE)
  ↓
Consultation (médecin appelle le patient)
  ↓
Visite (point central pour données IA)
  ↓
├─→ ConstantesVitales (température, tension, etc.)
├─→ DonneesCliniquesIA (pour Diabète, Rénal, Cardio)
└─→ ImageRadiographie (pour Tuberculose)
  ↓
PredictionIA (résultat des 4 modèles)
  ↓
├─→ ExplicabiliteIA (SHAP/LIME)
└─→ Validation (médecin valide/rejette)
  ↓
SuiviMedical (traitement, recommandations)
```

## 🔑 Points Clés

### Table `Visite` = Point Central
- Une visite = une session de collecte de données
- Lie consultation → données → prédictions
- Permet d'avoir plusieurs prédictions pour une même consultation

### Table `DonneesCliniquesIA`
- **Contient TOUS les champs** pour les 3 modèles (Diabète, Rénal, Cardio)
- Champs optionnels (peuvent être NULL)
- Un seul enregistrement par visite

### Table `PredictionIA`
- Supporte les **4 modèles** via enum `MaladiePredite`
- Champs spécifiques tuberculose : interpretation, recommendation, features_detected
- Peut avoir plusieurs prédictions par visite (ex: diabète + cardio)

### Table `ImageRadiographie`
- Spécifique à la tuberculose
- Stocke le chemin du fichier (pas le fichier lui-même)
- Une visite peut avoir plusieurs images

## 📝 Exemple d'Enregistrement

### Pour Diabète/Rénal/Cardio :
```typescript
// 1. Créer visite
const visite = await prisma.visite.create({
  data: { id_consultation: 1, date_visite: new Date() }
})

// 2. Enregistrer données cliniques
await prisma.donneesCliniquesIA.create({
  data: {
    id_visite: visite.id_visite,
    // Champs diabète
    taux_glucose: 148.0,
    nombre_grossesses: 2,
    // Champs rénal
    creatinine_serique: 1.2,
    uree_sanguine: 36.0,
    // Champs cardio
    cholesterol: 200.0,
    fumeur: false,
    // ... autres champs
  }
})

// 3. Faire prédiction (via API Python)
// 4. Enregistrer prédiction
await prisma.predictionIA.create({
  data: {
    id_visite: visite.id_visite,
    maladie_predite: 'DIABETE',
    probabilite: 0.8234,
    seuil_utilise: 0.5,
  }
})
```

### Pour Tuberculose :
```typescript
// 1. Créer visite
const visite = await prisma.visite.create({
  data: { id_consultation: 1, date_visite: new Date() }
})

// 2. Uploader image
const image = await prisma.imageRadiographie.create({
  data: {
    id_visite: visite.id_visite,
    nom_fichier: 'radio.png',
    chemin_fichier: '/uploads/radio.png',
  }
})

// 3. Faire prédiction (via /api/predict existant)
// 4. Enregistrer prédiction
await prisma.predictionIA.create({
  data: {
    id_visite: visite.id_visite,
    id_image: image.id_image,
    maladie_predite: 'TUBERCULOSE',
    probabilite: 0.9237,
    seuil_utilise: 0.12,
    niveau_confiance: 'Élevée',
    interpretation: 'Forte probabilité de tuberculose',
    recommendation: 'Consultation médicale recommandée',
    features_detected: {
      features: ['Opacités pulmonaires', 'Cavités']
    },
  }
})
```

## ✅ Checklist Finale

- [x] Structure SQL originale respectée
- [x] Table `visite` conservée
- [x] Tous les champs dataset Diabète
- [x] Tous les champs dataset Maladie Rénale (22 champs)
- [x] Tous les champs dataset Cardiovasculaire (12 champs)
- [x] Support tuberculose avec images
- [x] Validation médicale
- [x] Journalisation
- [x] Relations correctes
- [x] Index optimisés

## 🚀 Prochaines Étapes

1. Installer Prisma : `npm install prisma @prisma/client`
2. Configurer `.env` avec `DATABASE_URL`
3. Générer client : `npx prisma generate`
4. Créer migration : `npx prisma migrate dev --name init`
5. Créer les API routes pour chaque modèle IA

Le schéma est **complet et prêt** pour tous vos modèles IA ! 🎉

