#!/usr/bin/env python3
"""
Script pour charger le modèle XGBoost cardiovasculaire et faire des prédictions
"""

import os
import sys
import numpy as np
import pandas as pd
import joblib
import warnings
import glob
warnings.filterwarnings('ignore')

# Configurer OpenMP pour XGBoost sur macOS AVANT d'importer xgboost
libomp_paths = [
    '/opt/homebrew/opt/libomp/lib/libomp.dylib',
    '/usr/local/opt/libomp/lib/libomp.dylib',
    '/usr/local/Cellar/libomp/*/lib/libomp.dylib',
    '/usr/local/Cellar/llvm/*/lib/libomp.dylib',
]

for pattern in libomp_paths:
    matches = glob.glob(pattern)
    if matches:
        libomp_dir = os.path.dirname(matches[0])
        if 'DYLD_LIBRARY_PATH' in os.environ:
            os.environ['DYLD_LIBRARY_PATH'] = libomp_dir + ':' + os.environ['DYLD_LIBRARY_PATH']
        else:
            os.environ['DYLD_LIBRARY_PATH'] = libomp_dir
        break

# Définir OMP_NUM_THREADS pour éviter les problèmes
os.environ['OMP_NUM_THREADS'] = '1'

class CardiovascularPredictor:
    """
    Classe pour charger et utiliser le modèle de prédiction cardiovasculaire
    """
    
    def __init__(self, model_dir):
        """
        Initialise le prédicteur
        
        Args:
            model_dir: Dossier contenant les fichiers du modèle
        """
        self.model_dir = model_dir
        
        # Charger le modèle
        model_path = os.path.join(model_dir, "xgb_cardio_optimized.pkl")
        self.model = joblib.load(model_path)
        
        # Charger les scalers
        self.power_transformer = joblib.load(os.path.join(model_dir, "power_transformer_cardio.pkl"))
        self.robust_scaler = joblib.load(os.path.join(model_dir, "robust_scaler_cardio.pkl"))
        
        # Charger le feature selector
        self.feature_selector = joblib.load(os.path.join(model_dir, "feature_selector_cardio.pkl"))
        
        # Charger la config
        config_path = os.path.join(model_dir, "model_config_cardio.pkl")
        if os.path.exists(config_path):
            self.config = joblib.load(config_path)
            self.threshold = self.config.get('threshold', 0.5)
        else:
            self.threshold = 0.5
        
        # Messages de debug vers stderr
        print(f"✅ Modèle cardiovasculaire chargé depuis {model_dir}", file=sys.stderr)
        print(f"   Threshold : {self.threshold}", file=sys.stderr)
    
    def _feature_engineering(self, data):
        """
        Crée les features dérivées nécessaires pour le modèle
        
        Args:
            data: DataFrame avec les données brutes
            
        Returns:
            DataFrame avec les features originales + features dérivées
        """
        X = data.copy()
        
        # Calculer BMI (Body Mass Index) = weight / (height/100)^2
        X['bmi'] = X['weight'] / ((X['height'] / 100) ** 2)
        
        # Features au carré
        X['age_squared'] = X['age_years'] ** 2
        X['ap_hi_squared'] = X['ap_hi'] ** 2
        X['bmi_squared'] = X['bmi'] ** 2
        
        # Interactions
        X['alco_inactive'] = X['alco'] * (1 - X['active'])  # Consommation d'alcool sans activité physique
        
        # S'assurer que toutes les colonnes sont dans le bon ordre
        # Ordre attendu : gender, height, weight, ap_hi, ap_lo, cholesterol, gluc, smoke, alco, active, age_years, bmi, age_squared, ap_hi_squared, bmi_squared, alco_inactive
        feature_order = ['gender', 'height', 'weight', 'ap_hi', 'ap_lo', 'cholesterol', 
                        'gluc', 'smoke', 'alco', 'active', 'age_years', 
                        'bmi', 'age_squared', 'ap_hi_squared', 'bmi_squared', 'alco_inactive']
        
        # Réorganiser les colonnes dans l'ordre attendu
        X = X[feature_order]
        
        return X
    
    def _preprocess(self, data):
        """
        Prétraite les données : feature engineering, scaling, feature selection
        
        Args:
            data: DataFrame avec les données brutes
            
        Returns:
            Array numpy prêt pour la prédiction
        """
        # Feature engineering d'abord
        X_engineered = self._feature_engineering(data)
        
        # IMPORTANT: S'assurer que l'ordre des colonnes correspond exactement à celui utilisé pendant l'entraînement
        # Vérifier si le transformer a un attribut feature_names_in_ pour connaître l'ordre attendu
        if hasattr(self.power_transformer, 'feature_names_in_'):
            expected_cols = list(self.power_transformer.feature_names_in_)
            actual_cols = list(X_engineered.columns)
            
            print(f"   Colonnes attendues par transformer: {len(expected_cols)}", file=sys.stderr)
            print(f"   Colonnes reçues: {len(actual_cols)}", file=sys.stderr)
            
            # Vérifier si toutes les colonnes attendues sont présentes
            missing_cols = set(expected_cols) - set(actual_cols)
            if missing_cols:
                print(f"   ⚠️  Colonnes manquantes: {missing_cols}", file=sys.stderr)
                # Ajouter les colonnes manquantes avec des valeurs par défaut (0)
                for col in missing_cols:
                    X_engineered[col] = 0
                print(f"   ✅ Colonnes manquantes ajoutées avec valeur 0", file=sys.stderr)
            
            # Réorganiser les colonnes dans l'ordre attendu
            if expected_cols != actual_cols:
                print(f"   ⚠️  Ordre des colonnes différent, réorganisation...", file=sys.stderr)
                # S'assurer que toutes les colonnes attendues sont présentes
                for col in expected_cols:
                    if col not in X_engineered.columns:
                        X_engineered[col] = 0
                X_engineered = X_engineered[expected_cols]
                print(f"   ✅ Colonnes réorganisées dans l'ordre attendu", file=sys.stderr)
        
        # Normalisation
        try:
            X_power = self.power_transformer.transform(X_engineered)
            X_robust = self.robust_scaler.transform(X_engineered)
            X_scaled = (X_power + X_robust) / 2
            X_scaled = pd.DataFrame(X_scaled, columns=X_engineered.columns)
            
            print(f"   Shape après scaling: {X_scaled.shape}", file=sys.stderr)
            
            # Feature selection
            X_selected = self.feature_selector.transform(X_scaled)
            
            print(f"   Shape après feature selection: {X_selected.shape}", file=sys.stderr)
            
            return X_selected
        except Exception as e:
            print(f"   ❌ Erreur lors du preprocessing: {str(e)}", file=sys.stderr)
            print(f"   Colonnes de X_engineered: {list(X_engineered.columns)}", file=sys.stderr)
            if hasattr(self.power_transformer, 'feature_names_in_'):
                print(f"   Colonnes attendues: {list(self.power_transformer.feature_names_in_)}", file=sys.stderr)
            raise
    
    def predict(self, data_dict, return_probability=False):
        """
        Prédit si un patient a une maladie cardiovasculaire
        
        Args:
            data_dict: Dictionnaire avec les données du patient
                      Doit contenir: gender, height, weight, ap_hi, ap_lo,
                                   cholesterol, gluc, smoke, alco, active, age_years
            return_probability: Si True, retourne aussi la probabilité
            
        Returns:
            Si return_probability=False : 0 ou 1
            Si return_probability=True : (prediction, probability)
        """
        # Créer un DataFrame avec toutes les colonnes nécessaires
        # Ordre des colonnes du dataset : id,gender,height,weight,ap_hi,ap_lo,cholesterol,gluc,smoke,alco,active,cardio,age_years
        required_cols = ['gender', 'height', 'weight', 'ap_hi', 'ap_lo', 'cholesterol', 
                        'gluc', 'smoke', 'alco', 'active', 'age_years']
        
        # Créer un DataFrame avec toutes les colonnes, remplir avec les valeurs du dict ou 0
        data = pd.DataFrame([{col: data_dict.get(col, 0) for col in required_cols}])
        
        # Preprocessing
        X_processed = self._preprocess(data)
        
        # Prédiction
        proba = self.model.predict_proba(X_processed)[0][1]
        
        # Décision avec seuil optimal
        prediction = 1 if proba >= self.threshold else 0
        
        if return_probability:
            return prediction, float(proba)
        else:
            return prediction

