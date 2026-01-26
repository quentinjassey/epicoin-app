"""
Script d'entraînement du modèle de détection de fraude enrichi
Utilise les transactions synthétiques avec features enrichies
"""

import json
import os
import pickle
from datetime import datetime

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, confusion_matrix, roc_auc_score
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler
from supabase import Client, create_client
from xgboost import XGBClassifier

# Configuration Supabase
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://srvkyiugewdjrpvcmquq.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

print("=" * 80)
print("🤖 Entraînement du Modèle de Détection de Fraude Enrichi")
print("=" * 80)
print()

# 1. Récupérer les données depuis Supabase
print("📥 Étape 1/6 : Récupération des transactions depuis Supabase...")

if not SUPABASE_KEY:
    print("❌ SUPABASE_SERVICE_ROLE_KEY non configurée !")
    print("   Exportez: export SUPABASE_SERVICE_ROLE_KEY='votre_clé'")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Récupérer toutes les transactions
response = supabase.table('transactions').select('*').execute()
transactions = response.data

if not transactions:
    print("❌ Aucune transaction trouvée dans la base de données !")
    print("   Exécutez d'abord generate_synthetic_transactions.py")
    exit(1)

print(f"  ✅ {len(transactions)} transactions récupérées")

# 2. Préparer le DataFrame
print("\n🔧 Étape 2/6 : Préparation des features...")

df = pd.DataFrame(transactions)

# Extraire le label (is_fraud) depuis fraud_features
df['is_fraud'] = df['fraud_features'].apply(
    lambda x: json.loads(x).get('is_fraud', False) if x else False
)

# Extraire device_info si c'est un JSON string
def extract_device_info(device_info):
    if isinstance(device_info, str):
        try:
            return json.loads(device_info)
        except:
            return {}
    return device_info or {}

df['device_info_parsed'] = df['device_info'].apply(extract_device_info)
df['device_id'] = df['device_info_parsed'].apply(lambda x: x.get('device_id', 'unknown'))
df['os_name'] = df['device_info_parsed'].apply(lambda x: x.get('os_name', 'unknown'))

# Convertir les timestamps
df['created_at'] = pd.to_datetime(df['created_at'])
df['executed_at'] = pd.to_datetime(df['executed_at'])

# Calculer des features temporelles
df['hour'] = df['created_at'].dt.hour
df['day_of_week'] = df['created_at'].dt.dayofweek
df['execution_delay'] = (df['executed_at'] - df['created_at']).dt.total_seconds()

# Features de base
df['amount_numeric'] = pd.to_numeric(df['amount'], errors='coerce')

print(f"  ✅ DataFrame créé avec {len(df)} lignes et {len(df.columns)} colonnes")
print(f"  📊 Distribution fraudes: {df['is_fraud'].sum()} fraudes ({df['is_fraud'].sum()/len(df)*100:.1f}%)")

# 3. Feature Engineering
print("\n🧮 Étape 3/6 : Feature engineering...")

# Encoder les variables catégorielles
label_encoders = {}

categorical_features = [
    'transaction_type', 'direction', 'country', 'city', 
    'provider', 'status', 'os_name', 'type'
]

for feature in categorical_features:
    if feature in df.columns:
        le = LabelEncoder()
        df[feature + '_encoded'] = le.fit_transform(df[feature].fillna('unknown').astype(str))
        label_encoders[feature] = le

# Features statistiques par utilisateur
user_stats = df.groupby('sender_id').agg({
    'amount_numeric': ['mean', 'std', 'count'],
    'is_fraud': 'sum'
}).reset_index()
user_stats.columns = ['sender_id', 'user_avg_amount', 'user_std_amount', 'user_tx_count', 'user_fraud_count']
df = df.merge(user_stats, on='sender_id', how='left')

# Ratio fraude par utilisateur
df['user_fraud_ratio'] = df['user_fraud_count'] / df['user_tx_count']
df['user_fraud_ratio'] = df['user_fraud_ratio'].fillna(0)

# Features de déviation
df['amount_deviation'] = (df['amount_numeric'] - df['user_avg_amount']) / (df['user_std_amount'] + 1)
df['amount_deviation'] = df['amount_deviation'].fillna(0)

# Compter les transactions par device
device_tx_count = df.groupby('device_id').size().to_dict()
df['device_tx_count'] = df['device_id'].map(device_tx_count)

# Features sélectionnées pour l'entraînement
feature_columns = [
    'amount_numeric',
    'fraud_score',
    'hour',
    'day_of_week',
    'execution_delay',
    'transaction_type_encoded',
    'direction_encoded',
    'country_encoded',
    'city_encoded',
    'provider_encoded',
    'status_encoded',
    'os_name_encoded',
    'type_encoded',
    'user_avg_amount',
    'user_std_amount',
    'user_tx_count',
    'user_fraud_ratio',
    'amount_deviation',
    'device_tx_count'
]

# Vérifier que toutes les features existent
available_features = [f for f in feature_columns if f in df.columns]
print(f"  ✅ {len(available_features)} features disponibles sur {len(feature_columns)}")

# Préparer X et y
X = df[available_features].fillna(0)
y = df['is_fraud'].astype(int)

print(f"  📊 Shape finale: X={X.shape}, y={y.shape}")

# 4. Split train/test
print("\n✂️  Étape 4/6 : Split train/test (80/20)...")

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

print(f"  ✅ Train: {len(X_train)} samples ({y_train.sum()} fraudes)")
print(f"  ✅ Test: {len(X_test)} samples ({y_test.sum()} fraudes)")

# Normalisation
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)

# 5. Entraînement des modèles
print("\n🚀 Étape 5/6 : Entraînement des modèles...")

models = {}

# Random Forest
print("\n  🌲 Random Forest...")
rf = RandomForestClassifier(
    n_estimators=100,
    max_depth=10,
    min_samples_split=10,
    class_weight='balanced',
    random_state=42,
    n_jobs=-1
)
rf.fit(X_train_scaled, y_train)
models['random_forest'] = rf

y_pred_rf = rf.predict(X_test_scaled)
y_proba_rf = rf.predict_proba(X_test_scaled)[:, 1]

print(f"    ✅ Entraîné")
print(f"    📊 Accuracy: {rf.score(X_test_scaled, y_test):.3f}")
print(f"    📊 AUC-ROC: {roc_auc_score(y_test, y_proba_rf):.3f}")

# XGBoost
print("\n  ⚡ XGBoost...")
xgb = XGBClassifier(
    n_estimators=100,
    max_depth=6,
    learning_rate=0.1,
    scale_pos_weight=len(y_train[y_train == 0]) / len(y_train[y_train == 1]),
    random_state=42,
    n_jobs=-1
)
xgb.fit(X_train_scaled, y_train)
models['xgboost'] = xgb

y_pred_xgb = xgb.predict(X_test_scaled)
y_proba_xgb = xgb.predict_proba(X_test_scaled)[:, 1]

print(f"    ✅ Entraîné")
print(f"    📊 Accuracy: {xgb.score(X_test_scaled, y_test):.3f}")
print(f"    📊 AUC-ROC: {roc_auc_score(y_test, y_proba_xgb):.3f}")

# 6. Évaluation et sélection du meilleur modèle
print("\n📊 Étape 6/6 : Évaluation et sélection...")

print("\n🌲 Random Forest - Rapport de classification:")
print(classification_report(y_test, y_pred_rf, target_names=['Légit', 'Fraude']))

print("\n⚡ XGBoost - Rapport de classification:")
print(classification_report(y_test, y_pred_xgb, target_names=['Légit', 'Fraude']))

# Mesurer la latence
import time

# Random Forest
start = time.perf_counter()
for _ in range(100):
    rf.predict(X_test_scaled[:1])
rf_latency = (time.perf_counter() - start) / 100 * 1000  # en ms

# XGBoost
start = time.perf_counter()
for _ in range(100):
    xgb.predict(X_test_scaled[:1])
xgb_latency = (time.perf_counter() - start) / 100 * 1000  # en ms

print(f"\n⏱️  Latence moyenne (1 prédiction):")
print(f"  🌲 Random Forest: {rf_latency:.2f} ms")
print(f"  ⚡ XGBoost: {xgb_latency:.2f} ms")

# Sélectionner le meilleur modèle (XGBoost généralement meilleur)
best_model = xgb
best_model_name = 'xgboost'
print(f"\n🏆 Meilleur modèle sélectionné: {best_model_name.upper()}")

# 7. Sauvegarder le modèle
print("\n💾 Sauvegarde du modèle...")

model_dir = "/Users/quent/Documents/PGD 5/epicoin-app/supabase/functions/fraud-detection"

# Sauvegarder le modèle
with open(f'{model_dir}/fraud_model_enriched.pkl', 'wb') as f:
    pickle.dump(best_model, f)
print(f"  ✅ Modèle sauvegardé: fraud_model_enriched.pkl")

# Sauvegarder le scaler
with open(f'{model_dir}/scaler_enriched.pkl', 'wb') as f:
    pickle.dump(scaler, f)
print(f"  ✅ Scaler sauvegardé: scaler_enriched.pkl")

# Sauvegarder les encoders
with open(f'{model_dir}/label_encoders_enriched.pkl', 'wb') as f:
    pickle.dump(label_encoders, f)
print(f"  ✅ Encoders sauvegardés: label_encoders_enriched.pkl")

# Sauvegarder les métadonnées
metadata = {
    'model_type': best_model_name,
    'features': available_features,
    'training_date': datetime.now().isoformat(),
    'training_samples': len(X_train),
    'test_samples': len(X_test),
    'fraud_ratio': float(y.sum() / len(y)),
    'accuracy': float(best_model.score(X_test_scaled, y_test)),
    'auc_roc': float(roc_auc_score(y_test, y_proba_xgb)),
    'latency_ms': float(xgb_latency)
}

with open(f'{model_dir}/model_metadata_enriched.json', 'w') as f:
    json.dump(metadata, f, indent=2)
print(f"  ✅ Métadonnées sauvegardées: model_metadata_enriched.json")

# Feature importance
if hasattr(best_model, 'feature_importances_'):
    feature_importance = pd.DataFrame({
        'feature': available_features,
        'importance': best_model.feature_importances_
    }).sort_values('importance', ascending=False)
    
    print(f"\n📊 Top 10 features les plus importantes:")
    for idx, row in feature_importance.head(10).iterrows():
        print(f"  {row['feature']:30s} : {row['importance']:.4f}")

print("\n" + "=" * 80)
print("✅ ENTRAÎNEMENT TERMINÉ AVEC SUCCÈS !")
print("=" * 80)
print()
print("📁 Fichiers générés:")
print(f"  • {model_dir}/fraud_model_enriched.pkl")
print(f"  • {model_dir}/scaler_enriched.pkl")
print(f"  • {model_dir}/label_encoders_enriched.pkl")
print(f"  • {model_dir}/model_metadata_enriched.json")
print()
print("🚀 Prochaines étapes:")
print("  1. Uploader le modèle sur Hugging Face (optionnel)")
print("  2. Mettre à jour la fonction fraud-detection pour utiliser le nouveau modèle")
print("  3. Tester en conditions réelles")
print()
