# Сховані — MVP v2 prompts (run in order, one per new Agent chat, commit after each)

Every prompt starts with: Read `.cursor/rules/shovani.mdc` and `docs/mvp-v2.md` (it overrides `docs/app-spec.md`). References: `docs/figma-refs-v2/*.png`.

---

## V2-1 · Flow skeleton, journey data, city picker

```
Read `.cursor/rules/shovani.mdc` and `docs/mvp-v2.md` (overrides `docs/app-spec.md`).

## Task
Switch the app to the MVP v2 flow and data. Build the city picker. Wire all screens in the new order (some screens get their visual updates in later prompts; keep them working).

## Specify
Data:
- `data/artworks.json` → `journey.paths` now has 10 paths (see `docs/mvp-v2.md`). Re-sync `web/src/data/content.json` from it and update the validate script.
- Journey state (localStorage, versioned key): `startCityId`, `completedPaths`, `currentPath`. `/reset` clears all and opens the city picker.
- Origin of path 1 = chosen city; origin of path n>1 = previous path's museum. Consecutive paths in the same museum skip the map (go straight to the hall, scrolled to the next frame).

City picker (01, Figma `236:1250`, ref `docs/figma-refs-v2/01-city.png`):
- Copy and chip list exactly as in `docs/mvp-v2.md`. Wrapping chips (Figma «City Chip» `236:1248`, height 42, gap 6), no progress bar, no footer button.
- Tap a chip → selected state (150ms) → map 02. Coordinates for all oblast centers + Мелітополь in `web/src/data/cities.ts` (real lat/lng). «Я за кордоном»: origin off the west edge of the map at the target's latitude; sheet text «Звідти, де ти зараз» instead of km; route-trail label «Ти».
- Shown only when `startCityId` is empty.

Flow wiring (new order): 01 → 02 map → 03 zoom (automatic) → 04 museum → 05 hall → (stolen: 06 reveal) → 07 tour → 16 passport → 11 wallpaper → 17 saved → 02в route map → next path.
- Passport «×» → 02в. Wallpaper close → back to passport.
- Remove from the flow: onboarding, «Привіт, Анно», login, final screen with counters, Home/Collection/Profile tabs (keep code unreachable with `// MVP v2: disabled`).

## Format
Implement, then walk `/reset` → Київ → map → zoom → museum → hall in the desktop phone preview and confirm no dead ends (later screens may still have old visuals). Run lint, type check, build. Summarize.
```

---

## V2-2 · Map screens: «Твій шлях» and «Твій маршрут»

```
Read `.cursor/rules/shovani.mdc` and `docs/mvp-v2.md`. Scope: screens 02 and 02в only.

## Specify
02 «Твій шлях» (Figma `237:1459`, ref `02-map-5-museums.png`):
- Header «Твій шлях» + «10 творів у 5 музеях. Сьогодні шлях веде до <місто в знахідному відмінку>.» (Херсона, Мелітополя, Харкова, Львова, Чернігова).
- All 5 museums as dim dots with labels (Figma «Музей · …» groups: 14px ring + 6px dot, label 12px `text/secondary`), positioned with `projectToMap`. Target museum highlighted (gold pin + glow), start pin + arc as before.
- Sheet: «Твій шлях — <місто>» / «≈ N км від тебе. <одне речення з паспорта>» (Херсон: «Музей пограбували у 2022 році, але ми пам'ятаємо, що тут висіло.»; others `// TODO(copy)`) / «Вирушити» → flight → 03 zoom → 04.

02в «Твій маршрут» (Figma `238:1557`, ref `02v-route-map.png`):
- Header «Твій маршрут» / «10 творів у 5 музеях. Тапни на будь-який музей.»
- Passed museums glow (gold), the next one has a pulsing halo, others dim. Dashed route line Херсон → Мелітополь → Харків → Львів → Чернігів (1px, `#E9B872` at 60%, dash 4/4).
- Sheet: «Далі — <місто>» / one short line from that artwork's passport (Мелітополь: «Скіфське золото. У квітні 2022 року окупанти вивезли його з музею.») / «Вирушити». The arc goes from the previous museum to the next one.
- Any museum dot is tappable: selects it (sheet updates), «Вирушити» flies there and opens its next not-yet-seen artwork in journey order.
- When the next path is in the same museum, 02в is skipped (see flow rules).

Keep the projection, flight, zoom and no-snap camera behavior. Verify against both references at 390×844 and 390×740. Run lint, type check, build.
```

---

## V2-3 · Hall by status: empty frame, reveal, shelter, saved, neighbors

```
Read `.cursor/rules/shovani.mdc` and `docs/mvp-v2.md`. Scope: hall (05, 06, 12) only. Keep the existing layer stack (wall → all frames → 70% darkness → opened frame + lamp + cone → text).

## Specify
- stolen (Figma `236:1431`, ref `05-hall-empty-frame.png`): the opened slot shows the EMPTY frame — the frame image with the painting area filled `#0A0908` and the text «Цього твору зараз немає в Україні» centered inside (Manrope 14/20, `text/secondary`). Lamp + cone on. Hint ring at the frame corner with «Торкнись, щоб згадати».
- Tap (same tap) → reveal (Figma `236:1477`, ref `06-reveal-memory.png`): the painting fades in over 2.5s as a memory — CSS filter `saturate(0.55) sepia(0.15) brightness(0.92)` + inner vignette; NOT black-and-white. The line «Але ми пам'ятаємо, який він.» fades in above the frame. The hint disappears. After the reveal + 1.2s the tour opens with the shared-element transition (tap skips the wait).
- shelter: painting visible in warm, muted light (cone at 70% opacity, painting `brightness(0.85) sepia(0.1)`); hint «Торкнись картини, щоб почати тур»; tap → tour.
- saved: painting in full light; same hint; tap → tour.
- Neighbor frames (Figma `236:1749`, ref `12-neighbor-frame.png`): tap shows only the caption «Відкриється наступним шляхом» under that frame (fade in, auto-hide after 2.5s). No modal. Remove the 12б sheet.
- Same museum next path: the hall scrolls smoothly (600ms) to the next frame, its lamp switches on, then the same state logic.
- Halls for Мелітополь, Харків, Львів, Чернігів use their walls from `backgrounds/` and artworks from `art/`.

Verify at 390×844 for all three statuses (Херсон path 1, Харків path 3, Чернігів path 5) against the references. Run lint, type check, build.
```

---

## V2-4 · Tour, detail card, calibration

```
Read `.cursor/rules/shovani.mdc` and `docs/mvp-v2.md`. Scope: tour (07) and detail card (08).

## Specify
- Tour layout exactly as `docs/figma-refs-v2/07-tour.png` (Figma `236:1522`): lamp + cone at the top, framed painting full width (x 24–366, y 194), lens = two gold rings around the detail, bottom sheet with 4 progress segments, title, text, controls «Пропустити» (×) · «Пауза» (ring timer) · «Далі» (→).
- Painting + frame = the same `art/<name>.png` used in the hall (transparent), no white margins. For stolen works the painting keeps the «memory» filter from the reveal.
- All 10 journey artworks have a full 4-stop tour from `tourStops`. Lens zoom = stop zoom, but capped at 1.5× when the source image is narrower than 1000px. When x/y are null, use the center of the `locationHint` grid cell.
- «Пропустити» or the end of stop 4 → passport (16).
- Detail card (Figma `236:1564`, ref `08-detail.png`): opened by tapping the painting on the passport screen (touch zones); eyebrow «ДЕТАЛЬ», title, text from `touchZones`, link «З паспорта твору» (opens the Джерела tab), button «Спитати гіда про це» → guide with the detail attached.
- `/dev/calibrate` works for all 10 artworks (tap to set x/y, slider for zoom, «Copy all»).

Verify against `07-tour.png` and `08-detail.png`. Run lint, type check, build.
```

---

## V2-5 · AI guide chat (OpenAI)

```
Read `.cursor/rules/shovani.mdc` and `docs/mvp-v2.md`. Execute **Stage 7** from `docs/cursor-prompts.md` with these MVP v2 changes:
- Guide screen exactly as `docs/figma-refs-v2/09-guide.png` (Figma `236:1619`): «Я гід цієї картини» (no name), subtitle, «МОЖНА ПОЧАТИ З ЦЬОГО» + 3 default questions; conversation as `docs/figma-refs/20b-guide-chat.png`.
- No auth: chat history per artwork in localStorage.
- Opened from the passport («Спитати гіда») and from the detail card («Спитати гіда про це», with the detail attached). Back returns to where it was opened.
- The demo trap question «Де зараз ця картина?» must be answered truthfully from the passport, never naming where evacuated works are stored.
- Without `OPENAI_API_KEY` the chat works on fallback answers.
Run lint, type check, build. Print 5 test questions per artwork 1 and their answers.
```

---

## V2-6 · Passport, wallpaper, saved → next path

```
Read `.cursor/rules/shovani.mdc` and `docs/mvp-v2.md`. Scope: screens 16, 11, 17.

## Specify
- Passport 16 (Figma `240:1838`, ref `16-passport.png`): as now (tabs, sources, «Шпалери», «Спитати гіда»); «×» → route map 02в. Remove «Завершити шлях»: reaching 16 marks the path as completed.
- Wallpaper 11 (Figma `236:1720`, ref `11-wallpaper.png`): only «Уся картина» (remove the toggle), «Зберегти на телефон» (Web Share with file → else download) → 17.
- Saved 17 (Figma `240:1889`, ref `17-wallpaper-saved.png`): toast, preview, 3 steps, primary «Далі — <next city>» → 02в with the next museum selected. If the next path is in the same museum: «Далі — <next artwork title>» `// TODO(copy confirm)` → hall scrolls to the next frame.
- After path 10: 02в shows all museums passed; sheet «Шлях пройдено» `// TODO(copy)`.
Verify against the three references. Run lint, type check, build.
```
