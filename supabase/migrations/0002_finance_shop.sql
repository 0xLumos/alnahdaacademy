-- Al-Nahda: price categories, cash payments ledger, expenses, products (shop).
-- Run after 0001_schema.sql.

-- ============ Price categories ============
-- Monthly subscription price per group. Editable by the admin; shown publicly on the home page.
create table public.categories (
  key           text primary key check (key ~ '^[a-z_]{2,20}$'),
  label         text not null check (length(label) between 1 and 60),
  description   text check (description is null or length(description) <= 200),
  monthly_price numeric(10, 2) not null check (monthly_price >= 0),
  sort          smallint not null default 0
);
insert into public.categories (key, label, description, monthly_price, sort) values
  ('youth', 'شباب (15 سنة وما فوق)', 'MMA وكيك بوكسينغ', 250, 1),
  ('kids',  'صبيان وأطفال (أقل من 15 سنة)', null, 200, 2),
  ('women', 'سيدات', null, 150, 3);

alter table public.profiles
  add column category text references public.categories (key) on update cascade on delete set null;
alter table public.subscriptions
  add column category text references public.categories (key) on update cascade on delete set null;

-- ============ Products (shop) ============
create table public.products (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (length(name) between 1 and 80),
  description text check (description is null or length(description) <= 300),
  price       numeric(10, 2) not null check (price >= 0),
  type        text not null default 'equipment' check (type in ('equipment', 'clothing')),
  image_path  text check (image_path is null or length(image_path) <= 300),
  available   boolean not null default true,
  sort        smallint not null default 0,
  created_at  timestamptz not null default now()
);

-- ============ Cash payments (income ledger) ============
-- Every shekel received is one row, entered by the admin.
create type public.payment_kind as enum ('subscription', 'clothing', 'product', 'other');
create table public.payments (
  id              uuid primary key default gen_random_uuid(),
  student_id      uuid references public.profiles (id) on delete set null,
  payer_name      text check (payer_name is null or length(payer_name) <= 80), -- walk-in buyer without an account
  kind            public.payment_kind not null,
  amount          numeric(10, 2) not null check (amount > 0),
  paid_on         date not null default current_date,
  subscription_id uuid references public.subscriptions (id) on delete cascade,
  product_id      uuid references public.products (id) on delete set null,
  quantity        integer check (quantity is null or quantity between 1 and 999),
  note            text check (note is null or length(note) <= 300),
  created_by      uuid references public.profiles (id) on delete set null,
  created_at      timestamptz not null default now()
);
create index on public.payments (paid_on);
create index on public.payments (student_id);

-- ============ Expenses ============
create type public.expense_category as enum ('rent', 'electricity', 'water', 'staff', 'coaches', 'equipment', 'other');
create table public.expenses (
  id          uuid primary key default gen_random_uuid(),
  category    public.expense_category not null,
  amount      numeric(10, 2) not null check (amount > 0),
  spent_on    date not null default current_date,
  note        text check (note is null or length(note) <= 300),
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);
create index on public.expenses (spent_on);

-- ============ Record a subscription and its cash payment in one step ============
create or replace function public.record_subscription(
  p_student uuid, p_category text, p_plan text, p_start date, p_end date, p_amount numeric, p_notes text
) returns uuid
language plpgsql security invoker set search_path = public as $$
declare v_id uuid;
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  insert into subscriptions (student_id, category, plan, start_date, end_date, amount, notes, created_by)
  values (p_student, p_category, p_plan, p_start, p_end, p_amount, p_notes, auth.uid())
  returning id into v_id;
  if coalesce(p_amount, 0) > 0 then
    insert into payments (student_id, kind, amount, paid_on, subscription_id, note, created_by)
    values (p_student, 'subscription', p_amount, current_date, v_id, p_plan, auth.uid());
  end if;
  return v_id;
end;
$$;
revoke execute on function public.record_subscription(uuid, text, text, date, date, numeric, text) from public, anon;
grant  execute on function public.record_subscription(uuid, text, text, date, date, numeric, text) to authenticated;

-- ============ Row-level security ============
alter table public.categories enable row level security;
alter table public.products   enable row level security;
alter table public.payments   enable row level security;
alter table public.expenses   enable row level security;

-- Visitors may read prices and the shop, nothing else.
revoke all on public.categories, public.products, public.payments, public.expenses from anon;
grant select on public.categories, public.products to anon;

create policy cat_read      on public.categories for select to anon, authenticated using (true);
create policy cat_admin_all on public.categories for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy prod_read      on public.products for select to anon, authenticated using (available or public.is_admin());
create policy prod_admin_all on public.products for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Money is admin-only.
create policy pay_admin_all on public.payments for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy exp_admin_all on public.expenses for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ============ Product images (Supabase Storage) ============
-- Public bucket: anyone can view images by URL; only admins can upload, replace or delete.
do $$ begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    insert into storage.buckets (id, name, public) values ('products', 'products', true) on conflict (id) do nothing;
    create policy products_img_insert on storage.objects for insert to authenticated
      with check (bucket_id = 'products' and public.is_admin());
    create policy products_img_update on storage.objects for update to authenticated
      using (bucket_id = 'products' and public.is_admin());
    create policy products_img_delete on storage.objects for delete to authenticated
      using (bucket_id = 'products' and public.is_admin());
  end if;
end $$;
