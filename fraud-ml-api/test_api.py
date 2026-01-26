"""
Script de test pour l'API de détection de fraude enrichie
"""

import requests
import json

API_URL = "http://localhost:8000"

print("=" * 80)
print("🧪 Test de l'API de Détection de Fraude Enrichie")
print("=" * 80)
print()

# 1. Health check
print("1️⃣  Test du health check...")
response = requests.get(f"{API_URL}/health")
if response.status_code == 200:
    health = response.json()
    print(f"  ✅ API opérationnelle")
    print(f"  📊 Modèle: {health['metadata']['model_type']}")
    print(f"  📊 Accuracy: {health['metadata']['accuracy']:.1%}")
    print(f"  ⏱️  Latence: {health['metadata']['latency_ms']:.2f} ms")
else:
    print(f"  ❌ Erreur: {response.status_code}")
    exit(1)

print()

# 2. Test transaction légitime
print("2️⃣  Test transaction légitime (50 EPC, Paris, iOS)...")

legitimate_transaction = {
    "amount": 50.0,
    "fraud_score": 25,
    "hour": 14,
    "day_of_week": 2,
    "execution_delay": 2.5,
    "transaction_type": "P2P",
    "direction": "outgoing",
    "country": "FR",
    "city": "Paris",
    "provider": "stripe",
    "status": "completed",
    "os_name": "iOS",
    "type": "transfer",
    "user_avg_amount": 45.0,
    "user_std_amount": 15.0,
    "user_tx_count": 10,
    "user_fraud_ratio": 0.0,
    "amount_deviation": 0.33,
    "device_tx_count": 5
}

response = requests.post(f"{API_URL}/predict", json=legitimate_transaction)
if response.status_code == 200:
    result = response.json()
    print(f"  ✅ Prédiction réussie")
    print(f"  📊 Score de fraude: {result['fraud_score']}/100")
    print(f"  📊 Est une fraude: {'OUI ⚠️' if result['is_fraud'] else 'NON ✅'}")
    print(f"  📊 Confiance: {result['confidence']:.1%}")
else:
    print(f"  ❌ Erreur: {response.status_code} - {response.text}")

print()

# 3. Test transaction suspecte
print("3️⃣  Test transaction suspecte (5000 EPC, 3h du matin, nouveau device)...")

suspicious_transaction = {
    "amount": 5000.0,
    "fraud_score": 85,
    "hour": 3,
    "day_of_week": 6,
    "execution_delay": 0.1,
    "transaction_type": "CASHIN",
    "direction": "incoming",
    "country": "NG",
    "city": "Lagos",
    "provider": "stripe",
    "status": "pending",
    "os_name": "Android",
    "type": "topup",
    "user_avg_amount": 50.0,
    "user_std_amount": 20.0,
    "user_tx_count": 5,
    "user_fraud_ratio": 0.2,
    "amount_deviation": 247.5,
    "device_tx_count": 1
}

response = requests.post(f"{API_URL}/predict", json=suspicious_transaction)
if response.status_code == 200:
    result = response.json()
    print(f"  ✅ Prédiction réussie")
    print(f"  📊 Score de fraude: {result['fraud_score']}/100")
    print(f"  📊 Est une fraude: {'OUI ⚠️' if result['is_fraud'] else 'NON ✅'}")
    print(f"  📊 Confiance: {result['confidence']:.1%}")
else:
    print(f"  ❌ Erreur: {response.status_code} - {response.text}")

print()

# 4. Test batch
print("4️⃣  Test batch (2 transactions)...")

batch = [legitimate_transaction, suspicious_transaction]
response = requests.post(f"{API_URL}/predict_batch", json=batch)
if response.status_code == 200:
    result = response.json()
    print(f"  ✅ Batch traité avec succès")
    print(f"  📊 Nombre de prédictions: {result['count']}")
    for i, pred in enumerate(result['predictions']):
        print(f"    Transaction {i+1}: Score={pred['fraud_score']}, Fraude={'OUI' if pred['is_fraud'] else 'NON'}")
else:
    print(f"  ❌ Erreur: {response.status_code} - {response.text}")

print()
print("=" * 80)
print("✅ TESTS TERMINÉS")
print("=" * 80)
