#!/usr/bin/env python3
"""
Script de test pour simuler un Wallet A (Paris) 
qui envoie de l'argent vers un Wallet B (Lyon)

Usage:
    python test_intercampus_wallet_a.py
"""

import requests
import json
import os
from datetime import datetime

# ============================================
# CONFIGURATION - À ADAPTER À VOTRE PROJET
# ============================================

# URL de votre projet Supabase
SUPABASE_URL = os.getenv('EXPO_PUBLIC_SUPABASE_URL', 'https://your-project.supabase.co')

# Token JWT d'un utilisateur authentifié (obtenu via login)
USER_JWT_TOKEN = os.getenv('USER_JWT_TOKEN', 'your-jwt-token-here')

# Configuration du wallet source (Paris)
SOURCE_WALLET = {
    'id': 'wallet_paris_test',
    'campus_id': 'paris',
    'name': 'Epitech Paris'
}

# Configuration du wallet destination (Lyon)
DESTINATION_WALLET = {
    'id': 'wallet_lyon_test',
    'campus_id': 'lyon',
    'api_url': f'{SUPABASE_URL}/functions/v1'
}

# Montant à transférer
TRANSFER_AMOUNT = 50.00

# ============================================
# FONCTION D'ENVOI
# ============================================

def send_intercampus_payment():
    """Envoie un paiement inter-campus de Paris vers Lyon"""
    
    endpoint = f"{SUPABASE_URL}/functions/v1/intercampus-send"
    
    headers = {
        'Authorization': f'Bearer {USER_JWT_TOKEN}',
        'Content-Type': 'application/json'
    }
    
    payload = {
        'source_wallet_id': SOURCE_WALLET['id'],
        'destination_wallet_id': DESTINATION_WALLET['id'],
        'destination_campus_api_url': DESTINATION_WALLET['api_url'],
        'amount': TRANSFER_AMOUNT,
        'currency': 'EPC',
        'description': f'Transfert test de {SOURCE_WALLET["name"]} vers {DESTINATION_WALLET["campus_id"]}',
        'enriched_data': {
            'country': 'FR',
            'city': 'Paris',
            'device_info': {
                'device_model': 'Script Python',
                'os_name': 'Python',
                'os_version': '3.x',
                'ip': '127.0.0.1'
            },
            'test_mode': True,
            'timestamp': datetime.now().isoformat()
        }
    }
    
    print("=" * 60)
    print("🚀 TEST TRANSACTION INTER-CAMPUS")
    print("=" * 60)
    print(f"📤 Source:      {SOURCE_WALLET['name']} ({SOURCE_WALLET['id']})")
    print(f"📥 Destination: {DESTINATION_WALLET['campus_id']} ({DESTINATION_WALLET['id']})")
    print(f"💰 Montant:     {TRANSFER_AMOUNT} EPC")
    print(f"🌐 Endpoint:    {endpoint}")
    print("=" * 60)
    print()
    
    try:
        print("⏳ Envoi de la requête...")
        response = requests.post(endpoint, headers=headers, json=payload, timeout=15)
        
        print(f"📡 Status Code: {response.status_code}")
        print()
        
        # Afficher la réponse
        result = response.json()
        print("📄 RÉPONSE :")
        print(json.dumps(result, indent=2, ensure_ascii=False))
        print()
        
        # Interpréter le résultat
        if result.get('success'):
            print("✅ SUCCÈS - Transaction complétée")
            print(f"   Transaction ID: {result.get('transaction_id')}")
            print(f"   Nouveau solde:  {result.get('new_balance')} EPC")
            print(f"   Score fraude:   {result.get('fraud_score')}/100")
            
        elif result.get('status') == 'pending_review':
            print("⚠️  EN REVUE - Transaction en attente de validation admin")
            print(f"   Transaction ID: {result.get('transaction_id')}")
            print(f"   Score fraude:   {result.get('fraud_score')}/100")
            
        elif result.get('status') == 'blocked':
            print("🚫 BLOQUÉ - Transaction rejetée")
            print(f"   Raison:         {result.get('reason')}")
            print(f"   Score fraude:   {result.get('fraud_score')}/100")
            
        else:
            print("❌ ÉCHEC - Transaction échouée")
            print(f"   Message:        {result.get('message')}")
            print(f"   Code erreur:    {result.get('error_code')}")
        
    except requests.exceptions.Timeout:
        print("❌ ERREUR : Timeout - Le serveur met trop de temps à répondre")
        
    except requests.exceptions.RequestException as e:
        print(f"❌ ERREUR RÉSEAU : {e}")
        
    except json.JSONDecodeError:
        print("❌ ERREUR : Impossible de parser la réponse JSON")
        print(f"Réponse brute: {response.text}")
        
    except Exception as e:
        print(f"❌ ERREUR INATTENDUE : {e}")
    
    print()
    print("=" * 60)


if __name__ == '__main__':
    # Vérifier la configuration
    if 'your-project' in SUPABASE_URL or 'your-jwt' in USER_JWT_TOKEN:
        print("⚠️  ATTENTION : Configuration incomplète !")
        print()
        print("Veuillez définir les variables d'environnement :")
        print("  export EXPO_PUBLIC_SUPABASE_URL='https://your-project.supabase.co'")
        print("  export USER_JWT_TOKEN='votre-token-jwt'")
        print()
        print("Ou modifier directement les valeurs dans le script.")
        exit(1)
    
    send_intercampus_payment()
