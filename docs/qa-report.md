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
5. `displayYear`: strip parenthetical notes for `YYYY (…)`; collection dating rewritten to «IV ст. … · знайдено 1954».
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
