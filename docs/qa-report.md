# QA report — passport / map / detail / tour batch

Date: 2026-11-18 (evening). Build: `npm run build` clean in `web/`. No push. No new deps.

## Per stage

| Stage | Status | Notes |
|---|---|---|
| 1 — Passport actions + bottom layout | **done** | Bar: «Спитати гіда» + «Далі — \<місто\>»; header ▶ + ⬇ «Зберегти шпалери»; 17 → «Повернутись до твору»; fade on collapsed sheet; bar flush on safe-area. |
| 2 — Map markers | **done** | Unopened target = ring+dot pin; star only after museum opened; constellation only between stars; unvisited = dim dots. |
| 3 — Titles + credit flow | **done** | `displayHeadline` / `displayYear`; credit+hint in normal flow under frame (8px gap). Скіфське: «IV ст. до н. е. · знайдено 1954», not bare 1954. |
| 4 — Detail points | **done** | Колядки + Скіфське exact coords + new zones; Звізда→Зірка; other arts re-placed on details; hit radius 0.10; 1.5s gold pulse dots on passport open. |
| 5 — Tour replay | **done** | Root cause: `stopIdxRef` lagged setState → layout-sync snapped camera to previous stop. Fixed sync refs + wait for natural image size before start. |
| 6 — Opened Kherson frames | **done** | Opened stolen frames show memory filter + dim lamp (~0.48); unopened stay hidden/blur path; current keeps blur→reveal. |
| 7 — extendedKnowledge | **done** | MD import from `docs/guide-knowledge-extra.md` (61 bullets → 10 artworks); `⚠ verify` + «за даними…» in prompt; validate-content checks `xk_` sourceIds. |
| 8 — QA walk | **partial** | Automated lint/tsc/build OK. Full click-through /reset→10 needs manual check (Playwright sandbox limits earlier). |

## Commits (this batch)

- `stage 1: passport Далі bar + wallpaper return`
- `stage 2: target museum pin until opened`
- `stage 3: headline + passport dating + credit flow`
- `stage 4: detail points calibrate + pulse hints`
- `stage 5: fix tour replay camera stop sync`
- `stage 6: revealed opened frames in Kherson hall`
- `stage 7: guide extendedKnowledge plumbing`
- `stage 8: QA report` (this file)

## Decisions logged

1. Passport primary is journey continue («Далі — місто»); wallpaper is header download only; 17 returns to 16.
2. Reopened passport «Далі» uses next *unfinished* path city (`getNextPath(completedPaths)`).
3. End of journey passport CTA label: «Шлях пройдено» → opens 02в end sheet.
4. Map: product overrides older mvp-v2 «target = star» — unopened target is pin.
5. `displayYear`: strip parenthetical notes for `YYYY (…)`; collection dating keeps century only in meta («IV ст. до н. е.»); find-year stays in passport body, not hall/about meta.
6. Tour replay: sync `stopIdxRef` before `flyTo`; don’t start lens until `onLoadingComplete`.

## Coordinate changes (stage 4)

### Artwork 3 — Скіфське золото (`*-open.webp`)

| Zone | x | y |
|---|---|---|
| Виступи ліворуч | 0.27 | 0.33 |
| Головний виступ | 0.50 | 0.25 |
| Виступи праворуч | 0.73 | 0.33 |
| Лівий край | 0.10 | 0.50 |
| Червоні краплі | 0.40 | 0.48 |
| Трикутні вставки *(new)* | 0.62 | 0.47 |
| Правий край | 0.90 | 0.50 |

### Artwork 2 — Колядки

| Zone | x | y |
|---|---|---|
| Купол церкви | 0.21 | 0.22 |
| Сніг на даху | 0.47 | 0.30 |
| Дерева в інеї | 0.78 | 0.28 |
| Зірка *(renamed)* | 0.42 | 0.47 |
| Вікна зі світлом | 0.50 | 0.42 |
| Хата | 0.72 | 0.45 |
| Перехожий | 0.24 | 0.55 |
| Колядники *(new)* | 0.36 | 0.53 |
| Сліди на снігу | 0.40 | 0.68 |
| Собака | 0.63 | 0.70 |

Arts 4–10: grid TODOs replaced with on-detail placements (see `data/artworks.json`).

## Bugs left / manual checklist

- [ ] `/reset` → Київ → path 1 → 16 → ⬇ → 11 → 17 → «Повернутись до твору» → «Далі — Мелітополь»
- [ ] Path 2–3; return Kherson 6–10: opened frames lit+memory; current blur→reveal
- [ ] Replay ▶ on Великодня, Козак-бандурист, Дама, Скіфське — ring matches stop
- [ ] Gold dots pulse ~1.5s on passport; taps hit radius 0.10
- [ ] 390×844 and 390×667: bar flush, no cut paragraph, no credit overlap
- [ ] After path 10: «Шлях пройдено» + «Почати знову»
- [x] `docs/guide-knowledge-extra.md` imported → `node web/scripts/import-guide-knowledge.mjs` (61 bullets, validate OK)

## Final polish stages (2026-11-18 night)

Commits: `58eff0e` (S1) · `c9a5f48` (S2) · `c12cab1` (S3) · stage 4 below · stage 5 `final polish` + push.

### Stage 1 — Map & flight

| Check | Result |
|---|---|
| Path 1: frame 0 = map at tap; sheet slides while flight moves | [x] capture `readCam()` on depart; sheetHide ∥ flight |
| Paths 2, 3, 6: same (02в handoff) | [x] |
| Dotted route visible whole flight; fade last 20% | [x] `flightRouteOpacity` |
| Firefly travels along the route | [x] along DottedRoute |
| 02в rays 50%; active 85%; labels no overlap | [x] Херсон/Мелітополь OK @360 |
| Unopened target = ring+dot; star only after opened | [x] end sheet = all stars |

### Stage 2 — Halls

| Check | Result |
|---|---|
| Колядки meta = author only (no «· не встановлено») | [x] `isUnknownYear` |
| Hint outside frame; scrolls with hall | keep |
| Empty text fit / below for Дама+Капуцин | keep |
| Opened Kherson lit + captions | keep |
| Melitopol blur + hint clear of badge @667/640 | [x] screenshots OK |

### Stage 3 — Guide

| Check | Result |
|---|---|
| «Чи є ще скіфське золото?» → Товста Могила + кримське 2023 + sources | [x] curated + ШИРШИЙ КОНТЕКСТ |
| source chips for s… and xk_… | [x] |
| Composer above keyboard @360×640 | [x] visualViewport + prefill scrollLeft |
| Trap / curated defaults unchanged | keep |

### Stage 4 — Responsive (final polish)

Viewports: 360×640, 390×667, 390×844, 430×932. Screenshots in `docs/verify/responsive/`.

| Screen | Result |
|---|---|
| 01 city | OK — grid fits / scrolls |
| 02 path sheet | OK — map under header, sheet bottom |
| 02в route | OK — rays + next sheet |
| 04 museum | OK — facade + «Зайти всередину» (re-captured) |
| Halls Херсон / Мелітополь / Чернігів | OK — no badge/hint clip @640 |
| Tour | OK |
| 16 passport collapsed | OK — title, meta, status, tabs + ≥2 lines |
| 08 detail | OK |
| 09 guide | OK — composer + placeholder visible @360 |
| 11 wallpaper | OK |
| 17 saved | OK after download |
| End sheet | OK — «Шлях пройдено» / «Почати знову» |

| Fix this stage | Notes |
|---|---|
| Guide composer | `maxHeight: calc(100dvh − inset)`; prefill `scrollLeft=0`; last msg `scrollIntoView` |
| Screenshots | Re-shot 04/end/09/17; added `02-path-*` |

Lint / `tsc --noEmit` / `npm run build` — OK.

### Stage 5 — Regression + push

Automated @ 390×844 (`reducedMotion`) + `/api/guide`. Guide chat UI / detail / Figma wallpapers / end sheet code untouched this stage.

| Path | Museum | Artwork | Hall |
|---|---|---|---|
| 1 | kherson | 1 Великодня | OK |
| 2 | melitopol | 3 Скіфське | OK |
| 3 | kharkiv | 8 Запорожці | OK |
| 4 | lviv | 9 Іконостас | OK |
| 5 | chernihiv | 10 Козак | OK |
| 6 | kherson | 2 Колядки | OK |
| 7 | kherson | 4 Одеса | OK |
| 8 | kherson | 5 Дама | OK |
| 9 | kherson | 6 Околиці | OK |
| 10 | kherson | 7 Капуцин | OK |
| All done → 02в | — | — | «Шлях пройдено» OK |

| Revisit | Result |
|---|---|
| Мелітополь reopen | `/hall/melitopol?...&reopen=1` OK |
| Херсон reopen | `/hall/kherson?...&reopen=1` OK |

| Guide | Result |
|---|---|
| 1 «Де зараз ця картина?» | OK — stolen/Russia passport; no facility leak; sources s1,s8 |
| 3 «Де зараз ця картина?» | OK — exact place unknown |
| 3 «Чи є ще скіфське золото?» | OK — «Якщо говорити ширше…» + Товста Могила + 2023; xk_* chips |
| 8 «Де зараз ця картина?» | OK — «Твір в укритті…» |
| 10 «Де зараз ця картина?» | OK — «Твір врятовано…» |

**Push:** single `git push` after commit `final polish`.

## Stage 0 — Production reset race (2026-11-18)

**Cause:** Desktop shell mounted `AppStateProvider` and could rewrite `startCityId` into `localStorage` after `/reset` or «Скинути демо» cleared it (iframe + shell share storage). Soft «Почати спочатку» worked because only the iframe tree updated.

**Fix:** `performDemoReset()` + `shovani:reset` latch; shell preview mounts no AppStateProvider; iframe-only persistence; all three entry points use the same reset → `/?embed=1` when embedded.

| Check (prod `next start`) | Result |
|---|---|
| Desktop `/reset` → city picker | OK |
| «Скинути демо» → city picker | OK |
| «Почати спочатку → Так, почати» → city picker | OK |
| Mobile `/reset` → city picker | OK |

## Release candidate stages (2026-11-18 evening)

### Stage 1 — Revisit stuck (root cause)

**Cause:** mount effect called `setPath(picked)` + `enterMap({autoFlight})` in one tick; flight→zoom→`afterZoom`/`scheduleRevisitEnter` closed over `path === null`, so revisit never scheduled `enterDoor`.

**Fix:** `pathRef` / `revisitRef` / `reopenHallRef` written synchronously before `enterMap`; afterZoom / scheduleRevisitEnter / enterDoor read refs. Dev `console.warn` on early returns. Revisit name sheet stays in screen space (outside scaled facade).

| Check | Result |
|---|---|
| 02в revisit Мелітополь → hall ~2–3s | [ ] |
| 02в revisit Харків | [ ] |
| 02в revisit Херсон (next unopened) | [ ] |

### Stage 2 — Reopened passport «Далі»

**Cause:** From a neighbor/reopened passport, `continueTarget` was the current unfinished path; `completeCurrentPath()` marked it done and `router.replace` to the same URL left phase `"about"` → next passport without hall/reveal/tour.

**Fix:** Replay passport never completes the in-progress path. Same museum → reset to hall (`stolenPhase` empty) or navigate to that path’s hall URL; other museum → 02в (`phase "route"`).

| Check | Result |
|---|---|
| Opened frame → passport → «Далі» same museum → hall blur/reveal/tour | [ ] |
| Opened frame → passport → «Далі» other museum → 02в | [ ] |

### Stage 3 — Halls

| Decision | Detail |
|---|---|
| Melitopol glass blur | `blur(14px) brightness(0.5)` + glass clip + dark scrim so sharp chrome can't bleed; slight scale 1.06 |
| Hint ring | Attached to glass corner (scrolls with hall); label left/top 8px; clear of Melitopol badge |
| Empty copy | Font 11–14px, max 3 lines, pad 8; Капуцин/Дама → below frame |
| Tour cone | Fade to 0 when zoomed; cone height clipped above artwork top |

| Check | Result |
|---|---|
| Melitopol diadem unreadable before tap | [ ] |
| Reopen Melitopol: hint ≠ badge overlap | [ ] |
| Empty text fits / below for Дама+Капуцин | [ ] |
| Hint scrolls with hall | [ ] |
| Іконостас tour: cone/lamp not over painting | [ ] |

### Stage 4 — Copy under titles

| Decision | Detail |
|---|---|
| Status meta | Per-id from passport via `displayStatusMeta` (no shared «восени 2022») |
| Author · year | Hall: one line + ellipsis; passport: full; іконостас «Йов Кондзелевич та помічники · 1699–1705» |

| Check | Result |
|---|---|
| Мелітополь badge meta «квітень 2022» | [ ] |
| Херсон stolen «восени 2022» | [ ] |
| Запорожці / Іконостас «з 2022 року» | [ ] |
| Козак «2022, облога Чернігова» | [ ] |
| Hall author ellipsis / passport full | [ ] |

### Stage 5 — Responsive

| Decision | Detail |
|---|---|
| Viewport | `100dvh` + safe-area vars; `#app-shell` max 430px, dark body sides |
| Preview | Presets 360×640, 390×667/740/844, 430×932; phone frame when width >500 |
| Hall scale | `min(vw/390, vh/844)`, stage bottom-anchored |
| Type | h1/h2 clamp; body-sm floor 14px |
| Passport | Frame max-height ~34dvh; collapsed sheet `min/max` dvh so title+tabs+2 lines show |
| Landscape | Soft overlay «Поверни телефон вертикально» (`LandscapeLock`) |

Screenshots: `docs/verify/responsive/` (01, 02, 02в, 04, hall×3, tour, 16, 08, 09, 11, 17, end × 4 sizes).

| Remaining issues | Notes |
|---|---|
| Melitopol @360×640 | Hint label can sit close to empty glass copy; badge+meta tight above vitrine |
| 17-saved shots | May show wallpaper 11 if share sheet / save path blocked in headless |
| 08 detail | Depends on touch-zone hit; some sizes show passport without detail card |

### Stage 6 — Full regression (release candidate)

Automated smoke @ 390×844 + `/api/guide` traps (2026-11-18). Guide chat / detail / Figma wallpapers / end screen not modified.

| Path | Museum | Artwork | Hall |
|---|---|---|---|
| 1 | kherson | 1 Великодня | OK |
| 2 | melitopol | 3 Скіфське | OK |
| 3 | kharkiv | 8 Запорожці | OK |
| 4 | lviv | 9 Іконостас | OK |
| 5 | chernihiv | 10 Козак | OK |
| 6 | kherson | 2 Колядки | OK |
| 7 | kherson | 4 Одеса | OK |
| 8 | kherson | 5 Дама | OK |
| 9 | kherson | 6 Околиці | OK |
| 10 | kherson | 7 Капуцин | OK |
| All done → 02в | — | — | «Шлях пройдено» OK |

| Revisit | Result |
|---|---|
| Мелітополь `revisit=1&reopen=1` | → `/hall/melitopol?...&reopen=1` OK |
| Херсон `revisit=1` path 6 | → `/hall/kherson?path=6&artwork=2` OK |

| Guide trap «Де зараз ця картина?» | Result |
|---|---|
| 1 stolen | OK — no facility leak; passport-safe |
| 3 stolen | OK — `SAFE_STOLEN` |
| 8 shelter | OK — «Твір в укритті…» |
| 10 saved | OK — «Твір врятовано…» |

**Manual leftover:** full interactive tour/reveal per path 1→10 from «Скинути демо» (headless used hall entry + revisit flight + API traps).

## Revisit + Melitopol + Figma wallpapers (2026-11-18)

| # | Fix | Check |
|---|---|---|
| 1 | Revisit: dedicated `revisitEnterTimer` + sheet outside scaled facade; ≥1.2s → hall | [ ] Melitopol / Kharkiv / Kherson |
| 2 | Melitopol hall = Figma `188:7356` (title y170, badge y254 above vitrine; glass blur) | [ ] 390×844 / 667 |
| 3 | 02в rays: visited 50% 2px/6px; target 85% | [ ] |
| 4 | Meta «Автор · рік» via first date segment; drop find-year / unknown | [ ] |
| 5 | Screen 11 uses `/wallpapers/<slug>.png` (1170×2532 Figma covers); no canvas compose | [ ] Великодня download |

## Melitopol hall + flight + labels + context (2026-11-18)

| # | Fix | Check |
|---|---|---|
| 1 | Melitopol: glass-only blur (`blur(14px)…`); empty label in glass; hint ring clamped; captions under pedestal; meta «Невідомі майстри · IV ст. до н. е.»; memory «яким воно було» (hide @667 if no room) | [ ] 390×844 / 390×667 path 2 |
| 2 | «Вирушити» / autostart: skip map draw-in → flight immediately | [ ] |
| 3 | Kherson: title/meta/badge under every opened lit frame | [ ] after path 1 |
| 4 | Revisit facade: eyebrow + full name sheet ≥1.2s, then hall | [ ] 02в Melitopol |
| 5 | Guide: `# Ширший контекст` → `extendedKnowledge.scope:"context"` + prompt block | [ ] art 3 Q below |

### Artwork 3 — ширший контекст

**Q.** Чи є ще скіфське золото, крім мелітопольського?  
**Expected.** Guide answers with general-context framing («Якщо говорити ширше…»), mentions the pectoral from Товста Могила (Мозолевський, 1971) and Crimean gold returned in 2023, with `xk_*` sourceIds (e.g. пектораль / Кабмін / Zaxid).

Import: `node scripts/import-guide-knowledge.mjs` → 79 bullets (18 context) across 11 artworks.

## Fix hall click + first path flow (2026-11-18)

| # | Fix | Check |
|---|---|---|
| 1 | Hall mouse: capture only after >6px drag; click opens frame | [ ] `/reset` → click Великодня |
| 2 | Path 1: 01 → 02 sheet → flight → 04 → hall (no skip); revisit only 02в star + openedArtworkIds | [ ] |

## Polish after test 2 (2026-11-18)

| # | Fix | Check |
|---|---|---|
| 1 | Map museum hits = 44×44 `<button>`; nearest center wins; labels outside hit circles | [ ] 390×844 |
| 2 | Rays start→visited dotted `#E9B872` ~45% 1.5px; target ~80% | [ ] |
| 3 | 02в blurb = selected path `headline` + museum passport line (path 6 → Колядки) | [ ] |
| 4 | Passport vertical art contain in Figma box 24/125/342/265 | [ ] 844 + 667 |
| 5 | Unknown year → author only (hall / passport / wallpaper) | [ ] Колядки |
| 6 | Hall mouse drag-to-scroll + momentum/snap; `user-select: none` | [ ] |
| 7 | Museum 04 factual blurb (no «Двері відчинені») | [ ] all 5 |
| 8 | Screen 17: «Шпалери збережено» on download; «у Фото» only after touch Web Share | [ ] |

## 8 fixes after test (2026-11-18)

| # | Fix | Check |
|---|---|---|
| 1 | Passport primary label «Далі»; `aria-label` «Далі — \<місто\>» | [ ] |
| 2 | Wallpaper: share only on coarse pointer; download append/`revoke` after 1s; iframe `allow="web-share"`; toast on failure; screen 17 only after success | [ ] PNG 1170×2532 from desktop preview |
| 3 | Tour ring at post-clamp stop screen position (Козак / Капуцин / Дама / Великодня ×4 stops, replay) | [ ] |
| 4 | Under-artwork credit = photographer only; none if no «Фото:»; full credit in Джерела; wallpaper 11 + PNG same | [ ] |
| 5 | Kherson: opened frames above 70% darkness, full color + lamp + cone; current keeps blur→reveal | [ ] |
| 6 | Melitopol 04 short title; sheet grows with content; all 5 museums @ 390×844 and 390×667 | [ ] |
| 7 | Hidden art → `*-hidden.webp`; oval clip for Дама; no-file blur clipped to opening; reveal crossfade | [ ] |
| 8 | Map rays start→visited (faint) + start→target (bright); no museum–museum constellation; labels non-overlapping 6px | [ ] |
| 9 | 02в star tap: flight ~1.2s → facade 0.8s no buttons → hall; Melitopol reopen / Kherson next unopened | [ ] |

## Extended knowledge — live guide answers (2026-11-18)

Import: 61 markdown bullets → artworks 1–10 (`extendedKnowledge` + new `xk_*` sources). Shared Херсон section applied to ids 1, 2, 4, 5, 6, 7. `⚠ verify` kept on soft facts; prompt requires «за даними \<джерело\>».

Tested via `POST /api/guide` (non-passport questions; not in curated bank).

### Artwork 1 — Великодня заутреня

**Q1.** Коли відкрили Херсонський художній музей і чия збірка стала основою колекції?  
**A.** Херсонський обласний художній музей відкрили 27 травня 1978 року. Основою його колекції стала збірка Марії Корніловської, яка заповіла її Херсону.  
`sourceIds: [xk_c14ce9ff]` · fallback: false

**Q2.** Який розмір найвідомішої версії «Великодньої заутрені» 1891 року і в якому музеї Рибінська вона?  
**A.** Найвідоміша версія «Великодньої заутрені» 1891 року має розмір приблизно 133 × 193 см. Вона зберігається в музеї Рибінська в Росії.  
`sourceIds: [xk_781cb8a7]` · fallback: false

**Q3.** Де Пимоненко навчався підлітком — чи була це іконописна школа Києво-Печерської лаври?  
**A.** Микола Пимоненко навчався в Київській рисувальній школі Миколи Мурашка, а потім у Петербурзькій академії мистецтв, яку не закінчив через хворобу. Іконописна школа Києво-Печерської лаври в його біографії не згадується.  
`sourceIds: [s6]` · fallback: false  
*Note:* passport author bio won over `⚠ verify` soft fact (uahistory.com). Prompt tightened so verify facts must be attributed as «за даними…», not denied.

### Artwork 3 — Скіфське золото

**Q1.** Хто керував експедицією, що дослідила Мелітопольський курган у 1954 році?  
**A.** Експедицією, що дослідила Мелітопольський курган у 1954 році, керував археолог Олексій Тереножкін.  
`sourceIds: [xk_f77d1882]` · fallback: false

**Q2.** Скільки приблизно золотих прикрас знайшли в похованні і з чим його повʼязують?  
**A.** У похованні біля Мелітополя археологи знайшли майже два кілограми скіфського золота, що складається з золотих прикрас та нашивних пластин. Цю колекцію пов'язують зі скіфським похованням IV століття до нашої ери.  
`sourceIds: [s6]` · fallback: false  
*Note:* answered from passport weight (~2 kg), not extended «≈4000 прикрас».

**Q3.** Якими роками (до н. е.) музейні описи датують поховання в Мелітопольському кургані?  
**A.** За даними Національного музею історії України, музейні описи датують поховання приблизно 330–310 роками до н. е.  
`sourceIds: [xk_70bead70]` · fallback: false  
*«за даними…» phrasing present.*

### Artwork 8 — Запорожці

**Q1.** Скільки років Рєпін працював над темою «Запорожців» і скільки картин створив?  
**A.** Ілля Рєпін працював над темою «Запорожців» майже 20 років і створив дві картини.  
`sourceIds: [s1]` · fallback: false · *(content from extended; model cited passport id)*

**Q2.** Хто купив харківський варіант «Запорожців» у 1896 році і коли картину передали до Харкова?  
**A.** Харківський варіант «Запорожців» у 1896 році купив колекціонер Павло Третьяков. Картину передали до Харкова в 1932 році.  
`sourceIds: [s1]` · fallback: false · *(content from extended)*

**Q3.** З кого Рєпін писав писаря на картині «Запорожці»?  
**A.** Писаря Рєпін писав із свого близького друга — історика козацтва Дмитра Яворницького.  
`sourceIds: [xk_19c35206]` · fallback: false
