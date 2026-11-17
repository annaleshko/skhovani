export type City = {
  id: string;
  name: string;
  oblast: string;
  lat: number;
  lng: number;
  population?: number;
};

/**
 * Oblast centers + cities with population > ~50k + museum cities.
 * Coordinates approximate (city centers). Used for start-city search (screen 04).
 */
export const cities: City[] = [
  // Museum / journey cities
  { id: "kherson", name: "Херсон", oblast: "Херсонська", lat: 46.6354, lng: 32.6169, population: 279000 },
  { id: "melitopol", name: "Мелітополь", oblast: "Запорізька", lat: 46.8489, lng: 35.3653, population: 150000 },
  { id: "kharkiv", name: "Харків", oblast: "Харківська", lat: 49.9935, lng: 36.2304, population: 1400000 },
  { id: "lviv", name: "Львів", oblast: "Львівська", lat: 49.8397, lng: 24.0297, population: 720000 },
  { id: "chernihiv", name: "Чернігів", oblast: "Чернігівська", lat: 51.4982, lng: 31.2893, population: 285000 },

  // Oblast centers
  { id: "kyiv", name: "Київ", oblast: "Київ", lat: 50.4501, lng: 30.5234, population: 2950000 },
  { id: "vinnytsia", name: "Вінниця", oblast: "Вінницька", lat: 49.2331, lng: 28.4682, population: 370000 },
  { id: "lutsk", name: "Луцьк", oblast: "Волинська", lat: 50.7472, lng: 25.3254, population: 215000 },
  { id: "dnipro", name: "Дніпро", oblast: "Дніпропетровська", lat: 48.4647, lng: 35.0462, population: 980000 },
  { id: "donetsk", name: "Донецьк", oblast: "Донецька", lat: 48.0159, lng: 37.8028, population: 900000 },
  { id: "zhytomyr", name: "Житомир", oblast: "Житомирська", lat: 50.2547, lng: 28.6587, population: 260000 },
  { id: "uzhhorod", name: "Ужгород", oblast: "Закарпатська", lat: 48.6208, lng: 22.2879, population: 115000 },
  { id: "zaporizhzhia", name: "Запоріжжя", oblast: "Запорізька", lat: 47.8388, lng: 35.1396, population: 730000 },
  { id: "ivano-frankivsk", name: "Івано-Франківськ", oblast: "Івано-Франківська", lat: 48.9226, lng: 24.7111, population: 238000 },
  { id: "kropyvnytskyi", name: "Кропивницький", oblast: "Кіровоградська", lat: 48.5079, lng: 32.2623, population: 220000 },
  { id: "luhansk", name: "Луганськ", oblast: "Луганська", lat: 48.5740, lng: 39.3078, population: 400000 },
  { id: "mykolaiv", name: "Миколаїв", oblast: "Миколаївська", lat: 46.9750, lng: 31.9946, population: 480000 },
  { id: "odesa", name: "Одеса", oblast: "Одеська", lat: 46.4825, lng: 30.7233, population: 1010000 },
  { id: "poltava", name: "Полтава", oblast: "Полтавська", lat: 49.5883, lng: 34.5514, population: 280000 },
  { id: "rivne", name: "Рівне", oblast: "Рівненська", lat: 50.6199, lng: 26.2516, population: 245000 },
  { id: "sumy", name: "Суми", oblast: "Сумська", lat: 50.9077, lng: 34.7981, population: 260000 },
  { id: "ternopil", name: "Тернопіль", oblast: "Тернопільська", lat: 49.5535, lng: 25.5948, population: 225000 },
  { id: "khmelnytskyi", name: "Хмельницький", oblast: "Хмельницька", lat: 49.4229, lng: 26.9871, population: 275000 },
  { id: "cherkasy", name: "Черкаси", oblast: "Черкаська", lat: 49.4444, lng: 32.0598, population: 270000 },
  { id: "chernivtsi", name: "Чернівці", oblast: "Чернівецька", lat: 48.2917, lng: 25.9352, population: 265000 },
  { id: "simferopol", name: "Сімферополь", oblast: "Автономна Республіка Крим", lat: 44.9521, lng: 34.1024, population: 340000 },

  // Other cities >50k
  { id: "kryvyi-rih", name: "Кривий Ріг", oblast: "Дніпропетровська", lat: 47.9105, lng: 33.3918, population: 610000 },
  { id: "mariupol", name: "Маріуполь", oblast: "Донецька", lat: 47.0971, lng: 37.5434, population: 430000 },
  { id: "luhansk-sievierodonetsk", name: "Сєвєродонецьк", oblast: "Луганська", lat: 48.9482, lng: 38.4910, population: 100000 },
  { id: "kamenets", name: "Кам’янець-Подільський", oblast: "Хмельницька", lat: 48.6800, lng: 26.5800, population: 98000 },
  { id: "bila-tserkva", name: "Біла Церква", oblast: "Київська", lat: 49.7956, lng: 30.1122, population: 208000 },
  { id: "brovary", name: "Бровари", oblast: "Київська", lat: 50.5110, lng: 30.7909, population: 109000 },
  { id: "boryspil", name: "Бориспіль", oblast: "Київська", lat: 50.3527, lng: 30.9550, population: 64000 },
  { id: "irpin", name: "Ірпінь", oblast: "Київська", lat: 50.5218, lng: 30.2506, population: 65000 },
  { id: "bucha", name: "Буча", oblast: "Київська", lat: 50.5434, lng: 30.2120, population: 37000 },
  { id: "fastiv", name: "Фастів", oblast: "Київська", lat: 50.0768, lng: 29.9177, population: 45000 },
  { id: "zhytomyr-berdychiv", name: "Бердичів", oblast: "Житомирська", lat: 49.9000, lng: 28.6000, population: 75000 },
  { id: "korosten", name: "Коростень", oblast: "Житомирська", lat: 50.9500, lng: 28.6500, population: 62000 },
  { id: "novovolynsk", name: "Нововолинськ", oblast: "Волинська", lat: 50.7333, lng: 24.1667, population: 52000 },
  { id: "kovel", name: "Ковель", oblast: "Волинська", lat: 51.2150, lng: 24.7080, population: 68000 },
  { id: "chernivtsi-novodnistrovsk", name: "Новодністровськ", oblast: "Чернівецька", lat: 48.5833, lng: 27.4333, population: 11000 },
  { id: "kamianets", name: "Кам’янське", oblast: "Дніпропетровська", lat: 48.5110, lng: 34.6021, population: 230000 },
  { id: "nikopol", name: "Нікополь", oblast: "Дніпропетровська", lat: 47.5712, lng: 34.3964, population: 110000 },
  { id: "pavlohrad", name: "Павлоград", oblast: "Дніпропетровська", lat: 48.5300, lng: 35.8700, population: 104000 },
  { id: "novomoskovsk", name: "Новомосковськ", oblast: "Дніпропетровська", lat: 48.6333, lng: 35.2167, population: 70000 },
  { id: "kramatorsk", name: "Краматорськ", oblast: "Донецька", lat: 48.7390, lng: 37.5840, population: 150000 },
  { id: "sloviansk", name: "Слов’янськ", oblast: "Донецька", lat: 48.8500, lng: 37.6167, population: 110000 },
  { id: "bakhmut", name: "Бахмут", oblast: "Донецька", lat: 48.5950, lng: 38.0000, population: 72000 },
  { id: "pokrovsk", name: "Покровськ", oblast: "Донецька", lat: 48.2820, lng: 37.1750, population: 61000 },
  { id: "horlivka", name: "Горлівка", oblast: "Донецька", lat: 48.3000, lng: 38.0500, population: 240000 },
  { id: "makiivka", name: "Макіївка", oblast: "Донецька", lat: 48.0500, lng: 37.9667, population: 340000 },
  { id: "berdiansk", name: "Бердянськ", oblast: "Запорізька", lat: 46.7550, lng: 36.7885, population: 110000 },
  { id: "enerhodar", name: "Енергодар", oblast: "Запорізька", lat: 47.4980, lng: 34.6560, population: 53000 },
  { id: "mukachevo", name: "Мукачево", oblast: "Закарпатська", lat: 48.4414, lng: 22.7139, population: 86000 },
  { id: "khust", name: "Хуст", oblast: "Закарпатська", lat: 48.1790, lng: 23.2990, population: 28000 },
  { id: "kalush", name: "Калуш", oblast: "Івано-Франківська", lat: 49.0230, lng: 24.3650, population: 66000 },
  { id: "kolomyia", name: "Коломия", oblast: "Івано-Франківська", lat: 48.5300, lng: 25.0400, population: 61000 },
  { id: "bila-tserkva-obukhiv", name: "Обухів", oblast: "Київська", lat: 50.1100, lng: 30.6200, population: 33000 },
  { id: "oleksandriia", name: "Олександрія", oblast: "Кіровоградська", lat: 48.6667, lng: 33.1167, population: 78000 },
  { id: "svitlovodsk", name: "Світловодськ", oblast: "Кіровоградська", lat: 49.0500, lng: 33.2500, population: 45000 },
  { id: "lysychansk", name: "Лисичанськ", oblast: "Луганська", lat: 48.9000, lng: 38.4333, population: 95000 },
  { id: "rubizhne", name: "Рубіжне", oblast: "Луганська", lat: 49.0167, lng: 38.3667, population: 56000 },
  { id: "alchevsk", name: "Алчевськ", oblast: "Луганська", lat: 48.4700, lng: 38.8000, population: 110000 },
  { id: "drohobych", name: "Дрогобич", oblast: "Львівська", lat: 49.3500, lng: 23.5000, population: 75000 },
  { id: "chervonohrad", name: "Червоноград", oblast: "Львівська", lat: 50.3833, lng: 24.2333, population: 66000 },
  { id: "stryi", name: "Стрий", oblast: "Львівська", lat: 49.2560, lng: 23.8500, population: 60000 },
  { id: "sambir", name: "Самбір", oblast: "Львівська", lat: 49.5180, lng: 23.2020, population: 35000 },
  { id: "voznesensk", name: "Вознесенськ", oblast: "Миколаївська", lat: 47.5667, lng: 31.3333, population: 35000 },
  { id: "pervomaisk", name: "Первомайськ", oblast: "Миколаївська", lat: 48.0500, lng: 30.8500, population: 64000 },
  { id: "yuzhnoukrainsk", name: "Южноукраїнськ", oblast: "Миколаївська", lat: 47.8167, lng: 31.1833, population: 39000 },
  { id: "izmail", name: "Ізмаїл", oblast: "Одеська", lat: 45.3500, lng: 28.8333, population: 71000 },
  { id: "chornomorsk", name: "Чорноморськ", oblast: "Одеська", lat: 46.3010, lng: 30.6570, population: 59000 },
  { id: "podilsk", name: "Подільськ", oblast: "Одеська", lat: 47.7500, lng: 29.5333, population: 40000 },
  { id: "bilhorod-dnistrovskyi", name: "Білгород-Дністровський", oblast: "Одеська", lat: 46.2000, lng: 30.3500, population: 50000 },
  { id: "kremenchuk", name: "Кременчук", oblast: "Полтавська", lat: 49.0667, lng: 33.4167, population: 220000 },
  { id: "horishni-plavni", name: "Горішні Плавні", oblast: "Полтавська", lat: 49.0167, lng: 33.6500, population: 52000 },
  { id: "myrhorod", name: "Миргород", oblast: "Полтавська", lat: 49.9667, lng: 33.6000, population: 40000 },
  { id: "lubny", name: "Лубни", oblast: "Полтавська", lat: 50.0167, lng: 33.0000, population: 45000 },
  { id: "dubno", name: "Дубно", oblast: "Рівненська", lat: 50.4167, lng: 25.7500, population: 38000 },
  { id: "varash", name: "Вараш", oblast: "Рівненська", lat: 51.3500, lng: 25.8500, population: 42000 },
  { id: "konotop", name: "Конотоп", oblast: "Сумська", lat: 51.2333, lng: 33.2000, population: 86000 },
  { id: "shostka", name: "Шостка", oblast: "Сумська", lat: 51.8667, lng: 33.4833, population: 75000 },
  { id: "okhtyrka", name: "Охтирка", oblast: "Сумська", lat: 50.3000, lng: 34.9000, population: 48000 },
  { id: "romny", name: "Ромни", oblast: "Сумська", lat: 50.7500, lng: 33.4833, population: 40000 },
  { id: "chortkiv", name: "Чортків", oblast: "Тернопільська", lat: 49.0167, lng: 25.8000, population: 29000 },
  { id: "izium", name: "Ізюм", oblast: "Харківська", lat: 49.2120, lng: 37.2560, population: 46000 },
  { id: "lozova", name: "Лозова", oblast: "Харківська", lat: 48.8890, lng: 36.3170, population: 54000 },
  { id: "chuhuiv", name: "Чугуїв", oblast: "Харківська", lat: 49.8350, lng: 36.6880, population: 32000 },
  { id: "kupiansk", name: "Куп’янськ", oblast: "Харківська", lat: 49.7100, lng: 37.6160, population: 27000 },
  { id: "nova-kakhovka", name: "Нова Каховка", oblast: "Херсонська", lat: 46.7500, lng: 33.3667, population: 45000 },
  { id: "kakhovka", name: "Каховка", oblast: "Херсонська", lat: 46.8000, lng: 33.4833, population: 35000 },
  { id: "genichesk", name: "Генічеськ", oblast: "Херсонська", lat: 46.1760, lng: 34.7980, population: 20000 },
  { id: "umani", name: "Умань", oblast: "Черкаська", lat: 48.7500, lng: 30.2200, population: 83000 },
  { id: "smila", name: "Сміла", oblast: "Черкаська", lat: 49.2333, lng: 31.8667, population: 67000 },
  { id: "zolotonosha", name: "Золотоноша", oblast: "Черкаська", lat: 49.6667, lng: 32.0333, population: 28000 },
  { id: "nizhyn", name: "Ніжин", oblast: "Чернігівська", lat: 51.0500, lng: 31.9000, population: 67000 },
  { id: "pryluky", name: "Прилуки", oblast: "Чернігівська", lat: 50.5833, lng: 32.3833, population: 54000 },
  { id: "sevostopol", name: "Севастополь", oblast: "Севастополь", lat: 44.6167, lng: 33.5250, population: 480000 },
  { id: "yalta", name: "Ялта", oblast: "Автономна Республіка Крим", lat: 44.4991, lng: 34.1697, population: 78000 },
  { id: "yevpatoriia", name: "Євпаторія", oblast: "Автономна Республіка Крим", lat: 45.2000, lng: 33.3667, population: 108000 },
  { id: "kerch", name: "Керч", oblast: "Автономна Республіка Крим", lat: 45.3600, lng: 36.4700, population: 150000 },
  { id: "feodosiia", name: "Феодосія", oblast: "Автономна Республіка Крим", lat: 45.0333, lng: 35.3833, population: 69000 },
];

function normalizeQuery(q: string): string {
  return q
    .trim()
    .toLowerCase()
    .replace(/[ʼ'`´]/g, "'")
    .replace(/’/g, "'");
}

export function searchCities(query: string, limit = 8): City[] {
  const q = normalizeQuery(query);
  if (!q) return cities.slice(0, limit);
  return cities
    .filter(
      (c) =>
        normalizeQuery(c.name).includes(q) ||
        normalizeQuery(c.oblast).includes(q),
    )
    .slice(0, limit);
}

export function getCity(id: string): City | undefined {
  return cities.find((c) => c.id === id);
}
