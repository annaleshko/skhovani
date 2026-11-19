# FAST TRACK v2 — MVP without registration (AI guide first)

Flow: app opens on the map (07) as a fake signed-in user → flight → museum → hall → tour / touch zones → «Про картину» → AI chat → final → next path. Onboarding (01–04), login (01б, 18, 18б, 18в, E4), rhythm (18г) and push (18д) are OUT of the MVP. Detailed specs per stage stay in `docs/cursor-prompts.md`; ignore everything about Supabase, auth and push there.

Run one prompt per new Agent chat. After each: `git add -A && git commit -m "..." && git push`.

---

## Prompt A — Switch to demo user, start on the map

```
## Review
Onboarding (01–04) and the journey (E1, 07, 9, 11) are implemented. For the MVP the product changes: no registration and no onboarding. The app must open directly on the map screen 07 (Figma `87:1359`) as if the person is already signed in.

## Iterate
Remove onboarding and auth from the user flow and seed a fake signed-in demo user.

## Specify
- Read `.cursor/rules/shovani.mdc` (updated: no auth, no Supabase, no push).
- Create `web/src/data/demo-user.ts`: name «Анна», vocative «Анно», start city Вінниця, account «Google», rhythm «Без нагадувань» (so every next path is available immediately), avatar initial «А». All screens read the user from here via the existing state provider.
- `/` opens the journey: E1 (only if > 400ms) → 07 «Привіт, Анно» with the first path (Вінниця → Херсон). On a returning visit with completed paths, `/` opens Home (built later; for now a simple placeholder that shows the next path and «Летимо»).
- Do NOT delete onboarding/login code. Keep it in the repo but unreachable: remove links/redirects to it and add a short `// MVP: disabled` note. Remove any auth stubs/toasts from the active flow.
- Add a demo reset for the jury: route `/reset` clears localStorage progress and redirects to `/`; also a hidden trigger (long-press 2s on the avatar in Home/Profile, when they exist). No visible UI for it.
- Persist progress (completedPaths, openedArtworkIds, chat history, seen tour) in localStorage under a versioned key.
- Keep all journey animations and behavior unchanged.

## Maintain
Do not change map, flight, zoom, museum facade or transitions. Do not touch data files except adding `demo-user.ts`. Run lint, type check, build. Summarize changed files and how to test from a clean browser.
```

## Prompt B — Hall, AI-guide tour, touch zones, «Про картину», wallpapers (core)

```
Read `.cursor/rules/shovani.mdc`. Execute **Stage 5** and **Stage 6** from `docs/cursor-prompts.md` as one task.

This is the core feature of the MVP — highest fidelity to Figma (`92:4217`, `125:6530`, `100:1655`, `97:4692`, `97:4745`, `97:4788`, `104:1701`, `125:6841`, `107:1712`, `107:1777`, `107:1840`, `107:1906`, `127:9384`, `127:9408`) and smooth motion.
Speed mode otherwise: no questions, defaults + `// TODO`, list TODOs at the end.
Priority: hall → tour (grid fallback when x/y/zoom are null) → touch zones → «Про картину» tabs + sources → «Завершити шлях» → wallpapers → `/dev/calibrate`.
The tour and touch zones must work for ALL artworks in the journey.
Run lint, type check, build. Summarize.
```

## Prompt C — AI chat + final

```
Read `.cursor/rules/shovani.mdc`. Execute **Stage 7** and **Stage 8** from `docs/cursor-prompts.md` as one task, with these MVP changes:
- No auth: chat history per artwork lives in localStorage only.
- Final (17): no login sheet. The CTA «Зберегти моє сузір’я» and its hint are replaced by a primary «На головну» (→ Home) and the «Наступний шлях» card.

The AI chat is the core feature: streaming, verified source chips with real links, follow-up chips, E3 error card and fallback answers must all work.
`OPENAI_API_KEY` and `OPENAI_MODEL` are in `web/.env.local`. Without a key the chat must still work on fallback answers.
Speed mode otherwise: no questions, defaults + `// TODO`, list TODOs at the end.
Goal: the whole first path works end-to-end: 07 → flight → museum → hall → tour → «Про картину» → chat → «Завершити шлях» → final.
Run lint, type check, build. Summarize + print the fallback answers for my review.
```

## Prompt D — Home, Collection, Profile with the demo user + offline basics

```
Read `.cursor/rules/shovani.mdc`. Execute **Stage 11** from `docs/cursor-prompts.md`, then from **Stage 12** only: E2 offline screen, chat offline fallback label, preloading the next facade/hall during the flight.

MVP changes:
- Profile shows the demo user (Анна, Google, Вінниця, «Без нагадувань»). Rows Ім’я / Місто старту open simple inline edit sheets saved to localStorage. «Ритм», «Вийти», «Видалити акаунт і дані» are visible but non-functional (show a small «Недоступно в демо» toast) — except «Видалити акаунт і дані», which does the demo reset after a confirm sheet.
- Path availability: always jury mode — the next path opens right after the previous one.
- Tap on an opened artwork in Collection → AI-guide explore mode (touch zones) with ▶ replay tour, «Спитати гіда», «Про картину».
- Melitopol: no occupation label on map, Home or Collection.
Speed mode otherwise: no questions, defaults + `// TODO`, list TODOs at the end.
Run lint, type check, build. Summarize.
```

## Prompt E — Production check

```
Read `.cursor/rules/shovani.mdc`. Prepare the MVP for the demo:
- Full run in a 390px viewport: `/reset` → 3 full paths (Херсон, Мелітополь, Херсон) → Collection → Profile → `/reset`. Fix blockers you find with minimal changes.
- PWA: manifest + icons valid; app installs to the Home Screen; status bar/safe areas correct in standalone mode.
- Accessibility quick pass: labels on icon buttons, focus in sheets, reduced motion.
- Performance: `next/image` sizes, no image > 500KB served on mobile, Lighthouse mobile performance ≥ 80 on the map.
- List env vars for Vercel (only OPENAI_API_KEY, OPENAI_MODEL) and confirm `.env.example`.
Final report: what works, known issues ranked by demo risk.
```
