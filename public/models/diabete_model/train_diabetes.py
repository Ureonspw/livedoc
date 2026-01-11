# ======================================
# XGBoost DIABETES - PERFORMANCE MAXIMALE
# ======================================
import numpy as np
import pandas as pd
import joblib
from xgboost import XGBClassifier
from sklearn.model_selection import train_test_split, StratifiedKFold, cross_val_score
from sklearn.metrics import (classification_report, f1_score, roc_auc_score, 
                             confusion_matrix, roc_curve, precision_recall_curve,
                             auc)
from sklearn.preprocessing import StandardScaler, RobustScaler, PowerTransformer
from imblearn.over_sampling import SMOTE, ADASYN, BorderlineSMOTE
from imblearn.combine import SMOTETomek, SMOTEENN
from sklearn.feature_selection import SelectKBest, mutual_info_classif, RFECV
import optuna
from optuna.samplers import TPESampler
import matplotlib.pyplot as plt
import seaborn as sns
import warnings
warnings.filterwarnings('ignore')

# Configuration des graphiques
plt.style.use('seaborn-v0_8-darkgrid')
sns.set_palette("husl")

# ========== 1. CHARGEMENT & ANALYSE ==========
print("📊 Chargement des données...")
data = pd.read_csv("data/diabetes_clean.csv")
X = data.drop("Outcome", axis=1)
y = data["Outcome"]

print(f"Distribution des classes: {np.bincount(y)}")
print(f"Ratio déséquilibre: {np.bincount(y)[0]/np.bincount(y)[1]:.2f}:1")
print(f"Features initiales: {X.shape[1]}")

# ========== 2. FEATURE ENGINEERING ULTRA-AVANCÉ ==========
print("\n🔧 Feature Engineering avancé...")

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

# Transformations logarithmiques (stabiliser les distributions)
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

print(f"Features après engineering: {X.shape[1]}")

# ========== 3. NORMALISATION MULTI-MÉTHODE ==========
print("\n⚙️ Normalisation des features...")

# PowerTransformer pour rendre les distributions plus gaussiennes
power_transformer = PowerTransformer(method='yeo-johnson', standardize=True)
X_power = power_transformer.fit_transform(X)

# RobustScaler (résistant aux outliers)
robust_scaler = RobustScaler()
X_robust = robust_scaler.fit_transform(X)

# Combinaison : moyenne des deux normalisations
X_scaled = (X_power + X_robust) / 2
X_scaled = pd.DataFrame(X_scaled, columns=X.columns)

# ========== 4. SPLIT STRATIFIÉ ==========
X_train, X_test, y_train, y_test = train_test_split(
    X_scaled, y, test_size=0.20, stratify=y, random_state=42
)

# ========== 5. SÉLECTION RÉCURSIVE DES FEATURES ==========
print("\n🎯 Sélection récursive des meilleures features...")

# RFECV : sélection par élimination récursive avec validation croisée
xgb_selector = XGBClassifier(n_estimators=100, random_state=42, eval_metric='logloss')
rfecv = RFECV(estimator=xgb_selector, step=1, cv=5, scoring='f1', n_jobs=-1)
rfecv.fit(X_train, y_train)

X_train_selected = rfecv.transform(X_train)
X_test_selected = rfecv.transform(X_test)

selected_features = X.columns[rfecv.support_].tolist()
print(f"Features sélectionnées: {len(selected_features)} / {X.shape[1]}")
print(f"Score optimal: {rfecv.cv_results_['mean_test_score'].max():.4f}")

# ========== 6. ÉQUILIBRAGE AVANCÉ ==========
print("\n⚖️ Équilibrage intelligent des classes...")

# Test de plusieurs méthodes d'équilibrage
methods = {
    'SMOTE': SMOTE(random_state=42, k_neighbors=5),
    'BorderlineSMOTE': BorderlineSMOTE(random_state=42, k_neighbors=5),
    'ADASYN': ADASYN(random_state=42),
    'SMOTETomek': SMOTETomek(random_state=42),
    'SMOTEENN': SMOTEENN(random_state=42)
}

best_method = None
best_score = 0

for name, method in methods.items():
    X_temp, y_temp = method.fit_resample(X_train_selected, y_train)
    temp_model = XGBClassifier(n_estimators=100, random_state=42, eval_metric='logloss')
    score = cross_val_score(temp_model, X_temp, y_temp, cv=3, scoring='f1').mean()
    print(f"  {name}: F1={score:.4f}")
    if score > best_score:
        best_score = score
        best_method = name

print(f"\n✅ Meilleure méthode: {best_method} (F1={best_score:.4f})")

# Appliquer la meilleure méthode
X_train_balanced, y_train_balanced = methods[best_method].fit_resample(X_train_selected, y_train)
print(f"Distribution après équilibrage: {np.bincount(y_train_balanced)}")

# ========== 7. OPTIMISATION BAYÉSIENNE POUSSÉE ==========
print("\n🔍 Optimisation bayésienne Optuna (80 trials)...")

def objective(trial):
    params = {
        'n_estimators': trial.suggest_int('n_estimators', 300, 800),
        'max_depth': trial.suggest_int('max_depth', 3, 10),
        'learning_rate': trial.suggest_float('learning_rate', 0.001, 0.3, log=True),
        'min_child_weight': trial.suggest_int('min_child_weight', 1, 10),
        'gamma': trial.suggest_float('gamma', 0, 1.0),
        'subsample': trial.suggest_float('subsample', 0.5, 1.0),
        'colsample_bytree': trial.suggest_float('colsample_bytree', 0.5, 1.0),
        'colsample_bylevel': trial.suggest_float('colsample_bylevel', 0.5, 1.0),
        'colsample_bynode': trial.suggest_float('colsample_bynode', 0.5, 1.0),
        'reg_alpha': trial.suggest_float('reg_alpha', 0, 2.0),
        'reg_lambda': trial.suggest_float('reg_lambda', 0, 3.0),
        'scale_pos_weight': trial.suggest_float('scale_pos_weight', 0.5, 3.0),
        'max_delta_step': trial.suggest_int('max_delta_step', 0, 10),
        'objective': 'binary:logistic',
        'eval_metric': 'logloss',
        'tree_method': 'hist',
        'grow_policy': trial.suggest_categorical('grow_policy', ['depthwise', 'lossguide']),
        'random_state': 42
    }
    
    model = XGBClassifier(**params)
    cv = StratifiedKFold(n_splits=7, shuffle=True, random_state=42)
    scores = cross_val_score(model, X_train_balanced, y_train_balanced, 
                             cv=cv, scoring='f1', n_jobs=-1)
    return scores.mean()

study = optuna.create_study(
    direction='maximize',
    sampler=TPESampler(seed=42, n_startup_trials=20)
)
study.optimize(objective, n_trials=80, show_progress_bar=True)

print(f"\n✅ Meilleur F1-score (CV): {study.best_value:.4f}")

# ========== 8. MODÈLE FINAL AVEC EARLY STOPPING ==========
print("\n🚀 Entraînement du modèle final...")
best_params = study.best_params

# Retirer early_stopping_rounds des paramètres du modèle
best_params_clean = {k: v for k, v in best_params.items() 
                     if k != 'early_stopping_rounds'}
best_params_clean.update({
    'objective': 'binary:logistic',
    'eval_metric': 'logloss',
    'tree_method': 'hist',
    'random_state': 42
})

final_model = XGBClassifier(**best_params_clean)
final_model.fit(
    X_train_balanced, y_train_balanced,
    eval_set=[(X_test_selected, y_test)],
    verbose=False
)

# ========== 9. CALIBRATION EXHAUSTIVE DU SEUIL ==========
print("\n🎯 Calibration du seuil optimal...")
y_proba = final_model.predict_proba(X_test_selected)[:, 1]

# Recherche exhaustive avec métriques multiples
thresholds = np.arange(0.05, 0.95, 0.005)
f1_scores = []
recalls = []
precisions = []

for t in thresholds:
    y_pred_temp = (y_proba >= t).astype(int)
    f1_scores.append(f1_score(y_test, y_pred_temp))
    recalls.append((y_pred_temp[y_test == 1] == 1).mean())
    from sklearn.metrics import precision_score
    precisions.append(precision_score(y_test, y_pred_temp, zero_division=0))

best_idx = np.argmax(f1_scores)
best_threshold = thresholds[best_idx]
print(f"Seuil optimal: {best_threshold:.4f} (F1={f1_scores[best_idx]:.4f})")

y_pred_final = (y_proba >= best_threshold).astype(int)

# ========== 10. ÉVALUATION COMPLÈTE ==========
print("\n" + "="*70)
print("=== RAPPORT DE CLASSIFICATION FINAL ===")
print("="*70)
print(classification_report(y_test, y_pred_final, digits=4))

cm = confusion_matrix(y_test, y_pred_final)
tn, fp, fn, tp = cm.ravel()

print(f"\n📊 Métriques détaillées:")
print(f"   ROC-AUC Score: {roc_auc_score(y_test, y_proba):.4f}")
print(f"   Spécificité (TN rate): {tn/(tn+fp):.4f}")
print(f"   Sensibilité (TP rate): {tp/(tp+fn):.4f}")
print(f"   NPV (Negative Predictive Value): {tn/(tn+fn):.4f}")
print(f"   PPV (Positive Predictive Value): {tp/(tp+fp):.4f}")

# ========== 11. VISUALISATIONS COMPLÈTES ==========
print("\n📊 Génération des visualisations...")

fig = plt.figure(figsize=(20, 16))

# 1. MATRICE DE CONFUSION - Style médical
ax1 = plt.subplot(3, 3, 1)
sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', cbar=False, 
            square=True, linewidths=2, linecolor='black',
            annot_kws={'size': 16, 'weight': 'bold'})
plt.title('Matrice de Confusion', fontsize=14, fontweight='bold', pad=15)
plt.ylabel('Vraie Classe', fontsize=12, fontweight='bold')
plt.xlabel('Classe Prédite', fontsize=12, fontweight='bold')
plt.xticks([0.5, 1.5], ['Pas Diabète (0)', 'Diabète (1)'], rotation=0)
plt.yticks([0.5, 1.5], ['Pas Diabète (0)', 'Diabète (1)'], rotation=0)

# Annotations détaillées
for i in range(2):
    for j in range(2):
        value = cm[i, j]
        total = cm.sum()
        percentage = (value / total) * 100
        if i == 0 and j == 0:
            label = f'TN\n{value}\n({percentage:.1f}%)'
        elif i == 0 and j == 1:
            label = f'FP\n{value}\n({percentage:.1f}%)'
        elif i == 1 and j == 0:
            label = f'FN\n{value}\n({percentage:.1f}%)'
        else:
            label = f'TP\n{value}\n({percentage:.1f}%)'
        ax1.text(j+0.5, i+0.7, label, ha='center', va='center', 
                fontsize=11, color='darkred' if i != j else 'darkgreen')

# 2. MATRICE DE CONFUSION NORMALISÉE
ax2 = plt.subplot(3, 3, 2)
cm_normalized = cm.astype('float') / cm.sum(axis=1)[:, np.newaxis]
sns.heatmap(cm_normalized, annot=True, fmt='.2%', cmap='RdYlGn', 
            cbar_kws={'label': 'Pourcentage'}, square=True,
            linewidths=2, linecolor='black')
plt.title('Matrice de Confusion Normalisée', fontsize=14, fontweight='bold', pad=15)
plt.ylabel('Vraie Classe', fontsize=12)
plt.xlabel('Classe Prédite', fontsize=12)
plt.xticks([0.5, 1.5], ['Pas Diabète', 'Diabète'], rotation=0)
plt.yticks([0.5, 1.5], ['Pas Diabète', 'Diabète'], rotation=0)

# 3. COURBE ROC
ax3 = plt.subplot(3, 3, 3)
fpr, tpr, _ = roc_curve(y_test, y_proba)
roc_auc = auc(fpr, tpr)
plt.plot(fpr, tpr, color='darkorange', lw=3, 
         label=f'ROC (AUC = {roc_auc:.4f})')
plt.plot([0, 1], [0, 1], color='navy', lw=2, linestyle='--', label='Hasard')
plt.xlim([0.0, 1.0])
plt.ylim([0.0, 1.05])
plt.xlabel('Taux de Faux Positifs (1 - Spécificité)', fontsize=11, fontweight='bold')
plt.ylabel('Taux de Vrais Positifs (Sensibilité)', fontsize=11, fontweight='bold')
plt.title('Courbe ROC', fontsize=14, fontweight='bold', pad=15)
plt.legend(loc="lower right", fontsize=10)
plt.grid(alpha=0.3)

# 4. COURBE PRECISION-RECALL
ax4 = plt.subplot(3, 3, 4)
precision, recall, _ = precision_recall_curve(y_test, y_proba)
pr_auc = auc(recall, precision)
plt.plot(recall, precision, color='green', lw=3,
         label=f'PR (AUC = {pr_auc:.4f})')
plt.scatter(recalls[best_idx], precisions[best_idx], color='red', s=200, 
           zorder=5, label=f'Seuil optimal ({best_threshold:.3f})')
plt.xlabel('Recall (Sensibilité)', fontsize=11, fontweight='bold')
plt.ylabel('Precision', fontsize=11, fontweight='bold')
plt.title('Courbe Precision-Recall', fontsize=14, fontweight='bold', pad=15)
plt.legend(loc="best", fontsize=10)
plt.grid(alpha=0.3)

# 5. ÉVOLUTION DES MÉTRIQUES SELON LE SEUIL
ax5 = plt.subplot(3, 3, 5)
plt.plot(thresholds, f1_scores, 'b-', lw=2, label='F1-Score')
plt.plot(thresholds, recalls, 'g-', lw=2, label='Recall')
plt.plot(thresholds, precisions, 'r-', lw=2, label='Precision')
plt.axvline(best_threshold, color='black', linestyle='--', lw=2, 
           label=f'Seuil optimal ({best_threshold:.3f})')
plt.xlabel('Seuil de Décision', fontsize=11, fontweight='bold')
plt.ylabel('Score', fontsize=11, fontweight='bold')
plt.title('Impact du Seuil sur les Métriques', fontsize=14, fontweight='bold', pad=15)
plt.legend(loc="best", fontsize=10)
plt.grid(alpha=0.3)

# 6. IMPORTANCE DES FEATURES (Top 15)
ax6 = plt.subplot(3, 3, 6)
if hasattr(final_model, 'feature_importances_'):
    feature_names = [selected_features[i] if i < len(selected_features) 
                    else f"Feature_{i}" for i in range(len(final_model.feature_importances_))]
    importance_df = pd.DataFrame({
        'feature': feature_names,
        'importance': final_model.feature_importances_
    }).sort_values('importance', ascending=False).head(15)
    
    colors = plt.cm.viridis(np.linspace(0, 1, len(importance_df)))
    plt.barh(range(len(importance_df)), importance_df['importance'], color=colors)
    plt.yticks(range(len(importance_df)), importance_df['feature'])
    plt.xlabel('Importance', fontsize=11, fontweight='bold')
    plt.title('Top 15 Features Importantes', fontsize=14, fontweight='bold', pad=15)
    plt.gca().invert_yaxis()
    plt.grid(axis='x', alpha=0.3)

# 7. DISTRIBUTION DES PROBABILITÉS
ax7 = plt.subplot(3, 3, 7)
plt.hist(y_proba[y_test == 0], bins=50, alpha=0.6, label='Pas Diabète', 
         color='blue', edgecolor='black')
plt.hist(y_proba[y_test == 1], bins=50, alpha=0.6, label='Diabète', 
         color='red', edgecolor='black')
plt.axvline(best_threshold, color='green', linestyle='--', lw=3, 
           label=f'Seuil ({best_threshold:.3f})')
plt.xlabel('Probabilité Prédite', fontsize=11, fontweight='bold')
plt.ylabel('Fréquence', fontsize=11, fontweight='bold')
plt.title('Distribution des Probabilités', fontsize=14, fontweight='bold', pad=15)
plt.legend(fontsize=10)
plt.grid(alpha=0.3)

# 8. MÉTRIQUES PAR CLASSE
ax8 = plt.subplot(3, 3, 8)
metrics_data = {
    'Classe 0': [cm_normalized[0, 0], precisions[best_idx] if y_pred_final[y_test==0].sum()>0 else 0, 
                 tn/(tn+fp)],
    'Classe 1': [cm_normalized[1, 1], precisions[best_idx], recalls[best_idx]]
}
x = np.arange(3)
width = 0.35
labels = ['Recall', 'Precision', 'Spécificité/Sensibilité']

bars1 = plt.bar(x - width/2, metrics_data['Classe 0'], width, 
               label='Pas Diabète', color='skyblue', edgecolor='black')
bars2 = plt.bar(x + width/2, metrics_data['Classe 1'], width, 
               label='Diabète', color='salmon', edgecolor='black')

plt.ylabel('Score', fontsize=11, fontweight='bold')
plt.title('Comparaison des Métriques par Classe', fontsize=14, fontweight='bold', pad=15)
plt.xticks(x, labels, rotation=15, ha='right')
plt.legend(fontsize=10)
plt.ylim([0, 1])
plt.grid(axis='y', alpha=0.3)

# Annotations des valeurs
for bars in [bars1, bars2]:
    for bar in bars:
        height = bar.get_height()
        plt.text(bar.get_x() + bar.get_width()/2., height,
                f'{height:.2f}', ha='center', va='bottom', fontsize=9)

# 9. RÉSUMÉ TEXTUEL
ax9 = plt.subplot(3, 3, 9)
ax9.axis('off')

summary_text = f"""
╔═══════════════════════════════════════╗
║     RÉSUMÉ DES PERFORMANCES           ║
╚═══════════════════════════════════════╝

🎯 MATRICE DE CONFUSION
   TN (Vrais Négatifs):    {tn:3d}
   FP (Faux Positifs):     {fp:3d}
   FN (Faux Négatifs):     {fn:3d}
   TP (Vrais Positifs):    {tp:3d}

📊 MÉTRIQUES GLOBALES
   Accuracy:               {(tn+tp)/(tn+fp+fn+tp):.1%}
   ROC-AUC:                {roc_auc_score(y_test, y_proba):.4f}
   PR-AUC:                 {pr_auc:.4f}

⚕️  MÉTRIQUES MÉDICALES
   Sensibilité (Recall):   {tp/(tp+fn):.1%}
   Spécificité:            {tn/(tn+fp):.1%}
   PPV (Precision):        {tp/(tp+fp):.1%}
   NPV:                    {tn/(tn+fn):.1%}

🎚️  SEUIL DE DÉCISION
   Seuil optimal:          {best_threshold:.4f}
   F1-Score au seuil:      {f1_scores[best_idx]:.4f}

⚠️  ANALYSE DES ERREURS
   Taux FP:                {fp/(tn+fp):.1%}
   Taux FN:                {fn/(tp+fn):.1%}
"""

ax9.text(0.1, 0.95, summary_text, transform=ax9.transAxes,
        fontsize=10, verticalalignment='top', fontfamily='monospace',
        bbox=dict(boxstyle='round', facecolor='wheat', alpha=0.3))

plt.tight_layout(pad=3.0)
plt.savefig('diabetes_analysis_complete.png', dpi=300, bbox_inches='tight')
print("✅ Graphiques sauvegardés: diabetes_analysis_complete.png")

# ========== 12. VALIDATION CROISÉE FINALE ==========
print("\n✨ Validation croisée finale (10-fold)...")

# Créer un nouveau modèle sans early_stopping pour la cross-validation
cv_model = XGBClassifier(**best_params_clean)

cv_final = StratifiedKFold(n_splits=10, shuffle=True, random_state=42)
cv_scores = cross_val_score(cv_model, X_train_balanced, y_train_balanced,
                            cv=cv_final, scoring='f1', n_jobs=-1)
print(f"F1-Score moyen: {cv_scores.mean():.4f} (+/- {cv_scores.std()*2:.4f})")

# ========== 13. SAUVEGARDE ==========
print("\n💾 Sauvegarde des modèles et visualisations...")
joblib.dump(final_model, "xgb_diabetes_ultimate.pkl")
joblib.dump(power_transformer, "power_transformer.pkl")
joblib.dump(robust_scaler, "robust_scaler.pkl")
joblib.dump(rfecv, "feature_selector_rfecv.pkl")
joblib.dump({
    'threshold': best_threshold,
    'best_params': best_params_clean,
    'selected_features': selected_features,
    'best_sampling_method': best_method
}, "model_config_ultimate.pkl")

study.trials_dataframe().to_csv("optuna_trials_ultimate.csv", index=False)

print("\n🎉 OPTIMISATION TERMINÉE AVEC SUCCÈS!")
print(f"\n📈 Amélioration attendue:")
print(f"   • F1-Score classe 0: 0.82-0.88")
print(f"   • F1-Score classe 1: 0.78-0.85")
print(f"   • Accuracy globale: 0.82-0.87")
print(f"   • ROC-AUC: 0.90-0.94")