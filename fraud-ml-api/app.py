"""
API FastAPI pour Détection de Fraude ML - Epicoin
Sert le modèle XGBoost entraîné pour prédictions temps réel

Usage:
    uvicorn app:app --reload --port 8000
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Dict, List, Optional
import pickle
import numpy as np
import xgboost as xgb
from pathlib import Path
import logging

# Configuration logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialisation FastAPI
app = FastAPI(
    title="Epicoin Fraud Detection API",
    description="Machine Learning API pour détection de fraude en temps réel",
    version="1.0.0"
)

# CORS (autoriser Supabase Edge Functions)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # En production: restreindre aux domaines Supabase
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Modèles chargés en mémoire (initialisés au démarrage)
MODEL = None
SCALER = None
METADATA = None

# Schémas Pydantic
class TransactionFeatures(BaseModel):
    """Features d'une transaction pour prédiction"""
    amount: float = Field(..., description="Montant de la transaction")
    oldbalanceOrg: float = Field(..., description="Solde origine avant transaction")
    newbalanceOrig: float = Field(..., description="Solde origine après transaction")
    oldbalanceDest: float = Field(0, description="Solde destination avant transaction")
    newbalanceDest: float = Field(0, description="Solde destination après transaction")
    step: int = Field(1, description="Étape/jour de la transaction")
    type_TRANSFER: int = Field(0, description="Type TRANSFER (1/0)")
    type_PAYMENT: int = Field(0, description="Type PAYMENT (1/0)")
    type_CASH_OUT: int = Field(0, description="Type CASH_OUT (1/0)")
    type_CASH_IN: int = Field(0, description="Type CASH_IN (1/0)")
    type_DEBIT: int = Field(0, description="Type DEBIT (1/0)")

class FraudPrediction(BaseModel):
    """Résultat de prédiction"""
    fraud_probability: float = Field(..., description="Probabilité de fraude (0-1)")
    fraud_score: int = Field(..., description="Score de fraude (0-100)")
    prediction: str = Field(..., description="fraud ou legitimate")
    latency_ms: float = Field(..., description="Temps de calcul en ms")

class HealthCheck(BaseModel):
    """Statut de santé de l'API"""
    status: str
    model_loaded: bool
    model_type: str
    version: str

# Événements de démarrage
@app.on_event("startup")
async def load_models():
    """Charger les modèles au démarrage de l'API"""
    global MODEL, SCALER, METADATA
    
    try:
        # Chemins vers les modèles (relatifs au script)
        models_dir = Path(__file__).parent.parent / "supabase" / "functions" / "fraud-detection" / "trained_models"
        
        logger.info(f"Chargement modèles depuis: {models_dir}")
        
        # Charger XGBoost
        model_path = models_dir / "xgboost.pkl"
        MODEL = pickle.load(open(model_path, "rb"))
        logger.info(f"✅ XGBoost chargé: {model_path}")
        
        # Charger Scaler
        scaler_path = models_dir / "scaler.pkl"
        SCALER = pickle.load(open(scaler_path, "rb"))
        logger.info(f"✅ Scaler chargé: {scaler_path}")
        
        # Charger Metadata
        import json
        metadata_path = models_dir / "metadata.json"
        METADATA = json.load(open(metadata_path, "r"))
        logger.info(f"✅ Metadata chargé: {metadata_path}")
        
        logger.info("🚀 Modèles ML chargés et prêts!")
        
    except Exception as e:
        logger.error(f"❌ Erreur chargement modèles: {e}")
        raise

# Routes
@app.get("/", response_model=HealthCheck)
async def health_check():
    """Vérifier l'état de santé de l'API"""
    return {
        "status": "healthy" if MODEL is not None else "unhealthy",
        "model_loaded": MODEL is not None,
        "model_type": "XGBoost",
        "version": "1.0.0"
    }

@app.post("/predict", response_model=FraudPrediction)
async def predict_fraud(features: TransactionFeatures):
    """
    Prédire si une transaction est frauduleuse
    
    Args:
        features: Features de la transaction
        
    Returns:
        FraudPrediction avec probabilité, score et classification
        
    Example:
        POST /predict
        {
            "amount": 5000,
            "oldbalanceOrg": 10000,
            "newbalanceOrig": 5000,
            "oldbalanceDest": 0,
            "newbalanceDest": 5000,
            "type_TRANSFER": 1
        }
    """
    import time
    start_time = time.time()
    
    if MODEL is None or SCALER is None:
        raise HTTPException(status_code=503, detail="Modèles non chargés")
    
    try:
        # Construire le vecteur de features dans le bon ordre
        feature_names = METADATA.get("feature_names", [])
        
        # Créer dictionnaire avec toutes les features
        features_dict = features.dict()
        
        # Calculer features dérivées
        features_dict['errorBalanceOrig'] = features.newbalanceOrig + features.amount - features.oldbalanceOrg
        features_dict['errorBalanceDest'] = features.oldbalanceDest + features.amount - features.newbalanceDest
        features_dict['delta_balance_orig'] = features.oldbalanceOrg - features.newbalanceOrig
        features_dict['delta_balance_dest'] = features.newbalanceDest - features.oldbalanceDest
        features_dict['ratio_amount_balance'] = features.amount / features.oldbalanceOrg if features.oldbalanceOrg > 0 else 0
        
        # Construire array numpy
        X = np.array([[features_dict.get(f, 0) for f in feature_names]])
        
        # Normaliser
        X_scaled = SCALER.transform(X)
        
        # Prédiction
        fraud_prob = float(MODEL.predict(X_scaled)[0])
        fraud_score = int(fraud_prob * 100)
        prediction = "fraud" if fraud_prob > 0.5 else "legitimate"
        
        # Calculer latence
        latency_ms = (time.time() - start_time) * 1000
        
        logger.info(f"Prédiction: {prediction} (score: {fraud_score}, latency: {latency_ms:.2f}ms)")
        
        return {
            "fraud_probability": fraud_prob,
            "fraud_score": fraud_score,
            "prediction": prediction,
            "latency_ms": round(latency_ms, 2)
        }
        
    except Exception as e:
        logger.error(f"Erreur prédiction: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur prédiction: {str(e)}")

@app.post("/batch_predict")
async def batch_predict(transactions: List[TransactionFeatures]):
    """Prédire un lot de transactions (batch processing)"""
    results = []
    for tx in transactions:
        result = await predict_fraud(tx)
        results.append(result)
    return results

@app.get("/metrics")
async def get_metrics():
    """Retourner les métriques du modèle"""
    if METADATA is None:
        raise HTTPException(status_code=503, detail="Metadata non disponible")
    
    return {
        "model": "XGBoost",
        "recall": METADATA.get("xgboost", {}).get("recall"),
        "precision": METADATA.get("xgboost", {}).get("precision"),
        "f1_score": METADATA.get("xgboost", {}).get("f1_score"),
        "auc_roc": METADATA.get("xgboost", {}).get("auc_roc"),
        "latency_p95_ms": METADATA.get("xgboost", {}).get("latency_p95_ms"),
        "trained_on": METADATA.get("training_date")
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

