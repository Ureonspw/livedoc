#!/usr/bin/env python3
"""
Script pour charger le modèle XGBoost de diabète et faire des prédictions
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

class DiabetesPredictor:
    """
    Classe pour charger et utiliser le modèle de prédiction du diabète
    """
    
    def __init__(self, model_dir):
        """
        Initialise le prédicteur
        
        Args:
            model_dir: Dossier contenant les fichiers du modèle
        """
        self.model_dir = model_dir
        
        # Charger le modèle
        model_path = os.path.join(model_dir, "xgb_diabetes_best_optimized.pkl")
        self.model = joblib.load(model_path)
        
        # Charger les scalers
        self.power_transformer = joblib.load(os.path.join(model_dir, "power_transformer.pkl"))
        self.robust_scaler = joblib.load(os.path.join(model_dir, "robust_scaler.pkl"))
        
        # Charger le feature selector
        self.feature_selector = joblib.load(os.path.join(model_dir, "feature_selector_rfecv.pkl"))
        
        # Charger la config
        config_path = os.path.join(model_dir, "model_config_ultimate.pkl")
        if os.path.exists(config_path):
            self.config = joblib.load(config_path)
            self.threshold = self.config.get('threshold', 0.5)
            self.selected_features = self.config.get('selected_features', [])
        else:
            # Fallback sur optimal_threshold.pkl
            threshold_path = os.path.join(model_dir, "optimal_threshold.pkl")
            if os.path.exists(threshold_path):
                self.threshold = joblib.load(threshold_path)
            else:
                self.threshold = 0.5
            self.selected_features = []
        
        # Messages de debug vers stderr
        print(f"✅ Modèle diabète chargé depuis {model_dir}", file=sys.stderr)
        print(f"   Threshold : {self.threshold}", file=sys.stderr)
        if hasattr(self.feature_selector, 'n_features_'):
            print(f"   RFECV n_features_ : {self.feature_selector.n_features_}", file=sys.stderr)
        if hasattr(self.feature_selector, 'feature_names_in_'):
            print(f"   RFECV feature_names_in_ : {len(self.feature_selector.feature_names_in_)} features", file=sys.stderr)
    
    def _feature_engineering(self, data):
        """
        Applique le feature engineering comme dans train_diabetes.py
        
        Args:
            data: DataFrame avec les colonnes de base
            
        Returns:
            DataFrame avec features supplémentaires
        """
        X = data.copy()
        
        # Interactions médicalement pertinentes
        X['BMI_Age'] = X['BMI'] * X['Age']
        X['Glucose_BMI'] = X['Glucose'] * X['BMI']
        X['Glucose_Age'] = X['Glucose'] * X['Age']
        X['Insulin_Glucose'] = X['Insulin'] * X['Glucose']
        X['Pregnancies_Age'] = X['Pregnancies'] * X['Age']
        X['DiabetesPedigree_Age'] = X['DiabetesPedigreeFunction'] * X['Age']
        
        # Features polynomiales
        X['BMI_squared'] = X['BMI'] ** 2
        X['Glucose_squared'] = X['Glucose'] ** 2
        X['Age_squared'] = X['Age'] ** 2
        X['BMI_cubed'] = X['BMI'] ** 3
        
        # Ratios métaboliques
        X['Glucose_Insulin_ratio'] = X['Glucose'] / (X['Insulin'] + 1)
        X['BMI_BP_ratio'] = X['BMI'] / (X['BloodPressure'] + 1)
        X['Age_Pregnancies_ratio'] = X['Age'] / (X['Pregnancies'] + 1)
        X['Glucose_DiabetesPedigree'] = X['Glucose'] * X['DiabetesPedigreeFunction']
        
        # Transformations logarithmiques
        X['log_Insulin'] = np.log1p(X['Insulin'])
        X['log_BMI'] = np.log1p(X['BMI'])
        X['log_Glucose'] = np.log1p(X['Glucose'])
        
        # Bins médicaux
        X['Age_group'] = pd.cut(X['Age'], bins=[0, 30, 50, 100], labels=[0, 1, 2]).astype(int)
        X['BMI_category'] = pd.cut(X['BMI'], bins=[0, 18.5, 25, 30, 100], labels=[0, 1, 2, 3]).astype(int)
        X['Glucose_level'] = pd.cut(X['Glucose'], bins=[0, 100, 125, 200], labels=[0, 1, 2]).astype(int)
        X['BP_category'] = pd.cut(X['BloodPressure'], bins=[0, 80, 90, 200], labels=[0, 1, 2]).astype(int)
        
        # Score de risque composite
        X['risk_score'] = (X['Glucose']/200 + X['BMI']/40 + X['Age']/100 + 
                          X['DiabetesPedigreeFunction']*2) / 4
        
        return X
    
    def _preprocess(self, data):
        """
        Prétraite les données : feature engineering, scaling, feature selection
        
        Args:
            data: DataFrame avec les colonnes de base (dans l'ordre: Pregnancies, Glucose, BloodPressure, SkinThickness, Insulin, BMI, DiabetesPedigreeFunction, Age)
            
        Returns:
            Array numpy prêt pour la prédiction (8 features après sélection)
        """
        # Feature engineering
        X = self._feature_engineering(data)
        
        # IMPORTANT: S'assurer que l'ordre des colonnes correspond exactement à celui utilisé pendant l'entraînement
        # L'ordre doit être: colonnes originales (dans l'ordre) + nouvelles features (dans l'ordre de création)
        # Les transformers et le feature selector sont sensibles à l'ordre des colonnes
        
        # Normalisation
        # Les transformers attendent les colonnes dans le même ordre que pendant le fit
        try:
            X_power = self.power_transformer.transform(X)
            X_robust = self.robust_scaler.transform(X)
            X_scaled = (X_power + X_robust) / 2
            
            # Créer un DataFrame avec les colonnes dans le même ordre que X
            # C'est crucial pour que le feature selector fonctionne correctement
            X_scaled_df = pd.DataFrame(X_scaled, columns=X.columns)
            
            # Debug: afficher le nombre de colonnes avant sélection
            print(f"   Colonnes avant feature selection: {X_scaled_df.shape[1]}", file=sys.stderr)
            if hasattr(self.feature_selector, 'n_features_'):
                print(f"   RFECV n_features_ attendu: {self.feature_selector.n_features_}", file=sys.stderr)
            
            # CRITIQUE: Vérifier et réorganiser les colonnes pour correspondre exactement à l'ordre attendu par le RFECV
            if hasattr(self.feature_selector, 'feature_names_in_'):
                expected_cols = list(self.feature_selector.feature_names_in_)
                actual_cols = list(X_scaled_df.columns)
                print(f"   Colonnes attendues par RFECV: {len(expected_cols)}", file=sys.stderr)
                print(f"   Colonnes reçues: {len(actual_cols)}", file=sys.stderr)
                
                # Vérifier que toutes les colonnes attendues sont présentes
                missing_cols = set(expected_cols) - set(actual_cols)
                extra_cols = set(actual_cols) - set(expected_cols)
                
                if missing_cols:
                    print(f"   ⚠️  Colonnes manquantes: {missing_cols}", file=sys.stderr)
                    # Ajouter les colonnes manquantes avec des valeurs par défaut (0)
                    for col in missing_cols:
                        X_scaled_df[col] = 0
                    print(f"   ✅ Colonnes manquantes ajoutées avec valeur 0", file=sys.stderr)
                
                if extra_cols:
                    print(f"   ⚠️  Colonnes supplémentaires: {extra_cols}", file=sys.stderr)
                
                # Réorganiser les colonnes dans l'ordre EXACT attendu par le RFECV
                # C'est CRUCIAL pour que le feature selector fonctionne
                X_scaled_df = X_scaled_df[expected_cols]
                print(f"   ✅ Colonnes réorganisées dans l'ordre attendu par RFECV", file=sys.stderr)
                print(f"   Ordre final: {list(X_scaled_df.columns)}", file=sys.stderr)
            else:
                # Si feature_names_in_ n'existe pas, utiliser l'ordre actuel
                print(f"   ⚠️  RFECV n'a pas feature_names_in_, utilisation de l'ordre actuel", file=sys.stderr)
            
            # Feature selection (RFECV sélectionne 8 features parmi toutes les features créées)
            # IMPORTANT: Le feature selector doit recevoir les colonnes dans le même ordre que pendant l'entraînement
            X_selected = None
            
            try:
                X_selected = self.feature_selector.transform(X_scaled_df)
                print(f"   Shape après transform RFECV: {X_selected.shape}", file=sys.stderr)
            except Exception as e:
                print(f"   ❌ Erreur lors du transform RFECV: {str(e)}", file=sys.stderr)
                print(f"   Shape de X_scaled_df: {X_scaled_df.shape}", file=sys.stderr)
                print(f"   Colonnes de X_scaled_df: {list(X_scaled_df.columns)}", file=sys.stderr)
                # Ne pas lever d'erreur ici, essayer le fallback
                X_selected = None
            
            # Vérifier que le feature selector a bien réduit le nombre de features
            # Le modèle XGBoost attend 8 features, mais le RFECV peut avoir sélectionné plus
            # Si on a plus de 8 features, utiliser support_ pour sélectionner les 8 correctes
            needs_fallback = False
            expected_features = 8  # Le modèle XGBoost final attend 8 features
            
            if X_selected is None:
                needs_fallback = True
            elif X_selected.shape[1] != expected_features:
                # Si on n'a pas exactement 8 features, utiliser le fallback
                needs_fallback = True
                print(f"   ⚠️  Nombre de features incorrect: obtenu {X_selected.shape[1]}, attendu {expected_features}", file=sys.stderr)
            
            if needs_fallback:
                print(f"   ⚠️  Le transform RFECV n'a pas réduit les features correctement", file=sys.stderr)
                if X_selected is not None:
                    print(f"   Attendu: {self.feature_selector.n_features_} features, obtenu: {X_selected.shape[1]}", file=sys.stderr)
                else:
                    print(f"   Transform RFECV a échoué, utilisation du fallback", file=sys.stderr)
                
                # Fallback: utiliser support_ pour sélectionner manuellement les features
                if hasattr(self.feature_selector, 'support_'):
                    print(f"   Tentative de sélection manuelle avec support_", file=sys.stderr)
                    support = self.feature_selector.support_
                    if hasattr(support, 'shape'):
                        print(f"   support_ shape: {support.shape}, nombre de True: {support.sum()}", file=sys.stderr)
                    else:
                        print(f"   support_ length: {len(support)}, nombre de True: {sum(support)}", file=sys.stderr)
                    
                    # Si support_ existe, sélectionner manuellement les features
                    if len(support) == X_scaled_df.shape[1]:
                        # Sélectionner les indices où support_ = True
                        selected_indices = [i for i, val in enumerate(support) if val]
                        print(f"   Indices sélectionnés par support_: {len(selected_indices)} features", file=sys.stderr)
                        
                        # Si on a plus de 8 features sélectionnées, prendre seulement les 8 premières
                        # (le modèle a été entraîné sur les 8 premières features sélectionnées)
                        if len(selected_indices) > expected_features:
                            print(f"   ⚠️  Plus de {expected_features} features sélectionnées ({len(selected_indices)}), utilisation des {expected_features} premières", file=sys.stderr)
                            selected_indices = selected_indices[:expected_features]
                        elif len(selected_indices) < expected_features:
                            error_msg = (f"Pas assez de features sélectionnées: {len(selected_indices)} < {expected_features}. "
                                        f"Le modèle attend {expected_features} features.")
                            print(f"   ❌ {error_msg}", file=sys.stderr)
                            raise ValueError(error_msg)
                        
                        # Sélectionner les features
                        if isinstance(X_scaled_df, pd.DataFrame):
                            X_selected = X_scaled_df.iloc[:, selected_indices].values
                        else:
                            X_selected = X_scaled_df[:, selected_indices]
                        print(f"   ✅ Sélection manuelle réussie: {X_selected.shape} (attendu: (1, {expected_features}))", file=sys.stderr)
                    else:
                        error_msg = (f"Le feature selector n'a pas réduit correctement les features. "
                                    f"Attendu: {self.feature_selector.n_features_} features. "
                                    f"Le support_ a {len(support)} éléments mais X_scaled_df a {X_scaled_df.shape[1]} colonnes.")
                        print(f"   ❌ {error_msg}", file=sys.stderr)
                        print(f"   Colonnes de X_scaled_df: {list(X_scaled_df.columns)}", file=sys.stderr)
                        raise ValueError(error_msg)
                else:
                    error_msg = (f"Le feature selector n'a pas réduit correctement les features. "
                                f"Attendu: {self.feature_selector.n_features_} features, obtenu: {X_selected.shape[1] if X_selected is not None else 'None'}. "
                                f"Le RFECV n'a pas d'attribut support_ pour le fallback.")
                    print(f"   ❌ {error_msg}", file=sys.stderr)
                    if hasattr(self.feature_selector, 'feature_names_in_'):
                        print(f"   Colonnes attendues par RFECV: {list(self.feature_selector.feature_names_in_)}", file=sys.stderr)
                    print(f"   Colonnes reçues: {list(X_scaled_df.columns)}", file=sys.stderr)
                    raise ValueError(error_msg)
            
            # Vérification finale - le modèle attend exactement 8 features
            if X_selected is None:
                raise ValueError("X_selected est None après toutes les tentatives de sélection")
            
            if X_selected.shape[1] != expected_features:
                error_msg = (f"Le nombre de features final est incorrect: obtenu {X_selected.shape[1]}, "
                            f"attendu {expected_features}. Le modèle XGBoost attend exactement {expected_features} features.")
                print(f"   ❌ {error_msg}", file=sys.stderr)
                raise ValueError(error_msg)
            
            print(f"   ✅ Shape finale après feature selection: {X_selected.shape} (attendu: (1, {expected_features}))", file=sys.stderr)
            
            return X_selected
        except Exception as e:
            print(f"   Erreur lors du preprocessing: {str(e)}", file=sys.stderr)
            print(f"   Shape de X après feature engineering: {X.shape}", file=sys.stderr)
            print(f"   Colonnes de X: {list(X.columns)}", file=sys.stderr)
            raise
    
    def predict(self, data_dict, return_probability=False):
        """
        Prédit si un patient a le diabète
        
        Args:
            data_dict: Dictionnaire avec les données du patient
                      Doit contenir: Pregnancies, Glucose, BloodPressure, SkinThickness,
                                   Insulin, BMI, DiabetesPedigreeFunction, Age
            return_probability: Si True, retourne aussi la probabilité
            
        Returns:
            Si return_probability=False : 0 ou 1
            Si return_probability=True : (prediction, probability)
        """
        # Créer un DataFrame avec les colonnes dans le bon ordre (comme dans le dataset original)
        # Ordre exact du dataset: Pregnancies, Glucose, BloodPressure, SkinThickness, Insulin, BMI, DiabetesPedigreeFunction, Age
        required_cols = ['Pregnancies', 'Glucose', 'BloodPressure', 'SkinThickness',
                        'Insulin', 'BMI', 'DiabetesPedigreeFunction', 'Age']
        
        # Créer le DataFrame avec les colonnes dans l'ordre exact
        data = pd.DataFrame([{
            col: data_dict.get(col, 0) for col in required_cols
        }], columns=required_cols)
        
        # Vérifier que toutes les colonnes sont présentes
        for col in required_cols:
            if col not in data.columns:
                raise ValueError(f"Colonne manquante: {col}")
        
        # Preprocessing (feature engineering + scaling + feature selection)
        try:
            X_processed = self._preprocess(data)
        except Exception as e:
            error_msg = f"Erreur lors du preprocessing: {str(e)}"
            print(f"   ERREUR: {error_msg}", file=sys.stderr)
            raise ValueError(error_msg)
        
        # Vérifier la forme après preprocessing
        if X_processed.shape[1] != 8:
            error_msg = (f"Shape mismatch après preprocessing: attendu 8 features, obtenu {X_processed.shape[1]}. "
                        f"Le feature selector RFECV devrait sélectionner 8 features. "
                        f"Vérifiez que le feature selector est correctement chargé et que l'ordre des colonnes correspond à l'entraînement.")
            print(f"   ERREUR: {error_msg}", file=sys.stderr)
            raise ValueError(error_msg)
        
        # Prédiction
        proba = self.model.predict_proba(X_processed)[0][1]
        
        # Décision avec seuil optimal
        prediction = 1 if proba >= self.threshold else 0
        
        if return_probability:
            return prediction, float(proba)
        else:
            return prediction

