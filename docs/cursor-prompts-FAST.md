# FAST TRACK — whole app today (6 prompts)

Each prompt runs 2 detailed stages from `docs/cursor-prompts.md` as one task. Paste one prompt per new Agent chat, in order. Commit after each.

Shared speed rules (already part of every prompt below):
- Working end-to-end flow beats polish. Exact Figma fidelity on key screens (07, 12, 13–15, 16, 17, 20); other screens close enough.
- Do not stop to ask questions. Take the documented decision or a sensible default, leave `// TODO(<topic>)`, and list it in the summary.
- If a sub-task blocks progress for long, stub it behind a clear TODO and move on.

---

## Prompt 1 — Foundation + components + first deploy

```
Read `.cursor/rules/shovani.mdc` and `docs/cursor-prompts.md`.

Execute **Stage 1** and **Stage 2** from `docs/cursor-prompts.md` as one task, in that order.

Speed mode:
- Working end-to-end beats polish. Do not stop to ask questions: take the documented decision or a sensible default, leave `// TODO(<topic>)`, list TODOs in the summary.
- Keep `/dev/tokens` simple: one page, no extra tooling.

Also:
- Initialize git in `shovani/` with a `.gitignore` (node_modules, .next, .env*, .DS_Store; keep `.env.example`).
- Make sure `npm run build` passes in `web/` so I can deploy to Vercel with Root Directory = `web`.

Finish with: files changed, asset rename table, TODOs, the exact commands to run locally.
```

## Prompt 2 — Onboarding + journey

```
Read `.cursor/rules/shovani.mdc`. Execute **Stage 3** and **Stage 4** from `docs/cursor-prompts.md` as one task.

Speed mode: working flow first, no questions, defaults + `// TODO`, list TODOs at the end.
Goal of this step: on a phone I can go 01 → 02 → 03 → 04 → E1 → 07 → «Летимо» → flight → 9 → 11 → door → (hall placeholder).
Run lint, type check, build. Summarize what to check on a real phone.
```

## Prompt 3 — Hall, tour, touch zones, «Про картину», wallpapers

```
Read `.cursor/rules/shovani.mdc`. Execute **Stage 5** and **Stage 6** from `docs/cursor-prompts.md` as one task.

Speed mode: working flow first, no questions, defaults + `// TODO`, list TODOs at the end.
Priority inside this step: hall → tour (with grid fallback when x/y/zoom are null) → «Про картину» tabs + sources → «Завершити шлях» → touch zones → wallpapers → `/dev/calibrate`.
The tour must work for ALL artworks in the journey, not only «Великодня заутреня».
Run lint, type check, build. Summarize.
```

## Prompt 4 — AI chat + final

```
Read `.cursor/rules/shovani.mdc`. Execute **Stage 7** and **Stage 8** from `docs/cursor-prompts.md` as one task.

Speed mode: working flow first, no questions, defaults + `// TODO`, list TODOs at the end.
`OPENAI_API_KEY` and `OPENAI_MODEL` are in `web/.env.local`. If the key is missing, the chat must still work with fallback answers.
Goal: full first path works end-to-end: onboarding → journey → hall → tour → «Про картину» → chat → «Завершити шлях» → final with the star.
Run lint, type check, build. Summarize + the fallback answers list for my review.
```

## Prompt 5 — Return visit: Home, Collection, Profile + offline basics

```
Read `.cursor/rules/shovani.mdc`. Execute **Stage 11** from `docs/cursor-prompts.md`, then from **Stage 12** only: E2 offline screen, chat offline fallback label, preloading the next facade/hall during the flight.

Speed mode: working flow first, no questions, defaults + `// TODO`, list TODOs at the end.
Auth is not connected yet: Profile «Акаунт» row shows «Не увійшли», «Вийти» and «Видалити акаунт і дані» clear local data for now (TODO for Stage 9).
Jury mode must work: with rhythm «Без нагадувань» (or rhythm not chosen yet) the next path is available right after the previous one, so all artworks can be passed in one session.
Run lint, type check, build. Summarize.
```

## Prompt 6 — Real auth, rhythm, web push, production

```
Read `.cursor/rules/shovani.mdc`. Execute **Stage 9** and **Stage 10** from `docs/cursor-prompts.md` as one task, then the deploy part of **Stage 12**.

Speed mode: working flow first, no questions, defaults + `// TODO`, list TODOs at the end.
Env in `web/.env.local`: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY. Generate VAPID keys with `npx web-push generate-vapid-keys`, add them and CRON_SECRET to `.env.local` and to `.env.example` (without values).
Wire the existing Profile rows (Акаунт, Вийти, Видалити акаунт і дані) to Supabase.
Give me at the end: SQL to run (or confirm migrations ran), the full list of env vars for Vercel, the exact redirect URLs to add in Supabase and Google Cloud, and a 10-step test script for iPhone (install to Home Screen → push).
Run lint, type check, build.
```
