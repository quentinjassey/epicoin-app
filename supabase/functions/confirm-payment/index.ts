import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.14.0'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
    apiVersion: '2023-10-16',
    httpClient: Stripe.createFetchHttpClient(),
})

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // Lire le body UNE SEULE FOIS pour extraire toutes les données
        const body = await req.json()
        const { payment_intent_id } = body

        if (!payment_intent_id) {
            throw new Error('Missing payment_intent_id')
        }

        // 1. Retrieve PaymentIntent from Stripe
        const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id)

        if (paymentIntent.status !== 'succeeded') {
            throw new Error(`Payment not succeeded. Status: ${paymentIntent.status}`)
        }

        // 2. Check if transaction already exists (Idempotency)
        const { data: existingTx } = await supabase
            .from('transactions')
            .select('id')
            .eq('metadata->>stripe_payment_intent_id', payment_intent_id)
            .single()

        if (existingTx) {
            return new Response(
                JSON.stringify({ success: true, message: 'Transaction already processed' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // 3. Get User ID from metadata (or passed in body, but metadata is safer if set during creation)
        // We didn't set metadata in create-payment-intent, so we'll rely on the Auth context passed to this function
        // OR we can pass the user_id in the body.
        // Better: Get the user from the Authorization header of the request to this Edge Function.

        const authHeader = req.headers.get('Authorization')!
        const userClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: authHeader } } }
        )

        const { data: { user }, error: userError } = await userClient.auth.getUser()

        if (userError || !user) {
            throw new Error('Unauthorized')
        }

        const amountInEur = paymentIntent.amount / 100
        
        // Récupérer le montant EPC depuis les metadata (inclut le bonus)
        const amountInEpc = paymentIntent.metadata.epc_amount 
            ? parseFloat(paymentIntent.metadata.epc_amount)
            : amountInEur * 5 // Fallback: 1€ = 5 EPC sans bonus
        
        const bonus = paymentIntent.metadata.bonus 
            ? parseInt(paymentIntent.metadata.bonus)
            : 0

        // 4. Fraud Detection (avant d'incrémenter le solde) - VERSION ENRICHIE
        console.log('[Confirm Payment] Calling fraud-detection for top-up:', {
            userId: user.id,
            amount: amountInEpc
        })

        // Extraire device info depuis les headers
        const deviceInfo = {
            ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
            user_agent: req.headers.get('user-agent') || undefined,
        }

        // Récupérer le contexte depuis les metadata Stripe
        const context = paymentIntent.metadata.context 
            ? JSON.parse(paymentIntent.metadata.context)
            : {}

        const fraudResponse = await fetch(
            `${Deno.env.get('SUPABASE_URL')}/functions/v1/fraud-detection`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    transaction: {
                        // Ancien format (rétrocompatibilité)
                        userId: user.id,
                        amount: amountInEpc,
                        type: 'topup',
                        
                        // Nouveau format enrichi
                        initiator_user_id: user.id,
                        provider: 'stripe',
                        provider_tx_id: payment_intent_id,
                        currency: 'EPC',
                        transaction_type: 'CASHIN',
                        direction: 'incoming',
                        
                        // Timestamps
                        created_at: new Date().toISOString(),
                        provider_created_at: new Date(paymentIntent.created * 1000).toISOString(),
                        executed_at: new Date().toISOString(),
                        
                        // Localisation (depuis le contexte frontend)
                        country: context.country,
                        city: context.city,
                        
                        // Device info
                        device_info: {
                            ...deviceInfo,
                            ...context.device_info
                        },
                        
                        // Description
                        description: `Top-up de ${amountInEur}€ via Stripe`,
                        
                        // Métadonnées
                        metadata: {
                            stripe_payment_intent_id: payment_intent_id,
                            amount_eur: amountInEur,
                            payment_method: paymentIntent.payment_method
                        }
                    }
                })
            }
        )

        if (!fraudResponse.ok) {
            const errorText = await fraudResponse.text()
            console.error('[Confirm Payment] Fraud detection failed:', errorText)
            throw new Error(`Fraud detection failed: ${errorText}`)
        }

        const fraudAnalysis = await fraudResponse.json()
        console.log('[Confirm Payment] Fraud analysis result:', fraudAnalysis)

        let transactionStatus = 'completed'
        let shouldProcessPayment = true

        // 5. Décision selon le risque
        if (fraudAnalysis.decision === 'block') {
            // Transaction bloquée - Initier remboursement Stripe
            console.warn('[Confirm Payment] BLOCKED - High fraud risk. Initiating refund.')
            transactionStatus = 'failed'
            shouldProcessPayment = false

            try {
                await stripe.refunds.create({
                    payment_intent: payment_intent_id,
                    reason: 'fraudulent'
                })
                console.log('[Confirm Payment] Stripe refund initiated')
            } catch (refundError) {
                console.error('[Confirm Payment] Refund failed:', refundError)
            }

        } else if (fraudAnalysis.decision === 'review') {
            // Transaction en attente de revue manuelle
            console.warn('[Confirm Payment] PENDING REVIEW - Moderate fraud risk')
            transactionStatus = 'pending_review'
            shouldProcessPayment = false
        }

        // 6. Update Balance (uniquement si approuvé)
        if (shouldProcessPayment) {
        const { error: updateError } = await supabase.rpc('increment_balance', {
            user_id: user.id,
            amount_to_add: amountInEpc
        })

        // If RPC doesn't exist, we can do direct update since we are admin
        if (updateError) {
            // Fallback to direct update if RPC fails or doesn't exist
            const { data: profile } = await supabase.from('profiles').select('balance').eq('id', user.id).single()
            const newBalance = (profile?.balance || 0) + amountInEpc

            await supabase.from('profiles').update({ balance: newBalance }).eq('id', user.id)
            }
        }

        // 7. Record Transaction avec fraud data ENRICHIE
        const { data: insertedTx, error: insertError} = await supabase.from('transactions').insert({
            sender_id: user.id, // Self-funding
            receiver_id: user.id,
            amount: amountInEpc,
            type: 'topup',
            status: transactionStatus,
            
            // Fraud data
            fraud_score: fraudAnalysis.riskScore,
            fraud_features: fraudAnalysis.features,
            
            // Champs enrichis
            provider: 'stripe',
            provider_tx_id: payment_intent_id,
            initiator_user_id: user.id,
            currency: 'EPC',
            transaction_type: 'CASHIN',
            direction: 'incoming',
            provider_created_at: new Date(paymentIntent.created * 1000).toISOString(),
            executed_at: new Date().toISOString(),
            country: context.country,
            city: context.city,
            description: `Top-up de ${amountInEur}€ via Stripe`,
            device_info: {
                ...deviceInfo,
                ...context.device_info
            },
            
            // Métadonnées
            metadata: {
                stripe_payment_intent_id: payment_intent_id,
                amount_eur: amountInEur,
                bonus: bonus,
                base_epc: amountInEur * 5,
                total_epc: amountInEpc,
                payment_method: paymentIntent.payment_method,
                fraud_decision: fraudAnalysis.decision,
                fraud_reasons: fraudAnalysis.reasons.map((r: any) => r.description)
            }
        }).select().single()

        if (insertError) {
            console.error('[Confirm Payment] Transaction insert failed:', insertError)
            throw insertError
        }

        // 8. Créer alerte fraude si nécessaire
        if (transactionStatus !== 'completed') {
            const reasonsText = fraudAnalysis.reasons
                .map((r: any) => r.description)
                .join('; ')

            await supabase.rpc('create_fraud_alert', {
                p_transaction_id: insertedTx.id,
                p_risk_score: fraudAnalysis.riskScore,
                p_reason: reasonsText,
                p_fraud_features: fraudAnalysis.features
            })

            console.log('[Confirm Payment] Fraud alert created for transaction:', insertedTx.id)
        }

        // 9. Retourner résultat selon statut (toujours 200 OK pour que supabase.functions.invoke() ne throw pas)
        if (transactionStatus === 'failed') {
            return new Response(
                JSON.stringify({
                    success: false,
                    status: 'blocked',
                    message: 'Transaction bloquée pour suspicion de fraude. Un remboursement a été initié.',
                    fraud_score: fraudAnalysis.riskScore,
                    reasons: fraudAnalysis.reasons.map((r: any) => r.description)
                }),
                { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        } else if (transactionStatus === 'pending_review') {
            return new Response(
                JSON.stringify({
                    success: false,
                    status: 'pending_review',
                    message: 'Transaction en attente de vérification manuelle pour votre sécurité.',
                    fraud_score: fraudAnalysis.riskScore,
                    reasons: fraudAnalysis.reasons.map((r: any) => r.description)
                }),
                { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Transaction approuvée
        const { data: profile } = await supabase.from('profiles').select('balance').eq('id', user.id).single()

        return new Response(
            JSON.stringify({
                success: true,
                status: 'completed',
                new_balance: profile?.balance || 0,
                amount_added: amountInEpc,
                fraud_score: fraudAnalysis.riskScore
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        console.error('[Confirm Payment] Fatal error:', error)
        return new Response(
            JSON.stringify({ 
                success: false,
                status: 'error',
                error: error.message 
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
