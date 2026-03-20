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

// Grille de bonus officielle (source de vérité côté serveur)
const CONVERSION_RATE = 5 // 1€ = 5 EPC
const BONUS_TABLE: Record<number, number> = {
    5: 0,
    10: 5,
    20: 15,
    50: 50,
}
const ALLOWED_AMOUNTS = Object.keys(BONUS_TABLE).map(Number)

serve(async (req) => {
    const { amount, context } = await req.json()

    try {
        // Valider que le montant EUR est dans la liste autorisée
        if (!ALLOWED_AMOUNTS.includes(amount)) {
            throw new Error(`Montant non autorisé: ${amount}€. Montants valides: ${ALLOWED_AMOUNTS.join(', ')}€`)
        }

        // Calculer le montant EPC côté serveur (ne pas faire confiance au client)
        const bonus = BONUS_TABLE[amount]
        const epc_amount = amount * CONVERSION_RATE + bonus

        const paymentIntent = await stripe.paymentIntents.create({
            amount: amount * 100, // Convert to cents
            currency: 'eur',
            automatic_payment_methods: {
                enabled: true,
            },
            metadata: {
                amount_eur: amount.toString(),
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
