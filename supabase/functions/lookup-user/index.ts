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

    const { api_key, email, full_name, campus } = await req.json()

    if (!api_key) {
      return new Response(
        JSON.stringify({ success: false, status: 'unauthorized', message: 'api_key requis' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Auth : api_key doit correspondre à n'importe quel campus wallet actif
    // Pas de source_campus_id requis — quiconque possède un api_key_hash valide peut faire un lookup
    const { data: campusWallet } = await supabase
      .from('wallets')
      .select('id, campus_name')
      .eq('api_key_hash', api_key)
      .eq('is_active', true)
      .maybeSingle()

    if (!campusWallet) {
      return new Response(
        JSON.stringify({ success: false, status: 'unauthorized', message: 'API key invalide' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: result, error } = await supabase.rpc('lookup_user_for_intercampus', {
      p_email:     email     ?? null,
      p_campus:    campus    ?? null,
      p_full_name: full_name ?? null,
    })

    if (error) throw error

    // Le user_id retourné = destination_user_id à utiliser dans intercampus-send
    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, status: 'error', error: err.message }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
