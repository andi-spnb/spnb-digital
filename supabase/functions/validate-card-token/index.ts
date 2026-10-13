// Supabase Edge Function: validate-card-token
// Validates QR/NFC token and creates a claim session for card activation

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

    // Create Supabase client with service role for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    )

    // Hash the token to look up in database
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
          owner_id
        )
      `)
      .eq('token_hash', tokenHash)
      .single()

    if (tokenError || !cardToken) {
      console.error('Token lookup error:', tokenError)
      return new Response(
        JSON.stringify({ valid: false, error: 'invalid', message: 'Token tidak ditemukan atau tidak valid.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if token is revoked
    if (cardToken.revoked_at) {
      return new Response(
        JSON.stringify({ valid: false, error: 'invalid', message: 'Token sudah tidak berlaku.' }),
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

    // Check card lifecycle state
    if (card.lifecycle_state === 'claimed') {
      return new Response(
        JSON.stringify({ valid: false, error: 'already_claimed', message: 'Kartu ini sudah diaktifkan oleh pemilik lain.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (card.lifecycle_state === 'retired') {
      return new Response(
        JSON.stringify({ valid: false, error: 'retired', message: 'Kartu ini sudah tidak aktif.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (card.lifecycle_state === 'admin_stock' || card.lifecycle_state === 'reseller_stock') {
      return new Response(
        JSON.stringify({ valid: false, error: 'not_sold', message: 'Kartu ini belum ditandai terjual oleh reseller.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Card is in 'sold_unclaimed' state - ready for activation
    if (card.lifecycle_state !== 'sold_unclaimed') {
      return new Response(
        JSON.stringify({ valid: false, error: 'invalid', message: 'Status kartu tidak valid untuk aktivasi.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Generate a claim session token
    const claimTokenBytes = crypto.getRandomValues(new Uint8Array(32))
    const claimToken = Array.from(claimTokenBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
    
    // Hash the claim token for storage
    const claimHashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(claimToken))
    const claimTokenHash = Array.from(new Uint8Array(claimHashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')

    // Create claim session (expires in 30 minutes)
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString()
    
    const { error: sessionError } = await supabaseAdmin
      .from('claim_sessions')
      .insert({
        card_id: card.id,
        token_hash: claimTokenHash,
        expires_at: expiresAt
      })

    if (sessionError) {
      console.error('Create claim session error:', sessionError)
      return new Response(
        JSON.stringify({ valid: false, error: 'error', message: 'Gagal membuat sesi aktivasi.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Return success with card info and claim session token
    return new Response(
      JSON.stringify({
        valid: true,
        cardId: card.id,
        serial: card.serial,
        status: card.lifecycle_state,
        claimSessionToken: claimToken, // Raw token for client to use
        expiresAt: expiresAt
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
