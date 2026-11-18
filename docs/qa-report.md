# QA report — MVP v2 stages 1–5

Date: 2026-11-18. Preview: production build on `localhost:3010`, viewports 390×844 and 390×667. Screenshots under `docs/verify/qa-*.png`.

## Per stage

| Stage | Status | Notes |
|---|---|---|
| 1 — AI guide chat (V2-5) | **done** | Already shipped before this session; re-verified with live `OPENAI_API_KEY`. Passport «Спитати гіда» + detail prefill work; trap uses fallback. |
| 2 — Start-city route + constellation | **done** | Origin always `startCityId`; `MapStar` + `DottedRoute`; 02/02в distance from start city; `docs/mvp-v2.md` journey rules updated. |
| 3 — Passport → wallpaper → saved → next | **done** | Path completes on reaching 16 (and again on wallpaper/×/Далі as safety). No «Завершити шлях». 17 CTA always «Далі — \<місто\>». Same-museum next still scrolls hall. |
| 4 — Polish vs Figma | **done** | Passport frame width-fit to x24/w342; Джерела «Тексти»/«Фото»; external-link SVG; removed unused `CoveredSheet`. Other halls: walls + frames + status OK in deep-link checks. |
| 5 — Full QA + this report | **done** | Automated walkthrough + live guide Q&A below. |

## Files changed (this autonomous run)

- Stage 2: `JourneyFlow.tsx`, `RouteMapScreen.tsx`, `journey.ts`, `MapStar.tsx`, `DottedRoute.tsx`, `motion.ts`, `docs/mvp-v2.md`
- Stage 3: `AboutSheet.tsx`, `HallExperience.tsx`, `WallpaperScreen.tsx`, `WallpaperSavedScreen.tsx`, `docs/mvp-v2.md`
- Stage 4: `TourStage.tsx`, `tour-camera.ts` (`fitSlotWidth`), `SourceRow.tsx`, `AboutSheet.tsx`, `public/icons/external.svg`, deleted `CoveredSheet.tsx`
- Stage 5: `HallExperience.tsx` (completion safety), `docs/qa-report.md`

No new npm dependencies. `.env*` not committed.

## Decisions made on your behalf

1. **17 button always «Далі — \<місто\>»** even when next path is same museum (your product note overrides V2-6 artwork-title copy). Hall still skips map and opens the next frame.
2. **Passport «×» always opens 02в** (not auto-jump to same-museum hall).
3. **Photo source row** uses `photoCredit` under «Фото»; license line only when credit mentions CC BY. No invented Wikimedia URL.
4. **Constellation** links only between *visited* museums (not the full 5-museum dashed path from the old 02в).
5. **Path completion** also re-asserted on wallpaper save / × / «Далі» so 02в constellation cannot miss a just-finished museum if tour skip raced state.
6. Did **not** commit untracked `Skhovani_Hackathon_Rules_Knowledge.md` or the MVP PDF.

## Live guide Q&A — artwork 1 (Великодня заутреня)

Called `POST /api/guide` against the running build with the real key:

1. **Чому існує дві «Великодні заутрені»?**  
   Микола Пимоненко написав «Великодню заутреню» двічі: першу версію у 1891 році, яка зараз знаходиться в Росії, та другу — у 1910 році, що зберігалася в Херсонському художньому музеї. Обидві версії відрізняються, але обидві відображають атмосферу Великодньої ночі в українському селі.  
   Sources: `s3`, `s8`. fallback: false

2. **Як картину викрали з Херсона?**  
   Про це в моїх джерелах даних немає.  
   Sources: none. fallback: false  
   *(Earlier session had a richer answer from the same passport facts; model occasionally under-answers — see bugs.)*

3. **Що відбувається на картині?**  
   На картині «Великодня заутреня» зображено сільську церкву в ніч перед Великоднем. Люди зібралися біля церкви, чекаючи, коли священник вийде й посвятить принесені паски та крашанки. Художник передає атмосферу свята, де тепле світло з церкви освітлює обличчя людей, а ніч поступово відходить.  
   Sources: `s2`. fallback: false

4. **Хто такий Микола Пимоненко?**  
   Микола Пимоненко (1862–1912) — український художник-реаліст, родом з Києва. Він навчався в Київській рисувальній школі та Петербурзькій академії мистецтв, хоча не закінчив її через хворобу. Пимоненко став академіком живопису у 1904 році і відомий своїми творами, зокрема картиною «Великодня заутреня».  
   Sources: `s6`. fallback: false

5. **Де зараз ця картина?** *(trap)*  
   Окупанти вивезли її з музею. Точне місце зараз невідоме — я не вгадую, де вона зберігається.  
   Sources: `s1`. fallback: true

## Automated flow checklist (390×844)

`/reset` → Київ → 02 (star + dotted Kyiv→Херсон, ≈451 км) → Вирушити → flight → 04 → hall blur → reveal → tour → 16 → Спитати гіда → back → Шпалери → 17 «Далі — Мелітополь» → 02в (dotted Kyiv→Мелітополь, ≈535 км).

Also deep-linked:

- Мелітополь path 2 — wall + frame 3, stolen empty/blur copy present  
- Харків path 3 — wall + frame 8, badge «В укритті»  
- Львів path 4 — wall + frame 9, shelter  
- Чернігів path 5 — wall + frame 10, saved  

390×667: city → map sheet still usable (`qa-02-map-667.png`).

## Bugs found / not fully fixed

1. ~~Guide flakiness on theft question~~ → **fixed** (curated bank for all `defaultQuestions`; status-aware prompt + safety).
2. **02в constellation** — line draws only when ≥2 museums visited; after path 1 alone you see Херсон star without an inter-museum line (expected). Re-check after path 2+.
3. **Wallpaper 11** — phone preview is approximate vs Figma; footer license note present.
4. **Hall light intensity** for shelter vs saved — fine-tuning vs Figma refs not done.
5. **End of journey (path 10)** — sheet «Шлях пройдено» stub `// TODO(copy)`.
6. **Same-museum paths 6–10** — not re-walked in automated pass.

## Please check manually

- [ ] Full path 1 → passport → guide → back → Шпалери → 17 → «Далі — Мелітополь» → 02в: `startCityId` still `kyiv`, Херсон = visited star.
- [ ] Guide 09 empty state sits at the bottom above the composer.
- [ ] After 2+ museums: faint constellation line between visited stars under the active route.
- [ ] Artwork 8 trap «Де зараз?» → only «Твір в укритті…», no place name.

---

## Follow-up — guide reliability (2026-11-18 evening)

Commit: `guide reliability + fixes`.

### Fixes
- Curated answers for every `chat.defaultQuestions` across artworks 1–11 (passport-only); default taps skip the model (`curated: true`, `fallback: false`).
- Status-aware system prompt + «ФАКТИ, ЯКІ ТИ МОЖЕШ РОЗПОВІДАТИ»; stolen may state Russia / looting from passport; shelter/saved never name storage.
- `sanitizeGuideAnswer(text, status)` — stolen no longer rewritten to «твір в укритті» on «вивезли до…».
- Shrug retry: if model says «немає даних» but passport keywords match → one retry with quoted paragraphs → then curated/fallback bank.
- `startCityId` guard: cannot be wiped except `/reset`; save refuses to overwrite stored city with null; UI falls back to stored value.
- 02в: constellation dots use plain SVG circles (no motion initial-hide); drawn under active route.
- Guide empty state: `justify-end` above composer.
- `<body suppressHydrationWarning>`.

### Live Q&A re-check (artwork 1 + shelter trap)

| # | Q | curated / fallback | Answer (short) |
|---|---|---|---|
| 1 | Чому існує дві «Великодні заутрені»? | curated | Дві версії 1891 (Рибінськ) і 1910 (Херсон). Sources s2,s3,s8 |
| 2 | Як картину викрали з Херсона? | curated | 31.10–04.11.2022, >10 тис., обидві версії в Росії. Sources s1,s5 |
| 3 | Чи є шанс, що її повернуть? | curated | Реєстр + Інтерпол. Source s4 |
| 4 | Хто такий Микола Пимоненко? | curated | 1862–1912, киянин, академік 1904. Source s6 |
| 5 | Що відбувається на картині? | curated | Великодня ніч, церква, кошики, свічки. Sources s2,s3 |
| 6 | Де зараз ця картина? | fallback trap | Окупанти вивезли; за паспортом обидві версії в Росії; точного місця не знаю. s1,s8 |
| 7 | Скільки експонатів вивезли? | model | Понад 10 тисяч… Source s5 |
| 8 | Де Пимоненко мав майстерню? | model | Малютянка на Київщині |
| 9 | Artwork 8: Де зараз ця картина? | fallback | Твір в укритті. Точне місце зберігання я не називаю і не вгадую. |
