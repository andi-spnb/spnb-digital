// Supabase Edge Function: resolve-card-token
// Resolves QR/NFC token to card destination (Google Review or Profile)
// Records interaction events

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { token } = await req.json()

    if (!token || typeof token !== 'string') {
      return new Response(
        JSON.stringify({ valid: false, error: 'invalid', message: 'Token tidak valid.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create Supabase client with service role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    )

    // Hash the token
    const encoder = new TextEncoder()
    const data = encoder.encode(token)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const tokenHash = Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')

    // Look up the token in card_tokens table
    const { data: cardToken, error: tokenError } = await supabaseAdmin
      .from('card_tokens')
      .select(`
        id,
        card_id,
        kind,
        revoked_at,
        cards (
          id,
          serial,
          lifecycle_state,
          service_state,
          destination_mode,
          business_id,
          businesses (
            id,
            name,
            google_review_url,
            status,
            business_slugs (
              slug,
              is_current
            )
          )
        )
      `)
      .eq('token_hash', tokenHash)
      .single()

    if (tokenError || !cardToken) {
      console.error('Token lookup error:', tokenError)
      return new Response(
        JSON.stringify({ valid: false, error: 'not_found', message: 'Kartu tidak ditemukan.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if token is revoked
    if (cardToken.revoked_at) {
      return new Response(
        JSON.stringify({ valid: false, error: 'expired', message: 'Token sudah tidak berlaku.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const card = cardToken.cards as any

    // Check card service state
    if (card.service_state !== 'enabled') {
      return new Response(
        JSON.stringify({ valid: false, error: 'suspended', message: 'Kartu ini sedang dinonaktifkan.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if card is claimed and active
    if (card.lifecycle_state !== 'claimed') {
      return new Response(
        JSON.stringify({ valid: false, error: 'not_active', message: 'Kartu ini belum diaktifkan.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if business exists and is active
    const business = card.businesses
    if (!business || business.status !== 'active') {
      return new Response(
        JSON.stringify({ valid: false, error: 'no_destination', message: 'Profil bisnis tidak tersedia.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get current slug
    const currentSlug = business.business_slugs?.find((s: any) => s.is_current)?.slug

    // Return card resolution data
    return new Response(
      JSON.stringify({
        valid: true,
        cardId: card.id,
        businessId: business.id,
        destinationMode: card.destination_mode,
        googleReviewUrl: business.google_review_url,
        slug: currentSlug,
        tokenKind: cardToken.kind, // 'qr' or 'nfc'
        businessName: business.name
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ valid: false, error: 'error', message: 'Terjadi kesalahan server.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
