# 📱 Guide d'utilisation du modèle pour application

## 📁 Fichiers disponibles

Tous les fichiers nécessaires pour utiliser le modèle dans votre application sont dans ce dossier :

- **`model.h5`** : Modèle entraîné (format H5, compatible)
- **`model.keras`** : Modèle entraîné (format Keras moderne)
- **`model_info.json`** : Informations du modèle (JSON)
- **`model_info.pkl`** : Informations du modèle (Pickle)
- **`load_model.py`** : Script Python pour charger et utiliser le modèle
- **`example_usage.py`** : Exemple d'utilisation

---

## 🚀 Utilisation rapide

### Option 1 : Utiliser la classe TuberculosisPredictor

```python
from load_model import TuberculosisPredictor

# Initialiser
predictor = TuberculosisPredictor("app_model")

# Prédire une image
prediction, probability = predictor.predict("image.png", return_probability=True)

print(f"Prédiction : {prediction}")
print(f"Probabilité de TB : {probability:.2%}")
```

### Option 2 : Charger manuellement

```python
import tensorflow as tf
from tensorflow.keras.models import load_model
from tensorflow.keras.applications.mobilenet_v2 import preprocess_input
from PIL import Image
import numpy as np
import json

# Charger les informations
with open("app_model/model_info.json", 'r') as f:
    info = json.load(f)

# Charger le modèle
model = load_model("app_model/model.h5")

# Prétraiter une image
img = Image.open("image.png").convert('RGB')
img = img.resize(info['img_size'])
img_array = np.array(img)
img_array = np.expand_dims(img_array, axis=0)
img_array = preprocess_input(img_array)

# Prédire
proba = model.predict(img_array, verbose=0)[0][0]
prediction = "Tuberculosis" if proba >= info['threshold'] else "Normal"

print(f"Prédiction : {prediction} ({proba:.2%})")
```

---

## 📊 Informations du modèle

- **Image size** : 224x224 pixels
- **Threshold optimal** : 0.12
- **Classes** : Normal (0), Tuberculosis (1)
- **Format d'entrée** : RGB (3 canaux)
- **Format de sortie** : Probabilité (0-1)

---

## 🔧 Exigences

### Dépendances Python

```bash
pip install tensorflow pillow numpy
```

### Versions recommandées

- TensorFlow >= 2.10
- Pillow >= 8.0
- NumPy >= 1.20

---

## 💡 Exemples d'utilisation

### Exemple 1 : Application Flask

```python
from flask import Flask, request, jsonify
from load_model import TuberculosisPredictor

app = Flask(__name__)
predictor = TuberculosisPredictor("app_model")

@app.route('/predict', methods=['POST'])
def predict():
    file = request.files['image']
    file.save('temp_image.png')
    
    prediction, probability = predictor.predict('temp_image.png', return_probability=True)
    
    return jsonify({
        'prediction': prediction,
        'probability': float(probability),
        'confidence': 'high' if probability > 0.8 or probability < 0.2 else 'medium'
    })

if __name__ == '__main__':
    app.run(debug=True)
```

### Exemple 2 : Application Streamlit

```python
import streamlit as st
from load_model import TuberculosisPredictor
from PIL import Image

st.title("🔬 Détection de Tuberculose")

predictor = TuberculosisPredictor("app_model")

uploaded_file = st.file_uploader("Choisir une radiographie...", type=['png', 'jpg', 'jpeg'])

if uploaded_file is not None:
    image = Image.open(uploaded_file)
    st.image(image, caption='Image chargée', use_container_width=True)
    
    # Sauvegarder temporairement
    with open("temp_image.png", "wb") as f:
        f.write(uploaded_file.getbuffer())
    
    # Prédire
    prediction, probability = predictor.predict("temp_image.png", return_probability=True)
    
    st.write(f"**Prédiction :** {prediction}")
    st.write(f"**Probabilité de TB :** {probability:.2%}")
    
    if prediction == "Tuberculosis":
        st.warning("⚠️ Consultation médicale recommandée")
```

### Exemple 3 : Script simple

```python
from load_model import TuberculosisPredictor
import sys

if len(sys.argv) < 2:
    print("Usage: python predict.py <image_path>")
    sys.exit(1)

predictor = TuberculosisPredictor("app_model")
image_path = sys.argv[1]

prediction, probability = predictor.predict(image_path, return_probability=True)

print(f"Image : {image_path}")
print(f"Prédiction : {prediction}")
print(f"Probabilité de TB : {probability:.2%}")

if prediction == "Tuberculosis":
    print("⚠️ Consultation médicale recommandée")
```

---

## 📝 Notes importantes

1. **Format d'image** : Le modèle accepte PNG, JPG, JPEG
2. **Taille** : Les images sont automatiquement redimensionnées à 224x224
3. **Threshold** : 0.12 (optimisé pour meilleur Recall)
4. **Preprocessing** : Utilise `preprocess_input` de MobileNetV2

---

## ⚠️ Avertissement médical

Ce modèle est un **outil d'aide au diagnostic**, pas un diagnostic définitif :
- ✅ Consultation médicale toujours recommandée
- ✅ Les résultats doivent être interprétés par un professionnel
- ✅ Ne pas utiliser seul pour prendre des décisions médicales

---

## 🎯 Performance du modèle

- **AUC** : 0.9728
- **Precision** : 0.9208
- **Recall** : 0.8774
- **F1-Score** : 0.8986

---

## 📞 Support

Pour toute question sur l'utilisation du modèle, consultez :
- `load_model.py` : Code source de la classe
- `example_usage.py` : Exemples d'utilisation


