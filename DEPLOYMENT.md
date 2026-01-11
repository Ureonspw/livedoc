# Guide de Déploiement - Modèles ML

Ce guide explique comment déployer l'application avec les modèles ML (XGBoost) sur différents systèmes.

## Prérequis

### 1. Python 3.8+
```bash
python3 --version
```

### 2. Dépendances Python
```bash
pip3 install xgboost numpy pandas scikit-learn joblib
```

### 3. OpenMP (requis pour XGBoost)

#### macOS
```bash
brew install libomp
pip3 uninstall xgboost
pip3 install xgboost
```

#### Linux (Ubuntu/Debian)
```bash
sudo apt-get update
sudo apt-get install libomp-dev
pip3 uninstall xgboost
pip3 install xgboost
```

#### Linux (CentOS/RHEL)
```bash
sudo yum install libgomp
pip3 uninstall xgboost
pip3 install xgboost
```

#### Windows
1. Installer [Visual C++ Redistributable](https://aka.ms/vs/17/release/vc_redist.x64.exe)
2. Réinstaller XGBoost:
```bash
pip uninstall xgboost
pip install xgboost
```

## Vérification des Dépendances

Avant de déployer, exécutez le script de vérification:

```bash
python3 scripts/check_dependencies.py
```

Ce script vérifie:
- ✅ Installation de XGBoost et compatibilité OpenMP
- ✅ Autres dépendances Python (numpy, pandas, scikit-learn, joblib)
- ✅ Présence des fichiers de modèles

## Déploiement

### 1. Installation des dépendances Node.js
```bash
npm install
```

### 2. Configuration de la base de données
```bash
# Copier .env.example vers .env et configurer DATABASE_URL
cp .env.example .env
# Éditer .env avec vos paramètres de base de données
```

### 3. Migration de la base de données
```bash
npx prisma migrate dev
npx prisma generate
```

### 4. Vérification des modèles ML
```bash
python3 scripts/check_dependencies.py
```

### 5. Démarrage de l'application
```bash
npm run dev  # Développement
npm run build && npm start  # Production
```

## Dépannage

### Erreur: "XGBoost Library (libxgboost.dylib) could not be loaded"

**Cause**: OpenMP n'est pas installé ou XGBoost n'a pas été réinstallé après l'installation d'OpenMP.

**Solution**:
1. Installer OpenMP (voir section Prérequis ci-dessus)
2. Réinstaller XGBoost: `pip3 uninstall xgboost && pip3 install xgboost`
3. Redémarrer le serveur Next.js

### Erreur: "Module not found: xgboost"

**Solution**: Installer XGBoost avec `pip3 install xgboost`

### Erreur lors de la génération de prédiction

Vérifiez les logs du serveur pour plus de détails. Les erreurs sont maintenant affichées avec des instructions claires dans l'interface utilisateur.

## Déploiement en Production

### Option 1: Docker (Recommandé)

Créer un `Dockerfile` qui installe toutes les dépendances:

```dockerfile
FROM node:18-alpine

# Installer Python et dépendances système
RUN apk add --no-cache python3 py3-pip g++ make libomp

# Installer dépendances Python
RUN pip3 install xgboost numpy pandas scikit-learn joblib

# ... reste du Dockerfile
```

### Option 2: Serveur dédié

1. Installer toutes les dépendances système (OpenMP)
2. Installer les dépendances Python
3. Configurer les variables d'environnement
4. Déployer l'application Next.js

## Notes Importantes

- Les modèles XGBoost nécessitent OpenMP pour fonctionner
- Sur macOS, `DYLD_LIBRARY_PATH` peut ne pas fonctionner avec les processus lancés via `execAsync` à cause des restrictions de sécurité
- Il est recommandé de réinstaller XGBoost après l'installation d'OpenMP
- Le script `check_dependencies.py` doit être exécuté avant chaque déploiement

## Support

En cas de problème, vérifiez:
1. Les logs du serveur Next.js
2. Les messages d'erreur dans l'interface utilisateur (maintenant plus détaillés)
3. Le résultat de `python3 scripts/check_dependencies.py`

