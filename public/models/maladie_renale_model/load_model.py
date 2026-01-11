#!/usr/bin/env python3
"""
Script pour charger le modèle XGBoost de maladie rénale et faire des prédictions
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

class KidneyDiseasePredictor:
    """
    Classe pour charger et utiliser le modèle de prédiction de maladie rénale
    """
    
    def __init__(self, model_dir):
        """
        Initialise le prédicteur
        
        Args:
            model_dir: Dossier contenant les fichiers du modèle
        """
        self.model_dir = model_dir
        
        # Charger le modèle
        model_path = os.path.join(model_dir, "xgb_kidney_optimized.pkl")
        self.model = joblib.load(model_path)
        
        # Charger les scalers
        self.power_transformer = joblib.load(os.path.join(model_dir, "power_transformer_kidney.pkl"))
        self.robust_scaler = joblib.load(os.path.join(model_dir, "robust_scaler_kidney.pkl"))
        
        # Charger le feature selector
        self.feature_selector = joblib.load(os.path.join(model_dir, "feature_selector_kidney.pkl"))
        
        # Charger les label encoders
        self.label_encoders = joblib.load(os.path.join(model_dir, "label_encoders_kidney.pkl"))
        
        # Charger la config
        config_path = os.path.join(model_dir, "model_config_kidney.pkl")
        if os.path.exists(config_path):
            self.config = joblib.load(config_path)
            self.threshold = self.config.get('threshold', 0.5)
        else:
            self.threshold = 0.5
        
        # Messages de debug vers stderr
        print(f"✅ Modèle maladie rénale chargé depuis {model_dir}", file=sys.stderr)
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
        
        # Feature engineering : age_squared
        if 'age' in X.columns:
            X['age_squared'] = X['age'] ** 2
        
        return X
    
    def _rename_columns(self, data):
        """
        Renomme les colonnes pour correspondre aux noms attendus par le modèle
        
        Args:
            data: DataFrame avec les données
            
        Returns:
            DataFrame avec colonnes renommées
        """
        X = data.copy()
        
        # Mapping des noms de colonnes courts vers les noms longs attendus par le modèle
        column_mapping = {
            'al': 'albumin',
            'ane': 'anemia',
            'appet': 'appetite',
            'ba': 'bacteria',
        }
        
        # Renommer les colonnes si elles existent
        for old_name, new_name in column_mapping.items():
            if old_name in X.columns:
                X = X.rename(columns={old_name: new_name})
        
        return X
    
    def _encode_categorical(self, data):
        """
        Encode les variables catégorielles avec les label encoders
        
        Args:
            data: DataFrame avec les données
            
        Returns:
            DataFrame avec variables encodées
        """
        X = data.copy()
        
        # Colonnes catégorielles à encoder (essayer d'abord les noms longs, puis les noms courts)
        # Mapping pour gérer les deux cas (noms courts et noms longs)
        categorical_mapping = {
            'bacteria': ['bacteria', 'ba'],
            'anemia': ['anemia', 'ane'],
            'appetite': ['appetite', 'appet'],
            'albumin': ['albumin', 'al'],
        }
        
        # Colonnes catégorielles standard (sans renommage)
        standard_categorical_cols = ['rbc', 'pc', 'pcc', 'htn', 'dm', 'cad', 'pe']
        
        # Encoder les colonnes standard
        for col in standard_categorical_cols:
            if col in X.columns and col in self.label_encoders:
                # Remplacer les valeurs manquantes par une valeur par défaut
                X[col] = X[col].fillna('unknown')
                # Encoder
                try:
                    X[col] = self.label_encoders[col].transform(X[col].astype(str))
                except:
                    # Si valeur inconnue, utiliser la valeur la plus fréquente
                    X[col] = 0
        
        # Encoder les colonnes avec mapping (noms longs ou courts)
        for long_name, variants in categorical_mapping.items():
            # Trouver quelle variante existe dans les données et dans les encoders
            col_to_encode = None
            encoder_key = None
            
            for variant in variants:
                if variant in X.columns:
                    col_to_encode = variant
                    # Vérifier si l'encoder existe avec ce nom ou l'autre variante
                    if variant in self.label_encoders:
                        encoder_key = variant
                    elif variants[0] in self.label_encoders:  # Essayer le nom long
                        encoder_key = variants[0]
                    elif variants[1] in self.label_encoders:  # Essayer le nom court
                        encoder_key = variants[1]
                    break
            
            if col_to_encode and encoder_key and encoder_key in self.label_encoders:
                # Remplacer les valeurs manquantes par une valeur par défaut
                X[col_to_encode] = X[col_to_encode].fillna('unknown')
                # Encoder
                try:
                    X[col_to_encode] = self.label_encoders[encoder_key].transform(X[col_to_encode].astype(str))
                except:
                    # Si valeur inconnue, utiliser la valeur la plus fréquente
                    X[col_to_encode] = 0
        
        return X
    
    def _preprocess(self, data):
        """
        Prétraite les données : feature engineering, renommage, encodage, scaling, feature selection
        
        Args:
            data: DataFrame avec les données brutes
            
        Returns:
            Array numpy prêt pour la prédiction
        """
        # Feature engineering d'abord
        X = self._feature_engineering(data)
        
        # Renommer les colonnes pour correspondre aux noms attendus
        X = self._rename_columns(X)
        
        # IMPORTANT: S'assurer que l'ordre des colonnes correspond exactement à celui utilisé pendant l'entraînement
        # Vérifier si le transformer a un attribut feature_names_in_ pour connaître l'ordre attendu
        if hasattr(self.power_transformer, 'feature_names_in_'):
            expected_cols = list(self.power_transformer.feature_names_in_)
            actual_cols = list(X.columns)
            
            print(f"   Colonnes attendues par transformer: {len(expected_cols)}", file=sys.stderr)
            print(f"   Colonnes reçues: {len(actual_cols)}", file=sys.stderr)
            
            # Vérifier si toutes les colonnes attendues sont présentes
            missing_cols = set(expected_cols) - set(actual_cols)
            if missing_cols:
                print(f"   ⚠️  Colonnes manquantes: {missing_cols}", file=sys.stderr)
                # Ajouter les colonnes manquantes avec des valeurs par défaut
                for col in missing_cols:
                    # Pour les colonnes catégorielles, utiliser une valeur par défaut appropriée
                    if col in ['rbc', 'pc', 'pcc', 'bacteria', 'htn', 'dm', 'cad', 'appetite', 'pe', 'anemia']:
                        X[col] = 'normal' if col in ['rbc', 'pc'] else 'notpresent' if col in ['pcc', 'bacteria'] else 'no' if col in ['htn', 'dm', 'cad', 'pe', 'anemia'] else 'good'
                    else:
                        X[col] = 0
                print(f"   ✅ Colonnes manquantes ajoutées avec valeurs par défaut", file=sys.stderr)
            
            # Réorganiser les colonnes dans l'ordre attendu
            if expected_cols != actual_cols:
                print(f"   ⚠️  Ordre des colonnes différent, réorganisation...", file=sys.stderr)
                # S'assurer que toutes les colonnes attendues sont présentes
                for col in expected_cols:
                    if col not in X.columns:
                        if col in ['rbc', 'pc', 'pcc', 'bacteria', 'htn', 'dm', 'cad', 'appetite', 'pe', 'anemia']:
                            X[col] = 'normal' if col in ['rbc', 'pc'] else 'notpresent' if col in ['pcc', 'bacteria'] else 'no' if col in ['htn', 'dm', 'cad', 'pe', 'anemia'] else 'good'
                        else:
                            X[col] = 0
                X = X[expected_cols]
                print(f"   ✅ Colonnes réorganisées dans l'ordre attendu", file=sys.stderr)
        
        # Encodage des variables catégorielles
        X = self._encode_categorical(X)
        
        # Normalisation
        try:
            X_power = self.power_transformer.transform(X)
            X_robust = self.robust_scaler.transform(X)
            X_scaled = (X_power + X_robust) / 2
            X_scaled = pd.DataFrame(X_scaled, columns=X.columns)
            
            print(f"   Shape après scaling: {X_scaled.shape}", file=sys.stderr)
            
            # Feature selection
            X_selected = self.feature_selector.transform(X_scaled)
            
            print(f"   Shape après feature selection: {X_selected.shape}", file=sys.stderr)
            
            return X_selected
        except Exception as e:
            print(f"   ❌ Erreur lors du preprocessing: {str(e)}", file=sys.stderr)
            print(f"   Colonnes de X: {list(X.columns)}", file=sys.stderr)
            if hasattr(self.power_transformer, 'feature_names_in_'):
                print(f"   Colonnes attendues: {list(self.power_transformer.feature_names_in_)}", file=sys.stderr)
            raise
    
    def predict(self, data_dict, return_probability=False):
        """
        Prédit si un patient a une maladie rénale
        
        Args:
            data_dict: Dictionnaire avec les données du patient
                      Doit contenir les colonnes du dataset kidney
            return_probability: Si True, retourne aussi la probabilité
            
        Returns:
            Si return_probability=False : 0 ou 1
            Si return_probability=True : (prediction, probability)
        """
        # Créer un DataFrame avec toutes les colonnes nécessaires
        # Ordre des colonnes du dataset : id,age,bp,sg,al,su,rbc,pc,pcc,ba,bgr,bu,sc,sod,pot,hemo,pcv,wc,rc,htn,dm,cad,appet,pe,ane
        required_cols = ['age', 'bp', 'sg', 'al', 'su', 'rbc', 'pc', 'pcc', 'ba', 'bgr', 
                        'bu', 'sc', 'sod', 'pot', 'hemo', 'pcv', 'wc', 'rc', 'htn', 'dm', 
                        'cad', 'appet', 'pe', 'ane']
        
        # Créer un DataFrame avec toutes les colonnes, remplir avec les valeurs du dict ou 0/null
        data = pd.DataFrame([{col: data_dict.get(col, 0) if col not in ['rbc', 'pc', 'pcc', 'ba', 'htn', 'dm', 'cad', 'appet', 'pe', 'ane'] 
                             else data_dict.get(col, 'normal' if col in ['rbc', 'pc'] else 'notpresent' if col in ['pcc', 'ba'] else 'no' if col in ['htn', 'dm', 'cad', 'pe', 'ane'] else 'good')
                             for col in required_cols}])
        
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

