# QA report — MVP v2 stages 1–6 (autonomous call run)

Date: 2026-11-18. Build: `npm run build` clean in `web/`. Preview historically on `localhost:3010`. Screenshots under `docs/verify/`.

## Per stage

| Stage | Status | Notes |
|---|---|---|
| 1 — Guide honesty + wallpaper + 02в labels | **done** | No «офлайн-відповідь» in UI; speculation retry; wallpaper composes Figma `236:1720` (no hall/lamp/badge); map labels 6px gap + flip. Honesty fallback for price/symbolism tightened (no accidental plot dump). |
| 2 — Paths 2–5 walk + fix | **done** | Melitopol / Kharkiv / Lviv / Chernihiv halls verified (`docs/verify/qa-s2-*.png`). Stolen blur bumped; guide rate limit raised for demo walks. |
| 3 — Detail points artworks 2–10 | **done** | Every zone has `x`,`y` (0–1). Tour-stop match when titles align; else grid center `// TODO(calibrate)` — see coordinate table below. |
| 4 — Kherson paths 6–10 + end sheet | **done** | Same-museum scroll 600ms; multi-lamp (active full / opened dim); opened neighbor → passport 16; unopened → «Відкриється наступним шляхом»; end sheet «Шлях пройдено» + confirm → `/reset`. Order: 6 Колядки → 7 Вид Одеси → 8 Дама → 9 Околиці → 10 Капуцин. |
| 5 — Deploy readiness | **done** | Build clean. Env: `OPENAI_API_KEY`, `OPENAI_MODEL` only. Root Directory = `web`. Dropped ~13MB wallpaper PNGs + unused `tour-frame-1.png`; wallpaper field → art webp; screen 11 composes export. |
| 6 — Full QA + this report | **partial** | API guide Q&A for 3/8/10 verified live. Full Playwright UI walk blocked this session (Chromium sandbox). Paths 1–5 hall screenshots exist; 6–10 + end sheet need manual click-through. |

## Files changed (this call batch)

- Stage 1 (prior commit `380ad39`): guide prompt/route, WallpaperScreen, map-label, GuideScreen
- Stage 2 (`20da2b5`): `HallExperience` blur, guide rate limit, `docs/verify/qa-s2-*.png`
- Stage 3 (`53654a5`): `data/artworks.json`, `web/src/data/content.json` zone `x`,`y`
- Stage 4 (`8b832dd` + follow-ups): `HallExperience` lamps/neighbor passport, `RouteMapScreen` end CTA, `journey.ts` `ALL_DONE_COPY`, `JourneyRouteMap` always shows 02в end sheet
- Stage 5: remove `public/wallpapers/*.png`, `hall/tour-frame-1.png`; asset-map/content wallpaper→webp; `prepare-assets.mjs`; `.env.example`; saved-status trap + honesty fallback
- Stage 6: this report

No new npm dependencies. `.env*` not committed. Untracked PDF / Rules md left out.

## Decisions made for you

1. **Reopened passport «×»** → back to current-path hall (not 02в). Path passport «×» still → 02в.
2. **End-sheet copy** from your brief + `// TODO(copy confirm)`.
3. **«Почати знову»** → confirm («Так, почати знову») → `/reset`.
4. **Opened neighbor** → passport of that artwork; wallpaper replay does not advance path.
5. **Wallpaper assets** → do not ship multi-MB PNGs; compose from art webp at runtime.
6. **Saved trap** → «Твір врятовано…» (not «в укритті»).

## Tour / detail coordinate notes

No tour-stop `x`,`y` retunes this run (stops already present). Detail zones for 2–10 added:

| Art | Source mix | Notes |
|---|---|---|
| 2 Колядки | stop + grid | cupola/trees/hut/footprints = grid TODO |
| 3 Скіфське золото | stop + grid | side protrusions = grid TODO |
| 4 Вид Одеси | stop + grid | clouds/sea/waves = grid TODO |
| 5 Дама | stop + grid | hair/earring/hands = grid TODO; намисто → pearls stop |
| 6 Околиці | stop + grid | river/slope hand-fixed |
| 7 Капуцин | stop + grid | finial/gloves/robe = grid TODO |
| 8 Запорожці | stop + hand | spears/kobza hand-fixed (bad fuzzy) |
| 9 Іконостас | stop + grid | tiers mostly grid TODO |
| 10 Козак | stop + hand | face hand-fixed |

Full values live in `data/artworks.json` / `web/src/data/content.json`.

## Paths 1–10 one-line status

1. Херсон / Великодня — **ok** (prior verified)
2. Мелітополь / Скіфське золото — **ok** (stolen blur/hall; trap no place)
3. Харків / Запорожці — **ok** (shelter; trap «укритті»)
4. Львів / Іконостас — **ok** (shelter; wide frame)
5. Чернігів / Козак-бандурист — **ok** (saved; no «викрадений»)
6. Херсон / Колядки — **code done** — needs manual scroll/blur check
7. Херсон / Вид Одеси — **code done** — needs manual
8. Херсон / Дама з собакою — **code done** — needs manual
9. Херсон / Околиці Києва — **code done** — needs manual
10. Херсон / Капуцин → end sheet — **code done** — needs manual «Шлях пройдено» + restart

## Guide Q&A (live API, artworks 3 / 8 / 10)

### Artwork 3 — Скіфське золото (stolen)

1. **Як знайшли скіфське золото Мелітополя?** — curated: 1954 курган, ~2 кг, лишили в Україні. Sources `s6`.
2. **Як золото ховали…?** — curated: сховали; під дулом; видали колаборанти. Sources `s1`,`s2`.
3. **Де зараз ця картина?** — fallback trap: «Окупанти вивезли… Точне місце зараз невідоме.» (no invented place).

### Artwork 8 — Запорожці (shelter)

1. **Чим харківський варіант…?** — curated: живіший; Кубань. `s1`.
2. **Що написали козаки…?** — curated: зухвала відповідь; текст не цитую. `s6`.
3. **Де зараз?** — «Твір в укритті. Точне місце… не називаю.»

### Artwork 10 — Козак-бандурист (saved)

1. **Хто така Марина Гриценко?** — curated: зберігачка; порятунок; Europa Nostra. `s1`,`s2`,`s4`.
2. **Як врятували колекцію…?** — curated: підвал; старий одяг; без втрат. `s1`,`s5`.
3. **Де зараз?** — after fix: «Твір врятовано…» (was incorrectly «укритті» — fixed in stage 5).

## Deploy (Vercel)

**Env vars (names only):**

- `OPENAI_API_KEY`
- `OPENAI_MODEL`

Without them the guide degrades to curated defaults + fallback bank (no crash).

**Build settings:** Root Directory = `web`. Framework: Next.js. No special install flags.

## Bugs not fixed / open

1. Detail zone grid placements marked TODO(calibrate) — tap targets may miss fine details.
2. Full UI walk paths 6–10 + end sheet not screenshot-verified this session (Playwright Chromium blocked).
3. Hall shelter vs saved light fine-tuning vs Figma still soft.
4. Melitopol empty-frame blur may still look soft on very tall vitrine — blur already raised to 18px.
5. End copy still `// TODO(copy confirm)`.

## Please check manually

- [ ] `/reset` → Київ → path 1 → … → path 10 → 02в «Шлях пройдено» → «Почати знову» → confirm → city picker
- [ ] Paths 6–10: hall scrolls, previous lamp dims, blur→reveal each stolen frame
- [ ] Opened frame in Kherson hall opens passport; unopened shows neighbor caption only
- [ ] Wallpaper 11: phone preview, no hall/lamp/badge; save PNG composition
- [ ] Detail taps on artworks 3, 8, 10 open the right card
- [ ] Guide: price/symbolism → «Про це в моїх джерелах даних немає» + passport offer
- [ ] Art 10 trap → «врятовано», never «укритті» / never «викрадений» in Chernihiv copy
- [ ] 390×667: city, map sheet, passport sheet usable
