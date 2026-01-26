import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from 'https://esm.sh/stripe@12.0.0'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
    apiVersion: '2022-11-15',
    httpClient: Stripe.createFetchHttpClient(),
})

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    const { amount, bonus = 0, epc_amount, context } = await req.json()

    try {
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amount * 100, // Convert to cents
            currency: 'eur',
            automatic_payment_methods: {
                enabled: true,
            },
            metadata: {
                bonus: bonus.toString(),
                epc_amount: epc_amount.toString(),
                context: JSON.stringify(context || {}),
            },
        })

        return new Response(
            JSON.stringify({ clientSecret: paymentIntent.client_secret, id: paymentIntent.id }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { "Content-Type": "application/json" } },
        )
    }
})
