create type public.identity_verification_status as enum (
  'unverified',
  'simulated_verified'
);

create type public.buyer_tier as enum (
  'verified_buyer',
  'reliable_buyer',
  'trusted_buyer'
);

create table public.member_profiles (
  member_id uuid primary key references auth.users (id) on delete cascade,
  public_first_name text,
  public_last_initial text,
  profile_picture_path text,
  identity_verification_status public.identity_verification_status not null default 'unverified',
  identity_verified_at timestamptz,
  verification_provider_reference text,
  successful_handover_count integer not null default 0,
  transaction_partner_count integer not null default 0,
  buyer_tier public.buyer_tier not null default 'verified_buyer',
  is_restricted boolean not null default false,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint member_profiles_public_first_name_check check (
    public_first_name is null
    or (
      char_length(public_first_name) between 1 and 50
      and public_first_name = btrim(public_first_name)
    )
  ),
  constraint member_profiles_public_last_initial_check check (
    public_last_initial is null
    or (
      char_length(public_last_initial) = 1
      and public_last_initial = upper(public_last_initial)
    )
  ),
  constraint member_profiles_profile_picture_path_check check (
    profile_picture_path is null
    or profile_picture_path like member_id::text || '/%'
  ),
  constraint member_profiles_verification_state_check check (
    (
      identity_verification_status = 'unverified'
      and identity_verified_at is null
      and verification_provider_reference is null
      and public_first_name is null
      and public_last_initial is null
    )
    or (
      identity_verification_status = 'simulated_verified'
      and identity_verified_at is not null
      and verification_provider_reference is not null
      and public_first_name is not null
    )
  ),
  constraint member_profiles_successful_handover_count_check check (
    successful_handover_count >= 0
  ),
  constraint member_profiles_transaction_partner_count_check check (
    transaction_partner_count >= 0
  )
);

alter table public.member_profiles enable row level security;
alter table public.member_profiles force row level security;

revoke all on table public.member_profiles from anon, authenticated;
grant select on table public.member_profiles to authenticated;

create policy "members may read their private profile"
on public.member_profiles
for select
to authenticated
using ((select auth.uid()) = member_id);

create function public.create_member_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.member_profiles (member_id)
  values (new.id)
  on conflict (member_id) do nothing;
  return new;
end;
$$;

revoke all on function public.create_member_profile() from public, anon, authenticated;

create trigger create_member_profile_after_signup
after insert on auth.users
for each row execute function public.create_member_profile();

insert into public.member_profiles (member_id)
select id from auth.users
on conflict (member_id) do nothing;

create function public.get_current_member_profile()
returns table (
  member_id uuid,
  public_first_name text,
  public_last_initial text,
  profile_picture_path text,
  identity_verification_status public.identity_verification_status,
  identity_verified_at timestamptz,
  verification_provider_reference text,
  successful_handover_count integer,
  transaction_partner_count integer,
  buyer_tier public.buyer_tier,
  is_restricted boolean,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    profile.member_id,
    profile.public_first_name,
    profile.public_last_initial,
    profile.profile_picture_path,
    profile.identity_verification_status,
    profile.identity_verified_at,
    profile.verification_provider_reference,
    profile.successful_handover_count,
    profile.transaction_partner_count,
    profile.buyer_tier,
    profile.is_restricted,
    profile.created_at,
    profile.updated_at
  from public.member_profiles as profile
  where profile.member_id = (select auth.uid());
$$;

revoke all on function public.get_current_member_profile() from public, anon;
grant execute on function public.get_current_member_profile() to authenticated;

create function public.get_public_member_profile(target_member_id uuid)
returns table (
  member_id uuid,
  public_first_name text,
  public_last_initial text,
  profile_picture_path text,
  identity_verified boolean,
  successful_handover_count integer,
  transaction_partner_count integer,
  buyer_tier public.buyer_tier,
  available boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    profile.member_id,
    profile.public_first_name,
    profile.public_last_initial,
    profile.profile_picture_path,
    profile.identity_verification_status = 'simulated_verified',
    profile.successful_handover_count,
    profile.transaction_partner_count,
    profile.buyer_tier,
    not profile.is_restricted
  from public.member_profiles as profile
  where profile.member_id = target_member_id
    and profile.identity_verification_status = 'simulated_verified'
    and exists (
      select 1
      from public.member_profiles as requester
      where requester.member_id = (select auth.uid())
        and requester.identity_verification_status = 'simulated_verified'
        and not requester.is_restricted
    );
$$;

revoke all on function public.get_public_member_profile(uuid) from public, anon;
grant execute on function public.get_public_member_profile(uuid) to authenticated;

create function public.complete_simulated_identity_verification(
  public_first_name text,
  public_last_name text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_member_id uuid := auth.uid();
  normalized_first_name text := nullif(btrim(public_first_name), '');
  normalized_last_name text := nullif(btrim(public_last_name), '');
begin
  if current_member_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  if normalized_first_name is null or char_length(normalized_first_name) > 50 then
    raise exception 'invalid public first name' using errcode = '22023';
  end if;

  if normalized_last_name is not null and char_length(normalized_last_name) > 100 then
    raise exception 'invalid public last name' using errcode = '22023';
  end if;

  update public.member_profiles
  set
    public_first_name = normalized_first_name,
    public_last_initial = case
      when normalized_last_name is null then null
      else upper(left(normalized_last_name, 1))
    end,
    identity_verification_status = 'simulated_verified',
    identity_verified_at = statement_timestamp(),
    verification_provider_reference = 'simulation/' || current_member_id::text,
    updated_at = statement_timestamp()
  where member_id = current_member_id
    and identity_verification_status = 'unverified';

  if not found then
    raise exception 'unverified member profile not found' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.complete_simulated_identity_verification(text, text) from public, anon;
grant execute on function public.complete_simulated_identity_verification(text, text) to authenticated;

create function public.update_current_member_profile(profile_picture_path text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_member_id uuid := auth.uid();
  normalized_path text := nullif(btrim(profile_picture_path), '');
begin
  if current_member_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  if normalized_path is not null
    and normalized_path not like current_member_id::text || '/%'
  then
    raise exception 'profile picture must belong to current member' using errcode = '22023';
  end if;

  update public.member_profiles
  set
    profile_picture_path = normalized_path,
    updated_at = statement_timestamp()
  where member_id = current_member_id;

  if not found then
    raise exception 'member profile not found' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.update_current_member_profile(text) from public, anon;
grant execute on function public.update_current_member_profile(text) to authenticated;
