# 🔬 Intégration du Modèle de Prédiction de Tuberculose

## 📋 Prérequis

Pour utiliser la fonctionnalité de prédiction, vous devez installer les dépendances Python suivantes :

```bash
pip install tensorflow pillow numpy
```

### Versions recommandées
- TensorFlow >= 2.10
- Pillow >= 8.0
- NumPy >= 1.20

## 📁 Structure des fichiers

```
application/livedoc/
├── app/
│   ├── api/
│   │   └── predict/
│   │       └── route.ts          # API route Next.js
│   └── prediction-tuberculose/
│       └── page.tsx              # Page de prédiction
├── scripts/
│   └── predict.py                # Script Python pour les prédictions
├── public/
│   └── models/
│       └── app_model/            # Modèle entraîné
│           ├── model.h5          # Modèle Keras
│           ├── model_info.json   # Informations du modèle
│           └── load_model.py     # Classe de chargement
└── temp/                          # Dossier temporaire (créé automatiquement)
```

## 🚀 Utilisation

1. **Démarrer le serveur Next.js** :
   ```bash
   npm run dev
   ```

2. **Accéder à la page de prédiction** :
   - URL : `http://localhost:3000/prediction-tuberculose`

3. **Télécharger des images** :
   - Glissez-déposez des images ou cliquez pour sélectionner
   - Formats acceptés : JPG, PNG, DICOM
   - Vous pouvez sélectionner plusieurs images ou un dossier entier

4. **Lancer l'analyse** :
   - Cliquez sur "Lancer l'analyse IA"
   - Les images seront traitées séquentiellement
   - Les résultats s'afficheront avec les probabilités et explications

## 🔧 Fonctionnement technique

### Flux de données

1. **Frontend** (`page.tsx`) :
   - L'utilisateur télécharge des images
   - Les images sont envoyées à l'API via `FormData`

2. **API Route** (`route.ts`) :
   - Reçoit l'image via `POST /api/predict`
   - Sauvegarde temporairement l'image
   - Exécute le script Python `predict.py`
   - Retourne le résultat JSON

3. **Script Python** (`predict.py`) :
   - Charge le modèle depuis `app_model/`
   - Prétraite l'image (redimensionnement 224x224, preprocessing MobileNetV2)
   - Fait la prédiction
   - Retourne le résultat en JSON

4. **Modèle** (`load_model.py`) :
   - Classe `TuberculosisPredictor` pour charger et utiliser le modèle
   - Threshold optimal : 0.12
   - Image size : 224x224 pixels

## 📊 Format de réponse

```json
{
  "success": true,
  "prediction": 1,  // 1 = Tuberculose, 0 = Normal
  "probability": 0.85,
  "confidence": 0.85,
  "label": "Tuberculosis",
  "details": {
    "probability": 0.85,
    "explanation": "Signes de tuberculose détectés...",
    "features": ["Opacités pulmonaires", "Cavités", ...]
  }
}
```

## ⚠️ Notes importantes

1. **Performance** :
   - Le chargement du modèle prend quelques secondes au premier appel
   - Les prédictions suivantes sont plus rapides
   - Pour de meilleures performances, considérez un service Python dédié (Flask/FastAPI)

2. **Sécurité** :
   - Les fichiers temporaires sont automatiquement supprimés après traitement
   - Le dossier `temp/` est créé automatiquement

3. **Erreurs** :
   - Vérifiez que Python 3 est installé et accessible via `python3`
   - Vérifiez que TensorFlow est installé
   - Vérifiez que le modèle est présent dans `public/models/app_model/`

## 🐛 Dépannage

### Erreur : "python3: command not found"
- Installez Python 3 ou utilisez `python` au lieu de `python3`
- Modifiez `route.ts` ligne 43 pour utiliser `python` si nécessaire

### Erreur : "ModuleNotFoundError: No module named 'tensorflow'"
- Installez TensorFlow : `pip install tensorflow`

### Erreur : "FileNotFoundError: model.h5"
- Vérifiez que le modèle est bien copié dans `public/models/app_model/`
- Vérifiez les chemins dans `route.ts`

### Le modèle ne charge pas
- Vérifiez les logs du serveur Next.js
- Vérifiez que `load_model.py` est présent dans `public/models/app_model/`

## 🔄 Améliorations futures

- [ ] Service Python dédié (Flask/FastAPI) pour de meilleures performances
- [ ] Cache du modèle pour éviter de le recharger à chaque requête
- [ ] Support batch pour traiter plusieurs images en parallèle
- [ ] Conversion en TensorFlow.js pour exécution côté client
- [ ] Interface d'explicabilité avancée (Grad-CAM, SHAP)

