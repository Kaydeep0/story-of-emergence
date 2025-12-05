-- ============================================================================
-- Story of Emergence contacts table and RPC functions
-- Contacts are per owner wallet and store encrypted labels
-- ============================================================================

-- 1 create contacts table
-- ----------------------------------------------------------------------------
create table if not exists contacts (
  id             uuid primary key default gen_random_uuid(),
  wallet_address text not null,
  contact_wallet text not null,
  ciphertext     text not null,
  created_at     timestamptz not null default now()
);

create unique index if not exists idx_contacts_owner_contact
  on contacts (wallet_address, contact_wallet);

-- 2 enable row level security
-- ----------------------------------------------------------------------------
alter table contacts enable row level security;

-- 3 rls policies
-- each wallet can only see and modify its own contacts
-- ----------------------------------------------------------------------------
create policy contacts_select_policy on contacts
  for select
  using (lower(wallet_address) = get_wallet_from_header());

create policy contacts_insert_policy on contacts
  for insert
  with check (lower(wallet_address) = get_wallet_from_header());

create policy contacts_delete_policy on contacts
  for delete
  using (lower(wallet_address) = get_wallet_from_header());

-- 4 rpc functions
-- ----------------------------------------------------------------------------

-- insert_contact acts as an upsert for a single owner wallet contact pair
create or replace function insert_contact(
  p_wallet         text,
  p_contact_wallet text,
  p_ciphertext     text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if lower(p_wallet) <> get_wallet_from_header() then
    raise exception 'Wallet mismatch';
  end if;

  insert into contacts (wallet_address, contact_wallet, ciphertext)
  values (lower(p_wallet), lower(p_contact_wallet), p_ciphertext)
  on conflict (wallet_address, contact_wallet)
  do update set
    ciphertext = excluded.ciphertext,
    created_at = now()
  returning id into v_id;

  return v_id;
end;
$$;

-- list_contacts returns contacts for the given wallet
create or replace function list_contacts(
  w        text,
  p_limit  integer default 100,
  p_offset integer default 0
)
returns setof contacts
language plpgsql
security definer
set search_path = public
as $$
begin
  if lower(w) <> get_wallet_from_header() then
    raise exception 'Wallet mismatch';
  end if;

  return query
  select *
  from contacts
  where lower(wallet_address) = lower(w)
  order by created_at desc
  limit p_limit
  offset p_offset;
end;
$$;

-- delete_contact removes a single contact by id for the owner wallet
create or replace function delete_contact(
  w         text,
  p_contact_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if lower(w) <> get_wallet_from_header() then
    raise exception 'Wallet mismatch';
  end if;

  delete from contacts
  where id = p_contact_id
    and lower(wallet_address) = lower(w);
end;
$$;

-- 5 grants
-- ----------------------------------------------------------------------------
grant execute on function insert_contact(text, text, text) to anon, authenticated;
grant execute on function list_contacts(text, integer, integer) to anon, authenticated;
grant execute on function delete_contact(text, uuid) to anon, authenticated;

