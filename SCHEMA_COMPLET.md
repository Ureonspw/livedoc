# 📊 Schéma Complet - Tous les Modèles IA

## ✅ Modèles IA Supportés

1. **Diabète** - Prédiction basée sur données cliniques
2. **Maladie Rénale** - Prédiction basée sur données cliniques
3. **Cardiovasculaire** - Prédiction basée sur données cliniques
4. **Tuberculose** - Prédiction basée sur images radiographie

## 📋 Structure du Schéma

### Workflow Complet

```
Patient → Salle d'attente → Consultation → Visite → Données Cliniques → Prédiction IA
                                                      ↓
                                              Constantes Vitales
                                                      ↓
                                              Image Radiographie (si tuberculose)
                                                      ↓
                                              Prédiction IA
                                                      ↓
                                              Explicabilité IA
                                                      ↓
                                              Validation Médicale
                                                      ↓
                                              Suivi Médical
```

## 🗂️ Tables et leurs Rôles

### 1. **Utilisateur**
- Médecins, Infirmiers, Admins
- Authentification et autorisation

### 2. **Patient**
- Informations personnelles
- Réutilisables pour toutes les consultations

### 3. **SalleAttente**
- File d'attente des patients
- Statut : EN_ATTENTE, EN_CONSULTATION, TERMINE

### 4. **Consultation**
- Consultation médicale
- Lien patient ↔ médecin

### 5. **Visite** ⭐
- **Point central** : Lien entre consultation et toutes les données IA
- Une visite = une session de collecte de données pour prédiction

### 6. **ConstantesVitales**
- Mesures de base (température, tension, poids, taille, etc.)
- Liée à une visite

### 7. **DonneesCliniquesIA** ⭐
- **Toutes les données pour les 3 modèles** (Diabète, Rénal, Cardio)
- Champs organisés par dataset
- Liée à une visite

### 8. **ImageRadiographie**
- Images pour prédiction tuberculose
- Liée à une visite

### 9. **PredictionIA** ⭐
- **Prédictions pour les 4 modèles**
- Supporte :
  - Diabète (basé sur DonneesCliniquesIA)
  - Maladie Rénale (basé sur DonneesCliniquesIA)
  - Cardiovasculaire (basé sur DonneesCliniquesIA)
  - Tuberculose (basé sur ImageRadiographie)
- Champs spécifiques tuberculose : interpretation, recommendation, features_detected

### 10. **ExplicabiliteIA**
- Variables importantes pour chaque prédiction
- SHAP/LIME values

### 11. **Validation**
- Validation/rejet des prédictions par le médecin
- Diagnostic final

### 12. **SuiviMedical**
- Traitements et recommandations
- Suivi post-diagnostic

### 13. **ActivityLog**
- Journalisation de toutes les actions
- Audit trail

## 📊 Champs par Dataset

### Dataset Diabète ✅
Tous les champs présents dans `DonneesCliniquesIA` :
- nombre_grossesses
- taux_glucose
- pression_arterielle
- epaisseur_pli_cutane
- taux_insuline
- imc
- fonction_pedigree_diabete
- age

### Dataset Maladie Rénale ✅
Tous les champs présents dans `DonneesCliniquesIA` :
- uree_sanguine (bu)
- creatinine_serique (sc)
- sodium (sod)
- potassium (pot)
- hemoglobine (hemo)
- volume_cellulaire_packe (pcv)
- globules_blancs (wc)
- globules_rouges (rc)
- gravite_specifique (sg)
- albumine (al)
- sucre (su)
- globules_rouges_urine (rbc)
- pus_cells (pc)
- pus_cells_clumps (pcc)
- bacteries (ba)
- glucose_sang (bgr)
- hypertension (htn)
- diabete_mellitus (dm)
- maladie_coronaire (cad)
- appetit
- oedeme_pieds (pe)
- anemie (ane)

### Dataset Cardiovasculaire ✅
Tous les champs présents dans `DonneesCliniquesIA` :
- cholesterol
- pression_systolique (ap_hi)
- pression_diastolique (ap_lo)
- fumeur (smoke)
- consommation_alcool (alco)
- activite_physique (active)
- genre (gender)
- taille_cm (height)
- poids_kg (weight)
- glucose_cardio (gluc)

### Dataset Tuberculose ✅
- Images stockées dans `ImageRadiographie`
- Prédictions dans `PredictionIA` avec champs spécifiques :
  - interpretation
  - recommendation
  - features_detected (JSON)
  - niveau_confiance

## 🔄 Exemples d'Utilisation

### Créer une visite avec prédiction Diabète
```typescript
// 1. Créer la visite
const visite = await prisma.visite.create({
  data: {
    id_consultation: consultationId,
    date_visite: new Date(),
  }
})

// 2. Enregistrer les données cliniques
const donnees = await prisma.donneesCliniquesIA.create({
  data: {
    id_visite: visite.id_visite,
    nombre_grossesses: 2,
    taux_glucose: 148.0,
    pression_arterielle: 72.0,
    // ... autres champs diabète
  }
})

// 3. Faire la prédiction (via API Python)
// 4. Enregistrer la prédiction
const prediction = await prisma.predictionIA.create({
  data: {
    id_visite: visite.id_visite,
    maladie_predite: 'DIABETE',
    probabilite: 0.8234,
    seuil_utilise: 0.5,
  }
})
```

### Créer une visite avec prédiction Tuberculose
```typescript
// 1. Créer la visite
const visite = await prisma.visite.create({
  data: {
    id_consultation: consultationId,
    date_visite: new Date(),
  }
})

// 2. Uploader l'image
const image = await prisma.imageRadiographie.create({
  data: {
    id_visite: visite.id_visite,
    nom_fichier: 'radiographie.png',
    chemin_fichier: '/uploads/radiographie.png',
    taille_fichier: 1024000,
  }
})

// 3. Faire la prédiction (via API existante /api/predict)
// 4. Enregistrer la prédiction
const prediction = await prisma.predictionIA.create({
  data: {
    id_visite: visite.id_visite,
    id_image: image.id_image,
    maladie_predite: 'TUBERCULOSE',
    probabilite: 0.9237,
    seuil_utilise: 0.12,
    niveau_confiance: 'Élevée',
    interpretation: 'Forte probabilité de tuberculose détectée',
    recommendation: 'Consultation médicale recommandée',
    features_detected: {
      features: ['Opacités pulmonaires', 'Cavités', 'Adénopathies']
    },
    model_version: 'best_model_tb_final.h5',
  }
})
```

## ✅ Points Clés

1. **Table Visite** : Point central qui lie consultation → données → prédictions
2. **DonneesCliniquesIA** : Contient TOUS les champs pour les 3 modèles (diabète, rénal, cardio)
3. **ImageRadiographie** : Spécifique à la tuberculose
4. **PredictionIA** : Supporte les 4 modèles avec champs spécifiques pour tuberculose
5. **Tous les champs des datasets** sont présents et mappés correctement

## 🎯 Avantages de cette Structure

- ✅ **Flexible** : Peut ajouter de nouveaux modèles facilement
- ✅ **Complet** : Tous les champs des datasets sont présents
- ✅ **Normalisé** : Pas de redondance
- ✅ **Traçable** : Toutes les actions sont journalisées
- ✅ **Validable** : Les médecins peuvent valider/rejeter les prédictions

