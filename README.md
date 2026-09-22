# WildAssist

An AI-powered wildlife rescue assistant for Ontario. When someone finds an injured
or orphaned wild animal, WildAssist helps them figure out what to do — and, if the
animal needs help, routes it to the nearest rehabilitation centre.

## The problem

Wildlife rehabilitation centres are buried in phone calls from the public, and many
of those calls are for situations where the animal should simply be left alone (a
fledgling bird, a fawn whose mother is nearby). Meanwhile, animals that genuinely
need help often arrive in worse shape because the finder didn't know how to contain
them safely. The logistics of getting an animal from where it was found to a centre
are still coordinated manually, by phone.

## What it does

1. **Triage (front door)** — The finder snaps a photo and describes the situation.
   A vision model identifies the animal and an LLM, grounded in vetted Ontario rehab
   guidance, gives a clear answer: *leave it alone (and why)*, or *it needs help —
   here's how to safely contain it*.
2. **Routing** — If it needs help, WildAssist finds the nearest centre that handles
   that species and provides contact info and directions.
3. **Dispatch (stretch goal)** — Coordinate volunteer drivers to transport the animal
   to a centre.

## Status

Early development. v1 = triage + routing. Dispatch is a later milestone.

## Stack (all free-tier)

- **Frontend:** Next.js (Vercel)
- **Database:** Supabase (Postgres)
- **Vision:** Hugging Face / local model
- **LLM triage:** Groq / Gemini free tier / local Ollama
- **Maps:** browser geolocation + OpenStreetMap

## ⚠️ Important

All rescue guidance must be accurate and sourced from reputable wildlife
rehabilitation organizations. Bad advice is worse than none.
