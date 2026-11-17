# Сховані — Cursor prompts (staged workflow)

How to use:
1. Open the folder `shovani` in Cursor (the one with `art/`, `museums/`, `docs/`, `data/artworks.json`).
2. Make sure `.cursor/rules/shovani.mdc` is there — Cursor reads it automatically on every request.
3. Make sure Figma MCP is connected in Cursor and the Figma desktop app has the file «хакатон» open.
4. Run the stages in order, one per new Agent chat. Check the result on your phone before the next stage.
5. After each stage: commit to git (`git add -A && git commit -m "stage N"`) so you can roll back.

Figma file key: `YwA6vCDB79wBlD1A8E8Nt0`

---

## Stage 1 — Foundation: project, tokens, assets, data

```
## Role
You are a senior frontend engineer and design engineer working in Cursor with Figma MCP.

## Task
Set up the foundation for the «Сховані» PWA: Next.js project, design tokens from Figma, optimized assets, typed artwork data and motion primitives. No screens yet except a token preview page.

## Context
- Read `.cursor/rules/shovani.mdc`, `docs/app-spec.md` (sections «Огляд продукту», 8 and 9) and `docs/artwork-passports.md` fully before starting.
- The repo is empty except for asset folders: `art/`, `museums/`, `backgrounds/`, `map/`, `wallpapers/`. Do not modify or delete them.
- Figma: components page node `59:2`. Variables are defined in the file.

## Constraints
1. Scaffold Next.js (App Router, TypeScript, Tailwind, ESLint, `src/` dir) into `web/`. Add `framer-motion`, `sharp` (dev, for the asset script).
2. Tokens: read Figma variables via MCP (`get_variable_defs`). Map them to CSS variables in `globals.css` and to the Tailwind theme with the same semantic names (`bg-screen`, `text-secondary`, `status-stolen` …). Add Manrope via `next/font/google` (Cyrillic subset). Typography scale from the Figma text styles.
3. Assets: write `web/scripts/prepare-assets.mjs` that copies from the root asset folders into `web/public/` with Latin kebab-case names and WebP output:
   - `art/*.jpg` → `public/art/<slug>.webp` (max 2000px long side). Ignore duplicate `.png` versions.
   - `museums/*.png` → `public/museums/<slug>.webp` (max 1600px). The file starting with `7d0174bd…` is the National Museum in Lviv.
   - `backgrounds/*.png` → `public/halls/<slug>.webp`. `херсонський музей.png` is the Kherson hall panorama. Assume `image 63.png` is the Melitopol hall and mark it `// TODO(confirm)`.
   - `wallpapers/*.png` → `public/wallpapers/<slug>.png` (keep PNG, they are downloads).
   - `map/Map.svg` → `public/map/map.svg` (keep as SVG).
   - Generate `web/src/data/asset-map.ts` with the slug for every artwork/museum. Print a table of original → new names.
4. Figma-only assets: export via Figma MCP the picture frame image («рамка»), spotlight lamp, light cone and projector from the hall/tour frames (nodes `92:4217`, `100:1655`) into `public/hall/`. Prefer SVG for vector shapes, WebP for raster.
5. Data: `data/artworks.json` (repo root) is the single content source, generated from `docs/artwork-passports.md`. It contains `chatRules`, `artworks[]` (tabs, tourStops, touchZones, sources with real URLs, chat defaultQuestions/knowledgeBase/aiNotes, openQuestions, `sourceAssets` paths), `museums[]` and `journey.paths[]`. Do not retype or paraphrase its text.
   - Copy it to `web/src/data/content.json` and write `web/src/data/types.ts` (types that match the JSON exactly) + `web/src/data/index.ts` with typed getters: `getArtwork(id|slug)`, `getMuseum(id)`, `getArtworksByMuseum(id)`, `getSource(artworkId, sourceId)`.
   - Validate the JSON at build time with a small hand-written check script (`web/scripts/validate-content.mjs`): every artwork has 4 tour stops, zones, ≥3 sources with URLs, every `knowledgeBase.sourceId` exists or is null, every journey path points to an existing artwork/museum. Fail the build on errors.
   - Tour stops have `x, y, zoom = null` on purpose. They will be filled in Stage 5.
   - `touchZones.grid` is `3x3`, `3x2` or `custom` (Плафон, oval: positions are text labels — map them to rough normalized rects in a separate `zone-layouts.ts`, TODO until a photo exists).
   - Use `sourceAssets` paths for the asset script (step 3); the public paths are already in `image` / `wallpaper`.
   - `cities.ts`: city name, oblast, lat, lng for all oblast centers and cities with population > 50k in Ukraine (for the start-city search), plus museum cities.
   - `journey.ts`: read `journey.paths` from the JSON. Export pure functions `getPath(n)`, `getNextPath(completedPaths)`, `getOpenedArtworks(completedPaths)`. Skip paths with `skipIfNoImage` when the artwork has no image. After the last path, show the «all done» state (copy TODO).
6. Motion: `web/src/lib/motion.ts` with named durations/easings from the animation table (spec section 8), the default spring, and a `useReducedMotionSafe` helper.
7. PWA base: `app/manifest.ts` (name «Сховані», standalone, theme/background `bg/screen`), app icons placeholder, `viewport` with `viewport-fit=cover` and safe-area paddings.
8. Create `/dev/tokens` page that renders all colors, type styles, buttons and status badges for visual check against Figma.

## Format
1. Short plan (≤10 lines).
2. Implement.
3. Run lint, type check, build.
4. Summary: files created, the asset rename table, any passport fields you could not map, TODOs.
```

---

## Stage 2 — Base components (design system)

```
## Role
Senior design engineer with Figma MCP.

## Task
Implement the reusable UI components from the Figma components page so all screens can be assembled from them.

## Context
Figma components page node `59:2`. Components and nodes:
Button `59:21` (Primary/Secondary/Ghost), Social Button `83:1297` (Google, Email), Text Field `60:13` (Default/Focused, with/without icon), Option Card `60:46`, Chip `71:657` (Default/Active), Status Badge `71:651` (Викрадений / В укритті / Врятований / Втрачений), Artwork Card `72:724` (Lit/Covered, Show status), Museum Card `145:3844` (Пройдений/Наступний/Попереду), Bottom Sheet `72:614` (handle off by default), Nav Bar `72:688`, Chat Bubble `72:698`, Source Row `72:700`, Map Pin `71:684`, Illustration/Map `61:46`. Also: Progress Stepper, Screen Header, Feature Card, City Row, Stat Card, Time Pill, Number Badge, Check Badge, Icon Button, Status Bar spacer (inspect any frame in `42:1719`).

## Constraints
- Inspect each component through Figma MCP (`get_design_context`) before coding it. Treat the generated code as a reference, not final code.
- Map Figma variants to typed props. Use the Tailwind tokens from Stage 1 only.
- Bottom Sheet: one component with scrim, spring enter, swipe-down to close (drag on handle area), tap on scrim closes, focus trap, Esc closes, `aria-modal`. Supports `snapPoints` (collapsed/expanded) for the «Про картину» sheet.
- Do not render the iOS status bar, home indicator or keyboard from Figma — they are device chrome. Use safe-area insets instead.
- Map Pin and Map must work in SVG coordinate space (Stage 4 animates them).
- Add every component to `/dev/tokens` with all variants.

## Format
Plan → implement → lint/type/build → summary with a component → Figma node table.
```

---

## Stage 3 — Onboarding (01, 01б UI, 02, 03, 04)

```
## Role
Senior frontend engineer with Figma MCP.

## Task
Build onboarding screens with real behavior and transitions.

## Context
Spec: `docs/app-spec.md` section 1 and «Перехід вперед» in section 8.
Figma: 01 Вітання `125:6173`, 01б Вхід `125:6290`, 02 Як це працює `62:57`, 03 Імʼя `62:102`, 04 Місто `62:130`.

## Constraints
- Create an app state provider (`web/src/state/`) persisted to localStorage: name, nameVocative, startCityId, rhythm, completedPaths, currentPath, openedArtworkIds, seenTour, onboardingDone. Version the storage key.
- Ukrainian vocative for the name (Анна → Анно, Олег → Олеже, Марія → Маріє …): implement a small rule-based function with tests for common names; fall back to the nominative when unsure.
- 01: staggered text reveal (spec). «Почати» → 02, «Уже маю акаунт · Увійти» → 01б.
- 01б: build the UI now; buttons call auth functions that are stubs until Stage 9 (show a «скоро» toast in dev only).
- 02: cards stagger 80ms.
- 03: autofocus, «Далі» enabled with ≥1 non-space char, Enter submits.
- 04: search over `cities.ts` (case/apostrophe-insensitive, «ʼ» = «'»), suggestions fade 150ms, selected row gets a check, keyboard navigation with arrows. No geolocation.
- Forward transition: new screen slides from the right, previous moves 30% left and darkens (300ms ease-out). Use a shared transition wrapper.
- After 04 → go to the journey route (Stage 4 placeholder page is fine).
- If onboarding is done, `/` redirects to Home (placeholder until Stage 11).

## Format
Plan → implement → lint/type/build → summary + manual test steps on a phone.
```

---

## Stage 4 — Journey: building path, map, flight, zoom, museum facade (E1, 07, 9, 11)

```
## Role
Senior frontend / motion engineer with Figma MCP.

## Task
Implement the cinematic journey from the user's city to the museum door.

## Context
Spec: `docs/app-spec.md` section 2 and section 8 rows «Пульс мітки», «Дуга шляху», «Переліт», «Зум до міста», «Вхід у двері».
Figma: E1 `127:9603`, 07 `87:1359`, 9 `87:1430`, 11 `87:3585`. Map: `public/map/map.svg`.

## Constraints
- Map: render the SVG inside a «camera» wrapper (`motion.div` with x/y/scale). Write `projectToMap(lat, lng)` by calibrating against at least 3 city pins whose positions you read from the Figma frames; document the calibration.
- Occupied city (Melitopol, `museum.occupied = true`): the map, arc and Home card show NO occupation label. Only on screen 9, after the zoom into Melitopol finishes, show a short calm note «Мелітополь — місто під окупацією» (fade in 300ms, stays ~2.5s before the facade, `text/secondary`). Copy TODO(confirm).
- Path data from `journey.ts` + start city. Distance «≈ N км» = rounded haversine. Copy «У … N творів чекають на тебе» uses the museum's artwork count.
- E1: show only if data takes > 400ms (simulate the server pick with a small async function; keep it replaceable by a Supabase call later). Pulsing pin 1.6s loop.
- 07 sequence: map fade-in 600ms → start pin spring → arc draws (stroke-dashoffset 1.2s) → target pin with pulsing gold ring → sheet slides up 300ms. Greeting uses the vocative name.
- «Летимо»: sheet hides 250ms → gold dot travels along the arc 1.6s with the camera following and a light trail → zoom to the region ×4 1.2s, far city labels fade out, museum pin drops in with spring (screen 9).
- Decision: after the zoom the museum facade (11) opens automatically after 600ms; tapping the museum pin skips the wait.
- 11: facade crossfades in from the map (500ms) and slowly scales 1.05→1 (2s). Pulsing ring on the door, card slides up. Tap on the door or «Зайти всередину» → card hides, camera scales ×1.3 centered on the door (600ms ease-in) and fades to black → hall route.
- Route trail at the top («Нагадування шляху»: місто → музей → зала) shows the current step.
- Door hotspot position per museum lives in `museums.ts` (`doorX`, `doorY` in %, TODO values for non-Kherson facades).
- Reduced motion: all of the above become crossfades.
- No back navigation inside the journey; block browser back with a confirm-less redirect to the current step.

## Format
Plan → implement → lint/type/build → summary + list of values to fine-tune on a real phone.
```

---

## Stage 5 — Hall, touch zones, AI-guide tour, calibration tool (12, 12б, 13–15)

```
## Role
Senior frontend / motion engineer with Figma MCP.

## Task
Implement the museum hall, the hidden-artwork sheet, touch zones and the 4-stop guide tour for every artwork, plus a dev tool to set stop coordinates.

## Context
Spec: `docs/app-spec.md` section 3 and section 8 rows «Світло в залі», «Твір на весь екран», «Лінза», «Кільце-таймер», «Пауза ↔ Відтворити», «Вихід із туру».
Content: `tourStops` and `touchZones` per artwork in `web/src/data/content.json`.
Figma: hall 12 `92:4217`, hall panorama Kherson `156:15129`, 12б `125:6530`, tour 13 `100:1655`, 14 `97:4692`, 15 `97:4745`, 15(4) `97:4788`.

## Constraints
Hall (12):
- Horizontal scroll with snap to the center of each frame; opens centered on the artwork opened in this path. Background = the museum hall image.
- Hall order = `museum.artworkIds`. Each frame: artwork image (lit) or a dark frame (covered), title, «автор · рік» (`text/caption`), Status Badge.
- Enter animation from black: spotlights fade in one by one (300ms, 120ms step), the opened artwork lights last and brightest, then the hint «Торкнись картини, щоб почати тур».
- Tap opened artwork → tour. Tap covered frame → 12б: frame shakes ±4px 300ms, sheet with copy from the spec; the era line («Твір XVII століття») comes from data (TODO if missing).

Tour (13–15):
- Shared element: artwork grows from its frame to full width (500ms), hall darkens.
- Each stop: camera moves to (x, y, zoom) 900ms ease-in-out, rest of the image dims slightly, lens ring shows the detail, title + text crossfade 250ms. Progress = 4 segments.
- Text-only for now: ring timer duration = `max(6s, words × 0.45s)`; when full, auto-advance. Keep an `AudioSource` interface so OpenAI TTS can be plugged in later without UI changes.
- Controls: «Без гіда» (exit tour), Pause (ring stops, icon morphs to Play 200ms), «Далі» (fly detail→detail without zooming out).
- After stop 4 or «Без гіда»: zoom out to the full image 700ms, then the «Про картину» sheet (Stage 6 placeholder).
- Touch zones: when the tour is paused or finished and the full image is shown, tapping any area zooms to that zone of the grid (3×3, or 3×2 where the passport says so) and shows the zone title + one sentence in the bottom sheet. Tap again / «×» zooms out.
- Image loading: skeleton with shimmer (E5 `127:9680`) then fade in 400ms.
- If a stop has `x/y/zoom = null`, fall back to the center of its `locationHint` grid cell so the tour still works.

Calibration tool (dev only, `/dev/calibrate`):
- Pick an artwork, see its 4 stops. Tap on the image to set x/y (0–1 normalized), slider for zoom (1–5), live preview of the lens.
- «Copy JSON» copies all stops for that artwork. Also a «Copy all» that outputs a ready patch for `artworks.ts`.
- Hide the route in production builds.

## Format
Plan → implement → lint/type/build → summary + how to use the calibration tool.
```

---

## Stage 6 — «Про картину» sheet and wallpapers (16, 16б–16д, 21, 21б)

```
## Role
Senior frontend engineer with Figma MCP.

## Task
Implement the artwork sheet with tabs and the wallpaper flow.

## Context
Spec: `docs/app-spec.md` section 4 («Про картину», «Шпалери») and section 8 («Шторка», «Вкладки»).
Figma: 16 `104:1701`, 16 with detail card `125:6841`, 16б `107:1712`, 16в `107:1777`, 16г `107:1840`, 16д `107:1906`, 21 `127:9384`, 21б `127:9408`.

## Constraints
- Sheet appears with spring ~350ms, artwork above it shrinks to the top. Header: title, «автор · рік», Status Badge + status meta.
- Tabs Історія / Про твір / Автор / Джерела: underline slides 200ms, content crossfade 150ms. Content from data, verbatim.
- Decision: the sheet expands to full height by swiping the handle up OR by scrolling the text; the artwork collapses to a thumbnail (spring).
- Джерела tab: Source Rows from `sources[]`, each a real external link (`target="_blank" rel="noopener noreferrer"`), date shown. Photo credit row. «Повідомити про помилку» opens `mailto:` (TODO address).
- «Підказка · тапни»: tapping the artwork opens the touch-zone detail card (`125:6841`) with «Спитати гіда про це» → chat with that detail attached (Stage 7).
- Pinned actions: «Шпалери» → 21, «Спитати гіда» → 20, ▶ (header) → replay tour.
- Decision for 16 → 17: add a primary button «Завершити шлях» at the end of the sheet content AND show it in the pinned area after the user has seen at least one tab or 5 seconds have passed. It marks the path complete and goes to the Final (Stage 8).
- When opened from Collection (not inside a path), hide «Завершити шлях».
- Wallpapers 21: lock-screen preview with OS clock/date zone, caption + mandatory photo credit. Toggle «Уся картина / Деталь»: «Уся картина» uses `public/wallpapers/<slug>.png`; «Деталь» renders client-side on a canvas (780×1688) from the artwork image cropped to tour stop 1, with the same caption layout. Preview crossfade 250ms.
- «Зберегти на телефон»: use the Web Share API with a File when supported (iOS → «Зберегти зображення»), else download. Then 21б: check badge spring 0.6→1, steps how to set the lock screen.

## Format
Plan → implement → lint/type/build → summary.
```

---

## Stage 7 — AI guide chat with OpenAI (20, 20б, 20в, E3)

```
## Role
Senior full-stack engineer (Next.js + LLM integration).

## Task
Implement the per-artwork guide chat with streaming answers, verified source chips, suggestions and offline fallbacks.

## Context
Spec: `docs/app-spec.md` section 4 «Гід» and E3 in section 7. Rules for the AI chat: `chatRules` in `data/artworks.json` + each artwork's `chat` block (defaultQuestions, knowledgeBase with sourceIds, aiNotes).
Figma: 20 `127:9306`, 20б `127:9336`, 20в `127:9359`, E3 `127:9627`.
Env: `OPENAI_API_KEY`, `OPENAI_MODEL` (configurable, do not hardcode a model name in code).

## Constraints
Server (`app/api/guide/route.ts`, Node runtime):
- Input: artworkId, messages (last 10), optional detail { zoneOrStopTitle }, userName (vocative).
- System prompt built from: the global chat rules (verbatim), the artwork passport (history, about, author, tour, zones, aiNotes, openQuestions) and the knowledge base table with `sourceId`s. Nothing else. No web search.
- Ask the model to return the answer text plus `sourceIds` (array, may be empty) and `followUps` (2 short questions). Use the official `openai` SDK with streaming; stream the text to the client, send metadata at the end.
- Validate `sourceIds` against the artwork's `sources[]`; drop unknown ids. Chips show the source label + date and link to the real URL.
- Hard rules enforced in code too: answers in Ukrainian; if the text mentions a storage location for sheltered works, replace the answer with the safe refusal from the rules.
- Rate limit per IP (simple in-memory token bucket is fine for the demo) and max input length.

Client:
- 20: header «Гід · <назва> · <автор>», greeting with vocative name, default questions from the passport (staggered), composer.
- User message slides in from bottom-right 200ms; typing dots while waiting; streamed text; source chip fades in after the stream ends; new follow-up chips.
- 20в: when opened from a detail, show the attached detail pill above the user's message.
- E3: on network/API error or 15s timeout, the typing dots crossfade into the «Гід зараз не відповідає» card with «Спробувати ще раз»; default questions stay usable.
- Fallbacks: create `web/src/data/fallback-answers.ts` with an answer for every default question of every artwork, built ONLY from sentences in that artwork's passport, each with `sourceIds` and `reviewed: false`. Use them when offline/API fails. Print the list so Anna can review them.
- Keep chat history per artwork in local state (and Supabase after Stage 9).

## Format
Plan → implement → lint/type/build → summary + 5 test questions per one artwork (including a trap question about where an evacuated work is stored).
```

---

## Stage 8 — Final and constellation (17)

```
## Role
Senior frontend / motion engineer with Figma MCP.

## Task
Implement the path final with the star lighting moment and the growing constellation.

## Context
Spec: `docs/app-spec.md` section 5 «Фінал» and section 8 «Засвічування зірки», «Лічильники». Figma: 17 `125:6931`.

## Constraints
- On «Завершити шлях»: mark path complete, add the artwork to opened, compute counters (works in light, museums visited, cities on map).
- Sequence: map zooms out to country scale 800ms → city dot becomes a star (scale 0→1.2→1 spring + one glow burst 600ms) → subtle twinkle → counters count up (400ms, 100ms step) → «Наступний шлях» card + button slide up.
- Constellation: previous stars stay; the new star connects to the previous one with a thin line (draws in). Same city visited twice = same star, slightly brighter.
- «Наступний шлях» card uses `journey.ts`.
- CTA: if not logged in → «Зберегти моє сузір’я» + hint → login sheet (Stage 9). If logged in → «На головну» → Home.
- Reusable `<Constellation />` component for Home and Profile.

## Format
Plan → implement → lint/type/build → summary.
```

---

## Stage 9 — Real auth with Supabase: Google + email code (18, 18б, 18в, E4, 01б)

```
## Role
Senior full-stack engineer (Next.js + Supabase).

## Task
Add passwordless auth (Google OAuth and 6-digit email code) and sync anonymous progress to the account.

## Context
Spec: `docs/app-spec.md` sections 1 (01б) and 5 (18, email code, E4).
Figma: 18 sheet `126:2883`, 18б `125:7027`, 18в `125:7039`, E4 `127:9654`, 01б `125:6290`.
Env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server only). Google provider and email OTP are configured in the Supabase dashboard.

## Constraints
- Use `@supabase/ssr` for the App Router (server + browser clients, middleware session refresh).
- Google: `signInWithOAuth` with redirect back to `/auth/callback`, then continue where the user was (final → rhythm 18г; 01б → Home).
- Email: `signInWithOtp` (no magic-link redirect; the email template sends `{{ .Token }}`), then `verifyOtp` with type `email`. 6 separate digit inputs backed by one `inputMode="numeric" autoComplete="one-time-code"` field, paste support, auto-submit at 6 digits. Resend timer 0:30. «Змінити пошту». E4: shake ±6px + error copy.
- DB (SQL migration in `supabase/migrations/`): `profiles` (id, name, name_vocative, start_city_id, rhythm, reminder_time, timezone), `progress` (user_id, completed_paths, opened_artwork_ids, updated_at), `chat_messages` (user_id, artwork_id, role, content, source_ids, created_at), `push_subscriptions` (Stage 10). RLS: users access only their rows.
- On first login: merge localStorage state into Supabase (union of opened artworks, max of completed paths), then the DB is the source of truth; keep localStorage as cache.
- On login from 01б with existing data: load it and go to Home.
- Decision: if the user closes the login sheet, the next path still opens; Profile shows «Увійди, щоб зберегти сузір’я».
- Google sign-in error state: inline message on the sheet (copy TODO, not in Figma yet).

## Format
Plan → implement → lint/type/build → summary + a checklist of Supabase dashboard settings Anna must verify.
```

---

## Stage 10 — Rhythm and real web push (18г, 18д)

```
## Role
Senior full-stack engineer (PWA, Service Worker, Web Push).

## Task
Implement rhythm selection, notification permission and real push reminders for the installed PWA.

## Context
Spec: `docs/app-spec.md` section 5 «Ритм», «Дозвіл на сповіщення».
Figma: 18г `129:2923`, 18г без нагадувань `129:2966`, 18д `125:7081`.
Env: `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (mailto:), `CRON_SECRET`.

## Constraints
- 18г: options Щодня / Тричі на тиждень (пн, ср, пт) / Без нагадувань; time pills 09:00 / 13:00 / 20:00 / «Інший» (native time input in a sheet). Selected card: gold border + tinted bg 150ms; time block collapses for «Без нагадувань» (200ms) and «Далі» goes straight to Home.
- Store rhythm + reminder time + the user's IANA timezone in `profiles`.
- 18д: preview notification drops in (spring). «Дозволити» → `Notification.requestPermission()` → `pushManager.subscribe` → save subscription → Home. «Пізніше» → Home. Denied → Home + Profile shows how to enable (copy TODO).
- iOS: push only works when the app is installed to the Home Screen (iOS 16.4+). If not standalone on iOS, show a short «Додай на головний екран» instruction instead of the system prompt.
- Service worker (`public/sw.js`, registered on load): `push` → show notification «<Ім’я>, сьогодні шлях веде до <місто>» with icon; `notificationclick` → open/focus `/`.
- Sending: `app/api/push/send-due/route.ts` protected by `CRON_SECRET`, finds users whose local time matches their reminder hour/day and sends with the `web-push` package; removes expired subscriptions (404/410).
- Scheduling: hourly trigger. Provide both options and implement the first:
  1) Supabase Cron (pg_cron + pg_net) calling the endpoint every hour — SQL in a migration.
  2) Vercel Cron in `vercel.json` (note: on the Hobby plan it runs at most once a day).
- Add «Надіслати тестове сповіщення» in Profile (works only if subscribed) for the jury demo.
- Jury mode: rhythm «Без нагадувань» must not lock paths — the next path is always available immediately (see Stage 11).

## Format
Plan → implement → lint/type/build → summary + how to test push on an iPhone step by step.
```

---

## Stage 11 — Return visit: Home, tab bar, Collection, museum pages, Profile (19, 19б, 23б, 25, 25б, 25в, 24)

```
## Role
Senior frontend engineer with Figma MCP.

## Task
Implement the returning-user app: Home with today's path, Collection, museum pages and Profile with editing.

## Context
Spec: `docs/app-spec.md` section 6 and section 8 («Таб-бар», «Push / pop», «Фільтр сітки»).
Figma: 19 `116:2265`, 19б `127:9126`, 23б Колекція `145:3845`, 25 `145:3961`, 25б `145:4059`, 25в `145:4115`, 24 Профіль `127:9557`.

## Constraints
- Tab bar (Карта · Колекція · Профіль): floating, 16px insets, `bg/surface`, gradient under it; active highlight slides (spring 250ms), icon turns gold; tab content crossfade 150ms.
- Home 19: greeting by time of day + name, three stat cards (count up only if changed since last visit), constellation map, today's arc drawing, card «СЬОГОДНІ · Шлях до <місто> · ≈ N км» (no occupation note here — it appears only on the zoom screen, see Stage 4), «Летимо» runs the same journey as Stage 4.
- Path availability: with a reminder rhythm, one path per day (local date). With «Без нагадувань», the next path is available immediately after finishing the previous one (jury mode). 19б shows when today's path is done: dashed arc, no button, «Завтра о <час>».
- Collection 23б: search «Музей або місто» filters live with layout animation 200ms; grouped by region; Museum Card statuses «k/n відкрито» / «Наступний шлях» / «Ще попереду». Empty search state (copy TODO).
- Museum page 25/25б/25в: push from the right 300ms with the facade as a shared element; swipe from left edge / «‹ Колекція» pops. Passed: status chips «Усі / Викрадені / В укритті / Врятовані» with counts, 2-column grid. Tap on an opened artwork → the artwork opens full-screen in AI-guide explore mode (touch zones from Stage 5: tap any area → zoom + title + one sentence), with ▶ to replay the 4-stop tour, «Спитати гіда» → chat and «Про картину» → sheet (no «Завершити шлях»). Covered → 12б-style sheet. Next: info card + «До шляху» → Карта tab. Ahead: dimmed facade, no button.
- Profile 24: name, stats, rows Акаунт · Ім’я · Місто старту · Ритм · Про проєкт · Джерела і права на фото · Вийти · Видалити акаунт і дані (confirm sheet, deletes Supabase rows + signs out + clears local). Editing reuses screens 03, 04, 18г in «edit» mode (save → back to Profile).
- Melitopol (occupied city): same screens; the occupation note is NOT shown on the map, Home card or Collection card (only on the journey zoom screen, Stage 4). The museum page may mention it in the description if the docs do.

## Format
Plan → implement → lint/type/build → summary.
```

---

## Stage 12 — Offline, states, QA and deploy (E2, E5, final pass)

```
## Role
Senior frontend engineer and QA-minded design engineer.

## Task
Make the app robust for the live demo: offline behavior, remaining states, performance and deployment.

## Context
Spec: `docs/app-spec.md` section 7. Figma: E2 `127:9615`, E5 `127:9680`.

## Constraints
- E2: detect offline; when a path needs the network show E2 with «Спробувати ще раз» (spinner on the button) and «Мої твори» (opened works from cache).
- Service worker caching: app shell, fonts, map SVG, and images of opened artworks (cache-first); API calls network-first.
- Chat offline → fallback answers from Stage 7 with a small «офлайн-відповідь» label.
- Performance: `next/image` with proper `sizes`, preload the next path's facade and hall during the flight, keep JS for heavy screens dynamically imported. Target Lighthouse mobile performance ≥ 80 on Home.
- Accessibility pass: focus order in sheets, labels on icon buttons, contrast of `text/secondary` on surfaces, reduced motion end-to-end.
- Full manual run on a 390px viewport and a real iPhone: onboarding → 3 full paths → login (Google and email) → rhythm → push test → collection → profile edit → delete account.
- Deploy to Vercel with root directory `web/`; list every env var needed; update the Supabase auth redirect URLs and Google OAuth origins for the production domain.

## Format
Plan → fixes → lint/type/build → final report: what works, known issues ranked by demo risk, env var checklist.
```

---

## Follow-up prompt template (when something breaks)

```
## Review
Stage <N> result: <what is wrong, which screen/Figma node, what you expected>.

## Iterate
Find the root cause and fix it with the smallest safe change.

## Specify
- Do not rewrite the component. Inspect the current implementation first.
- Compare with Figma node <id> only for the affected area.
- Keep motion values from `web/src/lib/motion.ts`.

## Maintain
Do not change other screens, data files, routing or state shape. Run lint/type/build. Summarize the cause, the fix and how to verify.
```
