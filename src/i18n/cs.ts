import type { Dictionary } from './types'

export const cs: Dictionary = {
  localeName: 'Čeština',
  flag: '🇨🇿',
  currency: { symbol: 'Kč', rate: 24, position: 'after', thousand: ' ' },
  ui: {
    announce: '✨ Doprava 90 Kč · Zdarma nad 2 000 Kč · Snadné vrácení do 30 dnů ✨',
    search: {
      placeholder: 'Hledejte mikiny, šaty, tenisky…',
      submit: 'Hledat',
      aria: 'Hledat',
    },
    nav: {
      menuOpen: 'Otevřít menu',
      menuClose: 'Zavřít menu',
      wishlist: 'Oblíbené',
      cartOpen: 'Otevřít košík',
      cartClose: 'Zavřít košík',
      language: 'Jazyk',
    },
    hero: {
      pill: '🌿 Nová jarní kolekce 2026',
      titleLine1: 'Měkké, bezpečné a',
      titleAccent: 'nesmírně stylové',
      titleLine2: 'oblečení pro nejmenší',
      sub: 'Prémiové oblečení z biobavlny pro malé dobrodruhy — šetrné k jemné pokožce, ohleduplné k planetě a stvořené k milování (a dědění).',
      shop: 'Nakupovat novou kolekci',
      explore: 'Prozkoumat kategorie',
      stat1: '50k+',
      stat1Label: 'Spokojených rodin',
      stat2: '4,9★',
      stat2Label: '12k recenzí',
      stat3: '100%',
      stat3Label: 'Biobavlna',
      shipping: 'Doprava zdarma nad 2 000 Kč',
      bestsellerTag: 'Nejprodávanější',
    },
    categoriesSection: {
      eyebrow: 'Nakupovat podle kategorie',
      title: 'Najděte jejich nového favorita',
      sub: 'Od prvního mazlení po hrdiny z hřiště — pečlivě vybrané kolekce pro každý věk.',
    },
    featured: {
      eyebrow: 'Vybráno pro vás',
      title: 'Oblíbené kousky',
      sub: 'Kousky, ke kterým se rodiče stále vracejí — měkké, odolné a roztomilé.',
    },
    bestsellers: {
      eyebrow: 'Miláčci zákazníků',
      title: 'Nejprodávanější tento týden',
      sub: 'Milované tisíci dětí a jejich rodičů.',
    },
    seasonal: {
      eyebrow: 'Jaro 2026',
      title: 'Sezónní kolekce',
      sub: 'Vzdušné vrstvy a styly připravené na slunce pro teplejší dny.',
    },
    viewAll: 'Zobrazit vše',
    promo: {
      tag: 'Omezená nabídka',
      titleA: 'Nová jarní kolekce',
      titleHighlight: 'sleva až 30 %',
      sub: 'Svěží pastely, vzdušné bavlny a kousky stvořené k protáčení. Rozkvěťte do nové sezóny s Little One Store.',
      cta: 'Nakoupit ve slevě',
      days: 'dní',
      hrs: 'hod',
      min: 'min',
      sec: 'sek',
    },
    benefits: {
      organic: {
        title: 'Biobavlna',
        text: 'Vlákna s certifikací GOTS bez pesticidů, šetrná k jemné pokožce.',
      },
      delivery: {
        title: 'Rychlé doručení',
        text: 'Doprava 90 Kč, odeslání za 2–4 dny. Zdarma nad 2 000 Kč.',
      },
      returns: {
        title: 'Snadné vrácení',
        text: 'Rozmysleli jste si to? Pohodlné vrácení bez otázek do 30 dnů.',
      },
      payment: {
        title: 'Bezpečná platba',
        text: 'Šifrování na bankovní úrovni a důvěryhodná pokladna.',
      },
    },
    reviewsSection: {
      eyebrow: 'Milováno rodiči',
      title: '50 000+ spokojených malých zákazníků',
      sub: 'Skutečná slova rodin, které oblékají své nejmenší do Little One Store.',
    },
    newsletter: {
      title: 'Přidejte se k rodině Little One Store',
      sub: 'Získejte 10% slevu na první objednávku a předběžný přístup k novinkám, tipům pro rodiče a pastelové inspiraci.',
      placeholder: 'vas@email.cz',
      cta: 'Získat 10% slevu',
      done: 'Přihlášeno ✓',
      fine: 'Žádný spam, nikdy. Odhlásit se můžete kdykoli. Je to prototyp 🙂',
      toast: 'Vítejte v rodině! Zkontrolujte schránku 💌',
    },
    shop: {
      eyebrow: 'Nakupovat vše',
      titleAll: 'Celá kolekce',
      resultsFor: 'Výsledky pro',
      countTail: 'stvořených pro pohodlné a sebevědomé nejmenší.',
      pieces: { one: 'kousek', few: 'kousky', many: 'kousků' },
      filters: 'Filtry',
      clearAll: 'Vymazat vše',
      all: 'Vše',
      category: 'Kategorie',
      size: 'Velikost',
      colour: 'Barva',
      age: 'Věk',
      maxPrice: 'Max. cena',
      sort: 'Řadit',
      sortFeatured: 'Doporučené',
      sortPriceAsc: 'Cena: od nejnižší',
      sortPriceDesc: 'Cena: od nejvyšší',
      sortRating: 'Nejlépe hodnocené',
      emptyTitle: 'Zatím žádné výsledky',
      emptySub: 'Zkuste zrušit jeden či dva filtry.',
      reset: 'Resetovat filtry',
    },
    card: {
      view: 'Zobrazit produkt',
      addAria: 'Přidat {name} do košíku',
      wishAdd: 'Přidat do oblíbených',
      outOfStock: 'Vyprodáno',
      wishRemove: 'Odebrat z oblíbených',
    },
    badges: { Bestseller: 'Nejprodávanější', New: 'Novinka' },
    cart: {
      title: 'Váš košík',
      addMore: 'Přidejte ještě {amount} pro dopravu zdarma 🚚',
      freeUnlocked: '🎉 Máte dopravu zdarma!',
      emptyTitle: 'Váš košík je prázdný',
      emptySub: 'Přidejte pár roztomilých kousků a začněte.',
      continue: 'Pokračovat v nákupu',
      subtotal: 'Mezisoučet',
      shipping: 'Doprava',
      shippingFree: 'Zdarma',
      total: 'Celkem',
      note: 'Ceny jsou konečné, včetně DPH.',
      checkout: 'K pokladně',
      clear: 'Vyprázdnit košík',
      checkoutToast: 'Pokladna je prototyp — nic nebylo účtováno 💖',
      sizeLabel: 'Velikost',
      decrease: 'Snížit množství',
      increase: 'Zvýšit množství',
      remove: 'Odebrat',
    },
    product: {
      back: 'Zpět na kolekci',
      reviews: 'recenzí',
      save: 'Ušetříte {amount}',
      colour: 'Barva',
      size: 'Velikost',
      quantity: 'Množství',
      addToCart: 'Přidat do košíku',
      deliveryInfo: 'Doprava 90 Kč, zdarma nad 2 000 Kč · odeslání za 2–4 dny',
      returnsInfo: 'Snadné vrácení a výměna do 30 dnů',
      similar: 'Mohlo by se vám líbit',
      notFoundTitle: 'Produkt nenalezen',
      notFoundSub: 'Tento kousek se nám nepodařilo najít.',
      backHome: 'Zpět na domovskou stránku',
    },
    footer: {
      tagline:
        'Prémiové oblečení šetrné k planetě pro malé dobrodruhy. Navrženo s láskou, stvořené k dědění.',
      contactTitle: 'Kontaktujte nás',
      contact: ['✉️ hello@littleonestore.cz', '📍 Hviezdoslavova 545/41, Brno'],
      companyTitle: 'Provozovatel',
      company: ['Azruk s.r.o.', 'IČO: 14420333', 'Hviezdoslavova 545/41', 'Brno'],
      secure: '🔒 Bezpečná pokladna',
      rights: '© 2026 Little One Store · Azruk s.r.o. Všechna práva vyhrazena.',
      credit: 'Web vytvořila Rakaprime Consulting Group s.r.o.',
      columns: [
        {
          title: 'Nakupovat',
          links: ['Nová kolekce', 'Miminka', 'Holky', 'Kluci'],
        },
        {
          title: 'Pomoc',
          links: ['Tabulka velikostí', 'Doprava', 'Vrácení a výměny', 'Sledovat objednávku', 'Kontakt'],
        },
        {
          title: 'Společnost',
          links: ['Náš příběh', 'Udržitelnost', 'Kariéra', 'Tisk', 'Prodejny'],
        },
      ],
    },
    toast: {
      added: '{name} přidáno do košíku',
      wishOn: 'Uloženo do oblíbených',
      wishOff: 'Odebráno z oblíbených',
    },
    colors: {
      Pink: 'Růžová',
      'Peach Pink': 'Broskvově růžová',
      'Dark Pink': 'Tmavě růžová',
      Peach: 'Broskvová',
      Beige: 'Béžová',
      Green: 'Zelená',
      'Dark Green': 'Tmavě zelená',
      Grey: 'Šedá',
      Greige: 'Šedo-béžová',
      Blue: 'Světle modrá',
      Red: 'Červená',
      Cream: 'Smetanová',
      Safari: 'Safari',
      Script: 'S nápisem',
      Print: 'S potiskem',
    },
  },
  categories: {
    baby: { name: 'Miminka', tagline: '0–24 měsíců' },
    girls: { name: 'Holky', tagline: '0–24 měsíců' },
    boys: { name: 'Kluci', tagline: '0–24 měsíců' },
    shoes: { name: 'Boty', tagline: 'První krůčky' },
    accessories: { name: 'Doplňky', tagline: 'Dotek na závěr' },
    'new-collection': { name: 'Nová kolekce', tagline: 'Čerstvé novinky' },
  },
  products: {
    'girls-summer-set': {
      name: 'Dívčí letní set – tričko a šortky',
      description:
        'Lehký a pohodlný letní komplet ze 100% bavlny, který zajistí maximální komfort i během horkých dnů. Souprava obsahuje růžové tričko s ozdobnou aplikací mašle a pruhované šortky s pružným pasem. Ideální na procházky, hraní i každodenní nošení.',
      material: '100 % bavlna, měkká a prodyšná',
    },
    'girls-flower-set': {
      name: 'Dívčí souprava – mikina a kalhoty',
      description:
        'Elegantní a pohodlná souprava z 95 % bavlny a 5 % elastanu. Komplet tvoří mikina s dlouhým rukávem, ozdobným krajkovým límečkem a jemným květinovým vzorem spolu s pohodlnými kalhotami s pružným pasem. Měkká, příjemná na dotek a zároveň pružná.',
      material: '95 % bavlna, 5 % elastan',
    },
    'bunny-3piece-set': {
      name: 'Dětská 3dílná souprava se zajíčkem',
      description:
        'Stylová a pohodlná 3dílná souprava pro nejmenší, ideální na jaro, podzim i chladnější letní dny. Komplet obsahuje mikinu s roztomilým motivem zajíčka, pohodlné bavlněné kalhoty a lehce zateplenou vestu s kapucí. K dispozici v béžové a růžové barvě.',
      material: 'Mikina a kalhoty 100 % bavlna · vesta 50 % bavlna, 50 % polyester',
    },
    'cotton-pants-2pack': {
      name: 'Dětské bavlněné kalhoty – 2 ks',
      description:
        'Pohodlné dětské kalhoty ze 100% bavlny pro každodenní nošení. Sada obsahuje 2 kusy – jedny s veselým motivem safari zvířátek a jedny jednobarevné s potiskem zebry. Díky pružnému pasu se snadno oblékají a perfektně padnou.',
      material: '100 % bavlna, měkká a prodyšná',
    },
    'bear-3piece-set': {
      name: 'Chlapecká 3dílná souprava s medvídkem',
      description:
        'Pohodlná a stylová 3dílná souprava pro malé kluky, ideální na jaro, podzim i chladnější dny. Součástí kompletu je mikina s roztomilým motivem medvídka, pohodlné bavlněné kalhoty a lehce zateplená vesta s kapucí. K dispozici v modré a šedé barvě.',
      material: 'Mikina a kalhoty 100 % bavlna · vesta 50 % bavlna, 50 % polyester',
    },
    'boys-vest-3piece': {
      name: 'Chlapecká 3dílná souprava s vestou',
      description:
        'Moderní a pohodlná 3dílná souprava pro malé kluky, ideální na jaro, podzim i chladnější dny. Komplet obsahuje mikinu s dlouhým rukávem, pohodlné kalhoty a lehce zateplenou vestu s kapucí. Stylový design vhodný pro každodenní nošení.',
      material: 'Mikina a kalhoty 100 % bavlna · vesta 50 % bavlna, 50 % polyester',
    },
    'boys-hoodie-3piece': {
      name: 'Chlapecká 3dílná souprava s mikinou',
      description:
        'Stylová a pohodlná 3dílná souprava pro malé kluky, ideální pro každodenní nošení. Komplet obsahuje tričko s dlouhým rukávem, pohodlné kalhoty a mikinu na zip s kapucí. Moderní barvy a sportovní design z ní dělají skvělou volbu na procházky i hraní.',
      material: '100 % bavlna, měkká a prodyšná',
    },
    'elephant-2piece-set': {
      name: 'Chlapecká souprava se sloníkem',
      description:
        'Pohodlná a stylová 2dílná souprava pro malé kluky. Komplet obsahuje mikinu s dlouhým rukávem a roztomilou aplikací sloníka a pohodlné kalhoty s pružným pasem. Jemná modro-bílá barevná kombinace pro každodenní nošení.',
      material: '100 % bavlna, měkká a prodyšná',
    },
    'girls-love-3piece': {
      name: 'Dívčí 3dílná souprava Love',
      description:
        'Stylová a pohodlná 3dílná souprava pro malé slečny. Komplet obsahuje tričko s dlouhým rukávem, pohodlné kalhoty a mikinu na zip s kapucí. Romantický design se srdíčky a nápisem Love dodává soupravě roztomilý vzhled.',
      material: '100 % bavlna, měkká a prodyšná',
    },
    'girls-vest-3piece': {
      name: 'Dívčí 3dílná souprava s vestou',
      description:
        'Elegantní a pohodlná 3dílná souprava pro malé slečny, ideální na jaro, podzim i chladnější dny. Komplet obsahuje mikinu s dlouhým rukávem, pohodlné kalhoty a lehce zateplenou vestu s kapucí. Jemná růžová barva se zlatými květinovými detaily.',
      material: 'Mikina a kalhoty 100 % bavlna · vesta 50 % bavlna, 50 % polyester',
    },
    'boys-shirt-set': {
      name: 'Chlapecký letní komplet – košile a šortky',
      description:
        'Elegantní letní 2dílný komplet pro malé kluky, ideální na rodinné oslavy, focení i běžné nošení. Souprava obsahuje stylovou košili s krátkým rukávem a pohodlné šortky s kapsami. Díky 100% bavlně je komplet lehký a prodyšný.',
      material: '100 % bavlna, lehká a prodyšná',
    },
    'boys-summer-set': {
      name: 'Chlapecký letní komplet – tričko a šortky',
      description:
        'Lehký a pohodlný 2dílný komplet pro malé kluky, ideální na teplé letní dny. Souprava obsahuje bavlněné tričko s krátkým rukávem a pohodlné šortky s pružným pasem. Elegantní kombinace bílé a barevných tónů.',
      material: '100 % bavlna, lehká a prodyšná',
    },
    'tropical-summer-set': {
      name: 'Chlapecký letní komplet s tropickým vzorem',
      description:
        'Lehký a stylový 2dílný letní komplet pro malé kluky. Souprava obsahuje pohodlné tričko s krátkým rukávem a šortky s tropickým vzorem listů. Díky 100% bavlně je komplet příjemný na nošení a ideální do teplých letních dnů.',
      material: '100 % bavlna, lehká a prodyšná',
    },
    'boys-cotton-set': {
      name: 'Chlapecká souprava – tričko a kalhoty',
      description:
        'Lehká a pohodlná 2dílná souprava pro malé kluky, ideální na teplejší dny. Komplet obsahuje tričko s krátkým rukávem a dlouhé kalhoty s pružným pasem v elegantní béžovo-hnědé kombinaci.',
      material: '100 % bavlna, měkká a prodyšná',
    },
    'girls-c-3piece': {
      name: 'Dívčí 3dílná souprava s písmenem C',
      description:
        'Stylová a pohodlná 3dílná souprava pro malé slečny. Komplet obsahuje tričko s dlouhým rukávem, pohodlné kalhoty a lehkou mikinu na patentky. Jemná růžová barva a moderní design s písmenem C dodávají sportovně-elegantní vzhled.',
      material: '100 % bavlna, měkká a prodyšná',
    },
    'girls-floral-3piece': {
      name: 'Dívčí 3dílná souprava s květinami',
      description:
        'Roztomilá a pohodlná 3dílná souprava pro malé princezny. Komplet obsahuje body s dlouhým rukávem, pohodlné kalhoty a mikinu s kapucí. Jemná broskvová barva v kombinaci s květinovým motivem vytváří něžný a elegantní vzhled.',
      material: '100 % bavlna, měkká a prodyšná',
    },
    'newborn-bunny-set': {
      name: 'Novorozenecká souprava se zajíčkem',
      description:
        'Roztomilá 3dílná souprava pro novorozence, která zajistí miminku maximální pohodlí od prvních dnů života. Komplet obsahuje kabátek s dlouhým rukávem, polodupačky a čepičku. Motiv zajíčka s medvídkem je ideální jako první výbavička nebo dárek.',
      material: '100 % bavlna, šetrná k citlivé pokožce novorozence',
    },
    'newborn-bear-set': {
      name: 'Novorozenecká souprava s medvídkem',
      description:
        'Jemná 2dílná souprava pro novorozené holčičky. Komplet obsahuje praktický overal se zapínáním na patentky po celé délce a měkkou čepičku. Jemná růžová barva s roztomilým motivem medvídka se hvězdičkami.',
      material: '100 % bavlna, šetrná k citlivé pokožce novorozence',
    },
    'animal-romper': {
      name: 'Dětský overal se zvířátky',
      description:
        'Měkký a pohodlný overal pro miminka z kvalitní žebrované bavlny. Díky praktickému zapínání na patentky po celé délce se snadno obléká i přebaluje. Roztomilé motivy zvířátek – lvíčci, medvídci i Winnie – jsou ideální pro každodenní nošení i spaní.',
      material: '100 % žebrovaná bavlna, měkká a prodyšná',
    },
    'boys-romper-hat': {
      name: 'Chlapecký overal s čepičkou',
      description:
        'Pohodlný a stylový komplet pro miminka: bavlněný overal se špičkou a dlouhým rukávem a sladěná čepička. Praktické zapínání na patentky po celé délce usnadňuje oblékání i přebalování. Dostupný v zelené, světle modré a šedo-béžové.',
      material: '100 % bavlna, šetrná k citlivé dětské pokožce',
    },
    'tiger-3piece-set': {
      name: 'Chlapecká 3dílná souprava s tygříkem',
      description:
        'Roztomilá a pohodlná 3dílná souprava pro malé dobrodruhy. Komplet obsahuje body s dlouhým rukávem, pohodlné kalhoty a sladěnou čepičku. Veselý motiv tygříka a moderní zvířecí vzor dodávají soupravě originální vzhled.',
      material: '100 % bavlna, šetrná k citlivé dětské pokožce',
    },
    'hearts-skirt-set': {
      name: 'Dívčí souprava se srdíčky a sukýnkou',
      description:
        'Elegantní a roztomilá 3dílná souprava pro malé princezny. Komplet obsahuje body s dlouhým rukávem, stylovou sukýnku s velkou mašlí a sladěnou čelenku. Jemný vzor červených srdíček je ideální na oslavy, focení i každodenní nošení.',
      material: '100 % bavlna, měkká a prodyšná',
    },
    'hearts-3piece-set': {
      name: 'Dívčí 3dílná souprava se srdíčky',
      description:
        'Stylová a pohodlná 3dílná souprava pro malé princezny. Komplet obsahuje body s dlouhým rukávem, pohodlné kalhoty a mikinu s kapucí zdobenou motivem srdíček a mašlí. Moderní kombinace červené a smetanové barvy s jemným žebrovaným vzorem.',
      material: '100 % bavlna, měkká a prodyšná',
    },
    'fox-romper-set': {
      name: 'Dívčí souprava s liškou',
      description:
        'Něžná a elegantní souprava pro malé princezny. Komplet obsahuje pohodlný overal s dlouhým rukávem a sladěnou čelenku nebo čepičku. Romantický motiv lišky a květin je ideální pro první společné chvíle i slavnostní příležitosti.',
      material: '100 % bavlna, šetrná k citlivé dětské pokožce',
    },
    'ribbed-romper-set': {
      name: 'Dívčí žebrovaný overal s čelenkou',
      description:
        'Stylový a pohodlný komplet pro malé princezny: měkký žebrovaný overal s dlouhým rukávem a sladěná čelenka s mašlí. Elegantní volánky na ramenou a ozdobná mašle dodávají outfitu jemný a moderní vzhled. V béžové a tmavě zelené barvě.',
      material: '100 % žebrovaná bavlna, měkká a prodyšná',
    },
    'elegant-romper': {
      name: 'Dívčí elegantní overal',
      description:
        'Jemný a elegantní overal, který spojuje pohodlí s krásným slavnostním vzhledem. Kombinace měkké bavlny, ozdobného límečku, mašličky v pase a třpytivých růžových kalhot je ideální pro výjimečné příležitosti i každodenní nošení.',
      material: '100 % bavlna, měkká a prodyšná',
    },
  },
  reviews: {
    r1: {
      location: 'Lisabon, PT',
      text: 'Biobavlna je neuvěřitelně měkká — moje dcera má citlivou pokožku a tohle je jediné oblečení, které ji nikdy nedráždí. Nádherná kvalita.',
    },
    r2: {
      location: 'Manchester, UK',
      text: 'Objednali jsme bundu Malý objevitel pro naše dvojčata. Vyprali jsme ji už tucetkrát a pořád vypadá jako nová. Stojí za každou korunu.',
    },
    r3: {
      location: 'Berlín, DE',
      text: 'Doručení bylo bleskové a obal nádherný a bez plastů. Celý zážitek působil prémiově od začátku do konce.',
    },
    r4: {
      location: 'Kodaň, DK',
      text: 'Konečně dětská značka, která vypadá tak dobře, jak je příjemná. Barvy jsou jemné a moderní — pokaždé sklízím komplimenty.',
    },
  },
}
