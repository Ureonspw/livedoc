#!/usr/bin/env python3
"""
Script de vérification des dépendances pour les modèles ML
À exécuter avant le déploiement pour vérifier que tout est installé correctement
"""

import sys
import os

def check_xgboost():
    """Vérifie si XGBoost est installé et fonctionnel"""
    try:
        import xgboost
        print("✅ XGBoost installé (version: {})".format(xgboost.__version__))
        return True
    except ImportError:
        print("❌ XGBoost n'est pas installé")
        print("   Installez-le avec: pip3 install xgboost")
        return False
    except Exception as e:
        error_msg = str(e)
        if 'libxgboost' in error_msg or 'OpenMP' in error_msg or 'XGBoost Library' in error_msg:
            print("❌ XGBoost est installé mais ne peut pas charger (problème OpenMP)")
            print("   Erreur: {}".format(error_msg))
            print("\n   Pour résoudre:")
            print("   • macOS: brew install libomp")
            print("   • Linux (Ubuntu/Debian): sudo apt-get install libomp-dev")
            print("   • Linux (CentOS/RHEL): sudo yum install libgomp")
            print("   • Windows: Installer Visual C++ Redistributable")
            print("\n   Puis réinstaller: pip3 uninstall xgboost && pip3 install xgboost")
            return False
        else:
            print("❌ Erreur lors du chargement de XGBoost: {}".format(error_msg))
            return False

def check_other_dependencies():
    """Vérifie les autres dépendances Python"""
    dependencies = {
        'numpy': 'numpy',
        'pandas': 'pandas',
        'scikit-learn': 'sklearn',
        'joblib': 'joblib',
    }
    
    all_ok = True
    for package_name, import_name in dependencies.items():
        try:
            __import__(import_name)
            print("✅ {} installé".format(package_name))
        except ImportError:
            print("❌ {} n'est pas installé".format(package_name))
            print("   Installez-le avec: pip3 install {}".format(package_name))
            all_ok = False
    
    return all_ok

def check_model_files():
    """Vérifie que les fichiers de modèles existent"""
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    models_dir = os.path.join(base_dir, 'public', 'models')
    
    models = {
        'diabete_model': ['xgb_diabetes_best_optimized.pkl', 'load_model.py'],
        'maladie_renale_model': ['xgb_kidney_optimized.pkl', 'load_model.py'],
        'cardiovasculaire_model': ['xgb_cardio_optimized.pkl', 'load_model.py'],
    }
    
    all_ok = True
    for model_name, files in models.items():
        model_dir = os.path.join(models_dir, model_name)
        if not os.path.exists(model_dir):
            print("❌ Dossier modèle manquant: {}".format(model_dir))
            all_ok = False
            continue
        
        for file in files:
            file_path = os.path.join(model_dir, file)
            if os.path.exists(file_path):
                print("✅ {} trouvé".format(file_path))
            else:
                print("❌ Fichier manquant: {}".format(file_path))
                all_ok = False
    
    return all_ok

def main():
    print("=" * 60)
    print("Vérification des dépendances pour les modèles ML")
    print("=" * 60)
    print()
    
    xgb_ok = check_xgboost()
    print()
    
    deps_ok = check_other_dependencies()
    print()
    
    models_ok = check_model_files()
    print()
    
    print("=" * 60)
    if xgb_ok and deps_ok and models_ok:
        print("✅ Toutes les dépendances sont installées correctement!")
        sys.exit(0)
    else:
        print("❌ Certaines dépendances manquent ou sont incorrectes")
        print("   Veuillez corriger les problèmes ci-dessus avant de déployer")
        sys.exit(1)

if __name__ == "__main__":
    main()

