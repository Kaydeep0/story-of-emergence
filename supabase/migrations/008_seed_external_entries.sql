-- ============================================================================
-- Story of Emergence development seed
-- Inserts sample external entries for local testing
-- ============================================================================

INSERT INTO public.entries_external (
  wallet_address,
  kind,
  source_id,
  title,
  url,
  started_at,
  completed_at,
  notes
) VALUES
(
  '0x2742...bC0c',         -- dev wallet address
  'youtube',
  'yt_demo_1',
  'Lynn Alden on broken money',
  'https://www.youtube.com/watch?v=dummy1',
  now() - interval '3 days',
  null,
  'Watched first half, want to rewatch with notes'
),
(
  '0x2742...bC0c',
  'article',
  'article_demo_1',
  'IMF paper on global liquidity',
  'https://example.com/imf-liquidity',
  now() - interval '10 days',
  now() - interval '9 days',
  'Key ideas for liquidity thesis'
),
(
  '0x2742...bC0c',
  'book',
  'book_demo_1',
  'Education of a Speculator',
  'https://example.com/speculator',
  now() - interval '30 days',
  null,
  'Still reading first chapters'
);
