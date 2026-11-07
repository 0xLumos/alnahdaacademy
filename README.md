# أكاديمية النهضة الرياضية: student website

Arabic (RTL) website that students can install on their phone home screen (PWA).
Backend: Supabase (Postgres, auth, row-level security, realtime, one edge function).

## What it does

**Students** log in with a username and password created by the admin. They see:
- Subscription status with days remaining (amber warning in the last 7 days).
- Next class and the weekly schedule (their classes or all classes).
- Announcements for everyone or for their classes, with a "new" tag.
- A private two-way chat with the academy, with live updates and an unread badge.

**Admin** sees:
- Dashboard: active students, valid subscriptions, subscriptions ending within 7 days, students without a valid subscription, unread messages, today's classes.
- Students: create accounts (no public sign-up), search and filter, edit name and phone, set a new password, suspend or reactivate.
- Subscriptions: record a plan when the student pays at the center (monthly, 3, 6 or 12 months, or custom dates, amount, notes). Renewals start the day after the current one ends.
- Classes: weekly timetable with coach, location and roster count. Enroll students per class.
- Announcements to all students or one class.
- Inbox: one thread per student, unread counts, start a new conversation.
- Finance (المالية): pick a month to see income, expenses and net. Record cash payments (subscription top-ups, clothing packages, equipment, other) and expenses (rent, electricity, water, staff salaries, coach salaries, equipment, other). Shows how much each student paid that month and their subscription status. Edit the monthly prices here.
- Shop (المتجر): add products with photo, price and type (equipment or clothing package), mark out of stock, and record a cash sale (price x quantity fills in automatically).

**Prices:** youth 15 and over (MMA and kickboxing) 250 ₪, boys and children under 15: 200 ₪, women 150 ₪ per month. Stored in the database and shown on the home page. Recording a subscription fills the amount from the student's category x months, editable for discounts, and adds the payment to Finance automatically.

**Visitors** see the home page with prices and the shop at `/shop`. Students also see the shop inside the portal.

Not included yet: push notifications (students see new messages when they open the app), attendance, online payments.

## Access rules

All enforced in the database (`supabase/migrations/0001_schema.sql`), not just hidden in the UI:
- Logged-out visitors can read nothing.
- A student reads only their own profile, subscriptions, enrollments and chat thread, active classes, and announcements for everyone or for their classes.
- Students cannot change their role, subscriptions, enrollments or other people's data, cannot edit or delete messages, and cannot send as someone else.
- A suspended student loses all data access immediately and cannot log in again.
- Only an active admin can write classes, subscriptions, enrollments and announcements.
- Account creation runs in the `admin-users` edge function. The service-role key stays on the server.

- Money (payments, expenses) is visible only to admins. Visitors and students can read prices and in-stock products only.
- Product photos are public by URL; only admins can upload, replace or delete them.

`supabase/tests/rls_test.sh` checks these rules (57 checks) against a local Postgres 16.

## Setup (about 20 minutes)

1. **Create a Supabase project** at supabase.com (free tier is enough to start).
2. **Database:** open SQL Editor and run `supabase/migrations/0001_schema.sql`, then `supabase/migrations/0002_finance_shop.sql` (prices, payments, expenses, products, and the `products` image bucket).
3. **Turn off public sign-up:** Authentication > Sign In / Providers > Email: disable "Allow new users to sign up". Also disable "Confirm email".
4. **Deploy the edge function** (needs the Supabase CLI):
   ```
   npx supabase login
   npx supabase link --project-ref YOUR-PROJECT-REF
   npx supabase functions deploy admin-users
   ```
   Optional: `npx supabase secrets set ALLOWED_ORIGIN=https://your-site.example` to restrict which site may call it.
5. **Create the first admin:** Authentication > Users > Add user > Create new user, email `admin@nahda.local`, a strong password, tick "Auto Confirm User". Then run in SQL Editor:
   ```sql
   insert into public.profiles (id, username, full_name, role)
   select id, 'admin', 'مدير الأكاديمية', 'admin' from auth.users where email = 'admin@nahda.local';
   ```
   Log in on the site with username `admin`. Create all other accounts from the Students page.
6. **Frontend config:** copy `.env.example` to `.env` and fill in the project URL and anon key (Project Settings > API).
7. **Run locally:** `npm install` then `npm run dev`.
8. **Deploy:** push to GitHub and import in Vercel or Netlify. Build command `npm run build`, output `dist`. Add the two `VITE_` variables in the host's settings. `vercel.json` and `public/_redirects` handle page refreshes on deep links.

## Host on GitHub Pages

The workflow in `.github/workflows/deploy.yml` builds and publishes the site on every push to `main`.

1. Create a **public** repository on GitHub (Pages on private repos needs a paid plan).
2. Push this folder to it (see the commands below). Do not upload `node_modules`, `dist` or `.env`.
3. In the repo: Settings > Pages > Build and deployment > Source: **GitHub Actions**.
4. Open the Actions tab and wait for "Deploy to GitHub Pages" to go green. The site appears at `https://USERNAME.github.io/REPO/`.

Until you add Supabase, it publishes the **demo** (sample data, resets on reload). To publish the real site, add two repository secrets under Settings > Secrets and variables > Actions: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Then re-run the workflow or push any change.

```
cd nahda-academy
git init -b main
git add .
git commit -m "Al-Nahda academy website"
git remote add origin https://github.com/USERNAME/REPO.git
git push -u origin main
```

GitHub notes: Pages is not meant as hosting for an online business and discourages handling passwords on Pages sites. Logins here go to Supabase over HTTPS, not to GitHub, but if that matters to you, Cloudflare Pages or Netlify can host the same repo with no changes.

## Preview without Supabase

Double-clicking the project's `index.html` shows a blank page. That file is source code and has to go through Vite first.

- Quickest: open `nahda-demo.html` (shipped next to this project) by double-click. It is a self-contained demo with fake data.
- Rebuild that file yourself: `npm install` then `npm run build:demo`, then open `dist-demo/index.html`.
- Live-reloading demo while editing: `npm run demo`, then open the address it prints (usually http://localhost:5173).

Log in as `admin` or `ahmad` with any 8+ character password. Demo data resets on reload.

## Students installing it

- Android (Chrome): menu > Add to Home screen / Install app.
- iPhone (Safari): Share > Add to Home Screen.

## Project layout

```
supabase/migrations/0001_schema.sql    tables, RLS policies, helper functions
supabase/functions/admin-users/        create user, reset password, suspend
supabase/tests/                        RLS test suite
src/lib/api-supabase.js                all backend calls
src/lib/api-demo.js                    in-memory stand-in for `npm run demo`
src/pages/student/, src/pages/admin/   screens
public/sw.js, public/manifest.webmanifest   installable app shell
```

## Versions

React 18.3.1, React Router 6.26.2, Vite 5.4.10, @supabase/supabase-js 2.45.4. Tested build on Node 22.
