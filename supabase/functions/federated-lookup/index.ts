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

    const { email } = await req.json()
    if (!email) {
      return new Response(
        JSON.stringify({ found: false, message: 'email requis' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 1. Chercher en local d'abord
    const { data: localUser } = await supabase
      .from('profiles')
      .select('id, email, full_name, campus')
      .eq('email', email.toLowerCase().trim())
      .neq('id', user.id)
      .maybeSingle()

    if (localUser) {
      return new Response(
        JSON.stringify({
          found: true,
          type: 'local',
          user_id: localUser.id,
          full_name: localUser.full_name,
          email: localUser.email,
          campus: localUser.campus,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Fan-out vers les campus partenaires actifs
    const { data: partners } = await supabase
      .from('partner_campuses')
      .select('campus_id, campus_name, functions_url, remote_wallet_id, api_key_hash, receive_path, lookup_path')
      .eq('is_active', true)

    if (!partners || partners.length === 0) {
      return new Response(
        JSON.stringify({ found: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[Federated Lookup] Querying ${partners.length} partner campus(es) for ${email}`)

    const results = await Promise.allSettled(
      partners.map(async (partner) => {
        const lookupUrl = `${partner.functions_url}${partner.lookup_path ?? '/lookup-user'}`
        const resp = await fetch(lookupUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ api_key: partner.api_key_hash, email }),
          signal: AbortSignal.timeout(5000),
        })
        if (!resp.ok) throw new Error(`${partner.campus_id} returned ${resp.status}`)
        const data = await resp.json()
        if (!data.success) throw new Error(`Not found on ${partner.campus_id}`)
        return {
          found: true,
          type: 'intercampus',
          user_id: data.user_id,
          full_name: data.full_name,
          email,
          campus: data.campus,
          campus_name: partner.campus_name,
          functions_url: partner.functions_url,
          receive_path: partner.receive_path ?? '/intercampus-receive',
          remote_wallet_id: data.wallet_id ?? partner.remote_wallet_id,
          destination_api_key: partner.api_key_hash,
        }
      })
    )

    const match = results.find(r => r.status === 'fulfilled')
    if (match && match.status === 'fulfilled') {
      console.log(`[Federated Lookup] Found on partner campus:`, match.value.campus_name)
      return new Response(
        JSON.stringify(match.value),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ found: false }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('[Federated Lookup] Error:', err.message)
    return new Response(
      JSON.stringify({ found: false, error: err.message }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
