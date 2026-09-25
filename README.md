# WildAssist

Guided help for people who find injured or orphaned wildlife in Canada, and the operations tooling for the centres and volunteers who rescue them.

![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Postgres%20%7C%20Auth%20%7C%20Realtime-3FCF8E?logo=supabase&logoColor=white)
![Vercel](https://img.shields.io/badge/Deployed-Vercel-000000?logo=vercel&logoColor=white)

**Live demo:** https://wildassist.vercel.app

---

## What it is

Most people who find a hurt animal do not know what to do. They call around, get bad advice, or accidentally do harm (a lot of "orphaned" babies are not orphaned, and cat-caught birds need treatment within hours). Wildlife rehabilitation centres, meanwhile, are underfunded and run on phone calls and spreadsheets.

WildAssist connects those two sides. A member of the public answers a few questions, gets clear and sourced guidance, and their report is routed to the nearest centre that can help. Staff at that centre see it arrive on a dashboard, volunteers can claim the transport, and everyone stays coordinated. The public side needs no account. The staff, manager, admin, and volunteer sides sit behind role-based access.

It runs entirely on free tiers.

## Features

**For the public (no login)**
- A guided triage flow: choose the animal, describe the situation, add detail.
- Optional photo identification that runs a vision model in the browser (nothing is uploaded, no cost).
- AI guidance from an LLM grounded in vetted rehabilitation advice, returning one of three clear outcomes: leave it be, check first, or needs help.
- A deterministic safety layer that shows firm "do not handle" warnings for snakes, bats, raptors, raccoons, and other risky animals, independent of the AI, plus a browser alert.
- Location capture that auto-routes the report to the nearest suitable centre, followed by a clear confirmation.

**For centre staff and managers**
- A dashboard of incoming cases, scoped to the centre's area with an unassigned safety net so nothing falls through.
- Search, sort, status filters, a map view, and CSV export.
- Case detail with the photo, reporter's description, a location link, reporter contact, staff notes, and a status workflow.
- Live notifications when new cases arrive.
- Team roster with role badges, plus a join-code and team-management panel for managers.

**For rescue volunteers**
- A transport feed of nearby animals that need a lift, sorted by distance.
- Claim, deliver, and release actions. The destination centre sees who is transporting.
- Vetting: volunteers are approved by an admin or manager before they see any jobs, the feed is area-scoped, and a finder's contact stays hidden until a job is claimed.

**For admins**
- Onboard a centre by typing its address (geocoded automatically) and naming its first manager.
- Approve volunteers and view every case across the country.

**Team messaging**
- A per-centre main channel, one-to-one direct messages, and named group chats, all in real time with unread badges.

## Screenshots

> Add images to `docs/screenshots/` and they will render here.

| Triage flow | Care guidance |
| --- | --- |
| ![Triage](docs/screenshots/triage.png) | ![Guidance](docs/screenshots/guidance.png) |

| Centre dashboard | Messaging |
| --- | --- |
| ![Dashboard](docs/screenshots/dashboard.png) | ![Messages](docs/screenshots/messages.png) |

## How it works

```
Finder                     Server / Supabase                 Centre + Volunteers
  |                              |                                   |
  |-- photo + situation ------->|  in-browser vision (hint)          |
  |                              |  LLM triage (grounded in guidance)|
  |<-- advice + safety warnings-|                                   |
  |-- location ---------------->|  nearest-centre routing (haversine)|
  |                              |  case saved (Postgres, RLS)       |
  |<-- "sent to Centre X" ------|-------- realtime ---------------->| staff see the case
                                 |                                   | volunteer claims transport
```

The public never touches the database directly. Reads and writes go through server route handlers, and every table is protected by Row-Level Security so a user only ever sees what their role allows (a volunteer cannot read a finder's phone number, one centre cannot read another's cases, and so on).

## Tech stack

- **Frontend:** Next.js 16 (App Router), React, TypeScript, Tailwind CSS.
- **Backend:** Next.js route handlers running as serverless functions on Vercel.
- **Data and auth:** Supabase (Postgres, Auth, Storage, Realtime) with Row-Level Security throughout.
- **AI:** Groq (`openai/gpt-oss-120b`) for triage, grounded in a curated guidance set. In-browser image classification via `@huggingface/transformers`.
- **Maps and geocoding:** Leaflet with OpenStreetMap tiles, and Nominatim for turning centre addresses into coordinates.
- **Hosting:** Vercel.

## Running it locally

**Prerequisites:** Node 20+, a free Supabase project, and a free Groq API key.

```bash
git clone https://github.com/mohsin123-04/wildassist.git
cd wildassist
npm install
cp .env.local.example .env.local   # then fill in the values below
npm run dev
```

Set these in `.env.local`:

```
GROQ_API_KEY=              # from console.groq.com
NEXT_PUBLIC_SUPABASE_URL=  # Supabase project settings > API
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY= # keep server-side only
```

**Database:** open the Supabase SQL editor and run the files in `supabase/`, starting with `schema.sql` and `seed.sql`, then the feature migrations (profile fields, area visibility, roles, messaging, rate limiting, and so on). Create two public Storage buckets, `avatars` and `case-photos`.

The app runs without the AI key (it falls back to a built-in rule engine) and without the database (the public flow still works), which makes local development forgiving.

## Project structure

```
src/
  app/
    page.tsx            landing
    triage/             the public guided flow
    emergency/          quick reference
    dashboard/          staff, manager, and admin views + panels
    transport/          volunteer job feed
    messages/           channel, DMs, and group chats
    login/  profile/
    api/                route handlers (triage, cases, conversations, admin, ...)
  components/           shared UI (Avatar, SafetyBanner, AnimalIcon, ...)
  lib/
    triage.ts           types + rule-engine fallback
    guidance.ts         vetted guidance knowledge base
    safety.ts           deterministic danger registry
    centres.ts          centre data + distance ranking
    vision.ts           label to category mapping
    ratelimit.ts        Postgres-backed limiter
    supabase/           browser, server, and admin clients
supabase/               SQL schema, seed data, and migrations
```

## Roles and access

| Role | How they join | What they get |
| --- | --- | --- |
| Public | No account | Triage and guidance |
| Volunteer | Sign up, then approved | Area-scoped transport jobs |
| Staff | Sign up with a centre join code | Their centre's cases |
| Manager | Designated when the centre is onboarded | Staff view plus join code, team, and volunteer approval |
| Admin | Set by the operator | All cases, centre onboarding, oversight |

**Demo accounts** (shared demo, please be gentle): password `wildlife2026`.

| Email | Role |
| --- | --- |
| `staff@wildassist.ca` | Staff |
| `demo@wildassist.ca` | Manager |
| `admin@wildassist.ca` | Admin |
| `volunteer@wildassist.ca` | Volunteer |

## Security

- Row-Level Security on every table, including geospatial rules (a staffer sees cases within range of their centre) and membership rules (you read only the conversations you belong to).
- Secrets stay on the server. The service-role key is never exposed to the browser.
- Volunteers are vetted, area-scoped, and cannot see a finder's contact details until they claim a job.
- Centre access is gated by join codes, and managing a centre is gated by the manager role.
- Public endpoints are rate limited per IP, backed by an atomic Postgres function, so nobody can drain the AI quota or flood storage.

## Roadmap

- Automated tests over the core logic (triage rules, safety detection, centre ranking, access control).
- Verification of the seed centre and guidance data against authoritative sources before real-world use.
- Case history and audit trail, duplicate-report detection, and per-centre analytics.
- Email notifications alongside the existing in-app ones.

## Status

This is a working, deployed project built to explore the space and to learn. The guidance and centre contact details are drawn from reputable sources but are still marked as needing verification, so it should not yet be relied on for a real emergency. If you have found an animal in distress, contact a licensed wildlife rehabilitator directly.

## License

MIT.
