// ASCII companion to spec section 2. Order matches the spec table position-for-position
// (core cities, then ring2); build-config asserts the counts line up. `ads` is the exact
// Google Ads location_name prefix in /v3/keywords_data/google_ads/locations/il (checked
// 2026-11-07); null = no Google Ads location code -> V_source "imputed" (spec 2, 3.4).
export const CITY_TABLE = {
  R1: {
    core: [
      ['tel-aviv', 'Tel Aviv-Yafo'], ['ramat-gan', 'Ramat Gan'], ['givatayim', "Giv'atayim"],
      ['bnei-brak', 'Bnei Brak'], ['holon', 'Holon'], ['bat-yam', 'Bat Yam'], ['petah-tikva', 'Petah Tikva'],
    ],
    ring2: [
      ['kiryat-ono', 'Kiryat Ono'], ['or-yehuda', 'Or Yehuda'], ['yehud-monosson', 'Yehud-Monosson'],
      ['rosh-haayin', 'Rosh Haayin'], ['givat-shmuel', null, 'Giv\'at Shmuel'],
    ],
  },
  R2: {
    core: [
      ['netanya', 'Netanya'], ['herzliya', 'Herzliya'], ['raanana', "Ra'anana"], ['kfar-saba', 'Kefar Sava'],
      ['hod-hasharon', 'Hod Hasharon'], ['ramat-hasharon', 'Ramat Hasharon'],
    ],
    ring2: [['even-yehuda', 'Even Yehuda'], ['kadima-zoran', 'Kadima Zoran'], ['kfar-yona', 'Kfar Yona'], ['tel-mond', 'Tel Mond']],
  },
  R3: {
    core: [
      ['rishon-lezion', 'Rishon LeZion'], ['rehovot', 'Rehovot'], ['ness-ziona', 'Ness Ziona'], ['yavne', 'Yavne'],
      ['lod', 'Lod'], ['ramla', 'Ramla'], ['modiin', "Modi'in-Maccabim-Re'ut"],
    ],
    ring2: [
      ['gedera', 'Gedera'], ['mazkeret-batya', 'Mazkeret Batya'], ['beer-yaakov', "Be'er Ya'akov"],
      ['gan-yavne', 'Gan Yavne'], ['shoham', 'Shoham'],
    ],
  },
  R4: {
    core: [['jerusalem', 'Jerusalem']],
    ring2: [['mevaseret-zion', 'Mevaseret Zion'], ['beit-shemesh', 'Bet Shemesh'], ['maale-adumim', null, "Ma'ale Adumim"]],
  },
  R5: {
    core: [['haifa', 'Haifa']],
    ring2: [
      ['kiryat-ata', 'Kiryat Ata'], ['kiryat-bialik', 'Kiryat Bialik'], ['kiryat-motzkin', 'Kiryat Motzkin'],
      ['kiryat-yam', 'Kiryat Yam'], ['nesher', 'Nesher'], ['tirat-carmel', 'Tirat Carmel'],
    ],
  },
  R6: {
    core: [['hadera', 'Hadera']],
    ring2: [
      ['pardes-hanna-karkur', 'Pardes Hanna-Karkur'], ['zikhron-yaakov', "Zikhron Ya'akov"],
      ['binyamina', "Binyamina-Giv'at Ada"], ['or-akiva', 'Or Akiva'],
    ],
  },
  R7: {
    core: [['afula', 'Afula'], ['nof-hagalil', 'Nof HaGalil']],
    ring2: [['yokneam-illit', "Yokne'am Illit"], ['migdal-haemek', 'Migdal HaEmek'], ['tiberias', 'Tiberias']],
  },
  R8: {
    core: [['karmiel', 'Karmiel'], ['nahariya', 'Nahariyya'], ['akko', 'Acre']],
    ring2: [['maalot-tarshiha', "Ma'alot-Tarshiha"], ['kiryat-shmona', 'Qiryat Shemona']],
  },
  R9: {
    core: [['ashdod', 'Ashdod'], ['ashkelon', 'Ashkelon']],
    ring2: [['kiryat-malakhi', 'Kiryat Malakhi'], ['kiryat-gat', 'Kiryat Gat'], ['sderot', 'Sderot']],
  },
  R10: {
    core: [['beer-sheva', "Be'er Sheva"]],
    ring2: [['omer', 'Omer'], ['ofakim', 'Ofakim'], ['dimona', 'Dimona'], ['lehavim', null, 'Lehavim'], ['netivot', 'Netivot']],
  },
};

// English name used for the geocode fallback query.
export function englishName(entry) {
  return entry[2] ?? entry[1];
}
