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

1. **Guide flakiness on theft question** — live answer #2 was an empty “немає в джерелах” even though passport tabs cover the Oct–Nov 2022 looting. Fallback bank has a better answer; consider forcing fallback keywords or tightening the system prompt. Not changed beyond noting.
2. **02в after path 1** — during the first automated pass Kherson looked like a dim dot rather than a visited star (likely `completedPaths` race). Added completion safety; **please re-check** constellation star on Херсон after finishing path 1.
3. **Wallpaper 11** — phone preview is approximate vs Figma (framed art on vignette); composition not pixel-matched. Footer license note present.
4. **Hall light intensity** for shelter vs saved — status badges correct; fine-tuning of cone brightness vs Figma refs not done.
5. **End of journey (path 10)** — sheet «Шлях пройдено» is stub with `// TODO(copy)`; not walked in this run.
6. **Same-museum paths 6–10** — hall scroll after «Далі — Херсон» not re-walked in this automated pass; logic is in `continueAfterWallpaper` / `shouldSkipMapToHall`.

## Please check manually

- [ ] Full path 1 on a phone/Safari toolbar height (~740 / 667): lamp not covering sheet; passport frame width feels full (24–366).
- [ ] After path 1 → 02в: Херсон = small visited star; Київ = start ring; Мелітополь = target star; faint constellation only after 2+ museums.
- [ ] Detail 08 → «Спитати гіда про це» prefill, not auto-send; Back restores passport + detail context.
- [ ] Trap question never names a storage place.
- [ ] Path 3 shelter + path 5 saved lighting feel right.
- [ ] Path 6+ «Далі — Херсон» stays on hall and focuses the next frame.
- [ ] Ask guide again: «Як картину викрали з Херсона?» — expect a passport-grounded answer, not a shrug.
