"""
API FastAPI pour servir le modèle de détection de fraude enrichi
"""

import json
import pickle
from typing import Dict

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="EpiCoin Fraud Detection API - Enriched Model")

# CORS pour permettre les requêtes depuis Supabase Edge Functions
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Charger le modèle, scaler et encoders au démarrage
print("🔄 Chargement du modèle enrichi...")

with open('../supabase/functions/fraud-detection/fraud_model_enriched.pkl', 'rb') as f:
    model = pickle.load(f)
    print("  ✅ Modèle chargé")

with open('../supabase/functions/fraud-detection/scaler_enriched.pkl', 'rb') as f:
    scaler = pickle.load(f)
    print("  ✅ Scaler chargé")

with open('../supabase/functions/fraud-detection/label_encoders_enriched.pkl', 'rb') as f:
    encoders = pickle.load(f)
    print("  ✅ Encoders chargés")

with open('../supabase/functions/fraud-detection/model_metadata_enriched.json', 'r') as f:
    metadata = json.load(f)
    print("  ✅ Métadonnées chargées")

print(f"🎯 Modèle: {metadata['model_type'].upper()}")
print(f"📊 Accuracy: {metadata['accuracy']:.1%}")
print(f"⏱️  Latence: {metadata['latency_ms']:.2f} ms")
print()


class TransactionFeatures(BaseModel):
    """Features d'une transaction pour prédiction"""
    amount: float
    fraud_score: int  # Score heuristique (0-100)
    hour: int
    day_of_week: int
    execution_delay: float
    transaction_type: str  # P2P, MERCHANT, CASHIN
    direction: str  # incoming, outgoing
    country: str  # FR, BE, etc.
    city: str
    provider: str  # stripe, intercampus, etc.
    status: str  # pending, completed, failed
    os_name: str  # iOS, Android, etc.
    type: str  # topup, transfer, purchase
    user_avg_amount: float
    user_std_amount: float
    user_tx_count: int
    user_fraud_ratio: float
    amount_deviation: float
    device_tx_count: int


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "ok",
        "model": metadata['model_type'],
        "version": "enriched_v1",
        "accuracy": metadata['accuracy'],
        "auc_roc": metadata['auc_roc'],
        "latency_ms": metadata['latency_ms']
    }


@app.get("/health")
async def health():
    """Detailed health check"""
    return {
        "status": "healthy",
        "model_loaded": model is not None,
        "scaler_loaded": scaler is not None,
        "encoders_loaded": encoders is not None,
        "metadata": metadata
    }


@app.post("/predict")
async def predict(features: TransactionFeatures):
    """
    Prédire le score de fraude pour une transaction
    
    Returns:
        - fraud_score: Score de fraude (0-100)
        - is_fraud: Booléen (True si fraude probable)
        - confidence: Niveau de confiance (0-1)
    """
    try:
        # Construire le vecteur de features dans le bon ordre
        feature_vector = []
        
        # Features numériques directes
        feature_vector.append(features.amount)
        feature_vector.append(features.fraud_score)
        feature_vector.append(features.hour)
        feature_vector.append(features.day_of_week)
        feature_vector.append(features.execution_delay)
        
        # Encoder les features catégorielles
        categorical_features = [
            ('transaction_type', features.transaction_type),
            ('direction', features.direction),
            ('country', features.country),
            ('city', features.city),
            ('provider', features.provider),
            ('status', features.status),
            ('os_name', features.os_name),
            ('type', features.type)
        ]
        
        for feature_name, value in categorical_features:
            if feature_name in encoders:
                try:
                    # Encoder la valeur
                    encoded = encoders[feature_name].transform([value])[0]
                except:
                    # Valeur inconnue, utiliser -1
                    encoded = -1
            else:
                encoded = -1
            feature_vector.append(encoded)
        
        # Features statistiques utilisateur
        feature_vector.append(features.user_avg_amount)
        feature_vector.append(features.user_std_amount)
        feature_vector.append(features.user_tx_count)
        feature_vector.append(features.user_fraud_ratio)
        feature_vector.append(features.amount_deviation)
        feature_vector.append(features.device_tx_count)
        
        # Normaliser
        features_scaled = scaler.transform([feature_vector])
        
        # Prédire
        fraud_proba = model.predict_proba(features_scaled)[0][1]
        fraud_score_ml = int(fraud_proba * 100)
        
        # Décision
        is_fraud = fraud_score_ml > 70
        
        return {
            "fraud_score": fraud_score_ml,
            "is_fraud": is_fraud,
            "confidence": float(fraud_proba),
            "model": metadata['model_type']
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur de prédiction: {str(e)}")


@app.post("/predict_batch")
async def predict_batch(transactions: list[TransactionFeatures]):
    """
    Prédire pour un batch de transactions
    """
    results = []
    for transaction in transactions:
        result = await predict(transaction)
        results.append(result)
    
    return {
        "predictions": results,
        "count": len(results)
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
