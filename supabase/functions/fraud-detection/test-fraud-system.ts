/**
 * Script de test pour le système de détection de fraude
 * 
 * Ce script teste les 3 scénarios principaux :
 * 1. Transaction normale (devrait être approuvée)
 * 2. Transaction suspecte (devrait être en revue)
 * 3. Transaction frauduleuse (devrait être bloquée)
 * 
 * Usage:
 *   deno run --allow-net --allow-env test-fraud-system.ts
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Configuration
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || 'https://srvkyiugewdjrpvcmquq.supabase.co'
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

if (!SUPABASE_SERVICE_KEY) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY non défini')
    Deno.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

interface TestScenario {
    name: string
    description: string
    transaction: {
        userId: string
        amount: number
        type: 'transfer' | 'purchase' | 'topup'
        recipientId?: string
        metadata?: Record<string, any>
    }
    expectedDecision: 'approve' | 'review' | 'block'
    expectedScoreRange: [number, number] // [min, max]
}

// Couleurs pour les logs
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    gray: '\x1b[90m',
}

function log(color: string, symbol: string, message: string) {
    console.log(`${color}${symbol}${colors.reset} ${message}`)
}

async function getOrCreateTestUser(): Promise<string> {
    // Rechercher un utilisateur de test existant
    const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email')
        .limit(1)
    
    if (profiles && profiles.length > 0) {
        log(colors.blue, 'ℹ', `Utilisateur de test trouvé: ${profiles[0].email}`)
        return profiles[0].id
    }

    log(colors.yellow, '⚠', 'Aucun utilisateur trouvé. Créez un compte via l\'app pour tester.')
    throw new Error('No test user available')
}

async function testFraudDetection(scenario: TestScenario): Promise<boolean> {
    log(colors.blue, '▶', `Test: ${scenario.name}`)
    log(colors.gray, ' ', scenario.description)

    try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/fraud-detection`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ transaction: scenario.transaction })
        })

        if (!response.ok) {
            const errorText = await response.text()
            log(colors.red, '✖', `Erreur HTTP: ${response.status} - ${errorText}`)
            return false
        }

        const result = await response.json()

        // Vérifier la décision
        const decisionMatch = result.decision === scenario.expectedDecision
        const scoreInRange = result.riskScore >= scenario.expectedScoreRange[0] && 
                            result.riskScore <= scenario.expectedScoreRange[1]

        if (decisionMatch && scoreInRange) {
            log(colors.green, '✓', `SUCCÈS - Décision: ${result.decision}, Score: ${result.riskScore}`)
            
            // Afficher les raisons
            if (result.reasons && result.reasons.length > 0) {
                log(colors.gray, ' ', '  Raisons:')
                result.reasons.slice(0, 3).forEach((r: any) => {
                    log(colors.gray, ' ', `    • ${r.description} (poids: ${r.weight})`)
                })
            }
            
            return true
        } else {
            log(colors.red, '✖', `ÉCHEC`)
            log(colors.gray, ' ', `  Attendu: ${scenario.expectedDecision} [${scenario.expectedScoreRange[0]}-${scenario.expectedScoreRange[1]}]`)
            log(colors.gray, ' ', `  Obtenu:  ${result.decision} [${result.riskScore}]`)
            return false
        }

    } catch (error) {
        log(colors.red, '✖', `ERREUR: ${error.message}`)
        return false
    }
}

async function runTests() {
    console.log('\n' + '='.repeat(60))
    log(colors.blue, '🧪', 'Test du Système de Détection de Fraude - Epicoin')
    console.log('='.repeat(60) + '\n')

    // Récupérer un utilisateur de test
    let testUserId: string
    try {
        testUserId = await getOrCreateTestUser()
    } catch (error) {
        log(colors.red, '✖', 'Impossible de trouver un utilisateur de test')
        return
    }

    // Définir les scénarios de test
    const scenarios: TestScenario[] = [
        {
            name: 'Scénario 1: Transaction Normale',
            description: 'Petit montant, utilisateur établi → devrait être approuvée',
            transaction: {
                userId: testUserId,
                amount: 50,
                type: 'topup'
            },
            expectedDecision: 'approve',
            expectedScoreRange: [0, 30]
        },
        {
            name: 'Scénario 2: Transaction Suspecte Modérée',
            description: 'Montant moyen-élevé → devrait être en revue manuelle',
            transaction: {
                userId: testUserId,
                amount: 800,
                type: 'transfer',
                recipientId: '00000000-0000-0000-0000-000000000001', // Nouveau destinataire
            },
            expectedDecision: 'review',
            expectedScoreRange: [31, 70]
        },
        {
            name: 'Scénario 3: Transaction Hautement Frauduleuse',
            description: 'Montant très élevé → devrait être bloquée',
            transaction: {
                userId: testUserId,
                amount: 5000,
                type: 'transfer',
                recipientId: '00000000-0000-0000-0000-000000000002', // Nouveau destinataire
            },
            expectedDecision: 'block',
            expectedScoreRange: [71, 100]
        },
        {
            name: 'Scénario 4: Achat Normal',
            description: 'Achat produit, petit montant → devrait être approuvé',
            transaction: {
                userId: testUserId,
                amount: 25,
                type: 'purchase',
                metadata: {
                    product_id: 'test-product-1'
                }
            },
            expectedDecision: 'approve',
            expectedScoreRange: [0, 30]
        },
        {
            name: 'Scénario 5: Achat Suspect',
            description: 'Achat produit, montant élevé → devrait être en revue',
            transaction: {
                userId: testUserId,
                amount: 1200,
                type: 'purchase',
                metadata: {
                    product_id: 'test-product-expensive'
                }
            },
            expectedDecision: 'review',
            expectedScoreRange: [31, 70]
        }
    ]

    // Exécuter les tests
    const results: boolean[] = []
    
    for (const scenario of scenarios) {
        const success = await testFraudDetection(scenario)
        results.push(success)
        console.log('') // Ligne vide entre les tests
    }

    // Résumé
    console.log('='.repeat(60))
    const passedTests = results.filter(r => r).length
    const totalTests = results.length
    const successRate = (passedTests / totalTests) * 100

    if (successRate === 100) {
        log(colors.green, '✓', `TOUS LES TESTS RÉUSSIS (${passedTests}/${totalTests})`)
    } else if (successRate >= 80) {
        log(colors.yellow, '⚠', `TESTS PARTIELLEMENT RÉUSSIS (${passedTests}/${totalTests})`)
    } else {
        log(colors.red, '✖', `ÉCHEC DES TESTS (${passedTests}/${totalTests})`)
    }

    console.log('='.repeat(60) + '\n')

    // Statistiques supplémentaires
    log(colors.blue, 'ℹ', 'Statistiques Fraude:')
    try {
        const { data: stats } = await supabase.rpc('get_fraud_stats', { days_ago: 7 })
        if (stats) {
            log(colors.gray, ' ', `  • Total alertes (7 jours): ${stats.total_alerts || 0}`)
            log(colors.gray, ' ', `  • Alertes en attente: ${stats.pending_alerts || 0}`)
            log(colors.gray, ' ', `  • Taux de blocage: ${stats.block_rate || 0}%`)
        }
    } catch (error) {
        log(colors.gray, ' ', '  (Statistiques non disponibles)')
    }

    console.log('')
}

// Point d'entrée
if (import.meta.main) {
    runTests()
        .then(() => Deno.exit(0))
        .catch((error) => {
            console.error('Erreur fatale:', error)
            Deno.exit(1)
        })
}

