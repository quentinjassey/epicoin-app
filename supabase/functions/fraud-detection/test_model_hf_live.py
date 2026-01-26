#!/usr/bin/env python3
"""
Test du modèle ML déployé sur Hugging Face avec 17 features
Vérifie que le modèle retourne des scores variés (pas 0.0002 figé)
"""

import json
import os
import time
from datetime import datetime

import requests

# Configuration
HF_ENDPOINT = os.getenv('HUGGINGFACE_ENDPOINT_URL', 'https://cpgb5yp8o3kmtgif.eu-west-1.aws.endpoints.huggingface.cloud')
HF_TOKEN = os.getenv('HUGGINGFACE_TOKEN')

if not HF_TOKEN:
    print("❌ HUGGINGFACE_TOKEN non configuré !")
    print("💡 Lancer : export HUGGINGFACE_TOKEN='hf_...'")
    exit(1)

print("=" * 80)
print("🧪 Test du Modèle ML sur Hugging Face (17 Features)")
print("=" * 80)
print(f"🔗 Endpoint : {HF_ENDPOINT}")
print()

# Définir 3 scénarios de test (17 features chacun)
test_scenarios = {
    "Transaction Normale (Low Risk)": {
        "description": "Petit montant, heures normales, utilisateur établi",
        "features": [
            50.0,      # 1. amount_numeric (50 EPC - petit montant)
            14,        # 2. hour (14h - après-midi)
            2,         # 3. day_of_week (mardi)
            5.0,       # 4. execution_delay (5 secondes - rapide)
            0,         # 5. transaction_type_encoded (P2P)
            0,         # 6. direction_encoded (outgoing)
            1,         # 7. country_encoded (France)
            50,        # 8. city_encoded (Paris)
            0,         # 9. provider_encoded (wallet)
            # status RETIRÉ
            0,         # 10. os_name_encoded (iOS)
            1,         # 11. type_encoded (transfer)
            45.0,      # 12. user_avg_amount (moyenne 45 EPC)
            15.0,      # 13. user_std_amount (écart-type faible)
            25,        # 14. user_tx_count (utilisateur actif)
            0.02,      # 15. user_fraud_ratio (2% de fraudes - normal)
            5.0,       # 16. amount_deviation (légère déviation)
            10         # 17. device_tx_count (appareil connu)
        ],
        "expected_range": (0, 20)  # Attendu : 0-20%
    },
    
    "Transaction Suspecte (Medium Risk)": {
        "description": "Montant élevé, heures inhabituelles, nouveau pays",
        "features": [
            500.0,     # 1. amount_numeric (500 EPC - montant élevé)
            3,         # 2. hour (3h du matin - suspect)
            6,         # 3. day_of_week (dimanche)
            120.0,     # 4. execution_delay (2 min - lent)
            1,         # 5. transaction_type_encoded (MERCHANT)
            1,         # 6. direction_encoded (incoming)
            5,         # 7. country_encoded (pays différent)
            200,       # 8. city_encoded (ville inconnue)
            2,         # 9. provider_encoded (provider rare)
            # status RETIRÉ
            2,         # 10. os_name_encoded (Android)
            2,         # 11. type_encoded (purchase)
            80.0,      # 12. user_avg_amount (moyenne 80 EPC)
            40.0,      # 13. user_std_amount (écart-type élevé)
            15,        # 14. user_tx_count (utilisateur moins actif)
            0.08,      # 15. user_fraud_ratio (8% de fraudes - suspect)
            420.0,     # 16. amount_deviation (très forte déviation)
            2          # 17. device_tx_count (nouvel appareil)
        ],
        "expected_range": (30, 60)  # Attendu : 30-60%
    },
    
    "Transaction Frauduleuse (High Risk)": {
        "description": "Très gros montant, appareil nouveau, patterns suspects",
        "features": [
            2000.0,    # 1. amount_numeric (2000 EPC - énorme)
            4,         # 2. hour (4h du matin)
            0,         # 3. day_of_week (lundi)
            300.0,     # 4. execution_delay (5 min - très lent)
            2,         # 5. transaction_type_encoded (CASHOUT)
            0,         # 6. direction_encoded (outgoing)
            8,         # 7. country_encoded (pays à risque)
            500,       # 8. city_encoded (ville rare)
            3,         # 9. provider_encoded (provider inconnu)
            # status RETIRÉ
            3,         # 10. os_name_encoded (inconnu/web)
            1,         # 11. type_encoded (transfer)
            60.0,      # 12. user_avg_amount (moyenne 60 EPC)
            25.0,      # 13. user_std_amount (écart-type moyen)
            8,         # 14. user_tx_count (peu d'historique)
            0.25,      # 15. user_fraud_ratio (25% de fraudes - très élevé)
            1940.0,    # 16. amount_deviation (déviation énorme)
            1          # 17. device_tx_count (premier usage appareil)
        ],
        "expected_range": (70, 100)  # Attendu : 70-100%
    }
}

print(f"📊 Test de {len(test_scenarios)} scénarios avec 17 features chacun\n")

# Tester chaque scénario
results = []
all_passed = True

for scenario_name, scenario_data in test_scenarios.items():
    print(f"🔍 Scénario : {scenario_name}")
    print(f"   {scenario_data['description']}")
    print(f"   Features : {len(scenario_data['features'])} valeurs")
    
    # Préparer la requête
    payload = {
        "inputs": scenario_data['features']
    }
    
    headers = {
        "Authorization": f"Bearer {HF_TOKEN}",
        "Content-Type": "application/json"
    }
    
    try:
        # Appeler Hugging Face
        start_time = time.time()
        response = requests.post(HF_ENDPOINT, headers=headers, json=payload, timeout=10)
        latency = (time.time() - start_time) * 1000  # ms
        
        if response.status_code == 200:
            result = response.json()
            
            # Extraire la probabilité de fraude
            fraud_probability = result.get('fraud_probability', result.get('score', 0))
            fraud_score = int(fraud_probability * 100)
            is_fraud = result.get('is_fraud', fraud_score > 50)
            
            # Vérifier si le score est dans la plage attendue
            expected_min, expected_max = scenario_data['expected_range']
            in_range = expected_min <= fraud_score <= expected_max
            
            if in_range:
                status_icon = "✅"
            elif fraud_score < 1:  # Score figé à 0
                status_icon = "❌"
                all_passed = False
            else:
                status_icon = "⚠️"
            
            print(f"   {status_icon} ML Score : {fraud_score}% (attendu: {expected_min}-{expected_max}%)")
            print(f"   ⏱️  Latence : {latency:.0f} ms")
            print(f"   🎯 Fraude détectée : {'OUI' if is_fraud else 'NON'}")
            
            results.append({
                'scenario': scenario_name,
                'score': fraud_score,
                'expected_range': scenario_data['expected_range'],
                'in_range': in_range,
                'latency': latency
            })
            
        elif response.status_code == 503:
            print(f"   ⏳ Modèle en cours de chargement (cold start)...")
            print(f"   💡 Attendre 30 secondes et réessayer")
            all_passed = False
        else:
            print(f"   ❌ Erreur HTTP {response.status_code}")
            print(f"   Réponse : {response.text[:200]}")
            all_passed = False
            
    except Exception as e:
        print(f"   ❌ Erreur : {str(e)}")
        all_passed = False
    
    print()

# Résumé
print("=" * 80)
print("📊 RÉSUMÉ DES TESTS")
print("=" * 80)
print()

if results:
    print(f"Tests réussis : {sum(1 for r in results if r['in_range'])}/{len(results)}")
    print()
    
    # Vérifier si les scores varient (pas figés à 0.0002)
    scores = [r['score'] for r in results]
    score_variance = max(scores) - min(scores)
    
    print(f"📈 Variation des scores : {min(scores)}% - {max(scores)}% (écart: {score_variance}%)")
    
    if score_variance < 5:
        print("❌ PROBLÈME : Les scores varient trop peu !")
        print("   Le modèle semble toujours figé.")
        all_passed = False
    elif min(scores) < 1:
        print("❌ PROBLÈME : Score minimum < 1% (encore du data leakage ?)")
        all_passed = False
    else:
        print("✅ Les scores varient correctement selon le contexte")
    
    print()
    
    # Latence moyenne
    avg_latency = sum(r['latency'] for r in results) / len(results)
    print(f"⏱️  Latence moyenne : {avg_latency:.0f} ms")
    
    if avg_latency < 300:
        print("✅ Latence < 300ms (objectif POC atteint)")
    else:
        print("⚠️  Latence > 300ms (acceptable pour POC)")
    
    print()

# Conclusion
print("=" * 80)
if all_passed and results and score_variance > 20:
    print("🎉 SUCCÈS : Le modèle ML est fonctionnel !")
    print()
    print("✅ Les scores varient selon le contexte (pas figés)")
    print("✅ La latence est acceptable")
    print("✅ Le modèle détecte correctement les patterns")
    print()
    print("🚀 Tu peux maintenant tester dans l'app !")
    print()
elif not results:
    print("❌ ÉCHEC : Aucun test réussi")
    print()
    print("🔍 Vérifier :")
    print("   1. HUGGINGFACE_TOKEN est valide")
    print("   2. Le modèle est bien déployé (status = Running)")
    print("   3. Attendre 2-3 min si cold start")
    print()
elif score_variance < 5:
    print("❌ ÉCHEC : Les scores ne varient pas assez")
    print()
    print("🔍 Possible causes :")
    print("   1. Le modèle HF n'a pas été mis à jour (encore l'ancien)")
    print("   2. Le handler.py sur HF n'est pas à jour")
    print("   3. Cache HF (attendre 5 min)")
    print()
else:
    print("⚠️  PARTIEL : Quelques tests échoués")
    print()
    print("💡 Vérifier les détails ci-dessus")
    print()

print("=" * 80)
