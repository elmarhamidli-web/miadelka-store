// Info / legal pages: Obchodní podmínky, Tabulka velikostí, Doprava a
// vrácení, Kontakt. Short content is localised via the dictionary; the
// legally binding Terms & Conditions are kept in Czech (per §8.2 of the
// terms) with a short note for EN/UK visitors.
import { useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useI18n } from '../i18n'
import { applyPageSeo } from '../lib/seo'
import { ArrowIcon } from './icons'

function useInfoPage(title: string, description: string, path: string) {
  const { locale } = useI18n()
  const { hash } = useLocation()
  useEffect(() => {
    applyPageSeo(locale, title, description, path)
    if (hash) {
      // Let the section render first, then scroll to the anchor.
      const el = document.getElementById(hash.slice(1))
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        return
      }
    }
    window.scrollTo({ top: 0 })
  }, [locale, title, description, path, hash])
}

function InfoShell({ title, children }: { title: string; children: React.ReactNode }) {
  const navigate = useNavigate()
  const { dict } = useI18n()
  return (
    <section className="section info-page">
      <div className="container info-page__container">
        <button className="product-page__back" onClick={() => navigate('/')}>
          <ArrowIcon flip /> {dict.ui.pages.back}
        </button>
        <motion.div
          className="info-page__panel"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <h1 className="info-page__title">{title}</h1>
          {children}
        </motion.div>
      </div>
    </section>
  )
}

/* ================= Tabulka velikostí ================= */

export function SizeGuidePage() {
  const { dict } = useI18n()
  const p = dict.ui.pages
  useInfoPage(p.sizeTitle, p.sizeIntro, '/velikosti')
  return (
    <InfoShell title={p.sizeTitle}>
      <p className="info-page__intro">{p.sizeIntro}</p>
      <div className="size-table__wrap">
        <table className="size-table">
          <thead>
            <tr>
              <th>{p.sizeColAge}</th>
              <th>{p.sizeColHeight}</th>
            </tr>
          </thead>
          <tbody>
            {p.sizeRows.map(([age, height]) => (
              <tr key={age}>
                <td>{age}</td>
                <td>{height}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="info-page__tip">💡 {p.sizeTip}</p>
    </InfoShell>
  )
}

/* ================= Doprava a vrácení ================= */

const SHIP_ANCHORS = ['doprava', 'platba', 'vraceni', 'reklamace']

export function ShippingReturnsPage() {
  const { dict } = useI18n()
  const p = dict.ui.pages
  useInfoPage(p.shipTitle, p.shipSections[0]?.ps[0] ?? p.shipTitle, '/doprava-a-vraceni')
  return (
    <InfoShell title={p.shipTitle}>
      {p.shipSections.map((s, i) => (
        <section className="info-page__section" id={SHIP_ANCHORS[i]} key={s.h}>
          <h2>{s.h}</h2>
          {s.ps.map((text, j) => (
            <p key={j}>{text}</p>
          ))}
        </section>
      ))}
    </InfoShell>
  )
}

/* ================= Kontakt ================= */

export function ContactPage() {
  const { dict } = useI18n()
  const p = dict.ui.pages
  useInfoPage(p.contactTitle, p.contactIntro, '/kontakt')
  return (
    <InfoShell title={p.contactTitle}>
      <p className="info-page__intro">{p.contactIntro}</p>
      <dl className="contact-list">
        {p.contactRows.map((row) => (
          <div className="contact-list__row" key={row.label}>
            <dt>{row.label}</dt>
            <dd>
              {row.href ? (
                <a
                  href={row.href}
                  {...(row.href.startsWith('http')
                    ? { target: '_blank', rel: 'noopener noreferrer' }
                    : {})}
                >
                  {row.value}
                </a>
              ) : (
                row.value
              )}
            </dd>
          </div>
        ))}
      </dl>
    </InfoShell>
  )
}

/* ================= Obchodní podmínky ================= */
// Full wording of the official Terms & Conditions document
// (Little_One_Store_01_Obchodni_podminky, effective 1 July 2026).

interface TermsSection {
  h: string
  ps: string[]
}

const TERMS_META: [string, string][] = [
  ['Obchodní firma', 'Azruk s.r.o.'],
  ['IČO', '14420333'],
  ['DIČ', 'CZ14420333'],
  ['Sídlo', 'Hviezdoslavova 545/41, 627 00 Brno'],
  ['E-mail', 'info@littleonestore.cz'],
  ['Telefon', '+420 604 364 804'],
  ['Bankovní účet', '7441532004/5500'],
  ['Internetový obchod', 'Little One Store, web: www.littleonestore.cz'],
]

const TERMS: TermsSection[] = [
  {
    h: '1. Úvodní ustanovení',
    ps: [
      '1. Tyto obchodní podmínky upravují vzájemná práva a povinnosti mezi prodávajícím a kupujícím při nákupu zboží prostřednictvím internetového obchodu Little One Store provozovaného společností Azruk s.r.o.',
      '2. Kupujícím je spotřebitel nebo podnikatel. Spotřebitelem je fyzická osoba, která mimo rámec své podnikatelské činnosti nebo mimo rámec samostatného výkonu svého povolání uzavírá smlouvu s prodávajícím nebo s ním jinak jedná.',
      '3. Odesláním objednávky kupující potvrzuje, že se seznámil s těmito obchodními podmínkami, reklamačním řádem a zásadami ochrany osobních údajů.',
    ],
  },
  {
    h: '2. Sortiment zboží',
    ps: [
      '1. Internetový obchod nabízí zejména dětské a kojenecké oblečení, dětské soupravy, body, overaly, šaty, trička, kalhoty, mikiny, doplňky a další související zboží.',
      '2. Fotografie zboží mají informační charakter. Barvy se mohou mírně lišit podle nastavení displeje, světelných podmínek při focení nebo výrobní šarže.',
      '3. U dětského oblečení mohou být uvedené rozměry orientační. Tolerance rozměrů může činit přibližně +/- 1 až 3 cm podle střihu a materiálu.',
    ],
  },
  {
    h: '3. Uživatelský účet',
    ps: [
      '1. Pokud internetový obchod umožňuje registraci, může si kupující vytvořit zákaznický účet. Kupující je povinen uvádět pravdivé, přesné a aktuální údaje.',
      '2. Přístupové údaje k zákaznickému účtu je kupující povinen chránit před zneužitím. Prodávající nenese odpovědnost za škodu vzniklou neoprávněným použitím účtu třetí osobou, pokud k tomu došlo porušením povinností kupujícího.',
      '3. Prodávající si vyhrazuje právo zákaznický účet zrušit zejména při dlouhodobé neaktivitě, porušení obchodních podmínek nebo zneužití účtu.',
    ],
  },
  {
    h: '4. Objednávka a uzavření kupní smlouvy',
    ps: [
      '1. Prezentace zboží na internetovém obchodě je informativní. Kupní smlouva vzniká okamžikem potvrzení objednávky prodávajícím zaslaným na e-mail kupujícího.',
      '2. Objednávka se stává závaznou jejím odesláním prostřednictvím objednávkového formuláře. Před odesláním objednávky má kupující možnost zkontrolovat a změnit zadané údaje.',
      '3. Tlačítko pro odeslání objednávky bude označeno tak, aby bylo zřejmé, že objednávka zahrnuje povinnost platby, například textem „Objednat s povinností platby" nebo obdobným srozumitelným označením.',
      '4. Prodávající si vyhrazuje právo objednávku odmítnout zejména v případě nedostupnosti zboží, zjevné chyby v ceně, podezření na zneužití systému nebo nemožnosti doručení do zvolené země.',
    ],
  },
  {
    h: '5. Ceny a DPH',
    ps: [
      '1. Ceny zboží jsou uvedeny v českých korunách (CZK), pokud není na webu uvedeno jinak. Prodávající je plátcem DPH, ceny jsou uváděny včetně DPH.',
      '2. Cena dopravy, balného a případných platebních poplatků je uvedena v košíku před dokončením objednávky.',
      '3. V případě zjevné technické chyby v ceně není prodávající povinen dodat zboží za chybnou cenu. O takové situaci bude kupující bez zbytečného odkladu informován.',
    ],
  },
  {
    h: '6. Platební podmínky',
    ps: [
      '1. Kupující může objednávku uhradit platebními metodami uvedenými na webu: platba kartou online (karta, Apple Pay, Google Pay), dobírka nebo bankovní převod.',
      '2. Při platbě bankovním převodem hradí kupující cenu na účet prodávajícího 7441532004/5500. Jako variabilní symbol uvede číslo objednávky, pokud mu bude přiděleno.',
      '3. Objednávka je zpravidla expedována po přijetí platby, není-li zvolena dobírka nebo jiný způsob úhrady umožňující expedici před zaplacením.',
      '4. Prodávající si vyhrazuje právo některé platební metody dočasně omezit nebo zrušit.',
    ],
  },
  {
    h: '7. Dodací podmínky',
    ps: [
      '1. Zboží je doručováno prostřednictvím dopravců uvedených v objednávkovém procesu na webu.',
      '2. Adresa pro vrácení zboží a reklamace je stejná jako sídlo prodávajícího: Hviezdoslavova 545/41, 627 00 Brno, pokud nebude na webu uvedeno jinak.',
      '3. Objednávky jsou zpravidla expedovány do 1–3 pracovních dnů od přijetí platby nebo potvrzení objednávky u dobírky. U předobjednávek nebo zboží s delší dostupností platí termín uvedený u produktu.',
      '4. Kupující je povinen při převzetí zásilky zkontrolovat její neporušenost. Pokud je zásilka zjevně poškozená, doporučuje se sepsat s dopravcem škodní protokol nebo zásilku nepřevzít.',
    ],
  },
  {
    h: '8. Prodej do států Evropské unie',
    ps: [
      '1. Internetový obchod umožňuje prodej a dodání zboží do vybraných států Evropské unie. Konkrétní dostupné země, ceny dopravy a orientační dodací lhůty budou uvedeny v objednávkovém procesu.',
      '2. Kupující ze zahraničí bere na vědomí, že komunikace s prodávajícím probíhá zejména v českém jazyce, případně v jiném jazyce dle možností prodávajícího.',
      '3. Při přeshraničním prodeji se mohou lišit dodací lhůty, ceny dopravy a technické možnosti vrácení zboží podle země doručení.',
    ],
  },
  {
    h: '9. Dostupnost zboží a předobjednávky',
    ps: [
      '1. Dostupnost zboží je uvedena u jednotlivých produktů. Ve výjimečných případech může dojít k vyprodání zboží mezi vytvořením objednávky a jejím zpracováním.',
      '2. Pokud prodávající nemůže objednané zboží dodat, informuje kupujícího a nabídne náhradní řešení, například dodání podobného zboží, pozdější dodání nebo vrácení platby.',
      '3. Je-li u produktu umožněna předobjednávka, je termín dodání pouze orientační, pokud není výslovně uvedeno jinak.',
    ],
  },
  {
    h: '10. Přechod vlastnického práva a nebezpečí škody',
    ps: [
      '1. Vlastnické právo ke zboží přechází na kupujícího až úplným zaplacením kupní ceny.',
      '2. Nebezpečí škody na zboží přechází na kupujícího převzetím zboží od dopravce nebo při osobním převzetí, pokud bude osobní převzetí umožněno.',
    ],
  },
  {
    h: '11. Odstoupení od smlouvy spotřebitelem',
    ps: [
      '1. Spotřebitel má právo odstoupit od kupní smlouvy uzavřené na dálku bez udání důvodu ve lhůtě 14 dnů od převzetí zboží. Pokud je v jedné objednávce dodáváno několik kusů zboží samostatně, běží lhůta od převzetí posledního kusu.',
      '2. Odstoupení musí být prodávajícímu oznámeno jednoznačným prohlášením, například e-mailem na info@littleonestore.cz, písemně na adresu sídla nebo prostřednictvím online formuláře / tlačítka pro odstoupení, pokud bude na webu dostupné.',
      '3. Pouhé nepřevzetí zásilky se nepovažuje za odstoupení od smlouvy. Tím nejsou dotčena práva spotřebitele podle právních předpisů.',
      '4. Spotřebitel zašle zboží zpět nejpozději do 14 dnů od odstoupení od smlouvy, pokud se s prodávajícím nedohodne jinak.',
      '5. Zboží musí být vráceno čisté, nepoškozené, bez známek nadměrného používání a pokud možno v původním obalu. Kupující odpovídá za snížení hodnoty zboží způsobené nakládáním nad rámec nutný ke zjištění povahy, vlastností a funkčnosti zboží.',
      '6. Prodávající vrátí kupujícímu přijaté peněžní prostředky nejpozději do 14 dnů od odstoupení od smlouvy, nejdříve však po obdržení vráceného zboží nebo po prokázání jeho odeslání.',
      '7. Náklady na vrácení zboží nese kupující, pokud právní předpis nebo konkrétní akce prodávajícího nestanoví jinak.',
    ],
  },
  {
    h: '12. Výjimky z odstoupení od smlouvy',
    ps: [
      '1. Spotřebitel nemůže odstoupit od smlouvy v případech stanovených právními předpisy, zejména u zboží upraveného podle přání kupujícího nebo pro jeho osobu.',
      '2. Z hygienických důvodů může být omezeno vrácení zboží, které bylo po dodání vyjmuto z uzavřeného obalu a není vhodné jej vrátit z hygienických důvodů, pokud to odpovídá povaze konkrétního produktu a právním předpisům.',
    ],
  },
  {
    h: '13. Výměna velikosti',
    ps: [
      '1. Prodávající může umožnit výměnu velikosti nebo barvy zakoupeného zboží, pokud je požadovaná varianta skladem. Výměna není zákonným nárokem, pokud nejde o reklamaci vady.',
      '2. Podmínky výměny, případné náklady na dopravu a dostupnost variant budou uvedeny na webu nebo dohodnuty individuálně se zákazníkem.',
    ],
  },
  {
    h: '14. Práva z vadného plnění a reklamace',
    ps: [
      '1. Prodávající odpovídá kupujícímu, že zboží při převzetí nemá vady a odpovídá ujednanému popisu, množství, jakosti, funkčnosti a dalším vlastnostem uvedeným na webu.',
      '2. Kupující může reklamaci uplatnit e-mailem, písemně nebo prostřednictvím reklamačního formuláře. V reklamaci uvede číslo objednávky, popis vady, kontakt a případně přiloží fotografie vady.',
      '3. Adresa pro zaslání reklamovaného zboží: Azruk s.r.o., Hviezdoslavova 545/41, 627 00 Brno.',
      '4. Reklamace bude vyřízena bez zbytečného odkladu, nejpozději ve lhůtě stanovené právními předpisy. O výsledku reklamace bude kupující informován e-mailem.',
      '5. Podrobný postup je uveden v samostatném Reklamačním řádu.',
    ],
  },
  {
    h: '15. Dárkové poukazy',
    ps: [
      '1. Prodávající může nabízet dárkové poukazy v elektronické nebo tištěné podobě. Každý poukaz obsahuje jedinečný kód a informaci o hodnotě nebo typu slevy.',
      '2. Dárkový poukaz lze použít pouze k nákupu na internetovém obchodě Little One Store, není-li u poukazu uvedeno jinak.',
      '3. Dárkový poukaz nelze směnit za peníze. Pokud hodnota objednávky převyšuje hodnotu poukazu, kupující doplatí rozdíl. Pokud je hodnota objednávky nižší, nevyčerpaná část se nevrací, není-li uvedeno jinak.',
      '4. Platnost poukazu je uvedena na poukazu nebo v e-mailu s poukazem. Po uplynutí platnosti poukaz nelze uplatnit.',
      '5. Prodávající nenese odpovědnost za zneužití kódu třetí osobou, pokud kupující kód zpřístupnil nebo jej dostatečně nechránil.',
    ],
  },
  {
    h: '16. Slevové kódy a akční nabídky',
    ps: [
      '1. Prodávající může poskytovat slevové kódy, akční nabídky, dárky k objednávce nebo marketingové kampaně.',
      '2. Každý slevový kód může mít vlastní podmínky, zejména dobu platnosti, minimální hodnotu objednávky, omezení na vybrané produkty nebo omezení počtu použití.',
      '3. Není-li výslovně uvedeno jinak, slevové kódy nelze vzájemně kombinovat ani kombinovat s jinými slevami.',
      '4. Slevový kód je nutné zadat před odesláním objednávky. Po odeslání objednávky nelze slevu dodatečně uplatnit.',
      '5. V případě vrácení zboží se vrací pouze skutečně uhrazená částka. Hodnota využité slevy se neproplácí.',
      '6. Prodávající si vyhrazuje právo odmítnout použití kódu při podezření na zneužití, neoprávněné šíření nebo použití v rozporu s podmínkami akce.',
    ],
  },
  {
    h: '17. Dárky k objednávce',
    ps: [
      '1. Pokud prodávající poskytne k objednávce dárek zdarma, je darovací smlouva uzavřena s rozvazovací podmínkou.',
      '2. Pokud kupující odstoupí od kupní smlouvy nebo vrátí zboží tak, že nesplní podmínky pro poskytnutí dárku, je povinen vrátit i dárek.',
      '3. Pokud dárek nevrátí, může prodávající přiměřeně započíst jeho obvyklou hodnotu proti vracené částce, pokud je to v souladu s právními předpisy.',
    ],
  },
  {
    h: '18. Zákaznické recenze',
    ps: [
      '1. Prodávající může na webu zveřejňovat zákaznické recenze produktů nebo nákupu. Pokud prodávající uvádí, že recenze pochází od zákazníka, který zboží zakoupil, používá přiměřená opatření k ověření této skutečnosti, například vazbu na objednávku nebo e-mailovou výzvu po nákupu.',
      '2. Prodávající si vyhrazuje právo nezveřejnit nebo odstranit recenzi obsahující vulgarismy, reklamu, osobní údaje třetích osob, nepravdivá tvrzení, nenávistný obsah nebo obsah odporující právním předpisům.',
      '3. Prodávající neupravuje smysl recenzí. Může provádět technické nebo jazykové úpravy, které nemění význam recenze.',
    ],
  },
  {
    h: '19. Ochrana osobních údajů',
    ps: [
      '1. Prodávající zpracovává osobní údaje kupujících v souladu s platnými právními předpisy, zejména s nařízením GDPR.',
      '2. Podrobné informace o zpracování osobních údajů, právech subjektů údajů, době uchování a předávání údajů dopravcům, poskytovatelům platebních služeb a dalším zpracovatelům jsou uvedeny v dokumentu Zásady ochrany osobních údajů.',
    ],
  },
  {
    h: '20. Cookies',
    ps: [
      '1. Internetový obchod může používat cookies a obdobné technologie. Nezbytné cookies slouží k fungování webu a košíku. Analytické a marketingové cookies jsou používány podle nastavení souhlasu návštěvníka.',
      '2. Podrobnosti jsou uvedeny v dokumentu Zásady používání cookies a v cookie liště na webu.',
    ],
  },
  {
    h: '21. Autorská práva a obsah webu',
    ps: [
      '1. Veškeré texty, fotografie, grafika, logo, označení Little One Store a další obsah webu jsou chráněny právními předpisy. Bez souhlasu prodávajícího není dovoleno je kopírovat, šířit nebo komerčně využívat.',
      '2. Kupující nesmí narušovat provoz internetového obchodu, neoprávněně zasahovat do systému nebo používat web způsobem, který by mohl poškodit prodávajícího nebo třetí osoby.',
    ],
  },
  {
    h: '22. Vyšší moc',
    ps: [
      'Prodávající neodpovídá za prodlení nebo nemožnost plnění způsobenou okolnostmi, které nemohl rozumně ovlivnit, zejména přírodními katastrofami, epidemií, válkou, výpadkem energií, výpadkem informačních systémů, stávkou, omezením dopravy nebo zásahy orgánů veřejné moci.',
    ],
  },
  {
    h: '23. Mimosoudní řešení sporů',
    ps: [
      '1. Kupující, který je spotřebitelem, má právo obrátit se s návrhem na mimosoudní řešení spotřebitelského sporu na Českou obchodní inspekci, Štěpánská 567/15, 120 00 Praha 2, web: www.coi.cz.',
      '2. Spotřebitel může využít také evropskou platformu pro řešení sporů online, pokud je dostupná a použitelná pro daný spor.',
    ],
  },
  {
    h: '24. Závěrečná ustanovení',
    ps: [
      '1. Tyto obchodní podmínky jsou nedílnou součástí kupní smlouvy. Ustanovení odchylná od obchodních podmínek sjednaná v kupní smlouvě mají přednost.',
      '2. Prodávající si vyhrazuje právo obchodní podmínky měnit. Pro objednávku platí znění účinné v okamžiku jejího odeslání kupujícím.',
      '3. Pokud se některé ustanovení ukáže jako neplatné nebo neúčinné, nemá to vliv na platnost ostatních ustanovení.',
      '4. Tyto obchodní podmínky nabývají účinnosti dnem zveřejnění na internetovém obchodě Little One Store.',
    ],
  },
]

export function TermsPage() {
  const { dict } = useI18n()
  const p = dict.ui.pages
  useInfoPage(p.termsTitle, TERMS[0].ps[0], '/obchodni-podminky')
  return (
    <InfoShell title={p.termsTitle}>
      <p className="info-page__intro">
        Obchodní podmínky internetového obchodu Little One Store · Provozovatel: Azruk s.r.o. ·
        Platné a účinné od 1. 7. 2026
      </p>
      {p.termsNote && <p className="info-page__tip">ℹ️ {p.termsNote}</p>}
      <dl className="contact-list">
        {TERMS_META.map(([label, value]) => (
          <div className="contact-list__row" key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      {TERMS.map((s) => (
        <section className="info-page__section" key={s.h}>
          <h2>{s.h}</h2>
          {s.ps.map((text, j) => (
            <p key={j}>{text}</p>
          ))}
        </section>
      ))}
      <p className="info-page__footer-note">
        Máte dotaz k podmínkám? Napište nám na{' '}
        <Link to="/kontakt">stránce Kontakt</Link>.
      </p>
    </InfoShell>
  )
}
