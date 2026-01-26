"""
Handler d'inférence pour Hugging Face Inference Endpoint
"""

import os
import pickle
from typing import Any, Dict

import numpy as np


class EndpointHandler():
    """
    Classe handler pour Hugging Face Inference Endpoint
    """
    def __init__(self, path=""):
        """
        Initialise le handler et charge les modèles
        
        Args:
            path: Chemin vers le répertoire contenant les modèles (défaut: répertoire courant)
        """
        # Chemin de base (Hugging Face utilise /repository/)
        base_path = path if path else "."
        
        # Nouveau modèle indépendant (sans fraud_score - 18 features)
        model_path = os.path.join(base_path, 'fraud_model_independent.pkl')
        scaler_path = os.path.join(base_path, 'scaler_independent.pkl')
        encoders_path = os.path.join(base_path, 'label_encoders_independent.pkl')
        
        # Charger les modèles
        with open(model_path, 'rb') as f:
            self.model = pickle.load(f)
        
        with open(scaler_path, 'rb') as f:
            self.scaler = pickle.load(f)
        
        with open(encoders_path, 'rb') as f:
            self.encoders = pickle.load(f)
        
        print(f"✅ Modèles chargés depuis {base_path}")
    
    def __call__(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Handler appelé pour chaque requête
        
        Input:
            data: {
                "inputs": [18 features numériques (SANS fraud_score heuristique)]
            }
        
        Output:
            {
                "fraud_score": int (0-100),
                "fraud_probability": float (0-1),
                "is_fraud": bool
            }
        
        Note: Modèle indépendant entraîné sans fraud_score pour éviter
        la dépendance circulaire et apporter une vraie valeur ajoutée.
        """
        try:
            inputs = data.get("inputs", [])
            
            # Si c'est une liste de listes (batch), prendre la première
            if isinstance(inputs, list) and len(inputs) > 0 and isinstance(inputs[0], list):
                inputs = inputs[0]
            
            # IMPORTANT: Normaliser les features avant prédiction
            features = np.array([inputs])
            features_scaled = self.scaler.transform(features)
            
            # Prédire avec features normalisées
            fraud_proba = self.model.predict_proba(features_scaled)[0][1]
            fraud_score = int(fraud_proba * 100)
            
            print(f"🔍 Prédiction: proba={fraud_proba:.4f}, score={fraud_score}/100")
            
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
