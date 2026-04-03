import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
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

        const {
            transaction_id,
            source_wallet_id,
            destination_wallet_id,
            amount,
            currency,
            initiator_user_id,
            api_key,
            source_campus_id,
            enriched_data
        } = await req.json()

        console.log('[Intercampus Receive] Incoming payment:', {
            source_campus_id,
            destination_wallet_id,
            amount,
            transaction_id
        })

        // 1. Vérifier l'API key du wallet source
        const { data: sourceWallet } = await supabase
            .from('wallets')
            .select('*')
            .eq('campus_id', source_campus_id)
            .single()

        if (!sourceWallet) {
            return new Response(
                JSON.stringify({
                    success: false,
                    status: 'failed',
                    message: 'Wallet source inconnu'
                }),
                { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Comparaison directe : intercampus-send transmet api_key_hash comme clé d'authentification
        if (api_key !== sourceWallet.api_key_hash) {
            return new Response(
                JSON.stringify({
                    success: false,
                    status: 'unauthorized',
                    message: 'API key invalide'
                }),
                { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // 2. Vérifier que le wallet de destination existe
        const { data: destWallet } = await supabase
            .from('wallets')
            .select('*')
            .eq('id', destination_wallet_id)
            .eq('is_active', true)
            .single()

        if (!destWallet) {
            return new Response(
                JSON.stringify({
                    success: false,
                    status: 'failed',
                    message: 'Wallet de destination introuvable ou inactif'
                }),
                { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // 3. Appeler fraud-detection
        console.log('[Intercampus Receive] Calling fraud detection')
        
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
                        initiator_user_id,
                        amount,
                        currency: currency || 'EPC',
                        type: 'intercampus',
                        transaction_type: 'INTERCAMPUS',
                        direction: 'incoming',
                        provider: 'intercampus',
                        provider_tx_id: transaction_id,
                        source_wallet_id: sourceWallet.id,
                        destination_wallet_id: destWallet.id,
                        created_at: new Date().toISOString(),
                        ...enriched_data
                    }
                })
            }
        )

        if (!fraudResponse.ok) {
            throw new Error('Fraud detection failed')
        }

        const fraudAnalysis = await fraudResponse.json()
        console.log('[Intercampus Receive] Fraud analysis:', fraudAnalysis.riskScore, fraudAnalysis.decision)

        // 4. Appeler la fonction SQL intercampus_receive
        const { data: result, error } = await supabase.rpc('intercampus_receive', {
            p_source_wallet_id: sourceWallet.id,
            p_destination_wallet_id: destWallet.id,
            p_amount: amount,
            p_initiator_user_id: initiator_user_id,
            p_provider_tx_id: transaction_id,
            p_fraud_score: fraudAnalysis.riskScore,
            p_fraud_features: fraudAnalysis.features,
            p_enriched_data: {
                ...enriched_data,
                source_campus: sourceWallet.campus_name
            }
        })

        if (error) {
            console.error('[Intercampus Receive] SQL function error:', error)
            throw error
        }

        console.log('[Intercampus Receive] Transaction result:', result)

        return new Response(
            JSON.stringify(result),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        console.error('[Intercampus Receive] Error:', error.message)
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
