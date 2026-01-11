#!/usr/bin/env python3
"""
Exemple d'utilisation du modèle dans une application
"""

from load_model import TuberculosisPredictor

# Initialiser le prédicteur
predictor = TuberculosisPredictor("app_model")

# Exemple 1 : Prédire une seule image
image_path = "test_image.png"
prediction, probability = predictor.predict(image_path, return_probability=True)

print(f"📸 Image : {image_path}")
print(f"🔍 Prédiction : {prediction}")
print(f"📊 Probabilité de TB : {probability:.2%}")

# Exemple 2 : Prédire plusieurs images
image_paths = ["image1.png", "image2.png", "image3.png"]
results = predictor.predict_batch(image_paths)

for img_path, (pred, prob) in zip(image_paths, results):
    print(f"{img_path} : {pred} ({prob:.2%})")
