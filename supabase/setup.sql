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

-- ===== ประเภทลาบ: โหวต ลาบเหนือ / ลาบอีสาน (รันส่วนนี้เพิ่มได้ แม้เคยรันไฟล์นี้ไปแล้ว) =====
alter table public.user_shops add column if not exists north_votes integer not null default 0 check (north_votes >= 0);
alter table public.user_shops add column if not exists isan_votes integer not null default 0 check (isan_votes >= 0);

-- ตอนปักหมุด: ยอดไลก์เริ่มที่ 0 และโหวตประเภทได้ไม่เกิน 1 ต่อแบบ (ผู้ปักเลือก)
drop policy if exists "user_shops insert" on public.user_shops;
create policy "user_shops insert" on public.user_shops for insert to anon, authenticated
  with check (likes = 0 and north_votes <= 1 and isan_votes <= 1);

-- โหวต (+1) / ยกเลิกโหวต (-1) ประเภทลาบ
create or replace function public.vote_style(shop_id uuid, style text, delta integer default 1)
returns table (north_votes integer, isan_votes integer)
language sql
security definer
set search_path = public
as $$
  update user_shops u
     set north_votes = case when style = 'north' then greatest(0, u.north_votes + case when delta >= 0 then 1 else -1 end) else u.north_votes end,
         isan_votes  = case when style = 'isan'  then greatest(0, u.isan_votes  + case when delta >= 0 then 1 else -1 end) else u.isan_votes  end
   where u.id = shop_id and style in ('north', 'isan')
  returning u.north_votes, u.isan_votes;
$$;

revoke all on function public.vote_style(uuid, text, integer) from public;
grant execute on function public.vote_style(uuid, text, integer) to anon, authenticated;
