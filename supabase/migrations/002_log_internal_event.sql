-- ============================================================================
-- Story of Emergence: log_internal_event RPC function
-- A simpler way to log internal events with just wallet, event_type, and timestamp
-- ============================================================================

-- log_internal_event: Insert a new internal event with minimal parameters
-- The ciphertext will store a JSON object with the event_type
-- Returns the inserted row
CREATE OR REPLACE FUNCTION log_internal_event(
  wallet        text,
  event_type    text,
  ts            timestamptz DEFAULT now()
)
RETURNS internal_events
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row internal_events;
  v_ciphertext text;
BEGIN
  -- Verify caller matches the wallet
  IF lower(wallet) <> get_wallet_from_header() THEN
    RAISE EXCEPTION 'Wallet mismatch';
  END IF;

  -- Store event_type as a simple JSON object in ciphertext
  -- Note: This is NOT encrypted - for navigation events we don't need encryption
  -- The ciphertext field contains metadata, not sensitive content
  v_ciphertext := json_build_object(
    'event_type', event_type,
    'source_kind', 'internal',
    'event_kind', event_type
  )::text;

  INSERT INTO internal_events (wallet_address, event_at, ciphertext, encryption_version)
  VALUES (lower(wallet), ts, v_ciphertext, 0)  -- encryption_version 0 = unencrypted metadata
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION log_internal_event(text, text, timestamptz) TO anon, authenticated;

