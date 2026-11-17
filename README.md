# Beyond the Mirror

**A private student–counselor support platform.** Students message their school counselor, track every request, book sessions and use a self-help toolkit. Counselors get a triaged inbox, private notes, scheduling and insights. Administrators manage accounts and caseloads without ever seeing a single message.

Built with **Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · Supabase (Postgres, Auth, Realtime)** and deployable to **Vercel**.

> New to the project? Start with **[UNDERSTANDING.md](UNDERSTANDING.md)**, a plain-English overview of what the site does and how it's built.

![Landing page](docs/screenshots/landing.png)

| Student home | Counselor inbox |
| --- | --- |
| ![Student home](docs/screenshots/student-home.png) | ![Counselor inbox](docs/screenshots/counselor-inbox.png) |
| **Community board** | **Self-help toolkit** |
| ![Community board](docs/screenshots/community.png) | ![Toolkit](docs/screenshots/toolkit.png) |
| **Admin overview** | **Phone** |
| ![Admin overview](docs/screenshots/admin-overview.png) | ![Phone chat](docs/screenshots/mobile-chat.png) |

---

## Features

**Accounts:** students need no email: they sign up with a **username, password and a few profile details** (name, year, class, student ID). **Counselors apply with a professional profile**: full name, professional email, phone number, qualifications, years of experience and areas of expertise (email and phone are compulsory and visible only to the administrator). There's one **built-in administrator login** (overridable with environment variables), so there's no admin sign-up and no SQL step.

**Students**
- **Smart counselor matching:** "How are you feeling today?" asks what's going on (exams, family, friendships, overthinking, emotional tiredness, feeling low without knowing why, or something else), a follow-up, and an optional note in English or Roman Urdu. The answers are turned into concern areas on our own server (no outside AI service) and the student is matched with the **verified** counselor whose expertise, experience, availability and caseload fit best. Worrying words bring up safety information and mark the request urgent
- Private, real-time conversations with their matched counselor (topic, urgency, status, "Seen" receipts)
- **Anonymous messages:** a student can write to their counselor without revealing who they are, and share their name later if they choose. Anonymity is enforced in the database: the counselor's data never contains the student's identity
- **Community board:** posts asking for advice or sharing something, with an optional photo, replies, "Support" reactions, reporting and counselor moderation. Students can post anonymously (hidden from other students; staff can see who posted, for safeguarding)
- Guided "new request" flow with draft saving and a safety prompt for urgent requests
- Request tracking: *Sent → Seen → Replied → Resolved*, resolve/reopen, and feedback
- Session booking from the counselor's open slots (in person / online / phone), cancellation, post-session rating
- Live notifications (bell + toasts) for replies, bookings and status changes
- **A Voice That Understands:** voice notes of 20 seconds to 2 minutes (up to 7 MB) recorded by students for moments like *feeling lonely*, *before an exam*, *giving up on your day* or *feeling overwhelmed*, in English and Urdu. Record in the browser (or upload a file, which goes straight to private storage through a one-time signed upload link and is checked on the server before it is accepted), stay anonymous if you like, and a counselor reviews every recording before anyone hears it. A "Play me something" button picks a random note
- **Check in with yourself:** 10 questions on exam pressure, overthinking, concentration, sleep and feeling overwhelmed (*Never / Sometimes / Often / Almost always*), with practical ideas for each area (study timetable, breathing, breaks, sleep habits). Higher stress points to a counselor or trusted adult. Not a diagnosis, and nothing is saved
- **Wellbeing toolkit** (six connected tools, saved privately to the student's account, editable and deletable, never visible to counselors or admins unless shared):
  - *Daily Reflection Cards*: a thoughtful question each day across seven themes, follow-up questions, a skip option, a private journal and a weekly reflection
  - *Behaviour Pattern Tracker*: log habits (sleep, study, screen time, avoiding tasks…) with what came before, how you felt and what happened after; automatic pattern spotting, weekly and monthly reports, reflection questions and small goals
  - *Stress Pattern Analysis*: sources, frequency, intensity, effects on concentration, sleep, motivation and relationships, triggers and history; a personal summary, coping approaches and an option to share the summary with a counselor (not a diagnosis)
  - *Academic Pressure Manager*: tasks with deadlines, subjects, estimates and progress, priority ordering, step-by-step breakdowns, an automatic 7-day study plan, a focus timer with breaks, academic stress check-ins, a weekly review and support suggestions when pressure is high
  - *Decision-Making Assistant*: situation, options, benefits and challenges, outcomes and risks, personal priorities, a side-by-side comparison and a final reflection. It never decides for you
  - *Gratitude Wall*: anonymous-by-default posts in six categories, appreciation reactions (no follower counts), optional supportive comments, automatic screening that holds posts with contact details, links or hurtful language for review, reporting and counselor moderation
- **The Little Reset Zone:** seven games: *Little Paws 3D* (adopt, name, feed, bathe, dress up, play with and talk to your own 3D virtual pet), *Cozy Room* (a calm rainy room to decorate, with rain on the window and gentle sound), *Smash the Stress*, *Spin the Fun Wheel*, *Mystery Box* (jokes, stickers, kind messages, mini challenges), *Doodle & Guess* (ready-made doodles plus a shared Doodle Wall) and *Guess the Emoji* (movies, foods, animals and phrases, three levels). Game progress is saved to the student's account
- **The Mood Portal:** pick a mood colour and the whole site's background and animations change with you, with matching suggestions: a voice note, a game, breathing and a comforting message. Optionally describe the feeling in a few words (stays on the device)
- Self-help toolkit (also public, no login): *Check in with yourself, Name the feeling, Untangle a thought, Bad-day reset, Exam stress kit (with revision planner), What should I say?, Friends/family/bullying guides, Letters you won't send*
- Optional WhatsApp hand-off if the counselor publishes a number

**Counselors**
- Two-pane inbox with live updates, search, filters (status, topic, urgency, unread) and sorting
- Status/urgency/topic controls, quick-reply templates, student side panel with history
- Private case notes (visible only to the author, not students or admins)
- Availability management (one-off or weekly repeating slots) and booking management
- Overview dashboard: awaiting reply, urgent queue, median first-response time, ratings, topic breakdown
- Presence (Available / In a session / Away), profile, announcements
- Community moderation: hide or delete posts and replies, see report counts
- Voice note review queue (listen first, then approve or decline with a note to the student), Doodle Wall moderation and Gratitude Wall review
- Professional details (qualifications, experience, areas of expertise) that drive matching; changes are re-verified by the administrator

**Administrators**
- Verify counselor applications (qualifications, experience, expertise, email and phone) before approving them, and re-verify when counselors change their details; change roles, pause/restore access
- Reset a student's or counselor's password (shows a one-time temporary password, since accounts have no email)
- **No manual assignment:** a Matching page explains how students are matched, shows each counselor's verification, expertise and caseload, and what kinds of support students needed (totals only)
- Aggregate-only statistics: requests per day, by status and topic, caseloads, response times
- Announcements to everyone / students / staff

Also: the Beyond the Mirror logo and a plum brand colour taken from it, a warm "through the window" visual theme (photos framed in the brand's arch shape, illustrated page banners and empty states, a sunrise colour palette), a clean white base, responsive layouts from phone to desktop, accessible components (Radix), loading/empty/error states, and timezone-correct dates.

---

## Security model

Access control is enforced **in the database**, not just the UI. The browser only ever holds the Supabase publishable (anon) key.

- **Row Level Security on every table.** Students read only their own conversations; counselors only conversations assigned to them; admins have *no* policy that reaches messages, subjects, notes or feedback text.
- **Column-level grants.** Users can update only harmless profile fields. `role`, `status` and `counselor_id` are not writable by users. Role/assignment changes go through admin-only `SECURITY DEFINER` RPCs that re-check the caller.
- **Counselor accounts start `pending`** and have no access until an admin approves them. Sign-up details can't grant a role.
- **Verified counselors only.** A counselor's email and phone sit in a separate table that only they and the administrator can read; students get a safe summary (qualifications, experience, areas) through a function. Approving an application verifies it; editing qualifications, experience or areas clears verification until the admin checks again. Matching (`private.rank_counselors`) only ever scores verified counselors, and the manual assignment function no longer exists.
- **Personal toolkit records are owner-only.** Reflections, behaviour logs, goals, stress entries, tasks, study sessions, reviews, decisions and game saves have a single policy: `user_id = auth.uid()`. Counselors and admins have no access. Each table has a per-user row limit.
- **Username accounts.** Supabase Auth needs an email-shaped identifier, so each username maps to an internal address on the reserved `.invalid` domain. Nothing is ever emailed. Reserved usernames (`admin`, `support`, …) are blocked in the database itself.
- **Built-in admin.** The admin password is stored only as a salted scrypt hash (or taken from `ADMIN_PASSWORD` if set) and checked in constant time. On first login the server creates the admin account using a one-time token that only the server can mint, so nobody can claim the admin role through the public auth API.
- **Server actions** re-verify the session and role, validate input with Zod, and call the database as the user (so RLS still applies).
- **Anonymity by design.** Anonymous conversations store the owner in a private table the API can't reach; the conversation has no student, and the student's messages have no sender. Feedback on them can't be traced either.
- **Community data is never exposed directly.** Posts, replies and reactions are only readable through functions that mask anonymous authors. Photos go to a private storage bucket after the server checks the real file type, and are shown through short-lived signed links. The browser re-draws each photo before upload, which shrinks it and strips hidden metadata such as GPS location.
- **Voice notes and doodles** are stored in private buckets after the server checks the real file type, and are only reachable through functions that return approved notes, hide anonymous speakers' names, and never send a doodle's answer until it has been guessed. Each user can submit a limited number per day, and three reports hide a doodle automatically.
- **Brute-force protection.** After 8 failed logins for a username (or 40 from one IP) in 15 minutes, logins are blocked for that window. Sign-ups are limited per IP. Attempts are stored in a table only the server can access.
- **Rate limits** on messages and new requests; length limits on all text fields; safe redirects.
- **Security headers:** a strict Content-Security-Policy (scripts only from this site; network and media only from your Supabase project), `X-Frame-Options: DENY`, `nosniff`, a strict referrer policy and a locked-down permissions policy (the microphone is allowed only on this site, for recording voice notes).
- **The Supabase secret (service-role) key stays on the server.** It's used only to create accounts, prepare the admin login and reset passwords, never to read conversations, and never sent to the browser.

`scripts/test-rls.mjs` contains **81 automated security tests** (cross-student reads, sender spoofing, privilege escalation, admin isolation, anonymity, community masking and moderation, voice note review, Doodle Wall answers, counselor contact privacy and verification, verified-only matching, private toolkit records, Gratitude Wall screening, reserved usernames, double booking, pending accounts, …).

---

## Getting started (local)

Requirements: Node 20+, Docker (for the local Supabase stack).

```bash
npm install
cp .env.example .env.local

npx supabase start          # starts Postgres/Auth/Realtime locally and applies migrations
npx supabase status         # copy API URL, publishable key and secret key into .env.local


npm run seed                # optional: demo accounts and sample data
npm run dev                 # http://localhost:3000
```

Demo accounts after seeding (usernames; password `Mirror-demo-2026`):

| Role | Username |
| --- | --- |
| Student | `zara`, `omar`, `lina`, `ethan` |
| Counselor | `amira`, `daniel` |
| Admin | the built-in admin login |

Useful scripts:

| Script | What it does |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js |
| `npm run typecheck` | Route types + `tsc` |
| `npm run lint` | ESLint |
| `npm run db:reset` | Recreate the local DB from migrations |
| `npm run db:migrate` | Apply pending migrations to the database in `DATABASE_URL` |
| `npm run db:types` | Regenerate `src/lib/supabase/database.types.ts` |
| `npm run seed` | Demo data (local or a dev project) |
| `npm run test:rls` | Security tests, **local DB only** (run after `db:reset` + `seed`, with `ADMIN_PASSWORD` set to the admin password) |

---

## Deploying to Vercel

Until a database is connected, the site still works: the landing page and toolkit load, and the login page shows a "we're almost ready" notice.

### 1. Connect a Supabase database (one click)

In Vercel, open your project → **Storage** → **Create / Connect Database** → **Supabase** → connect it to this project for **Production and Preview** (leave the environment-variable prefix empty).

This adds the database variables automatically (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `POSTGRES_URL_NON_POOLING`, …). The tables are created automatically: during the build, or, if the build can't reach the database, on the first visit to the login page. Database problems never fail a deploy.

> **Using an existing Supabase project instead?** Add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and `SUPABASE_SECRET_KEY` yourself (Supabase → Project Settings → API). Then either add `DATABASE_URL` (Settings → Database → connection string) so builds apply migrations, or run the files in `supabase/migrations/` in order in the SQL Editor.

### 2. Optional environment variables

Vercel → Settings → **Environment Variables**:

| Variable | Value |
| --- | --- |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | Optional: override the built-in admin login |
| `ADMIN_DISPLAY_NAME` | Optional, e.g. `Ms. Sana Malik` |
| `NEXT_PUBLIC_SITE_URL` | `https://your-app.vercel.app` |
| `NEXT_PUBLIC_DEFAULT_TIMEZONE` | e.g. `Asia/Karachi` |
| `NEXT_PUBLIC_CRISIS_LINE_NAME` / `_NUMBER` | Your local emergency line, shown in safety notices |

Then **Deployments → ⋯ → Redeploy**.

### 3. Recommended Supabase settings

- **Authentication → Sign In / Providers → "Allow new users to sign up": OFF.** The app creates accounts itself through the server, so the public sign-up endpoint isn't needed. Turning it off closes it to scripts.
- **Authentication → Rate limits:** keep the defaults or tighten them.

### 4. Log in as admin

Go to `/login` and use the admin login. The admin account is created on first login. To change it later, set `ADMIN_USERNAME` / `ADMIN_PASSWORD` in Vercel and redeploy.

### Troubleshooting

- **"We're almost ready"** on the login page → the box under it says exactly what's missing (database not connected, server key missing, or tables not created). Supabase variables are read at build time, so **redeploy after connecting**.
- **Tables not created** → check the build log and the function logs for `[migrate]` lines, or run the files in `supabase/migrations/` in order in Supabase's SQL Editor.
- **Admin login says the account couldn't be prepared** → a non-admin account already uses that username. Pick a different `ADMIN_USERNAME`.

---

## Project structure

```
supabase/migrations/       Schema, RLS policies, grants, triggers, RPCs, realtime publication
scripts/                   migrate.mjs (build-time migrations), seed.mjs (demo data), test-rls.mjs (security tests)
src/proxy.ts               Session refresh + optimistic auth redirect (Next 16 "proxy")
src/actions/               Server actions: validated, role-checked mutations
src/lib/                   auth (DAL), supabase clients, validation, constants, time/tz, queries
src/hooks/                 realtime subscriptions, form helpers
src/components/ui/         Design-system primitives (button, input, dialog, badge, …)
src/components/shared/     Chat thread, status badges, counselor card, stats
src/components/toolkit/    The eight self-help tools
src/components/voices/     Voice notes: player, recorder, review queue
src/components/play/       Reset Zone games and the Doodle Wall
src/components/pet/        Little Paws 3D (three.js / React Three Fiber, everything generated in code)
src/components/cozy/       Cozy Room
src/components/wellbeing/  The six-tool wellbeing toolkit and the Gratitude Wall
src/lib/matching.ts        Concern analysis for smart matching (scoring happens in the database)
src/components/mood/       Mood Portal and the mood-coloured background
src/app/(marketing)/       Landing page, public toolkit, games and Mood Portal
src/app/(auth)/            Login, register, password reset
src/app/student|counselor|admin/   Role-based portals
```

See [`docs/PRODUCT.md`](docs/PRODUCT.md) for the product analysis, user journeys and design system.

---

## Important notes

- **Not an emergency service.** The UI says so throughout. Configure `NEXT_PUBLIC_CRISIS_LINE_*` for your region, and agree a safeguarding process with your counseling team before launch.
- Review your local data-protection requirements (e.g. parental consent, retention) before using with real students.

---

## Credits

- **Photography:** public-domain (CC0) photos from [StockSnap](https://stocksnap.io), found through [Openverse](https://openverse.org). Stored in `src/assets/photos/` with metadata stripped.
- **Illustrations:** [unDraw](https://undraw.co) by Katerina Limpitsouni (free for commercial use, no attribution required), via the MIT-licensed `undraw-svg` compilation. Recoloured to the brand palette in `public/illustrations/`.
