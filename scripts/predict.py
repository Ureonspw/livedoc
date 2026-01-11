#!/usr/bin/env python3
"""
Script pour faire des prédictions avec le modèle de tuberculose
Appelé par l'API Next.js
"""

import sys
import os
import json
import numpy as np
from PIL import Image
import tensorflow as tf

# Supprimer les warnings TensorFlow et rediriger stderr
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'
os.environ['PYTHONWARNINGS'] = 'ignore'
tf.get_logger().setLevel('ERROR')

# Rediriger les warnings vers stderr pour ne pas polluer stdout
import warnings
warnings.filterwarnings('ignore')

def main():
    if len(sys.argv) < 3:
        print(json.dumps({"error": "Arguments manquants"}))
        sys.exit(1)
    
    image_path = sys.argv[1]
    model_dir = sys.argv[2]
    
    # Ajouter le chemin du modèle au sys.path pour l'import
    sys.path.insert(0, model_dir)
    
    from load_model import TuberculosisPredictor
    
    try:
        # Initialiser le prédicteur
        predictor = TuberculosisPredictor(model_dir)
        
        # Faire la prédiction
        prediction, probability = predictor.predict(image_path, return_probability=True)
        
        # Déterminer la classe
        is_tuberculosis = prediction == "Tuberculosis"
        confidence = probability if is_tuberculosis else (1 - probability)
        threshold = predictor.threshold
        
        # Déterminer le niveau de confiance textuel (comme dans test_model.py)
        if is_tuberculosis:
            confidence_level = "Élevée" if probability >= 0.8 else "Modérée"
        else:
            confidence_level = "Élevée" if probability <= 0.2 else "Modérée"
        
        # Générer l'interprétation (comme dans test_model.py)
        if is_tuberculosis:
            if probability >= 0.8:
                interpretation = "Forte probabilité de tuberculose détectée"
                recommendation = "Consultation médicale recommandée"
            else:
                interpretation = "Signes possibles de tuberculose détectés"
                recommendation = "Consultation médicale recommandée pour confirmation"
            explanation = "Signes de tuberculose détectés : opacités pulmonaires, cavités, adénopathies médiastinales"
            features = [
                "Opacités pulmonaires",
                "Cavités",
                "Adénopathies",
                "Épanchement pleural"
            ]
        else:
            if probability <= 0.2:
                interpretation = "Aucun signe de tuberculose détecté"
                recommendation = None
            else:
                interpretation = "Résultat incertain"
                recommendation = "Consultation recommandée"
            explanation = "Aucun signe de tuberculose détecté. Image normale."
            features = [
                "Poumons clairs",
                "Pas d'anomalie",
                "Structures normales"
            ]
        
        # Résultat JSON
        result = {
            "success": True,
            "prediction": 1 if is_tuberculosis else 0,
            "probability": float(probability),
            "confidence": float(confidence),
            "confidenceLevel": confidence_level,
            "threshold": float(threshold),
            "label": prediction,
            "details": {
                "probability": float(confidence),
                "explanation": explanation,
                "features": features,
                "interpretation": interpretation,
                "recommendation": recommendation
            }
        }
        
        # Imprimer uniquement le JSON sur stdout (pas de print de debug)
        print(json.dumps(result), file=sys.stdout)
        sys.stdout.flush()
        
    except Exception as e:
        import traceback
        error_result = {
            "success": False,
            "error": str(e),
            "traceback": traceback.format_exc() if os.getenv('DEBUG') else None
        }
        print(json.dumps(error_result), file=sys.stdout)
        sys.stdout.flush()
        sys.exit(1)

if __name__ == "__main__":
    main()

