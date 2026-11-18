# Сховані — MVP v2 (final demo flow)

Source of truth for the final demo. Overrides `docs/app-spec.md` wherever they differ.
Figma section: `236:1245` «MVP для фіналу · флоу демо». Reference renders: `docs/figma-refs-v2/*.png` (390×844).

Removed from the MVP: onboarding, name, login, email code, rhythm, notifications, home with stats, collection, profile, final screen with counters. One metaphor: the path. No points, no counters.

## Screens and copy

| # | Screen | Figma | Reference | Copy |
|---|---|---|---|---|
| 01 | City picker | `236:1250` | `01-city.png` | «Звідки починаємо шлях?» / «Обери місто — і ми прокладемо шлях до твору, який зараз неможливо побачити.» Chips: Київ, Вінниця, Дніпро, Донецьк, Житомир, Запоріжжя, Івано-Франківськ, Кропивницький, Луганськ, Луцьк, Львів, Мелітополь, Миколаїв, Одеса, Полтава, Рівне, Сімферополь, Суми, Тернопіль, Ужгород, Харків, Херсон, Хмельницький, Черкаси, Чернівці, Чернігів, «Я за кордоном». Tap = go, no «Далі». |
| 02 | Map · your path | `237:1459` | `02-map-5-museums.png` | «Твій шлях» / «10 творів у 5 музеях. Сьогодні шлях веде до Херсона.» Sheet: «Твій шлях — Херсон» / «≈ N км від тебе. …» / «Вирушити». Start city = ring+dot; target = gold 4-point star; dotted curve start→target; unvisited = dim dots. |
| 03 | Zoom | `236:1386` | `03-zoom.png` | Automatic, no tap. Route trail «<start> — <city> — Музей». |
| 04 | Museum outside | `236:1401` | `04-museum.png` | Eyebrow = city in caps («ХЕРСОН»), full museum name, «Колекцію вивезли у 2022-му. Зайди — один твір чекає, щоб його згадали.» / «Зайти всередину». Other statuses: `// TODO(copy)`. |
| 05 | Hall · empty frame (stolen) | `236:1431` | `05-hall-empty-frame.png` | Inside the empty frame: «Цього твору зараз немає в Україні». Hint at the frame corner: «Торкнись, щоб згадати». |
| 06 | Reveal · memory | `236:1477` | `06-reveal-memory.png` | After the same tap the painting appears in 2–3 s, muted (less saturation, warmer, vignette; NOT black-and-white). Line above the frame: «Але ми пам'ятаємо, який він.» Then the tour starts. |
| 07 | Tour | `236:1522` | `07-tour.png` | Controls: «Пропустити» · «Пауза» · «Далі». |
| 08 | Detail | `236:1564` | `08-detail.png` | Eyebrow «ДЕТАЛЬ», title, text, source link «З паспорта твору», button «Спитати гіда про це». |
| 09 | Guide | `236:1619` | `09-guide.png` | Header «Гід · <назва> · <автор>». «Я гід цієї картини» / «Питай про сюжет, автора чи долю твору. Відповідаю лише з перевірених джерел.» / «МОЖНА ПОЧАТИ З ЦЬОГО» + 3 questions. Conversation: `docs/figma-refs/20b-guide-chat.png`. Demo trap question: «Де зараз ця картина?» |
| 16 | Passport | `240:1838` | `16-passport.png` | Tabs Історія / Про твір / Автор / Джерела, «Шпалери», «Спитати гіда». «×» → route map (02в). |
| 11 | Wallpaper | `236:1720` | `11-wallpaper.png` | Only «Уся картина» (no toggle). «Зберегти на телефон». |
| 17 | Wallpaper saved | `240:1889` | `17-wallpaper-saved.png` | Toast «Шпалери збережено у «Фото»», «Тепер постав їх на екран блокування» / «Займе хвилину. Твір буде з тобою щодня.», 3 steps, button «Далі — <next city>» (same museum: «Далі — <next artwork title>» `// TODO(copy confirm)`). |
| 02в | Route map | `238:1557` | `02v-route-map.png` | «Твій маршрут» / «10 творів у 5 музеях. Тапни на будь-який музей.» Start city ring+dot; target gold star; visited = smaller constellation stars linked by faint dotted lines; unvisited dim. Sheet: «Далі — <city>» / «≈ N км від тебе» + blurb / «Вирушити». After path 10: «Шлях пройдено» `// TODO(copy)`. |
| 12 | Neighbor frame | `236:1749` | `12-neighbor-frame.png` | Tap on another frame: no modal, only a quiet caption «Відкриється наступним шляхом» under it. |

End of each artwork: 07 Tour → 16 Passport → 11 Wallpaper → 17 Saved → 02в Route map → next museum.
Passport «×» also goes to 02в (so the user can continue without wallpapers).

## Journey (10 artworks)

| n | Museum | Artwork | Status |
|---|---|---|---|
| 1 | Херсон | Великодня заутреня | stolen |
| 2 | Мелітополь | Скіфське золото | stolen |
| 3 | Харків | Запорожці пишуть листа турецькому султанові | shelter |
| 4 | Львів | Богородчанський іконостас | shelter |
| 5 | Чернігів | Козак-бандурист | saved |
| 6 | Херсон | Колядки | stolen |
| 7 | Херсон | Вид міста Одеси | stolen |
| 8 | Херсон | Дама з собакою | stolen |
| 9 | Херсон | Околиці Києва | stolen |
| 10 | Херсон | Капуцин | stolen |

Stored in `data/artworks.json` → `journey.paths`.

## Journey rules
- Origin for every path is the user's start city (`startCityId`). «Я за кордоном» keeps the west-edge abroad pin. Flight after «Вирушити» always starts from the start city — not from the previous museum.
- Map markers: start = ring + dot + label; current target = gold 4-point star (~22px, soft glow) + white 16px label; dotted gold curve start → target (draw-in ~800ms). Visited museums (`completedPaths`) = smaller stars (~14px) linked in visit order by a faint dotted line (constellation); one star per museum even if visited many times. Unvisited = dim dots.
- Sheet distance «≈ N км від тебе» is always start city → selected museum.
- Consecutive paths in the same museum (6–10): no map, no flight; the hall scrolls to the next frame. Saved screen button stays «Далі — <місто>» (same city name).
- Full tour (4 stops) for all 10 artworks. If the artwork image is narrower than 1000px, the lens zoom is capped at 1.5×.
- Hall light by status:
  - stolen → empty frame (screen 05), tap → reveal (06) → tour;
  - shelter → painting visible in warm, muted light; tap → tour;
  - saved → painting in full light; tap → tour.
- Neighbor frames never open a modal: only the caption «Відкриється наступним шляхом».
- Route map: tapping any museum selects it (dotted line crossfades) and «Вирушити» opens its next not-yet-seen artwork in journey order.
- `/reset` returns to the city picker.
