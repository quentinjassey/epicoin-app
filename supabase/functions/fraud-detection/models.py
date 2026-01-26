"""
Entraînement et validation modèles ML de détection de fraude
Dataset: PaySim (Kaggle)
Objectif: Recall ≥85%, Latency P95 <300ms
"""

import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from xgboost import XGBClassifier
from sklearn.metrics import (
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    classification_report,
    confusion_matrix
)
import time
import json
import pickle
from pathlib import Path

# Configuration
RANDOM_STATE = 42
TEST_SIZE = 0.3

def download_and_load_dataset():
    """
    Télécharger le dataset PaySim
    
    Instructions manuelles:
    1. Aller sur https://www.kaggle.com/datasets/ealaxi/paysim1
    2. Télécharger PS_20174392719_1491204439457_log.csv
    3. Placer dans supabase/functions/fraud-detection/data/
    
    Pour automatiser (si Kaggle API configurée):
    pip install kaggle
    kaggle datasets download -d ealaxi/paysim1
    """
    data_path = Path(__file__).parent / "data" / "PS_20174392719_1491204439457_log.csv"
    
    if not data_path.exists():
        print(f"❌ Dataset non trouvé : {data_path}")
        print("📥 Téléchargement manuel requis:")
        print("1. https://www.kaggle.com/datasets/ealaxi/paysim1")
        print(f"2. Placer dans: {data_path.parent}")
        return None
    
    print(f"📁 Chargement dataset: {data_path}")
    df = pd.read_csv(data_path)
    print(f"✅ Dataset chargé: {len(df):,} transactions")
    print(f"   Fraudes: {df['isFraud'].sum():,} ({df['isFraud'].mean()*100:.2f}%)")
    
    return df

def engineer_features(df):
    """
    Feature engineering pour améliorer détection
    """
    print("\n🔧 Feature engineering...")
    
    # 1. Différence balance (envoyeur)
    df['delta_balance_orig'] = df['oldbalanceOrg'] - df['newbalanceOrig'] - df['amount']
    
    # 2. Différence balance (destinataire)
    df['delta_balance_dest'] = df['oldbalanceDest'] - df['newbalanceDest'] + df['amount']
    
    # 3. Ratio montant / balance initiale
    df['ratio_amount_balance_orig'] = df['amount'] / (df['oldbalanceOrg'] + 1)  # +1 pour éviter division par 0
    df['ratio_amount_balance_dest'] = df['amount'] / (df['oldbalanceDest'] + 1)
    
    # 4. Balance nulle après transaction (suspect)
    df['dest_balance_zero_after'] = (df['newbalanceDest'] == 0).astype(int)
    df['orig_balance_zero_after'] = (df['newbalanceOrig'] == 0).astype(int)
    
    # 5. Transaction très élevée (>200k)
    df['is_high_amount'] = (df['amount'] > 200000).astype(int)
    
    # 6. Type transaction (encoder)
    le_type = LabelEncoder()
    df['type_encoded'] = le_type.fit_transform(df['type'])
    
    print(f"✅ {len(df.columns)} features créées")
    
    return df, le_type

def prepare_data(df):
    """
    Préparer données pour entraînement
    """
    print("\n📊 Préparation données...")
    
    # Features utilisées
    feature_cols = [
        'step', 'amount', 'oldbalanceOrg', 'newbalanceOrig',
        'oldbalanceDest', 'newbalanceDest', 'type_encoded',
        'delta_balance_orig', 'delta_balance_dest',
        'ratio_amount_balance_orig', 'ratio_amount_balance_dest',
        'dest_balance_zero_after', 'orig_balance_zero_after',
        'is_high_amount'
    ]
    
    X = df[feature_cols]
    y = df['isFraud']
    
    # Split train/test
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=TEST_SIZE, random_state=RANDOM_STATE, stratify=y
    )
    
    # Scaling
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    print(f"✅ Train: {len(X_train):,} | Test: {len(X_test):,}")
    print(f"   Fraudes train: {y_train.sum():,} ({y_train.mean()*100:.2f}%)")
    print(f"   Fraudes test: {y_test.sum():,} ({y_test.mean()*100:.2f}%)")
    
    return X_train_scaled, X_test_scaled, y_train, y_test, scaler, feature_cols

def train_logistic_regression(X_train, y_train, X_test, y_test):
    """
    Modèle 1: Logistic Regression (baseline)
    """
    print("\n🔵 Entraînement Logistic Regression...")
    
    model = LogisticRegression(
        random_state=RANDOM_STATE,
        max_iter=1000,
        class_weight='balanced',  # Important pour classes déséquilibrées
        solver='lbfgs'
    )
    
    start_time = time.time()
    model.fit(X_train, y_train)
    train_time = time.time() - start_time
    
    # Prédictions
    y_pred = model.predict(X_test)
    y_pred_proba = model.predict_proba(X_test)[:, 1]
    
    # Métriques
    metrics = {
        'model': 'Logistic Regression',
        'train_time_s': round(train_time, 2),
        'precision': round(precision_score(y_test, y_pred), 3),
        'recall': round(recall_score(y_test, y_pred), 3),
        'f1_score': round(f1_score(y_test, y_pred), 3),
        'auc_roc': round(roc_auc_score(y_test, y_pred_proba), 3)
    }
    
    # Latence (moyenne sur 1000 prédictions)
    latencies = []
    for _ in range(1000):
        start = time.time()
        _ = model.predict([X_test[0]])
        latencies.append((time.time() - start) * 1000)  # ms
    
    metrics['latency_p50_ms'] = round(np.percentile(latencies, 50), 2)
    metrics['latency_p95_ms'] = round(np.percentile(latencies, 95), 2)
    metrics['latency_p99_ms'] = round(np.percentile(latencies, 99), 2)
    
    print(f"✅ Precision: {metrics['precision']:.3f} | Recall: {metrics['recall']:.3f} | AUC: {metrics['auc_roc']:.3f}")
    print(f"   Latency P95: {metrics['latency_p95_ms']:.2f}ms")
    
    return model, metrics

def train_random_forest(X_train, y_train, X_test, y_test):
    """
    Modèle 2: Random Forest (optimisé latence)
    """
    print("\n🌲 Entraînement Random Forest...")
    
    model = RandomForestClassifier(
        n_estimators=50,  # Réduit pour latence
        max_depth=10,     # Réduit pour latence
        min_samples_split=5,
        min_samples_leaf=2,
        random_state=RANDOM_STATE,
        class_weight='balanced',
        n_jobs=-1
    )
    
    start_time = time.time()
    model.fit(X_train, y_train)
    train_time = time.time() - start_time
    
    # Prédictions
    y_pred = model.predict(X_test)
    y_pred_proba = model.predict_proba(X_test)[:, 1]
    
    # Métriques
    metrics = {
        'model': 'Random Forest',
        'train_time_s': round(train_time, 2),
        'precision': round(precision_score(y_test, y_pred), 3),
        'recall': round(recall_score(y_test, y_pred), 3),
        'f1_score': round(f1_score(y_test, y_pred), 3),
        'auc_roc': round(roc_auc_score(y_test, y_pred_proba), 3)
    }
    
    # Latence
    latencies = []
    for _ in range(1000):
        start = time.time()
        _ = model.predict([X_test[0]])
        latencies.append((time.time() - start) * 1000)
    
    metrics['latency_p50_ms'] = round(np.percentile(latencies, 50), 2)
    metrics['latency_p95_ms'] = round(np.percentile(latencies, 95), 2)
    metrics['latency_p99_ms'] = round(np.percentile(latencies, 99), 2)
    
    # Feature importance
    feature_importance = sorted(
        zip(range(len(model.feature_importances_)), model.feature_importances_),
        key=lambda x: x[1],
        reverse=True
    )[:5]
    metrics['top_features'] = [{'feature_idx': int(idx), 'importance': round(imp, 3)} for idx, imp in feature_importance]
    
    print(f"✅ Precision: {metrics['precision']:.3f} | Recall: {metrics['recall']:.3f} | AUC: {metrics['auc_roc']:.3f}")
    print(f"   Latency P95: {metrics['latency_p95_ms']:.2f}ms")
    
    return model, metrics

def train_xgboost(X_train, y_train, X_test, y_test):
    """
    Modèle 3: XGBoost (meilleur performance)
    """
    print("\n🚀 Entraînement XGBoost...")
    
    # Calculer scale_pos_weight pour classes déséquilibrées
    scale_pos_weight = (y_train == 0).sum() / (y_train == 1).sum()
    
    model = XGBClassifier(
        n_estimators=100,
        max_depth=6,
        learning_rate=0.1,
        scale_pos_weight=scale_pos_weight,
        random_state=RANDOM_STATE,
        use_label_encoder=False,
        eval_metric='logloss',
        n_jobs=-1
    )
    
    start_time = time.time()
    model.fit(X_train, y_train)
    train_time = time.time() - start_time
    
    # Prédictions
    y_pred = model.predict(X_test)
    y_pred_proba = model.predict_proba(X_test)[:, 1]
    
    # Métriques
    metrics = {
        'model': 'XGBoost',
        'train_time_s': round(train_time, 2),
        'precision': round(precision_score(y_test, y_pred), 3),
        'recall': round(recall_score(y_test, y_pred), 3),
        'f1_score': round(f1_score(y_test, y_pred), 3),
        'auc_roc': round(roc_auc_score(y_test, y_pred_proba), 3)
    }
    
    # Latence
    latencies = []
    for _ in range(1000):
        start = time.time()
        _ = model.predict([X_test[0]])
        latencies.append((time.time() - start) * 1000)
    
    metrics['latency_p50_ms'] = round(np.percentile(latencies, 50), 2)
    metrics['latency_p95_ms'] = round(np.percentile(latencies, 95), 2)
    metrics['latency_p99_ms'] = round(np.percentile(latencies, 99), 2)
    
    # Feature importance
    feature_importance = sorted(
        zip(range(len(model.feature_importances_)), model.feature_importances_),
        key=lambda x: x[1],
        reverse=True
    )[:5]
    metrics['top_features'] = [{'feature_idx': int(idx), 'importance': round(float(imp), 3)} for idx, imp in feature_importance]
    
    print(f"✅ Precision: {metrics['precision']:.3f} | Recall: {metrics['recall']:.3f} | AUC: {metrics['auc_roc']:.3f}")
    print(f"   Latency P95: {metrics['latency_p95_ms']:.2f}ms")
    
    return model, metrics

def save_models(models, scalers, feature_cols):
    """
    Sauvegarder modèles et metadata
    """
    print("\n💾 Sauvegarde modèles...")
    
    output_dir = Path(__file__).parent / "trained_models"
    output_dir.mkdir(exist_ok=True)
    
    for name, model in models.items():
        model_path = output_dir / f"{name.lower().replace(' ', '_')}.pkl"
        with open(model_path, 'wb') as f:
            pickle.dump(model, f)
        print(f"✅ {name} → {model_path}")
    
    # Sauvegarder scaler
    scaler_path = output_dir / "scaler.pkl"
    with open(scaler_path, 'wb') as f:
        pickle.dump(scalers, f)
    print(f"✅ Scaler → {scaler_path}")
    
    # Sauvegarder feature columns
    metadata = {
        'feature_columns': feature_cols,
        'num_features': len(feature_cols)
    }
    metadata_path = output_dir / "metadata.json"
    with open(metadata_path, 'w') as f:
        json.dump(metadata, f, indent=2)
    print(f"✅ Metadata → {metadata_path}")

def save_metrics(all_metrics):
    """
    Sauvegarder métriques pour documentation
    """
    print("\n📊 Sauvegarde métriques...")
    
    output_path = Path(__file__).parent / "metrics.json"
    
    # Choisir meilleur modèle (recall + latency)
    best_model = None
    best_score = 0
    
    for metrics in all_metrics:
        # Score = recall (weight 70%) + latency_ok (weight 30%)
        latency_ok = 1.0 if metrics['latency_p95_ms'] < 300 else 0.5
        score = metrics['recall'] * 0.7 + latency_ok * 0.3
        
        if score > best_score:
            best_score = score
            best_model = metrics['model']
    
    output = {
        'dataset': 'PaySim',
        'test_date': pd.Timestamp.now().isoformat(),
        'best_model': best_model,
        'models': all_metrics,
        'requirements': {
            'recall_min': 0.85,
            'latency_p95_max_ms': 300
        },
        'validation': {
            'recall_passed': any(m['recall'] >= 0.85 for m in all_metrics),
            'latency_passed': any(m['latency_p95_ms'] < 300 for m in all_metrics)
        }
    }
    
    with open(output_path, 'w') as f:
        json.dump(output, f, indent=2)
    
    print(f"✅ Métriques → {output_path}")
    print(f"🏆 Meilleur modèle: {best_model}")

def main():
    """
    Pipeline complet d'entraînement
    """
    print("="*60)
    print("🤖 ENTRAÎNEMENT MODÈLES DÉTECTION FRAUDE")
    print("="*60)
    
    # 1. Charger dataset
    df = download_and_load_dataset()
    if df is None:
        return
    
    # 2. Feature engineering
    df, label_encoder = engineer_features(df)
    
    # 3. Préparer données
    X_train, X_test, y_train, y_test, scaler, feature_cols = prepare_data(df)
    
    # 4. Entraîner modèles
    lr_model, lr_metrics = train_logistic_regression(X_train, y_train, X_test, y_test)
    rf_model, rf_metrics = train_random_forest(X_train, y_train, X_test, y_test)
    xgb_model, xgb_metrics = train_xgboost(X_train, y_train, X_test, y_test)
    
    # 5. Sauvegarder
    models = {
        'Logistic Regression': lr_model,
        'Random Forest': rf_model,
        'XGBoost': xgb_model
    }
    save_models(models, scaler, feature_cols)
    
    all_metrics = [lr_metrics, rf_metrics, xgb_metrics]
    save_metrics(all_metrics)
    
    # 6. Résumé
    print("\n" + "="*60)
    print("📊 RÉSUMÉ COMPARATIF")
    print("="*60)
    print(f"{'Modèle':<20} {'Recall':<10} {'Precision':<10} {'Latency P95':<15} {'Validation'}")
    print("-"*75)
    
    for m in all_metrics:
        recall_ok = "✅" if m['recall'] >= 0.85 else "❌"
        latency_ok = "✅" if m['latency_p95_ms'] < 300 else "❌"
        print(f"{m['model']:<20} {m['recall']:<10.3f} {m['precision']:<10.3f} {m['latency_p95_ms']:<15.2f} {recall_ok} {latency_ok}")
    
    print("\n✅ Entraînement terminé!")

if __name__ == "__main__":
    main()

