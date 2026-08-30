/* =========================================================
   НАСТРОЙКА — впиши свои значения из Supabase
   ========================================================= */
export const SUPABASE_URL = "https://fpatqbdoqwkpfjnruwcx.supabase.co";
export const SUPABASE_KEY = "sb_publishable_VMaQNWRJwv1WIfAa_9TTAg_JZMcieyu";

export const CITIES = {
  "Алматы": { center:[43.238,76.913], zoom:12, districts:{
    "Медеуский":[43.238,76.955], "Бостандыкский":[43.230,76.900],
    "Алмалинский":[43.255,76.920], "Ауэзовский":[43.220,76.850],
    "Наурызбайский":[43.200,76.820], "Алатауский":[43.300,76.900],
    "Жетысуский":[43.290,76.930], "Турксибский":[43.300,76.960],
  }},
  "Астана": { center:[51.169,71.449], zoom:12, districts:{
    "Алматинский":[51.130,71.430], "Есильский":[51.100,71.410],
    "Сарыаркинский":[51.190,71.420], "Байконурский":[51.200,71.470], "Нура":[51.100,71.550],
  }},
  "Шымкент": { center:[42.317,69.587], zoom:12, districts:{
    "Абайский":[42.340,69.600], "Аль-Фарабийский":[42.310,69.580],
    "Енбекшинский":[42.300,69.620], "Каратауский":[42.370,69.550], "Туран":[42.320,69.630],
  }},
};
export const COLORS = ["#5b8def","#e07a5f","#81b29a","#f2cc8f","#9d84b7","#e29578","#83c5be"];

// Жилые комплексы по городам (для фильтра и формы)
export const COMPLEXES = {
  "Алматы": [
    "7Su Nury","AFD Plaza","ALA Park","ALA Town","Almaly Park","Aura",
    "BI City","Botanika","Central Avenue","Comfort City","Dream City Family",
    "Esentai City","Green Park","Hayat Park","Highvill","Mega Tower",
    "Nova City","O'NER Towers","Sensata","Tumar","Verdi","Vista",
    "Аскарова","Бельведер","Керемет","Мерей","Ремизовка","Розмарин",
    "Сымбат","Тау Самал","Экватор",
    // Полный список ЖК с krisha.kz (страница "Популярные новостройки в Алматы")
    "Аль-Фараби","Gulder","Горное Солнце","Династия","Riviera","Medeu City","Dostyk",
    "Комфорт Сити","Nest Grand","Etasa Residence","Kokjiek City","Родник",
    "Коттеджный городок Tauda Villa 3.0","Клубный дом Seneca","RAMS Saiahat",
    "Boulevard Residence","Exclusive Opera","Arena Park","Noble House","Aisafi",
    "Oslo Residence","Magnit Alatau","TUMANBAY MOLDAGALIYEV","Prime Park","Vesper",
    "Аврора","Zangar","Alkey Margulan","Saulet","RAMS City","1st by BI",
    "Arena City. Life","Arena City. Park","Каспий","Status 2.0","Miras Park",
    "Чешские террасы","Тан Нуры","Luxury Park","Lancashire","Exclusive Юбилейный",
    "Green City","Auezov City","PRIMAVERA","Aulet","ORDA CITY","Munar Tau",
    "Коттеджный городок Regis Hills","Nurly Dala 2","Jana Arbat","Royal Time",
    "Клубный дом на Жамакаева","Loro Residence","MEREI","Altyn Ai","Arena Sunset",
    "Seifullin","UMAI","Kenesary","DOSTYQ 300","Клубный дом Benelux","Asyl Tas",
    "Selin Residence","Centrium",
    "ASYL MURA","Orient","Ayala Park","Apple Residence","NEOPARK","Biography",
    "Бигвилль Dream City. Family","Maxima City","DASTUR","AURUS",
    "Arena City. Balance","Бигвилль Arena City. Sport","Palladium","Legenda",
    "Аманат","Жандосова","4YOU","Клубный дом Grande Vie","Атмосфера",
    "AL'FARABI 27","Aqtolqyn Grand","SEYFULLIN PARK","M. Park","Северный",
    "Клубный дом La Era de Aquarius","Mereke","Turan",
    "Коттеджный городок Sunrise Village","Birlik","Raaf Park","Клубный дом Baitas",
    "Мадениет 1","River City","Таунхаус Remizovka Life","Клубный дом Tamga Residence",
    "Mangilik","Riviera PLUS","Жайна","BAIQADAM","Kosmonavtova","El Monte",
    "Коттеджный городок Дубровка","Hayat Arena","Jan Dostar","Madeniet",
    "Nurlitau Hills","KAMENKA LUXURY","Vendome","South Garden","Alatau House",
    "Parasat","NOVA","Ansar","Клубный дом PARKVILLE","Satpaev","RAMS EVO",
    "Бигвилль Dream City. Eco","Abay 130","Orion III","Jazz-квартал","Хан Тенгри",
    "Таунхаус Blackberry Hills","Metropole","Qarasai Park",
    "Европолис","Alasha Residence","Seven Hills","Gul-Ana","Estet","Lifetown",
    "BUTA Legacy","Miracle","Hayat Meliora","Kamila","BUTA Fenomen","Autograph",
    "Айнабулак 33/2","Клубный дом 44","Ulytau","Aspen","Наследие","Kaycap",
    "На Кассина","Habi park","BASTION","O'NER","BUTA Albion","Жетысу (Казстрой)",
    "Shabyt","Everest Boulevard","Жас Отау","Jar-Jar","Privilegia","Hayat Astoria",
    "Клубный дом Millenium","Tarlan","Melody","Admiral","Synergy Towers",
    "BUTA Meken","Dream City. Promenade","Клубный дом Silva Residence",
    "Sunny Village","Бигвилль Jibek Joly","Diamond","Satay","Altai City",
    "Kamenka Park","Koktobe city","КУАТ на Масанчи — Абая","Клубный дом De Ville",
    "AMIR","President's Park","Megapolis","R-House","Apple Park","Nurly Dala",
    "Elif Garden","Jetisu Park","Ozhet Plus","Exclusive Duet","QAZYNA",
    "Таунхаус Garden House","Достар Deluxe","Arman City","DAS HAUS",
    "Alma Villa Deluxe","BUTA Legend","Hayat Regency",
  ],
  "Астана": ["Triumph Astana","Nurly Tau","Capital Hill","Highvill","Park View","Expo City","Riverside"],
  "Шымкент": ["Нурлы Жол","Арман","Достык Plaza","Алтын Орда"],
};

export const PAGE_SIZE = 24; // сколько объявлений на одной странице
