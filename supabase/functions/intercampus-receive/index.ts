import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, x-api-key',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

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

    console.log('[Intercampus Receive] Incoming payment:', { source_campus_id, destination_wallet_id, amount, transaction_id })

    // Auth : vérifier que api_key correspond au wallet DESTINATAIRE
    // Le campus envoyeur doit connaître l'api_key_hash du wallet qu'il veut créditer
    const { data: destWallet } = await supabase
      .from('wallets')
      .select('*')
      .eq('id', destination_wallet_id)
      .eq('is_active', true)
      .single()

    if (!destWallet) {
      return new Response(
        JSON.stringify({ success: false, status: 'failed', message: 'Wallet de destination introuvable ou inactif' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (api_key !== destWallet.api_key_hash) {
      return new Response(
        JSON.stringify({ success: false, status: 'unauthorized', message: 'API key invalide' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Retrouver le wallet source si connu localement (pour l'enregistrement en DB)
    const { data: sourceWallet } = await supabase
      .from('wallets')
      .select('id, campus_name')
      .eq('campus_id', source_campus_id)
      .maybeSingle()

    const effectiveSourceWalletId = source_wallet_id || sourceWallet?.id || destination_wallet_id
    const sourceCampusName = sourceWallet?.campus_name || source_campus_id

    // Fraud detection
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
            source_wallet_id: effectiveSourceWalletId,
            destination_wallet_id: destWallet.id,
            created_at: new Date().toISOString(),
            ...enriched_data
          }
        })
      }
    )

    if (!fraudResponse.ok) throw new Error('Fraud detection failed')

    const fraudAnalysis = await fraudResponse.json()
    console.log('[Intercampus Receive] Fraud analysis:', fraudAnalysis.riskScore, fraudAnalysis.decision)

    const { data: result, error } = await supabase.rpc('intercampus_receive', {
      p_source_wallet_id: effectiveSourceWalletId,
      p_destination_wallet_id: destWallet.id,
      p_amount: amount,
      p_initiator_user_id: initiator_user_id,
      p_provider_tx_id: transaction_id,
      p_fraud_score: fraudAnalysis.riskScore,
      p_fraud_features: fraudAnalysis.features,
      p_enriched_data: { ...enriched_data, source_campus: sourceCampusName }
    })

    if (error) throw error

    console.log('[Intercampus Receive] Transaction result:', result)
    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('[Intercampus Receive] Error:', err.message)
    return new Response(
      JSON.stringify({ success: false, status: 'error', error: err.message }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
