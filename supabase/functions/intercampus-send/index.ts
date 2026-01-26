import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // Get authenticated user
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

        const {
            source_wallet_id,
            destination_wallet_id,
            destination_campus_api_url,
            amount,
            currency,
            description,
            enriched_data
        } = await req.json()

        console.log('[Intercampus Send] Sending payment:', {
            user_id: user.id,
            source_wallet_id,
            destination_wallet_id,
            amount
        })

        // 1. Vérifier le wallet source
        const { data: sourceWallet } = await supabase
            .from('wallets')
            .select('*')
            .eq('id', source_wallet_id)
            .eq('is_active', true)
            .single()

        if (!sourceWallet) {
            return new Response(
                JSON.stringify({
                    success: false,
                    status: 'failed',
                    message: 'Wallet source introuvable ou inactif'
                }),
                { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Vérifier le solde
        if (sourceWallet.balance < amount) {
            return new Response(
                JSON.stringify({
                    success: false,
                    status: 'failed',
                    message: 'Solde du wallet insuffisant'
                }),
                { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // 2. Collecter device info depuis headers
        const deviceInfo = {
            ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
            user_agent: req.headers.get('user-agent') || undefined,
        }

        // 3. Appeler fraud-detection local
        console.log('[Intercampus Send] Calling fraud detection')
        
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
                        initiator_user_id: user.id,
                        amount,
                        currency: currency || 'EPC',
                        type: 'intercampus',
                        transaction_type: 'INTERCAMPUS',
                        direction: 'outgoing',
                        provider: 'intercampus',
                        source_wallet_id: sourceWallet.id,
                        destination_wallet_id,
                        created_at: new Date().toISOString(),
                        description,
                        device_info: {
                            ...deviceInfo,
                            ...enriched_data?.device_info
                        },
                        country: enriched_data?.country,
                        city: enriched_data?.city,
                        ...enriched_data
                    }
                })
            }
        )

        if (!fraudResponse.ok) {
            throw new Error('Fraud detection failed')
        }

        const fraudAnalysis = await fraudResponse.json()
        console.log('[Intercampus Send] Fraud analysis:', fraudAnalysis.riskScore, fraudAnalysis.decision)

        // Générer un transaction ID unique
        const transactionId = crypto.randomUUID()

        // 4. Appeler la fonction SQL intercampus_send (débite le wallet local)
        const { data: sendResult, error: sendError } = await supabase.rpc('intercampus_send', {
            p_sender_id: user.id,
            p_source_wallet_id: sourceWallet.id,
            p_destination_wallet_id: destination_wallet_id,
            p_amount: amount,
            p_provider_tx_id: transactionId,
            p_fraud_score: fraudAnalysis.riskScore,
            p_fraud_features: fraudAnalysis.features,
            p_enriched_data: {
                currency,
                description,
                device_info: deviceInfo,
                ...enriched_data
            }
        })

        if (sendError) {
            console.error('[Intercampus Send] SQL function error:', sendError)
            throw sendError
        }

        // Si bloqué ou en revue, ne pas envoyer au campus distant
        if (sendResult.status === 'blocked' || sendResult.status === 'pending_review') {
            return new Response(
                JSON.stringify(sendResult),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // 5. Envoyer au campus destinataire via API
        try {
            console.log('[Intercampus Send] Calling destination campus API:', destination_campus_api_url)
            
            const destResponse = await fetch(`${destination_campus_api_url}/intercampus-receive`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': sourceWallet.api_key_hash // En prod, utiliser la vraie clé API
                },
                body: JSON.stringify({
                    transaction_id: transactionId,
                    source_wallet_id: sourceWallet.id,
                    destination_wallet_id,
                    amount,
                    currency,
                    initiator_user_id: user.id,
                    api_key: sourceWallet.api_key_hash, // En prod, utiliser la vraie clé
                    source_campus_id: sourceWallet.campus_id,
                    enriched_data: {
                        description,
                        device_info: deviceInfo,
                        ...enriched_data
                    }
                })
            })

            if (!destResponse.ok) {
                throw new Error(`Destination campus returned ${destResponse.status}`)
            }

            const destResult = await destResponse.json()
            
            if (!destResult.success) {
                // Rollback: re-créditer le wallet source
                await supabase
                    .from('wallets')
                    .update({ balance: sourceWallet.balance })
                    .eq('id', source_wallet_id)

                // Mettre à jour la transaction locale en 'failed'
                await supabase
                    .from('transactions')
                    .update({ 
                        status: 'failed',
                        reason_code: 'DEST_REJECTED',
                        metadata: { ...sendResult.metadata, destination_error: destResult.message }
                    })
                    .eq('id', sendResult.transaction_id)

                return new Response(
                    JSON.stringify({
                        success: false,
                        status: 'failed',
                        message: `Transaction rejetée par le campus destinataire: ${destResult.message}`,
                        transaction_id: sendResult.transaction_id
                    }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                )
            }

            // 6. Succès - mettre à jour la transaction locale
            await supabase
                .from('transactions')
                .update({
                    executed_at: new Date().toISOString(),
                    metadata: { 
                        ...sendResult.metadata, 
                        destination_tx_id: destResult.transaction_id 
                    }
                })
                .eq('id', sendResult.transaction_id)

            console.log('[Intercampus Send] Transfer successful')

            return new Response(
                JSON.stringify({
                    success: true,
                    status: 'completed',
                    message: 'Transfert intercampus réussi',
                    transaction_id: sendResult.transaction_id,
                    destination_tx_id: destResult.transaction_id,
                    new_balance: sendResult.new_balance,
                    fraud_score: fraudAnalysis.riskScore
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )

        } catch (destError) {
            console.error('[Intercampus Send] Destination API error:', destError.message)
            
            // Rollback: re-créditer le wallet source
            await supabase
                .from('wallets')
                .update({ balance: sourceWallet.balance })
                .eq('id', source_wallet_id)

            // Mettre à jour la transaction en 'failed'
            await supabase
                .from('transactions')
                .update({ 
                    status: 'failed',
                    reason_code: 'NETWORK_ERROR',
                    metadata: { ...sendResult.metadata, error: destError.message }
                })
                .eq('id', sendResult.transaction_id)

            return new Response(
                JSON.stringify({
                    success: false,
                    status: 'failed',
                    message: 'Erreur lors de la communication avec le campus destinataire',
                    transaction_id: sendResult.transaction_id,
                    error: destError.message
                }),
                { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

    } catch (error) {
        console.error('[Intercampus Send] Error:', error.message)
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
