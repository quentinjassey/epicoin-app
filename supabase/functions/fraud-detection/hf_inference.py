"""
Hugging Face Inference Handler pour Détection de Fraude
Ce fichier sera uploadé sur Hugging Face avec les modèles
"""

import pickle
import numpy as np
from typing import Dict, Any

def predict(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Handler d'inférence pour Hugging Face
    
    Args:
        data: Dictionnaire contenant les features de transaction
              Format: {"inputs": {"amount": 500, "oldbalanceOrg": 1000, ...}}
    
    Returns:
        Dictionnaire avec fraud_probability et fraud_score
    """
    # Charger les modèles (cachés après le premier appel)
    with open("xgboost.pkl", "rb") as f:
        model = pickle.load(f)
    
    with open("scaler.pkl", "rb") as f:
        scaler = pickle.load(f)
    
    # Extraire les features depuis l'input
    features = data.get("inputs", {})
    
    # Ordre des features (doit matcher l'entraînement)
    feature_order = [
        "step",
        "amount",
        "oldbalanceOrg",
        "newbalanceOrig",
        "oldbalanceDest",
        "newbalanceDest",
        "type_encoded",
        "delta_balance_orig",
        "delta_balance_dest",
        "ratio_amount_balance_orig",
        "ratio_amount_balance_dest",
        "dest_balance_zero_after",
        "orig_balance_zero_after",
        "is_high_amount"
    ]
    
    # Construire le vecteur de features
    X = np.array([[features.get(f, 0) for f in feature_order]])
    
    # Normaliser avec le scaler
    X_scaled = scaler.transform(X)
    
    # Prédiction
    fraud_prob = float(model.predict(X_scaled)[0])
    fraud_score = int(fraud_prob * 100)
    
    return {
        "fraud_probability": fraud_prob,
        "fraud_score": fraud_score,
        "prediction": "fraud" if fraud_prob > 0.5 else "legitimate"
    }


# Pour tests locaux
if __name__ == "__main__":
    # Test avec transaction frauduleuse
    test_data = {
        "inputs": {
            "amount": 5000,
            "oldbalanceOrg": 10000,
            "newbalanceOrig": 5000,
            "oldbalanceDest": 0,
            "newbalanceDest": 5000,
            "type_encoded": 1,  # TRANSFER
            "step": 1,
            "delta_balance_orig": 5000,
            "delta_balance_dest": 5000,
            "ratio_amount_balance_orig": 0.5,
            "ratio_amount_balance_dest": 0,
            "dest_balance_zero_after": 0,
            "orig_balance_zero_after": 0,
            "is_high_amount": 1
        }
    }
    
    result = predict(test_data)
    print(f"Test Result: {result}")
    print(f"Fraud Score: {result['fraud_score']}/100")
    print(f"Prediction: {result['prediction']}")
