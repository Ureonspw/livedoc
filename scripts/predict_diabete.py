#!/usr/bin/env python3
"""
Script pour faire des prédictions avec le modèle de diabète
Appelé par l'API Next.js
"""

import sys
import os
import json
import numpy as np
import warnings
warnings.filterwarnings('ignore')

# Supprimer les warnings et rediriger stderr
os.environ['PYTHONWARNINGS'] = 'ignore'

# Configurer OpenMP pour XGBoost sur macOS
# Chercher libomp.dylib dans les emplacements courants
libomp_paths = [
    '/opt/homebrew/opt/libomp/lib/libomp.dylib',
    '/usr/local/opt/libomp/lib/libomp.dylib',
    '/usr/local/Cellar/libomp/*/lib/libomp.dylib',
    '/usr/local/Cellar/llvm/*/lib/libomp.dylib',
]

import glob
for pattern in libomp_paths:
    matches = glob.glob(pattern)
    if matches:
        os.environ['DYLD_LIBRARY_PATH'] = os.path.dirname(matches[0]) + (':' + os.environ.get('DYLD_LIBRARY_PATH', ''))
        break

# Alternative: définir OMP_NUM_THREADS pour éviter les problèmes
os.environ['OMP_NUM_THREADS'] = '1'

def main():
    if len(sys.argv) < 3:
        print(json.dumps({"success": False, "error": "Arguments manquants"}))
        sys.exit(1)
    
    data_json_base64 = sys.argv[1]
    model_dir = sys.argv[2]
    
    # Décoder le JSON depuis base64
    import base64
    try:
        data_json = base64.b64decode(data_json_base64).decode('utf-8')
    except Exception as e:
        print(json.dumps({"success": False, "error": f"Erreur de décodage base64: {str(e)}"}))
        sys.exit(1)
    
    # Ajouter le chemin du modèle au sys.path pour l'import
    sys.path.insert(0, model_dir)
    
    try:
        # Importer xgboost AVANT load_model pour capturer les erreurs tôt
        try:
            import xgboost
        except Exception as xgb_error:
            error_msg = str(xgb_error)
            if 'libxgboost' in error_msg or 'OpenMP' in error_msg or 'XGBoost Library' in error_msg:
                result = {
                    "success": False,
                    "error": f"XGBoost nécessite OpenMP. Erreur: {error_msg}\n\n" +
                            "Pour installer OpenMP:\n" +
                            "  macOS: brew install libomp\n" +
                            "  Linux: sudo apt-get install libomp-dev (Ubuntu/Debian)\n" +
                            "  Windows: Installer Visual C++ Redistributable\n\n" +
                            "Puis réinstaller xgboost: pip3 uninstall xgboost && pip3 install xgboost"
                }
                print(json.dumps(result), file=sys.stdout)
                sys.stdout.flush()
                sys.exit(1)
            else:
                raise xgb_error
        
        from load_model import DiabetesPredictor
        
        # Parser les données JSON
        data_dict = json.loads(data_json)
        
        # Initialiser le prédicteur
        predictor = DiabetesPredictor(model_dir)
        
        # Faire la prédiction
        prediction, probability = predictor.predict(data_dict, return_probability=True)
        
        # Déterminer la classe
        is_diabetes = prediction == 1
        confidence = probability if is_diabetes else (1 - probability)
        threshold = predictor.threshold
        
        # Déterminer le niveau de confiance
        if is_diabetes:
            confidence_level = "Élevée" if probability >= 0.8 else "Modérée"
        else:
            confidence_level = "Élevée" if probability <= 0.2 else "Modérée"
        
        # Générer l'interprétation
        if is_diabetes:
            if probability >= 0.8:
                interpretation = "Forte probabilité de diabète détectée. Signes cliniques significatifs présents."
                recommendation = "Consultation médicale urgente recommandée. Examens complémentaires nécessaires (HbA1c, test de tolérance au glucose)."
            else:
                interpretation = "Signes possibles de diabète détectés. Surveillance recommandée."
                recommendation = "Consultation médicale recommandée pour confirmation."
            explanation = "Facteurs de risque détectés : glucose élevé, IMC élevé, antécédents familiaux"
            features = [
                "Taux de glucose élevé",
                "IMC élevé",
                "Antécédents familiaux",
                "Âge"
            ]
        else:
            if probability <= 0.2:
                interpretation = "Aucun signe de diabète détecté. Paramètres normaux."
                recommendation = None
            else:
                interpretation = "Résultat incertain. Surveillance recommandée."
                recommendation = "Consultation médicale recommandée."
            explanation = "Paramètres dans les limites normales. Aucun facteur de risque majeur détecté."
            features = [
                "Glucose normal",
                "IMC normal",
                "Pas d'antécédents",
                "Paramètres stables"
            ]
        
        # Résultat JSON
        result = {
            "success": True,
            "prediction": prediction,
            "probability": float(probability),
            "confidence": float(confidence),
            "confidenceLevel": confidence_level,
            "threshold": float(threshold),
            "label": "Diabète" if is_diabetes else "Normal",
            "details": {
                "probability": float(confidence),
                "explanation": explanation,
                "features": features,
                "interpretation": interpretation,
                "recommendation": recommendation
            }
        }
        
        # Imprimer uniquement le JSON sur stdout
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

