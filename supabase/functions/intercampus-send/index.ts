import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const authHeader = req.headers.get('Authorization')!
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: userError } = await userClient.auth.getUser()
    if (userError || !user) throw new Error('Unauthorized')

    const {
      source_wallet_id,
      destination_wallet_id,   // campus wallet UUID du campus destinataire
      destination_user_id,     // user UUID à créditer chez le campus destinataire
      destination_campus_api_url,
      destination_api_key,     // api_key_hash du campus destinataire
      receive_path,            // chemin de l'endpoint receive chez le campus destinataire
      amount,
      currency,
      description,
      enriched_data
    } = await req.json()

    if (!destination_api_key) {
      return new Response(
        JSON.stringify({ success: false, status: 'failed', message: 'destination_api_key requis' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!destination_user_id) {
      return new Response(
        JSON.stringify({ success: false, status: 'failed', message: 'destination_user_id requis — utiliser lookup-user pour l obtenir' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('[Intercampus Send]', { user_id: user.id, source_wallet_id, destination_wallet_id, destination_user_id, amount })

    const { data: sourceWallet } = await supabase
      .from('wallets')
      .select('*')
      .eq('id', source_wallet_id)
      .eq('is_active', true)
      .single()

    if (!sourceWallet) {
      return new Response(
        JSON.stringify({ success: false, status: 'failed', message: 'Wallet source introuvable ou inactif' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: senderProfile } = await supabase
      .from('profiles')
      .select('balance')
      .eq('id', user.id)
      .single()

    if (!senderProfile || senderProfile.balance < amount) {
      return new Response(
        JSON.stringify({ success: false, status: 'failed', message: 'Solde insuffisant' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const deviceInfo = {
      ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
      user_agent: req.headers.get('user-agent') || undefined,
    }

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
            device_info: { ...deviceInfo, ...enriched_data?.device_info },
            country: enriched_data?.country,
            city: enriched_data?.city,
            ...enriched_data
          }
        })
      }
    )

    if (!fraudResponse.ok) throw new Error('Fraud detection failed')

    const fraudAnalysis = await fraudResponse.json()
    console.log('[Intercampus Send] Fraud analysis:', fraudAnalysis.riskScore, fraudAnalysis.decision)

    const transactionId = crypto.randomUUID()

    const { data: sendResult, error: sendError } = await supabase.rpc('intercampus_send', {
      p_sender_id: user.id,
      p_source_wallet_id: sourceWallet.id,
      p_destination_wallet_id: destination_wallet_id,
      p_amount: amount,
      p_provider_tx_id: transactionId,
      p_fraud_score: fraudAnalysis.riskScore,
      p_fraud_features: fraudAnalysis.features,
      p_enriched_data: { currency, description, device_info: deviceInfo, destination_campus_name: enriched_data?.destination_campus_name, ...enriched_data }
    })

    if (sendError) throw sendError

    if (!sendResult?.success) {
      return new Response(
        JSON.stringify({
          success: false,
          status: sendResult?.status || 'error',
          message: sendResult?.message || 'Erreur lors de la transaction locale',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (sendResult.status === 'blocked' || sendResult.status === 'pending_review') {
      return new Response(
        JSON.stringify(sendResult),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    try {
      const effectiveReceivePath = receive_path ?? '/intercampus-receive'
      const receiveUrl = `${destination_campus_api_url}${effectiveReceivePath}`
      console.log('[Intercampus Send] Calling destination:', receiveUrl)
      const destResponse = await fetch(receiveUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transaction_id: transactionId,
          source_wallet_id: sourceWallet.id,
          destination_wallet_id,
          destination_user_id,
          amount,
          currency,
          initiator_user_id: user.id,
          api_key: destination_api_key,
          source_campus_id: sourceWallet.campus_id,
          enriched_data: { description, device_info: deviceInfo, ...enriched_data }
        })
      })

      if (!destResponse.ok) throw new Error(`Destination returned ${destResponse.status}`)

      const destResult = await destResponse.json()

      if (!destResult.success) {
        await supabase.from('profiles').update({ balance: senderProfile.balance }).eq('id', user.id)
        await supabase.from('transactions').update({ status: 'failed', reason_code: 'DEST_REJECTED' }).eq('id', sendResult.transaction_id)
        await supabase.rpc('merge_transaction_metadata', { p_tx_id: sendResult.transaction_id, p_extra: { destination_error: destResult.message } })

        return new Response(
          JSON.stringify({
            success: false, status: 'failed',
            message: `Rejeté par le campus destinataire: ${destResult.message}`,
            transaction_id: sendResult.transaction_id
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Merge destination_tx_id into existing metadata (not overwrite)
      await supabase.rpc('merge_transaction_metadata', {
        p_tx_id: sendResult.transaction_id,
        p_extra: { destination_tx_id: destResult.transaction_id, executed_at: new Date().toISOString() }
      })

      console.log('[Intercampus Send] Transfer successful')
      return new Response(
        JSON.stringify({
          success: true, status: 'completed',
          message: 'Transfert intercampus réussi',
          transaction_id: sendResult.transaction_id,
          destination_tx_id: destResult.transaction_id,
          new_balance: sendResult.new_balance,
          fraud_score: fraudAnalysis.riskScore
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )

    } catch (destError) {
      console.error('[Intercampus Send] Destination error:', destError.message)
      await supabase.from('profiles').update({ balance: senderProfile.balance }).eq('id', user.id)
      await supabase.from('transactions').update({ status: 'failed', reason_code: 'NETWORK_ERROR' }).eq('id', sendResult.transaction_id)
      await supabase.rpc('merge_transaction_metadata', { p_tx_id: sendResult.transaction_id, p_extra: { error: destError.message } })

      return new Response(
        JSON.stringify({
          success: false, status: 'failed',
          message: 'Erreur de communication avec le campus destinataire',
          transaction_id: sendResult.transaction_id,
          error: destError.message
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

  } catch (err) {
    console.error('[Intercampus Send] Error:', err.message)
    return new Response(
      JSON.stringify({ success: false, status: 'error', error: err.message }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
