"""
Générateur de transactions synthétiques réalistes pour EpiCoin
Génère 1000+ transactions avec patterns réalistes de fraude et légitimes
"""

import json
import os
import random
import uuid
from datetime import datetime, timedelta
from typing import Dict, List

import requests

from supabase import Client, create_client

# Configuration Supabase
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://srvkyiugewdjrpvcmquq.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

# Distributions réalistes
COUNTRIES = {
    'FR': 0.60,  # France dominant (60%)
    'BE': 0.08,  # Belgique
    'CH': 0.05,  # Suisse
    'DE': 0.05,  # Allemagne
    'ES': 0.04,  # Espagne
    'IT': 0.04,  # Italie
    'GB': 0.03,  # UK
    'US': 0.03,  # USA
    'CA': 0.02,  # Canada
    'MA': 0.02,  # Maroc
    'NG': 0.01,  # Nigeria (risque élevé)
    'RU': 0.01,  # Russie (risque élevé)
    'CN': 0.01,  # Chine (risque élevé)
    'BR': 0.01,  # Brésil
}

HIGH_RISK_COUNTRIES = ['NG', 'RU', 'CN', 'UA', 'VN']

CITIES_BY_COUNTRY = {
    'FR': ['Paris', 'Lyon', 'Marseille', 'Toulouse', 'Nice', 'Bordeaux', 'Lille', 'Strasbourg'],
    'BE': ['Brussels', 'Antwerp', 'Ghent', 'Liège'],
    'CH': ['Zurich', 'Geneva', 'Basel', 'Bern'],
    'DE': ['Berlin', 'Munich', 'Hamburg', 'Frankfurt'],
    'ES': ['Madrid', 'Barcelona', 'Valencia', 'Seville'],
    'IT': ['Rome', 'Milan', 'Naples', 'Turin'],
    'GB': ['London', 'Manchester', 'Birmingham', 'Leeds'],
    'US': ['New York', 'Los Angeles', 'Chicago', 'Houston'],
    'CA': ['Toronto', 'Montreal', 'Vancouver', 'Ottawa'],
    'MA': ['Casablanca', 'Rabat', 'Marrakech', 'Fes'],
    'NG': ['Lagos', 'Abuja', 'Kano'],
    'RU': ['Moscow', 'St Petersburg', 'Novosibirsk'],
    'CN': ['Beijing', 'Shanghai', 'Guangzhou'],
    'BR': ['São Paulo', 'Rio de Janeiro', 'Brasília'],
}

DEVICE_MODELS = [
    'iPhone 14 Pro', 'iPhone 13', 'iPhone 12', 'Samsung Galaxy S23',
    'Samsung Galaxy A54', 'Google Pixel 7', 'Xiaomi Redmi Note 12',
    'OnePlus 11', 'Huawei P60', 'iPad Pro', 'MacBook Pro'
]

OS_VERSIONS = {
    'iOS': ['16.5', '16.4', '17.0', '17.1'],
    'Android': ['13', '12', '11', '14'],
}

PROVIDERS = ['stripe', 'wallet']

TRANSACTION_TYPES = {
    'CASHIN': 0.30,    # 30% top-up
    'P2P': 0.45,       # 45% transfers
    'MERCHANT': 0.25,  # 25% purchases
}

def weighted_choice(choices: dict):
    """Choix pondéré basé sur un dictionnaire {valeur: probabilité}"""
    population = list(choices.keys())
    weights = list(choices.values())
    return random.choices(population, weights=weights)[0]

def generate_device_id():
    """Génère un device ID réaliste"""
    return str(uuid.uuid4())

def generate_device_info(country: str):
    """Génère device_info cohérent avec le pays"""
    os_name = random.choice(['iOS', 'Android'])
    device_model = random.choice(DEVICE_MODELS)
    
    # Adapter le device selon le pays
    if country in HIGH_RISK_COUNTRIES:
        # Pays à risque = plus d'Android et devices moins chers
        os_name = 'Android' if random.random() > 0.3 else 'iOS'
        if os_name == 'Android':
            device_model = random.choice([
                'Samsung Galaxy A54', 'Xiaomi Redmi Note 12', 
                'Huawei P60', 'OnePlus 11'
            ])
    
    return {
        'device_id': generate_device_id(),
        'device_model': device_model,
        'os_name': os_name,
        'os_version': random.choice(OS_VERSIONS[os_name]),
        'ip': f"192.168.{random.randint(0,255)}.{random.randint(1,254)}",
        'user_agent': f"Mozilla/5.0 ({device_model}; {os_name})"
    }

def generate_timestamp(base_date: datetime, is_fraud: bool = False):
    """Génère un timestamp réaliste"""
    # Moins de transactions la nuit
    hour = random.randint(0, 23)
    
    if is_fraud:
        # Fraudes plus fréquentes la nuit (2-6h)
        if random.random() < 0.3:
            hour = random.randint(2, 6)
    else:
        # Transactions légitimes surtout en journée (8-22h)
        if random.random() < 0.8:
            hour = random.randint(8, 22)
    
    days_offset = random.randint(0, 30)  # Derniers 30 jours
    minutes_offset = random.randint(0, 59)
    
    return base_date - timedelta(days=days_offset, hours=(23-hour), minutes=minutes_offset)

def generate_amount(transaction_type: str, is_fraud: bool = False):
    """Génère un montant réaliste selon le type et si c'est une fraude"""
    
    if is_fraud:
        # Fraudes = montants plus élevés
        if transaction_type == 'CASHIN':
            return round(random.uniform(1000, 5000), 2)
        elif transaction_type == 'P2P':
            return round(random.uniform(500, 3000), 2)
        else:  # MERCHANT
            return round(random.uniform(300, 1500), 2)
    else:
        # Transactions légitimes = distribution normale
        if transaction_type == 'CASHIN':
            # Top-up : souvent des montants ronds
            amounts = [5, 10, 20, 50, 100, 200]
            base = random.choice(amounts)
            return float(base * 5)  # 1€ = 5 EPC
        elif transaction_type == 'P2P':
            # Transfers : montants variés
            return round(random.lognormvariate(3.5, 1.2), 2)  # Moyenne ~50 EPC
        else:  # MERCHANT
            # Achats : montants moyens
            return round(random.lognormvariate(2.8, 0.8), 2)  # Moyenne ~20 EPC

def should_be_fraud():
    """Détermine si une transaction doit être frauduleuse (10% de fraudes)"""
    return random.random() < 0.10

def generate_fraud_pattern():
    """Génère un pattern de fraude spécifique"""
    patterns = [
        'high_amount',         # Montant très élevé
        'high_risk_country',   # Pays à risque
        'night_hour',          # Transaction nocturne
        'device_changed',      # Changement d'appareil
        'velocity',            # Transactions rapides
        'money_mule',          # Pattern money mule
    ]
    return random.choice(patterns)

def generate_transaction(
    user_id: str,
    base_date: datetime,
    user_device_ids: List[str],
    user_country: str,
    transaction_number: int,
    all_user_ids: List[str]  # Liste de tous les IDs utilisateurs pour les receiver_id
) -> Dict:
    """
    Génère une transaction synthétique réaliste
    """
    
    is_fraud = should_be_fraud()
    transaction_type = weighted_choice(TRANSACTION_TYPES)
    
    # Choisir le pays
    if is_fraud and random.random() < 0.4:
        # 40% des fraudes depuis pays à risque
        country = random.choice(HIGH_RISK_COUNTRIES)
    else:
        country = user_country
    
    city = random.choice(CITIES_BY_COUNTRY.get(country, ['Unknown']))
    
    # Device
    if is_fraud and random.random() < 0.3:
        # Fraude = nouveau device
        device_info = generate_device_info(country)
        user_device_ids.append(device_info['device_id'])
    else:
        # Utiliser un device existant
        device_id = random.choice(user_device_ids) if user_device_ids else generate_device_id()
        if device_id not in user_device_ids:
            user_device_ids.append(device_id)
        device_info = generate_device_info(country)
        device_info['device_id'] = device_id
    
    # Timestamp
    created_at = generate_timestamp(base_date, is_fraud)
    
    # Montant
    amount = generate_amount(transaction_type, is_fraud)
    
    # Provider
    if transaction_type == 'CASHIN':
        provider = 'stripe'
        direction = 'incoming'
    else:
        provider = 'wallet'
        direction = 'outgoing'
    
    # Status et fraud_score
    if is_fraud:
        fraud_pattern = generate_fraud_pattern()
        
        if fraud_pattern == 'high_amount':
            fraud_score = random.randint(75, 95)
        elif fraud_pattern == 'high_risk_country':
            fraud_score = random.randint(70, 90)
        elif fraud_pattern == 'velocity':
            fraud_score = random.randint(65, 85)
        else:
            fraud_score = random.randint(60, 80)
        
        # 70% des fraudes détectées sont bloquées
        if fraud_score > 70 and random.random() < 0.7:
            status = 'failed'
        elif fraud_score > 40:
            status = 'pending'
        else:
            status = 'completed'  # Fraude non détectée
    else:
        # Transaction légitime
        fraud_score = random.randint(0, 35)
        status = 'completed'
    
    # Description
    descriptions = {
        'CASHIN': f"Top-up Stripe {amount/5:.2f}€",
        'P2P': f"Transfert à un ami",
        'MERCHANT': f"Achat produit campus"
    }
    
    # Choisir un receiver_id valide parmi les utilisateurs existants
    if transaction_type == 'CASHIN':
        receiver_id = user_id  # Top-up : sender = receiver
    else:
        # P2P ou MERCHANT : choisir un autre utilisateur aléatoire
        other_users = [uid for uid in all_user_ids if uid != user_id]
        receiver_id = random.choice(other_users) if other_users else user_id
    
    return {
        'sender_id': user_id,
        'receiver_id': receiver_id,
        'amount': amount,
        'type': 'topup' if transaction_type == 'CASHIN' else ('transfer' if transaction_type == 'P2P' else 'purchase'),
        'status': status,
        'provider': provider,
        'provider_tx_id': f"tx_{uuid.uuid4().hex[:16]}",
        'initiator_user_id': user_id,
        'currency': 'EPC',
        'transaction_type': transaction_type,
        'direction': direction,
        'country': country,
        'city': city,
        'description': descriptions[transaction_type],
        'device_info': device_info,
        'fraud_score': fraud_score,
        'fraud_features': json.dumps({
            'is_fraud': is_fraud,
            'pattern': generate_fraud_pattern() if is_fraud else 'normal',
            'transaction_number': transaction_number
        }),
        'created_at': created_at.isoformat(),
        'executed_at': (created_at + timedelta(seconds=random.randint(1, 10))).isoformat(),
        'metadata': json.dumps({
            'synthetic': True,
            'generated_for_training': True
        })
    }

def generate_all_transactions(num_transactions: int = 1000, num_users: int = 50):
    """
    Génère un dataset complet de transactions réalistes
    """
    print(f"🚀 Génération de {num_transactions} transactions pour {num_users} utilisateurs...\n")
    
    # Générer les utilisateurs avec leurs caractéristiques
    users = []
    for i in range(num_users):
        user_country = weighted_choice(COUNTRIES)
        user_city = CITIES_BY_COUNTRY.get(user_country, ['Unknown City'])[0]
        user = {
            'id': str(uuid.uuid4()),
            'country': user_country,
            'city': user_city,
            'campus': f'Campus {random.choice(["Paris", "Lyon", "Marseille", "Nice", "Toulouse"])}',
            'balance': random.randint(100, 10000),
            'created_at': datetime.now() - timedelta(days=random.randint(30, 365)),
            'device_info': generate_device_info(user_country),
            'device_ids': [],  # Sera rempli au fur et à mesure
        }
        users.append(user)
    
    print(f"✅ {num_users} utilisateurs générés")
    print(f"📍 Distribution pays: {dict(sorted(COUNTRIES.items(), key=lambda x: x[1], reverse=True)[:5])}")
    
    # Générer les transactions
    transactions = []
    base_date = datetime.now()
    
    # Créer une liste de tous les user IDs pour les receiver_id
    all_user_ids = [user['id'] for user in users]
    
    for i in range(num_transactions):
        user = random.choice(users)
        
        transaction = generate_transaction(
            user_id=user['id'],
            base_date=base_date,
            user_device_ids=user['device_ids'],
            user_country=user['country'],
            transaction_number=i,
            all_user_ids=all_user_ids
        )
        
        transactions.append(transaction)
        
        if (i + 1) % 100 == 0:
            fraud_count = sum(1 for t in transactions[-100:] if t['fraud_score'] > 70)
            print(f"  ⏳ Généré {i + 1}/{num_transactions} transactions (dont {fraud_count} fraudes dans les 100 dernières)")
    
    # Statistiques finales
    print("\n📊 Statistiques du dataset généré:")
    print(f"  Total transactions: {len(transactions)}")
    
    fraud_count = sum(1 for t in transactions if t['fraud_score'] > 70)
    print(f"  Fraudes (score > 70): {fraud_count} ({fraud_count/len(transactions)*100:.1f}%)")
    
    by_type = {}
    for t in transactions:
        by_type[t['transaction_type']] = by_type.get(t['transaction_type'], 0) + 1
    print(f"  Par type: {by_type}")
    
    by_status = {}
    for t in transactions:
        by_status[t['status']] = by_status.get(t['status'], 0) + 1
    print(f"  Par statut: {by_status}")
    
    countries_used = set(t['country'] for t in transactions)
    print(f"  Pays uniques: {len(countries_used)}")
    
    devices_used = set(t['device_info']['device_id'] for t in transactions)
    print(f"  Devices uniques: {len(devices_used)}")
    
    return transactions, users

def insert_to_supabase(transactions: List[Dict], users: List[Dict]):
    """
    Insère les utilisateurs (via Auth API) et les transactions dans Supabase
    """
    if not SUPABASE_KEY:
        print("\n❌ SUPABASE_SERVICE_ROLE_KEY non configurée !")
        print("   Exportez la variable d'environnement :")
        print("   export SUPABASE_SERVICE_ROLE_KEY='votre_clé'")
        return
    
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    # Étape 1 : Créer les utilisateurs via l'API Auth (qui créera automatiquement les profils via trigger)
    print(f"\n📥 Étape 1/3 : Création de {len(users)} utilisateurs via Auth API...")
    
    user_id_mapping = {}  # ancien_id -> nouvel_id
    created_user_ids = []
    
    for i, user in enumerate(users):
        old_id = user['id']
        email = f'synthetic_{old_id[:8]}@test.epicoin.app'
        
        try:
            # Créer l'utilisateur via l'API Admin Auth de Supabase
            response = requests.post(
                f'{SUPABASE_URL}/auth/v1/admin/users',
                headers={
                    'apikey': SUPABASE_KEY,
                    'Authorization': f'Bearer {SUPABASE_KEY}',
                    'Content-Type': 'application/json'
                },
                json={
                    'email': email,
                    'password': 'TestPassword123!',  # Mot de passe par défaut pour les tests
                    'email_confirm': True,  # Auto-confirmer l'email
                    'user_metadata': {
                        'full_name': f'Test User {old_id[:8]}'
                    }
                }
            )
            
            if response.status_code == 200:
                created_user = response.json()
                new_id = created_user['id']
                
                # Sauvegarder le mapping ancien_id -> nouvel_id
                user_id_mapping[old_id] = new_id
                created_user_ids.append(new_id)
                
                # Mettre à jour l'ID de l'utilisateur dans la liste
                user['id'] = new_id
                
                if (i + 1) % 10 == 0:
                    print(f"  ⏳ {i + 1}/{len(users)} utilisateurs créés...")
            elif response.status_code == 422 and 'already registered' in response.text:
                # L'utilisateur existe déjà, on le garde
                print(f"  ℹ️  Utilisateur {email} existe déjà, on continue...")
                user_id_mapping[old_id] = old_id  # Garder le même ID
                created_user_ids.append(old_id)
            else:
                print(f"  ⚠️  Erreur création utilisateur {email}: {response.status_code} - {response.text[:100]}")
        except Exception as e:
            print(f"  ⚠️  Erreur création utilisateur {email}: {e}")
    
    print(f"  ✅ {len(created_user_ids)} utilisateurs créés/trouvés")
    
    # Étape 2 : Mettre à jour les balances des profils
    print(f"\n📥 Étape 2/3 : Mise à jour des balances des profils...")
    
    try:
        for user in users:
            if user['id'] in created_user_ids:
                supabase.table('profiles').update({
                    'balance': user['balance']
                }).eq('id', user['id']).execute()
        
        print(f"  ✅ Balances mises à jour pour {len(created_user_ids)} profils")
    except Exception as e:
        print(f"  ⚠️  Erreur lors de la mise à jour des balances: {e}")
    
    # Étape 3 : Mettre à jour les IDs dans les transactions et les insérer
    print(f"\n📤 Étape 3/3 : Insertion de {len(transactions)} transactions...")
    
    # Mettre à jour les sender_id et receiver_id dans les transactions avec le mapping créé à l'étape 1
    for transaction in transactions:
        if transaction['sender_id'] in user_id_mapping:
            transaction['sender_id'] = user_id_mapping[transaction['sender_id']]
        if transaction['receiver_id'] in user_id_mapping:
            transaction['receiver_id'] = user_id_mapping[transaction['receiver_id']]
        if transaction.get('initiator_user_id') in user_id_mapping:
            transaction['initiator_user_id'] = user_id_mapping[transaction['initiator_user_id']]
    
    batch_size = 100
    success_count = 0
    error_count = 0
    
    for i in range(0, len(transactions), batch_size):
        batch = transactions[i:i+batch_size]
        
        try:
            response = supabase.table('transactions').insert(batch).execute()
            success_count += len(batch)
            print(f"  ✅ Batch {i//batch_size + 1}/{(len(transactions)-1)//batch_size + 1} inséré ({len(batch)} transactions)")
        except Exception as e:
            error_count += len(batch)
            print(f"  ❌ Erreur batch {i//batch_size + 1}: {e}")
            # Continuer avec le prochain batch
    
    print(f"\n🎉 Insertion terminée !")
    print(f"  ✅ {success_count} transactions insérées avec succès")
    if error_count > 0:
        print(f"  ⚠️  {error_count} transactions en erreur")

def export_to_csv(transactions: List[Dict], filename: str = 'synthetic_transactions.csv'):
    """
    Exporte les transactions en CSV pour vérification/backup
    """
    import csv
    
    print(f"\n💾 Export vers {filename}...")
    
    # Flatten device_info pour CSV
    flattened = []
    for t in transactions:
        flat = {**t}
        device_info = flat.pop('device_info')
        flat.update({
            'device_id': device_info['device_id'],
            'device_model': device_info['device_model'],
            'os_name': device_info['os_name'],
            'os_version': device_info['os_version'],
            'ip': device_info['ip']
        })
        flattened.append(flat)
    
    keys = flattened[0].keys()
    with open(filename, 'w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=keys)
        writer.writeheader()
        writer.writerows(flattened)
    
    print(f"✅ {len(transactions)} transactions exportées vers {filename}")

if __name__ == '__main__':
    print("=" * 60)
    print("🎲 Générateur de Transactions Synthétiques Réalistes")
    print("=" * 60)
    print()
    
    # Générer les transactions et les utilisateurs
    transactions, users = generate_all_transactions(
        num_transactions=5000,  # Générer 5000 transactions pour meilleur entraînement
        num_users=150  # Plus d'utilisateurs pour plus de diversité
    )
    
    # Option 1: Exporter en CSV pour vérification
    export_to_csv(transactions)
    
    # Option 2: Insérer dans Supabase (décommenter si migrations appliquées)
    print("\n" + "="*60)
    print("⚠️  Pour insérer dans Supabase:")
    print("   1. Assurez-vous que les migrations sont appliquées")
    print("   2. Exportez: export SUPABASE_SERVICE_ROLE_KEY='votre_clé'")
    print("   3. Exécutez ce script")
    print("="*60)
    
    insert_to_supabase(transactions, users)  # Crée les profils puis les transactions
    
    print("\n✅ Terminé ! Vous pouvez maintenant:")
    print("   1. Vérifier synthetic_transactions.csv")
    print("   2. Les données sont dans Supabase (profils + transactions)")
    print("   3. Entraîner le modèle avec ces données")
