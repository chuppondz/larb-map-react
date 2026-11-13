-- ลาบแมป: ตารางร้านแนะนำจากผู้ใช้ + ยอดไลก์
-- วิธีใช้: Supabase Dashboard → SQL Editor → New query → วางทั้งไฟล์ → Run

create table if not exists public.user_shops (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 2 and 80),
  city text not null check (char_length(city) between 2 and 40),
  lat double precision not null check (lat between 5 and 21),
  lng double precision not null check (lng between 97 and 106),
  maps_url text check (
    maps_url is null or (char_length(maps_url) <= 2000
      and maps_url ~ '^https://([a-z0-9-]+\.)*(google\.[a-z.]+|goo\.gl)/')
  ),
  note text check (note is null or char_length(note) <= 200),
  likes integer not null default 0 check (likes >= 0),
  created_at timestamptz not null default now()
);

alter table public.user_shops enable row level security;

-- ทุกคนอ่านได้ และเพิ่มร้านได้ (ยอดไลก์เริ่มที่ 0 เท่านั้น); ไม่มีสิทธิ์แก้/ลบจากหน้าเว็บ
drop policy if exists "user_shops read" on public.user_shops;
create policy "user_shops read" on public.user_shops for select to anon, authenticated using (true);
drop policy if exists "user_shops insert" on public.user_shops;
create policy "user_shops insert" on public.user_shops for insert to anon, authenticated with check (likes = 0);

-- กดไลก์ (+1) / เลิกไลก์ (-1) ผ่านฟังก์ชันนี้เท่านั้น
create or replace function public.like_shop(shop_id uuid, delta integer default 1)
returns integer
language sql
security definer
set search_path = public
as $$
  update user_shops
     set likes = greatest(0, likes + case when delta >= 0 then 1 else -1 end)
   where id = shop_id
  returning likes;
$$;

revoke all on function public.like_shop(uuid, integer) from public;
grant execute on function public.like_shop(uuid, integer) to anon, authenticated;

-- ===== ประเภทลาบ: โหวต ลาบเหนือ / ลาบอีสาน (รันส่วนนี้ซ้ำได้ ไม่กระทบข้อมูลเดิม) =====
-- ป้ายขึ้นตามฝั่งที่ได้โหวตมากกว่า · แต่ละคนโหวตได้ฝั่งเดียวต่อร้าน (เว็บย้ายโหวตให้)

-- 1) ร้านที่ผู้ใช้ปัก: เก็บโหวตในตารางร้าน
alter table public.user_shops add column if not exists north_votes integer not null default 0 check (north_votes >= 0);
alter table public.user_shops add column if not exists isan_votes integer not null default 0 check (isan_votes >= 0);

-- ตอนปักหมุด: ยอดไลก์เริ่มที่ 0 และผู้ปักโหวตประเภทได้ไม่เกิน 1 ฝั่ง
drop policy if exists "user_shops insert" on public.user_shops;
create policy "user_shops insert" on public.user_shops for insert to anon, authenticated
  with check (likes = 0 and north_votes <= 1 and isan_votes <= 1 and north_votes + isan_votes <= 1);

drop function if exists public.vote_style(uuid, text, integer); -- เวอร์ชันเก่า
create or replace function public.vote_style(shop_id uuid, add_style text default null, remove_style text default null)
returns table (north_votes integer, isan_votes integer)
language sql
security definer
set search_path = public
as $$
  update user_shops u
     set north_votes = greatest(0, u.north_votes
           + case when vote_style.add_style = 'north' then 1 else 0 end
           - case when vote_style.remove_style = 'north' then 1 else 0 end),
         isan_votes = greatest(0, u.isan_votes
           + case when vote_style.add_style = 'isan' then 1 else 0 end
           - case when vote_style.remove_style = 'isan' then 1 else 0 end)
   where u.id = vote_style.shop_id
  returning u.north_votes, u.isan_votes;
$$;
revoke all on function public.vote_style(uuid, text, text) from public;
grant execute on function public.vote_style(uuid, text, text) to anon, authenticated;

-- 2) ร้านจาก Google (ใน data.js): เก็บโหวตแยก อ้างร้านด้วย placeId หรือ "n:ชื่อ|จังหวัด"
create table if not exists public.official_votes (
  shop_key text primary key check (shop_key ~ '^(ChIJ[A-Za-z0-9_-]{10,}|n:.{3,160})$'),
  north_votes integer not null default 0 check (north_votes >= 0),
  isan_votes integer not null default 0 check (isan_votes >= 0),
  updated_at timestamptz not null default now()
);
alter table public.official_votes enable row level security;
drop policy if exists "official_votes read" on public.official_votes;
create policy "official_votes read" on public.official_votes for select to anon, authenticated using (true);
-- ไม่มีสิทธิ์เขียนตรง ต้องผ่านฟังก์ชันด้านล่างเท่านั้น

create or replace function public.vote_official(shop_key text, add_style text default null, remove_style text default null)
returns table (north_votes integer, isan_votes integer)
language sql
security definer
set search_path = public
as $$
  insert into official_votes (shop_key) values (vote_official.shop_key) on conflict do nothing;
  update official_votes o
     set north_votes = greatest(0, o.north_votes
           + case when vote_official.add_style = 'north' then 1 else 0 end
           - case when vote_official.remove_style = 'north' then 1 else 0 end),
         isan_votes = greatest(0, o.isan_votes
           + case when vote_official.add_style = 'isan' then 1 else 0 end
           - case when vote_official.remove_style = 'isan' then 1 else 0 end),
         updated_at = now()
   where o.shop_key = vote_official.shop_key
  returning o.north_votes, o.isan_votes;
$$;
revoke all on function public.vote_official(text, text, text) from public;
grant execute on function public.vote_official(text, text, text) to anon, authenticated;

-- ให้ API ของ Supabase เห็นตาราง/ฟังก์ชันใหม่ทันที
notify pgrst, 'reload schema';
