# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Next.js
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

Coffee Field OS runs the Silva / SPX / vendor estate instrument chain (AFP → AFE → Work Order → Field Ticket → Payment Request → Settlement) with Schedule 3 bands and structural firewalls.

## Supabase integration

This app now supports Supabase as a backend for:
- direct domain tables (`orders`, `payments`)
- full Zustand store sync via `app_state`

### Environment variables

Create a `.env.local` file with:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your_supabase_anon_publishable_key
```

### Demo logins (local)

Password for all desks: `Password123!`

| Desk | Email |
|------|----------|
| SPX (Manage) | `principal@spx.example` |
| Silva (Govern) | `owner@silva.example` |
| B-Agro (Execute) | `lead@bagro.example` |

See `docs/SCOPE.md` and `docs/END_TO_END_WORKFLOW.md`.

## Mobile & web

Coffee Field OS is a responsive web app usable on desktop browsers and phones:

- Desktop: sidebar + full module workspace
- Mobile: drawer menu, bottom field nav, touch-sized controls, installable PWA (`manifest.json`)

Open `/app` on a phone browser, or “Add to Home Screen” for standalone use.


### Migration file (recommended)

Use the migration in this repo:

`supabase/migrations/20260304_full_app_schema.sql`

For a more complete backend foundation (auth + major ERP domains), use:

`supabase/migrations/20260305_full_backend_auth_and_domains.sql`

Open Supabase SQL Editor and run the file contents.

### What the migration creates

- `public.app_state` for full app store synchronization
- `public.orders`
- `public.payments`
- indexes and updated-at trigger
- basic permissive RLS policies (for development)

### Full backend migration (20260305) includes

- `profiles` linked to `auth.users` with auto-create trigger on signup
- operational domain tables for menu, tables/reservations/waitlist, inventory, purchasing, recipes, discounts, CRM, shifts, accounting
- `orders`, `payments`, and `app_state`
- RLS enabled across all created tables with permissive dev policies

### User management backend (Supabase Auth + profiles)

This project now supports admin-driven user management via:

- Supabase Auth (`auth.users`) for login credentials
- `public.profiles` for app roles and metadata
- `public.user_pins` for PIN-only login
- Edge Function: `supabase/functions/admin-users/index.ts`

#### PIN-only login migration

Run this migration too:

`supabase/migrations/20260305_pin_auth.sql`

#### Seed first admin PIN (one-step helper)

Use:

`supabase/migrations/20260305_seed_first_admin_pin.sql`

Before running it:
- change `v_email` to your initial admin email
- change `v_pin` to the desired 4-digit PIN

#### Deploy the Edge Function

```sh
supabase functions deploy admin-users
```

#### Required behavior

- Login uses **4-digit PIN only**
- The caller must be an `admin` in `public.profiles` to create/update/delete users
- User CRUD in the UI calls the `admin-users` Edge Function
- New users get an auto-generated unique PIN from admin create flow

### Manual SQL (same schema)

If you prefer manual creation, run this SQL:

```sql
create table if not exists public.app_state (
  store_name text primary key,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id text primary key,
  hotel_id text not null,
  outlet_id text not null,
  zone_id text not null,
  location text not null,
  items jsonb not null,
  status text not null,
  guest_info jsonb,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  staff_id text not null,
  order_type text,
  table_id text,
  discount numeric,
  service_charge numeric,
  tax numeric,
  grand_total numeric,
  void_reason text,
  voided_by text,
  voided_at timestamptz,
  customer_name text,
  notes text
);

create table if not exists public.payments (
  id text primary key,
  order_id text not null,
  method text not null,
  amount numeric not null,
  refunded_amount numeric,
  status text not null,
  created_at timestamptz not null,
  refund_reason text,
  refunded_at timestamptz,
  refunded_by text,
  processed_by text
);
```

If Supabase env vars are missing, app behavior falls back to local in-memory data.

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
# cropfrot_frontend
