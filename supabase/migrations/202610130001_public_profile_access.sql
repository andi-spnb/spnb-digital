-- Additional RLS policies for public profile access
-- Run this after the initial schema migration

-- Allow anonymous access to active business profiles (for public profile pages)
CREATE POLICY businesses_public_read ON public.businesses 
  FOR SELECT TO anon
  USING (status = 'active');

-- Allow anonymous access to current business slugs
CREATE POLICY slugs_public_read ON public.business_slugs 
  FOR SELECT TO anon
  USING (is_current = true);

-- Allow anonymous access to active profile links
CREATE POLICY links_public_read ON public.profile_links 
  FOR SELECT TO anon
  USING (is_active = true);

-- Grant SELECT to anon for public profile data
GRANT SELECT ON public.businesses TO anon;
GRANT SELECT ON public.business_slugs TO anon;
GRANT SELECT ON public.profile_links TO anon;

-- Allow inserting interaction events from anonymous users (for tracking)
CREATE POLICY events_insert_anon ON public.interaction_events
  FOR INSERT TO anon
  WITH CHECK (true);

GRANT INSERT ON public.interaction_events TO anon;

-- Create a public RPC for getting business by slug (safer than direct table access)
CREATE OR REPLACE FUNCTION public.get_business_by_slug(p_slug text)
RETURNS TABLE (
  id uuid,
  name text,
  description text,
  logo_url text,
  cover_url text,
  google_review_url text,
  google_maps_url text,
  whatsapp_e164 text,
  address text,
  theme_color text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT 
    b.id,
    b.name,
    b.description,
    b.logo_url,
    b.cover_url,
    b.google_review_url,
    b.google_maps_url,
    b.whatsapp_e164,
    b.address,
    b.theme_color
  FROM public.businesses b
  JOIN public.business_slugs bs ON bs.business_id = b.id
  WHERE bs.slug = p_slug
    AND bs.is_current = true
    AND b.status = 'active';
$$;

-- Grant execute to both anon and authenticated
GRANT EXECUTE ON FUNCTION public.get_business_by_slug(text) TO anon, authenticated;

-- Create RPC for getting profile links by business
CREATE OR REPLACE FUNCTION public.get_profile_links(p_business_id uuid)
RETURNS TABLE (
  id uuid,
  link_type text,
  label text,
  destination_url text,
  sort_order smallint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT 
    pl.id,
    pl.link_type,
    pl.label,
    pl.destination_url,
    pl.sort_order
  FROM public.profile_links pl
  WHERE pl.business_id = p_business_id
    AND pl.is_active = true
  ORDER BY pl.sort_order ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_profile_links(uuid) TO anon, authenticated;

-- Create RPC for recording interaction (safer than direct insert)
CREATE OR REPLACE FUNCTION public.record_interaction(
  p_event_type text,
  p_business_id uuid DEFAULT NULL,
  p_card_id uuid DEFAULT NULL,
  p_profile_link_id uuid DEFAULT NULL,
  p_token_kind text DEFAULT NULL,
  p_destination_mode text DEFAULT NULL,
  p_anonymous_session_hash text DEFAULT NULL,
  p_user_agent_class text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Validate event type
  IF p_event_type NOT IN ('qr_scan', 'nfc_tap', 'profile_view', 'profile_link_click') THEN
    RAISE EXCEPTION 'Invalid event type';
  END IF;

  INSERT INTO public.interaction_events (
    event_type,
    business_id,
    card_id,
    profile_link_id,
    token_kind,
    destination_mode,
    anonymous_session_hash,
    user_agent_class,
    is_likely_bot
  ) VALUES (
    p_event_type,
    p_business_id,
    p_card_id,
    p_profile_link_id,
    p_token_kind,
    p_destination_mode,
    p_anonymous_session_hash,
    p_user_agent_class,
    false
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_interaction(text, uuid, uuid, uuid, text, text, text, text) TO anon, authenticated;
