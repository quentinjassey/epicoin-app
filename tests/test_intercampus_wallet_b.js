#!/usr/bin/env node
/**
 * Script de test pour simuler un Wallet B (externe)
 * qui REÇOIT de l'argent depuis le système EpiPay
 * 
 * Ce script simule un système de wallet externe indépendant
 * qui appelle l'endpoint /intercampus-receive d'EpiPay
 * 
 * Usage:
 *   node test_intercampus_wallet_b.js
 */

const https = require('https');
const crypto = require('crypto');

// ============================================
// CONFIGURATION - À ADAPTER À VOTRE PROJET
// ============================================

const CONFIG = {
  // URL de votre projet Supabase
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co',
  
  // API Key du wallet externe (générée via SQL)
  walletApiKey: process.env.WALLET_API_KEY || 'epw_your_api_key_here',
  
  // Configuration de la transaction test
  transaction: {
    transaction_id: crypto.randomUUID(),
    source_wallet_id: 'wallet_external_test',
    destination_wallet_id: 'wallet_paris_test',
    amount: 75.00,
    currency: 'EPC',
    initiator_user_id: 'external_user_123',
    source_campus_id: 'external_campus',
    enriched_data: {
      country: 'FR',
      city: 'External City',
      description: 'Test de réception depuis wallet externe',
      device_info: {
        device_model: 'Script Node.js',
        os_name: 'Node.js',
        os_version: process.version,
        ip: '127.0.0.1'
      },
      test_mode: true,
      timestamp: new Date().toISOString()
    }
  }
};

// ============================================
// FONCTION DE RÉCEPTION
// ============================================

function receiveIntercampusPayment() {
  const url = new URL(`${CONFIG.supabaseUrl}/functions/v1/intercampus-receive`);
  
  const payload = {
    ...CONFIG.transaction,
    api_key: CONFIG.walletApiKey
  };
  
  const postData = JSON.stringify(payload);
  
  const options = {
    hostname: url.hostname,
    port: 443,
    path: url.pathname,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };
  
  console.log('='.repeat(60));
  console.log('🔄 TEST RÉCEPTION INTER-CAMPUS (Wallet Externe → EpiPay)');
  console.log('='.repeat(60));
  console.log(`📤 Source externe:  ${CONFIG.transaction.source_campus_id}`);
  console.log(`📥 Destination:     ${CONFIG.transaction.destination_wallet_id}`);
  console.log(`💰 Montant:         ${CONFIG.transaction.amount} EPC`);
  console.log(`🆔 Transaction ID:  ${CONFIG.transaction.transaction_id}`);
  console.log(`🌐 Endpoint:        ${url.href}`);
  console.log('='.repeat(60));
  console.log();
  
  const req = https.request(options, (res) => {
    let responseData = '';
    
    console.log(`📡 Status Code: ${res.statusCode}`);
    console.log();
    
    res.on('data', (chunk) => {
      responseData += chunk;
    });
    
    res.on('end', () => {
      try {
        const result = JSON.parse(responseData);
        
        console.log('📄 RÉPONSE :');
        console.log(JSON.stringify(result, null, 2));
        console.log();
        
        // Interpréter le résultat
        if (result.success) {
          console.log('✅ SUCCÈS - Paiement reçu et crédité');
          console.log(`   Transaction ID: ${result.transaction_id}`);
          console.log(`   Montant crédité: ${result.amount || CONFIG.transaction.amount} EPC`);
          console.log(`   Score fraude:    ${result.fraud_score}/100`);
        } 
        else if (result.status === 'pending_review') {
          console.log('⚠️  EN REVUE - Transaction en attente de validation');
          console.log(`   Transaction ID: ${result.transaction_id}`);
          console.log(`   Score fraude:   ${result.fraud_score}/100`);
        }
        else if (result.status === 'blocked') {
          console.log('🚫 BLOQUÉ - Transaction rejetée');
          console.log(`   Raison:       ${result.reason || result.message}`);
          console.log(`   Score fraude: ${result.fraud_score}/100`);
        }
        else if (result.status === 'unauthorized') {
          console.log('🔐 NON AUTORISÉ - API Key invalide');
          console.log(`   Message: ${result.message}`);
        }
        else {
          console.log('❌ ÉCHEC - Transaction échouée');
          console.log(`   Message: ${result.message || result.error}`);
        }
        
      } catch (e) {
        console.log('❌ ERREUR : Impossible de parser la réponse JSON');
        console.log(`Réponse brute: ${responseData}`);
      }
      
      console.log();
      console.log('='.repeat(60));
    });
  });
  
  req.on('error', (e) => {
    console.error(`❌ ERREUR RÉSEAU : ${e.message}`);
    console.log('='.repeat(60));
  });
  
  req.on('timeout', () => {
    console.error('❌ ERREUR : Timeout - Le serveur met trop de temps à répondre');
    req.destroy();
    console.log('='.repeat(60));
  });
  
  req.setTimeout(15000); // 15 secondes
  
  console.log('⏳ Envoi de la requête...');
  req.write(postData);
  req.end();
}

// ============================================
// POINT D'ENTRÉE
// ============================================

if (require.main === module) {
  // Vérifier la configuration
  if (CONFIG.supabaseUrl.includes('your-project') || CONFIG.walletApiKey.includes('your_api_key')) {
    console.log('⚠️  ATTENTION : Configuration incomplète !');
    console.log();
    console.log('Veuillez définir les variables d\'environnement :');
    console.log('  export EXPO_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"');
    console.log('  export WALLET_API_KEY="epw_votre_cle_api"');
    console.log();
    console.log('Ou modifier directement les valeurs dans le script.');
    process.exit(1);
  }
  
  receiveIntercampusPayment();
}

module.exports = { receiveIntercampusPayment };
