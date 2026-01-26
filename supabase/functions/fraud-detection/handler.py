"""
Handler d'inférence pour Hugging Face Inference API
"""

import pickle
import numpy as np
from typing import Dict, Any

def load_models():
    """Charge le modèle, scaler et encoders"""
    with open('fraud_model_enriched.pkl', 'rb') as f:
        model = pickle.load(f)
    
    with open('scaler_enriched.pkl', 'rb') as f:
        scaler = pickle.load(f)
    
    with open('label_encoders_enriched.pkl', 'rb') as f:
        encoders = pickle.load(f)
    
    return model, scaler, encoders

# Charger au démarrage
model, scaler, encoders = load_models()

def handler(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Handler pour l'API Inference de Hugging Face
    
    Input:
        data: {
            "inputs": [19 features numériques déjà encodées et normalisées]
        }
    
    Output:
        {
            "fraud_score": int (0-100),
            "fraud_probability": float (0-1),
            "is_fraud": bool
        }
    """
    try:
        inputs = data.get("inputs", [])
        
        # Si c'est une liste de listes (batch), prendre la première
        if isinstance(inputs[0], list):
            inputs = inputs[0]
        
        # Prédire
        features = np.array([inputs])
        fraud_proba = model.predict_proba(features)[0][1]
        fraud_score = int(fraud_proba * 100)
        
        return {
            "fraud_score": fraud_score,
            "fraud_probability": float(fraud_proba),
            "is_fraud": fraud_score > 70
        }
        
    except Exception as e:
        return {
            "error": str(e),
            "fraud_score": 0,
            "fraud_probability": 0.0,
            "is_fraud": False
        }
