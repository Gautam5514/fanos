<div align="center">

# FanOS — The Operating System for Your Audience

**Turn your audience into a community that builds with you.**

Followers → Communities → Ideas → AI Insights → Collaboration → Action

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev/)
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
- [Two Ways to Use It](#two-ways-to-use-it)
- [Features](#features)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Environment Variables](#environment-variables)
- [Security Model](#security-model)
- [Real Creator Validation](#real-creator-validation-)
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

```bash
cd influencer/frontend
npm install
cp .env.example .env.local      # add your Supabase URL + keys
npm run build && npm start      # or: npm run dev
# open http://localhost:3000
```

**Requirements:** Node.js 18+ and a free [Supabase](https://supabase.com/) project.

## Supabase Setup (one-time)

Open **Supabase → SQL Editor → New query**, paste the contents of
[`frontend/supabase/migrations/001_fanos.sql`](frontend/supabase/migrations/001_fanos.sql),
and **Run**.

This creates three tables with Row Level Security enabled:

| Table | Purpose |
|---|---|
| `profiles` | One row per auth user (role + link to member record) |
| `app_state` | Versioned JSONB document holding all community content |
| `creator_feedback` | Real creator-test feedback (validation kit) |

In **live mode the community starts empty** — only real data created by real users appears.
The **demo** (View Demo) uses rich sample data so you can explore the product instantly.

## Two Ways to Use It

| | **View Demo** | **Get Started (live)** |
|---|---|---|
| **Account** | none | email + password |
| **Data** | seeded sandbox in your browser | Supabase Postgres, shared by everyone |
| **Use for** | pitch / judges | real creator + real followers |

**Live flow:** the creator clicks *Get Started → Creator* (the first creator account claims
the community), fills in the creator profile, then shares the join link from the dashboard
header (`<your-url>/?join=1`). Followers sign up as members, pick interests / skills / goals,
and appear on the creator's dashboard within ~5 seconds.

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
Next.js 16 (React 19, Tailwind 4) — single app
├── app/lib/reducer.js     pure state logic, shared by browser + server
├── app/lib/ai.js          AI engine (TF-IDF clustering, Signal Score, search, brief, promo)
├── app/lib/server/        supabase clients, db (Postgres, optimistic concurrency), auth, actions, llm
├── supabase/migrations/   SQL schema (RLS on, no public policies)
└── app/api/
    ├── auth/{signup,login,logout,me}          Supabase Auth (email + password, cookie sessions via @supabase/ssr)
    ├── state                                  shared data for the signed-in user
    ├── actions                                every write: role check → sanitize → reducer
    ├── ai                                     optional LLM (copilot answers, promo rewrite)
    └── feedback                               creator test feedback
```

- **Storage:** Supabase Postgres. Accounts live in `auth.users` + `profiles`; community
  content is one versioned JSONB document in `app_state`, written with optimistic concurrency
  (`UPDATE … WHERE version = n`, retried on conflict). Works on any host, including Vercel.
- **AI:** the built-in engine runs without any API key. With `OPENAI_API_KEY` set, new ideas
  get LLM summaries, the copilot answers in natural language, and promo posts can be rewritten.

## Project Structure

```
influencer/
├── frontend/              Next.js full-stack app (UI + server/API + DB access)
│   ├── app/
│   │   ├── components/    client UI
│   │   ├── api/           server route handlers (the backend)
│   │   └── lib/server/    Supabase clients, auth, db, actions (server-only)
│   ├── supabase/          SQL migration
│   ├── .env.example       copy to .env.local and fill in
│   └── package.json
├── docs/screenshots/      images for this README
└── README.md
```

> **Architecture note:** FanOS is a single Next.js app. In Next.js the "backend" lives
> inside the app — `app/api/*` route handlers and `app/lib/server/*` run only on the
> server (they are never shipped to the browser), and the `SUPABASE_SECRET_KEY` has no
> `NEXT_PUBLIC_` prefix so it stays server-side. There is no separate backend service to run.

## Environment Variables

Copy `frontend/.env.example` to `frontend/.env.local` and fill in:

| Variable | Required | Description |
|---|:---:|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | ✅ | Publishable (anon) key — used for auth |
| `SUPABASE_SECRET_KEY` | ✅ | Server-only secret key — bypasses RLS. **Never commit.** |
| `APP_URL` | ✅ | Public URL (used for OAuth redirects) |
| `CREATOR_ACCESS_CODE` | | Lets additional creators register after the first |
| `OPENAI_API_KEY` | | Enables LLM summaries, copilot, promo rewrite |
| `OPENAI_MODEL` / `OPENAI_BASE_URL` | | Override model / use an OpenAI-compatible API |
| `FEEDBACK_ADMIN_TOKEN` | | Read all creator-test feedback via `GET /api/feedback` |

> ⚠️ `.env` and `.env.local` are git-ignored. Only `.env.example` (no real secrets) is committed.

## Security Model

- The **browser never talks to the database.** Tables have RLS enabled with **no policies**,
  so the publishable key cannot read them; only the server (secret key) can.
- The server rebuilds every action from allow-lists; identities (author, member, creator)
  come from the Supabase session.
- Members cannot run creator actions or see the opportunities inbox.
- Email sign-ups are created pre-confirmed (no confirmation email). There is no password
  reset UI yet.

## Real Creator Validation ⭐

Send a creator `<your-url>/?test=1`. They use the creator dashboard (demo data), a checklist
ticks 6 tasks automatically, then they rate each requirement, estimate time saved, write a
quote, add a video link, and choose whether it can be published. Results are saved in Supabase
(`creator_feedback`) and shown under landing page → **Creator tests** (averages, testimonial
cards, Copy pitch summary, CSV/JSON export). Nothing is pre-filled.

## Notes

- **Demo seed data** (`app/lib/seed.js`): used only for the in-browser demo (243 members,
  8 communities, 35 ideas, etc.). Live mode starts empty. `seed.js` also defines the shared
  config allow-lists (categories, interests, roles, needs) used to validate every write.
- **Next step for scale:** split `app_state` into normalized tables (communities, ideas, votes,
  comments, projects…) and add pgvector for embeddings.
