<div align="center">

# FanOS — The Operating System for Your Audience

**Turn your audience into a community that builds with you.**

Followers → Communities → Ideas → AI Insights → Collaboration → Action

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![Express](https://img.shields.io/badge/Express-5-000000?logo=express)](https://expressjs.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres%20%2B%20Auth-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38BDF8?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)

</div>

---

FanOS helps creators turn followers into organized communities, collect ideas, discover
valuable people, and use AI to surface the best opportunities — then select an idea,
build a team, and promote it.

## Table of Contents

- [Screenshots](#screenshots)
- [Quick Start](#quick-start)
- [Supabase Setup](#supabase-setup-one-time)
- [How It Works](#how-it-works)
- [Pages & URLs](#pages--urls)
- [Features](#features)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Environment Variables](#environment-variables)
- [Deployment](#deployment)
- [Security Model](#security-model)
- [Notes](#notes)

## Screenshots

> Add your captures to `docs/screenshots/` (see that folder's README for file names).
> They render automatically once added.

| Landing | Creator Dashboard |
|---|---|
| ![Landing](docs/screenshots/landing.png) | ![Dashboard](docs/screenshots/dashboard.png) |

| Community Page | AI Insights |
|---|---|
| ![Community](docs/screenshots/community.png) | ![AI Insights](docs/screenshots/ai-insights.png) |

## Quick Start

The app is split into two independent services — run both:

```bash
# 1. Backend (API) — http://localhost:4000
cd influencer/backend
npm install
cp .env.example .env            # add your Supabase URL + keys
npm run dev

# 2. Frontend (UI) — http://localhost:3000   (in a second terminal)
cd influencer/frontend
npm install
cp .env.example .env.local      # BACKEND_URL=http://localhost:4000
npm run dev
```

**Requirements:** Node.js 22+ and a free [Supabase](https://supabase.com/) project.

## Supabase Setup (one-time)

Open **Supabase → SQL Editor → New query**, paste the contents of
[`backend/supabase/migrations/001_fanos.sql`](backend/supabase/migrations/001_fanos.sql),
and **Run**.

This creates three tables with Row Level Security enabled:

| Table | Purpose |
|---|---|
| `profiles` | One row per auth user (role + link to member record) |
| `app_state` | Versioned JSONB document holding all community content |
| `creator_feedback` | Legacy table from the removed creator-test kit (unused by the UI) |

**Only real data is shown.** There is no demo mode or sample data: every member, idea,
community, project and opportunity comes from real users, and a new community starts empty
with clear empty states. (The landing page's product illustrations use fixed sample values
and are labelled as such.)

## How It Works

**Flow:** the creator clicks *Get Started → Creator* (the first creator account claims
the community), fills in the creator profile, then shares the join link from the dashboard
header (`<your-url>/?join=1`). Followers sign up as members, pick interests / skills / goals,
and appear on the creator's dashboard within ~5 seconds.

## Pages & URLs

Every screen has its own URL, so pages can be bookmarked, refreshed and shared, and the
browser Back/Forward buttons work. One catch-all route (`app/[[...slug]]/page.js`) renders the
app; `app/lib/routes.js` maps URLs ↔ screens (`parsePath` / `pathFor`) and sets the tab title.

| URL | Screen | Who |
|---|---|---|
| `/` | Landing page | everyone |
| `/auth/login`, `/auth/signup` | Log in / create account (`/auth` → `/auth/login`) | signed out |
| `/setup` | Creator profile setup | creator |
| `/onboarding` | Member onboarding | member |
| `/dashboard`, `/brief`, `/opportunities` | Creator dashboard, weekly brief, inbox | creator |
| `/home`, `/profile` | Member home and profile | member |
| `/ideas`, `/people`, `/communities`, `/projects` | Shown in the creator or member app, by role | both |
| `/communities/:id`, `/projects/:id` | One community / project | both |

Signed-out visitors opening an app URL are sent to `/auth/login`; a page that belongs to the
other role redirects to that user's home (`/dashboard` or `/home`). The join link
`/?join=1` opens `/auth/signup` as a member.

## Features

**Community & people**
- Email + password auth with Creator or Member roles
- Creator profile + member onboarding (interests, skills, why joining)
- Create and join communities; community feed, ideas, members, projects
- Contributor profiles with a Contribution Score, people discovery

**Ideas & collaboration**
- Idea submission (title, description, category, help needed) with live duplicate/spam check
- Idea cards: Support / Comment / I Can Help, with counts
- Invite to collaborate → turn an idea into a project (team, tasks, updates)
- Feature an idea and generate AI promotion posts (Instagram / X / LinkedIn / community)

**AI engine** (works with no API key; richer with `OPENAI_API_KEY`)
- Idea summaries
- Similar-idea detection and merging (TF-IDF clustering)
- Trending topics and an AI **Signal Score** with breakdown
- Natural-language copilot ("Find developers interested in AI")
- Weekly AI brief

## Architecture

```
Browser ──► frontend (Next.js UI) ──/api/* proxy──► backend (Express API) ──► Supabase
```

| | **frontend/** | **backend/** |
|---|---|---|
| **Stack** | Next.js 16, React 19, Tailwind 4 | Node 22, Express 5, Supabase JS |
| **Does** | All UI, URL routing, optimistic updates, built-in AI engine | Auth, validation, roles, DB writes, optional LLM |
| **Secrets** | none | Supabase secret key, OpenAI key, admin tokens |
| **Deploy to** | Vercel / Netlify / any Node host | Render / Railway / Fly / Docker |

The UI only ever calls relative `/api/*` URLs. `frontend/next.config.mjs` rewrites them to
`BACKEND_URL`, so to the browser the API is on the same origin as the page — the Supabase
session cookies stay first-party and no CORS setup is needed.

**Backend API** (`backend/src/`)

```
GET  /health                                   health check for your host
     /api/auth/{signup,login,logout,me}        Supabase Auth (email + password, httpOnly cookie sessions)
GET  /api/state                                shared data for the signed-in user
POST /api/actions                              every write: role check → sanitize → reducer
GET|POST /api/ai                               optional LLM (copilot answers, promo rewrite)
GET|POST /api/feedback                         creator test feedback
```

- **Storage:** Supabase Postgres. Accounts live in `auth.users` + `profiles`; community
  content is one versioned JSONB document in `app_state`, written with optimistic concurrency
  (`UPDATE … WHERE version = n`, retried on conflict). Safe to run multiple backend instances.
- **Shared logic:** `reducer.js`, `ai.js` and `seed.js` are pure JS used by both sides
  (browser for optimistic updates, server for validation). The source of truth is
  `frontend/app/lib/`; after editing them run `cd backend && npm run sync-shared`.
- **AI:** the built-in engine runs without any API key. With `OPENAI_API_KEY` set on the
  backend, new ideas get LLM summaries, the copilot answers in natural language, and promo
  posts can be rewritten.

## Project Structure

```
influencer/
├── frontend/                  Next.js UI (no secrets, no database access)
│   ├── app/
│   │   ├── components/        UI components
│   │   ├── lib/               client store + shared pure logic (reducer, ai, seed)
│   │   ├── layout.js, page.js
│   ├── next.config.mjs        /api/* → BACKEND_URL proxy
│   ├── .env.example
│   └── package.json
├── backend/                   Express API service
│   ├── src/
│   │   ├── server.js          entry point (listens on PORT)
│   │   ├── app.js             express app, route mounting, error handler
│   │   ├── routes/            auth, community (state + actions), ai, feedback
│   │   ├── lib/               supabase clients, auth, db, actions, llm
│   │   └── shared/            copy of frontend/app/lib/{reducer,ai,seed}.js
│   ├── scripts/sync-shared.mjs
│   ├── supabase/migrations/   SQL schema (RLS on, no public policies)
│   ├── Dockerfile
│   ├── .env.example
│   └── package.json
├── docs/screenshots/          images for this README
└── README.md
```

## Environment Variables

**`backend/.env`** (copy from `backend/.env.example`)

| Variable | Required | Description |
|---|:---:|---|
| `SUPABASE_URL` | ✅ | Your Supabase project URL |
| `SUPABASE_PUBLISHABLE_KEY` | ✅ | Publishable (anon) key — used for auth |
| `SUPABASE_SECRET_KEY` | ✅ | Secret key — bypasses RLS. **Never commit.** |
| `PORT` | | Port to listen on (default `4000`; most hosts set it) |
| `CREATOR_ACCESS_CODE` | | Lets additional creators register after the first |
| `OPENAI_API_KEY` | | Enables LLM summaries, copilot, promo rewrite |
| `OPENAI_MODEL` / `OPENAI_BASE_URL` | | Override model / use an OpenAI-compatible API |
| `FEEDBACK_ADMIN_TOKEN` | | Read all creator-test feedback via `GET /api/feedback` |

**`frontend/.env.local`** (copy from `frontend/.env.example`)

| Variable | Required | Description |
|---|:---:|---|
| `BACKEND_URL` | ✅ | Backend base URL, e.g. `https://fanos-api.onrender.com` (no trailing slash). Read at build time — redeploy the frontend after changing it. |

> ⚠️ `.env` and `.env.local` are git-ignored. Only `.env.example` files (no real secrets) are committed.

## Deployment

Deploy the **backend first**, then point the frontend at it.

**1. Backend** (Render / Railway / Fly / any Docker host)
- Root directory: `backend`
- Build: `npm install` · Start: `npm start` (or use the included `Dockerfile`)
- Set the backend env vars above in the host's dashboard.
- Health check path: `/health`
- Copy the public URL, e.g. `https://fanos-api.onrender.com`.

**2. Frontend** (Vercel / Netlify / any Node host)
- Root directory: `frontend` (framework: Next.js, default build settings)
- Env var: `BACKEND_URL=https://fanos-api.onrender.com`
- Deploy. Share `<frontend-url>/?join=1` with followers.

**3. Supabase:** run `backend/supabase/migrations/001_fanos.sql` once (see above).

## Security Model

- The **browser never talks to the database.** Tables have RLS enabled with **no policies**,
  so the publishable key cannot read them; only the backend (secret key) can.
- The backend rebuilds every action from allow-lists; identities (author, member, creator)
  come from the Supabase session.
- Members cannot run creator actions or see the opportunities inbox.
- Email sign-ups are created pre-confirmed (no confirmation email). There is no password
  reset UI yet.

## Notes

- **`app/lib/seed.js`** holds configuration only — the allow-lists (categories, interests,
  roles, goals, needs, skills) used to validate every write — and the live creator profile.
  It contains no sample records.
- **Ages are real:** members, ideas, comments, projects and updates store timestamps
  (`joinedAt`, `createdAt`, `at`); "joined 3 days ago" etc. are computed from them on load.
- **Next step for scale:** split `app_state` into normalized tables (communities, ideas, votes,
  comments, projects…) and add pgvector for embeddings.
