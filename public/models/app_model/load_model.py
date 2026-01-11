#!/usr/bin/env python3
"""
Script pour charger le modèle et faire des prédictions
Usage dans votre application
"""

import tensorflow as tf
import numpy as np
from PIL import Image
from tensorflow.keras.models import load_model
from tensorflow.keras.applications.mobilenet_v2 import preprocess_input
import json
import os

class TuberculosisPredictor:
    """
    Classe pour charger et utiliser le modèle de détection de tuberculose
    """
    
    def __init__(self, model_dir="app_model"):
        """
        Initialise le prédicteur
        
        Args:
            model_dir: Dossier contenant les fichiers du modèle
        """
        self.model_dir = model_dir
        
        # Charger les informations
        info_path = os.path.join(model_dir, "model_info.json")
        with open(info_path, 'r') as f:
            self.info = json.load(f)
        
        # Charger le modèle
        model_path = os.path.join(model_dir, "model.h5")
        self.model = load_model(model_path, compile=False)
        self.model.compile(optimizer='adam', loss='binary_crossentropy', metrics=['accuracy'])
        
        # Paramètres
        self.img_size = tuple(self.info['img_size'])
        self.threshold = self.info['threshold']
        self.classes = self.info['classes']
        
        # Messages de debug vers stderr pour ne pas polluer stdout
        import sys
        print(f"✅ Modèle chargé depuis {model_dir}", file=sys.stderr)
        print(f"   Threshold : {self.threshold}", file=sys.stderr)
        print(f"   Image size : {self.img_size}", file=sys.stderr)
    
    def preprocess_image(self, image_path):
        """
        Prétraite une image pour la prédiction
        
        Args:
            image_path: Chemin vers l'image
            
        Returns:
            Image prétraitée (numpy array)
        """
        # Charger et redimensionner
        img = Image.open(image_path).convert('RGB')
        img = img.resize(self.img_size)
        
        # Convertir en array
        img_array = np.array(img)
        img_array = np.expand_dims(img_array, axis=0)
        
        # Preprocessing MobileNetV2
        img_array = preprocess_input(img_array)
        
        return img_array
    
    def predict(self, image_path, return_probability=False):
        """
        Prédit si une image contient de la tuberculose
        
        Args:
            image_path: Chemin vers l'image
            return_probability: Si True, retourne aussi la probabilité
            
        Returns:
            Si return_probability=False : "Normal" ou "Tuberculosis"
            Si return_probability=True : (prediction, probability)
        """
        # Preprocessing
        img_array = self.preprocess_image(image_path)
        
        # Prédiction
        proba = self.model.predict(img_array, verbose=0)[0][0]
        
        # Décision
        if proba >= self.threshold:
            prediction = "Tuberculosis"
        else:
            prediction = "Normal"
        
        if return_probability:
            return prediction, float(proba)
        else:
            return prediction
    
    def predict_batch(self, image_paths):
        """
        Prédit pour plusieurs images
        
        Args:
            image_paths: Liste de chemins vers les images
            
        Returns:
            Liste de tuples (prediction, probability)
        """
        results = []
        for img_path in image_paths:
            pred, prob = self.predict(img_path, return_probability=True)
            results.append((pred, prob))
        return results

# ===============================
# EXEMPLE D'UTILISATION
# ===============================
if __name__ == "__main__":
    # Initialiser le prédicteur
    predictor = TuberculosisPredictor("app_model")
    
    # Exemple : Prédire une image
    # image_path = "test_image.png"
    # prediction, probability = predictor.predict(image_path, return_probability=True)
    # print(f"Prédiction : {prediction}")
    # print(f"Probabilité de TB : {probability:.2%}")
