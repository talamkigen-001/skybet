"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useLocale } from "@/lib/locale";

interface Slide {
  eyebrow: string;
  title: string;
  body: string;
  cta: string;
  to: string;
  gradient: string;
  glyph: string;
}

const SLIDES_BY_LANG: Record<string, Slide[]> = {
  en: [
    {
      eyebrow: "FEATURED · POPULAR",
      title: "1win Lucky Jet — fly high",
      body: "Fly with Lucky Joe and cash out before he flies away. Multipliers up to 100x and beyond!",
      cta: "Play now",
      to: "/games/live/lucky-jet",
      gradient: "linear-gradient(120deg, #06b6d4 0%, #3b82f6 50%, #8b5cf6 100%)",
      glyph: "🚀",
    },
    {
      eyebrow: "WELCOME OFFER",
      title: "+500% on your first deposit",
      body: "Get matched credits, daily cashback bonuses, and free rounds on 1win games.",
      cta: "Claim bonus",
      to: "/promotions",
      gradient: "linear-gradient(120deg, #7c3aed 0%, #ec4899 60%, #f59e0b 100%)",
      glyph: "🎁",
    },
    {
      eyebrow: "LIVE CASINO",
      title: "1win Live Casino studio",
      body: "Mines, Plinko, Crazy Time, Coin Flip and live roulette tables streamed 24/7.",
      cta: "Enter the lobby",
      to: "/games/live",
      gradient: "linear-gradient(120deg, #f43f5e 0%, #fb923c 50%, #eab308 100%)",
      glyph: "🎥",
    },
    {
      eyebrow: "MDL, HUF & TJS BANKS",
      title: "Instant Regional Bank Deposits",
      body: "Fast transfers via MAIB, MICB, VictoriaBank, PayNet, Revolut, MKB, Wise, Zen & Dushanbe Bank.",
      cta: "Deposit now",
      to: "/wallet",
      gradient: "linear-gradient(120deg, #10b981 0%, #06b6d4 50%, #3b82f6 100%)",
      glyph: "🏛️",
    },
  ],
  ro: [
    {
      eyebrow: "RECOMANDAT · POPULAR",
      title: "1win Lucky Jet — zboară sus",
      body: "Zboară cu Lucky Joe și retrage înainte de decolare. Multiplicatori de până la 100x și mai mult!",
      cta: "Joacă acum",
      to: "/games/live/lucky-jet",
      gradient: "linear-gradient(120deg, #06b6d4 0%, #3b82f6 50%, #8b5cf6 100%)",
      glyph: "🚀",
    },
    {
      eyebrow: "OFERTĂ DE BUN VENIT",
      title: "+500% bonus la prima depunere",
      body: "Primești credite egalate, cashback zilnic și runde gratuite la jocurile 1win.",
      cta: "Revendică bonusul",
      to: "/promotions",
      gradient: "linear-gradient(120deg, #7c3aed 0%, #ec4899 60%, #f59e0b 100%)",
      glyph: "🎁",
    },
    {
      eyebrow: "CAZINOU LIVE",
      title: "Studioul 1win Cazinou Live",
      body: "Mines, Plinko, Crazy Time, Coin Flip și mese de ruletă live transmise 24/7.",
      cta: "Intră în lobby",
      to: "/games/live",
      gradient: "linear-gradient(120deg, #f43f5e 0%, #fb923c 50%, #eab308 100%)",
      glyph: "🎥",
    },
    {
      eyebrow: "BĂNCI MDL, HUF & TJS",
      title: "Depuneri Rapide prin Bănci Regionale",
      body: "Transferuri rapide prin MAIB, MICB, VictoriaBank, PayNet, Revolut, MKB, Wise, Zen și Dushanbe Bank.",
      cta: "Depune fonduri",
      to: "/wallet",
      gradient: "linear-gradient(120deg, #10b981 0%, #06b6d4 50%, #3b82f6 100%)",
      glyph: "🏛️",
    },
  ],
  hu: [
    {
      eyebrow: "KIEMELT · NÉPSZERŰ",
      title: "1win Lucky Jet — repülj magasra",
      body: "Repülj Lucky Joe-val és vedd ki a nyereményt mielőtt elrepül. Akár 100x-os szorzók!",
      cta: "Játék most",
      to: "/games/live/lucky-jet",
      gradient: "linear-gradient(120deg, #06b6d4 0%, #3b82f6 50%, #8b5cf6 100%)",
      glyph: "🚀",
    },
    {
      eyebrow: "ÜDVÖZLŐ AJÁNLAT",
      title: "+500% bónusz az első befizetésre",
      body: "Jóváírások, napi cashback bónuszok és ingyenes körök a 1win játékokon.",
      cta: "Bónusz igénylése",
      to: "/promotions",
      gradient: "linear-gradient(120deg, #7c3aed 0%, #ec4899 60%, #f59e0b 100%)",
      glyph: "🎁",
    },
    {
      eyebrow: "ÉLŐ KASZINÓ",
      title: "1win Élő Kaszinó stúdió",
      body: "Mines, Plinko, Crazy Time, Coin Flip és élő rulett asztalok 24/7 közvetítéssel.",
      cta: "Belépés a lobbyba",
      to: "/games/live",
      gradient: "linear-gradient(120deg, #f43f5e 0%, #fb923c 50%, #eab308 100%)",
      glyph: "🎥",
    },
    {
      eyebrow: "MDL, HUF ÉS TJS BANKOK",
      title: "Azonnali Banki Befizetések",
      body: "Gyors átutalás MAIB, MICB, VictoriaBank, PayNet, Revolut, MKB, Wise, Zen és Dushanbe Bank útján.",
      cta: "Befizetés",
      to: "/wallet",
      gradient: "linear-gradient(120deg, #10b981 0%, #06b6d4 50%, #3b82f6 100%)",
      glyph: "🏛️",
    },
  ],
  ru: [
    {
      eyebrow: "ПОПУЛЯРНОЕ · ХИТ",
      title: "1win Lucky Jet — лети высоко",
      body: "Лети с Lucky Joe и забирай выигрыш до улета. Множители до 100x и выше!",
      cta: "Играть сейчас",
      to: "/games/live/lucky-jet",
      gradient: "linear-gradient(120deg, #06b6d4 0%, #3b82f6 50%, #8b5cf6 100%)",
      glyph: "🚀",
    },
    {
      eyebrow: "ПРИВЕТСТВЕННЫЙ БОНУС",
      title: "+500% на первый депозит",
      body: "Бонусные средства, ежедневный кэшбэк и бесплатные вращения в играх 1win.",
      cta: "Забрать бонус",
      to: "/promotions",
      gradient: "linear-gradient(120deg, #7c3aed 0%, #ec4899 60%, #f59e0b 100%)",
      glyph: "🎁",
    },
    {
      eyebrow: "ЛАЙВ КАЗИНО",
      title: "Студия Лайв Казино 1win",
      body: "Mines, Plinko, Crazy Time, Coin Flip и лайв рулетка в эфире 24/7.",
      cta: "Войти в лобби",
      to: "/games/live",
      gradient: "linear-gradient(120deg, #f43f5e 0%, #fb923c 50%, #eab308 100%)",
      glyph: "🎥",
    },
    {
      eyebrow: "БАНКИ MDL, HUF И TJS",
      title: "Мгновенные переводы через Банки",
      body: "Быстрые переводы через MAIB, MICB, VictoriaBank, PayNet, Revolut, MKB, Wise, Zen и Dushanbe Bank.",
      cta: "Пополнить баланс",
      to: "/wallet",
      gradient: "linear-gradient(120deg, #10b981 0%, #06b6d4 50%, #3b82f6 100%)",
      glyph: "🏛️",
    },
  ],
  de: [
    {
      eyebrow: "BELIEBT · HIGHLIGHT",
      title: "1win Lucky Jet — Flieg hoch und gewinne",
      body: "Fliege mit Lucky Joe und zahle aus, bevor er wegfliegt. Multiplikatoren bis zu 100x und mehr!",
      cta: "Jetzt spielen",
      to: "/games/live/lucky-jet",
      gradient: "linear-gradient(120deg, #06b6d4 0%, #3b82f6 50%, #8b5cf6 100%)",
      glyph: "🚀",
    },
    {
      eyebrow: "WILLKOMMENSANGEBOT",
      title: "+500% auf Ihre erste Einzahlung",
      body: "Erhalten Sie Guthaben, täglichen Cashback und Freispiele für 1win-Spiele.",
      cta: "Bonus sichern",
      to: "/promotions",
      gradient: "linear-gradient(120deg, #7c3aed 0%, #ec4899 60%, #f59e0b 100%)",
      glyph: "🎁",
    },
    {
      eyebrow: "LIVE-CASINO",
      title: "1win Live-Casino Studio",
      body: "Mines, Plinko, Crazy Time, Coin Flip und Live-Roulette-Tische rund um die Uhr gestreamt.",
      cta: "Lobby betreten",
      to: "/games/live",
      gradient: "linear-gradient(120deg, #f43f5e 0%, #fb923c 50%, #eab308 100%)",
      glyph: "🎥",
    },
    {
      eyebrow: "MDL, HUF & TJS BANKEN",
      title: "Sofortige Bank-Einzahlungen",
      body: "Schnelle Überweisungen über MAIB, MICB, VictoriaBank, PayNet, Revolut, MKB, Wise, Zen & Dushanbe Bank.",
      cta: "Jetzt einzahlen",
      to: "/wallet",
      gradient: "linear-gradient(120deg, #10b981 0%, #06b6d4 50%, #3b82f6 100%)",
      glyph: "🏛️",
    },
  ],
  fr: [
    {
      eyebrow: "EN VEDETTE · POPULAIRE",
      title: "1win Lucky Jet — Volez haut",
      body: "Volez avec Lucky Joe et encaissez avant qu'il ne s'envole. Multiplicateurs jusqu'à 100x !",
      cta: "Jouer maintenant",
      to: "/games/live/lucky-jet",
      gradient: "linear-gradient(120deg, #06b6d4 0%, #3b82f6 50%, #8b5cf6 100%)",
      glyph: "🚀",
    },
    {
      eyebrow: "OFFRE DE BIENVENUE",
      title: "+500% sur votre premier dépôt",
      body: "Obtenez des crédits, un cashback quotidien et des tours gratuits sur les jeux 1win.",
      cta: "Obtenir le bonus",
      to: "/promotions",
      gradient: "linear-gradient(120deg, #7c3aed 0%, #ec4899 60%, #f59e0b 100%)",
      glyph: "🎁",
    },
    {
      eyebrow: "CASINO EN DIRECT",
      title: "Studio Casino en direct 1win",
      body: "Mines, Plinko, Crazy Time, Coin Flip et tables de roulette en direct diffusées 24/7.",
      cta: "Entrer dans le lobby",
      to: "/games/live",
      gradient: "linear-gradient(120deg, #f43f5e 0%, #fb923c 50%, #eab308 100%)",
      glyph: "🎥",
    },
    {
      eyebrow: "BANQUES MDL, HUF & TJS",
      title: "Dépôts bancaires régionaux instantanés",
      body: "Virements rapides via MAIB, MICB, VictoriaBank, PayNet, Revolut, MKB, Wise, Zen et Dushanbe Bank.",
      cta: "Déposer maintenant",
      to: "/wallet",
      gradient: "linear-gradient(120deg, #10b981 0%, #06b6d4 50%, #3b82f6 100%)",
      glyph: "🏛️",
    },
  ],
  es: [
    {
      eyebrow: "DESTACADO · POPULAR",
      title: "1win Lucky Jet — Vuela alto y cobra",
      body: "Vuela con Lucky Joe y retira antes de que despegue. ¡Multiplicadores de hasta 100x y más!",
      cta: "Jugar ahora",
      to: "/games/live/lucky-jet",
      gradient: "linear-gradient(120deg, #06b6d4 0%, #3b82f6 50%, #8b5cf6 100%)",
      glyph: "🚀",
    },
    {
      eyebrow: "OFERTA DE BIENVENIDA",
      title: "+500% en tu primer depósito",
      body: "Obtén créditos de bonificación, reembolso diario y tiradas gratis en juegos 1win.",
      cta: "Reclamar bono",
      to: "/promotions",
      gradient: "linear-gradient(120deg, #7c3aed 0%, #ec4899 60%, #f59e0b 100%)",
      glyph: "🎁",
    },
    {
      eyebrow: "CASINO EN VIVO",
      title: "Estudio de Casino en vivo 1win",
      body: "Mines, Plinko, Crazy Time, Coin Flip y mesas de ruleta en vivo transmitidas 24/7.",
      cta: "Entrar al lobby",
      to: "/games/live",
      gradient: "linear-gradient(120deg, #f43f5e 0%, #fb923c 50%, #eab308 100%)",
      glyph: "🎥",
    },
    {
      eyebrow: "BANCOS MDL, HUF Y TJS",
      title: "Depósitos bancarios instantáneos",
      body: "Transferencias rápidas vía MAIB, MICB, VictoriaBank, PayNet, Revolut, MKB, Wise, Zen y Dushanbe Bank.",
      cta: "Depositar ahora",
      to: "/wallet",
      gradient: "linear-gradient(120deg, #10b981 0%, #06b6d4 50%, #3b82f6 100%)",
      glyph: "🏛️",
    },
  ],
  it: [
    {
      eyebrow: "IN EVIDENZA · POPOLARE",
      title: "1win Lucky Jet — Vola alto e incassa",
      body: "Vola con Lucky Joe e incassa prima che voli via. Moltiplicatori fino a 100x e oltre!",
      cta: "Gioca ora",
      to: "/games/live/lucky-jet",
      gradient: "linear-gradient(120deg, #06b6d4 0%, #3b82f6 50%, #8b5cf6 100%)",
      glyph: "🚀",
    },
    {
      eyebrow: "OFFERTA DI BENVENUTO",
      title: "+500% sul tuo primo deposito",
      body: "Ricevi crediti bonus, cashback giornaliero e giri gratuiti sui giochi 1win.",
      cta: "Richiedi bonus",
      to: "/promotions",
      gradient: "linear-gradient(120deg, #7c3aed 0%, #ec4899 60%, #f59e0b 100%)",
      glyph: "🎁",
    },
    {
      eyebrow: "CASINO DAL VIVO",
      title: "Studio Casino dal vivo 1win",
      body: "Mines, Plinko, Crazy Time, Coin Flip e tavoli di roulette dal vivo in streaming 24/7.",
      cta: "Entra nella lobby",
      to: "/games/live",
      gradient: "linear-gradient(120deg, #f43f5e 0%, #fb923c 50%, #eab308 100%)",
      glyph: "🎥",
    },
    {
      eyebrow: "BANCHE MDL, HUF E TJS",
      title: "Depositi bancari immediati",
      body: "Trasferimenti veloci tramite MAIB, MICB, VictoriaBank, PayNet, Revolut, MKB, Wise, Zen e Dushanbe Bank.",
      cta: "Deposita ora",
      to: "/wallet",
      gradient: "linear-gradient(120deg, #10b981 0%, #06b6d4 50%, #3b82f6 100%)",
      glyph: "🏛️",
    },
  ],
  pt: [
    {
      eyebrow: "DESTAQUE · POPULAR",
      title: "1win Lucky Jet — Voa alto e retira",
      body: "Voa com o Lucky Joe e retira antes de ele voar para longe. Multiplicadores até 100x e mais!",
      cta: "Jogar agora",
      to: "/games/live/lucky-jet",
      gradient: "linear-gradient(120deg, #06b6d4 0%, #3b82f6 50%, #8b5cf6 100%)",
      glyph: "🚀",
    },
    {
      eyebrow: "OFERTA DE BOAS-VINDAS",
      title: "+500% no teu primeiro depósito",
      body: "Ganha bónus de depósito, cashback diário e jogadas grátis nos jogos 1win.",
      cta: "Reclamar bónus",
      to: "/promotions",
      gradient: "linear-gradient(120deg, #7c3aed 0%, #ec4899 60%, #f59e0b 100%)",
      glyph: "🎁",
    },
    {
      eyebrow: "CASINO AO VIVO",
      title: "Estúdio de Casino ao Vivo 1win",
      body: "Mines, Plinko, Crazy Time, Coin Flip e mesas de roleta ao vivo transmitidas 24/7.",
      cta: "Entrar no lobby",
      to: "/games/live",
      gradient: "linear-gradient(120deg, #f43f5e 0%, #fb923c 50%, #eab308 100%)",
      glyph: "🎥",
    },
    {
      eyebrow: "BANCOS MDL, HUF E TJS",
      title: "Depósitos bancários instantâneos",
      body: "Transferências rápidas via MAIB, MICB, VictoriaBank, PayNet, Revolut, MKB, Wise, Zen e Dushanbe Bank.",
      cta: "Depositar agora",
      to: "/wallet",
      gradient: "linear-gradient(120deg, #10b981 0%, #06b6d4 50%, #3b82f6 100%)",
      glyph: "🏛️",
    },
  ],
  pl: [
    {
      eyebrow: "POLECANE · POPULARNE",
      title: "1win Lucky Jet — Leć wysoko i wypłacaj",
      body: "Leć z Lucky Joe i wypłać zanim odleci. Mnożniki aż do 100x i więcej!",
      cta: "Zagraj teraz",
      to: "/games/live/lucky-jet",
      gradient: "linear-gradient(120deg, #06b6d4 0%, #3b82f6 50%, #8b5cf6 100%)",
      glyph: "🚀",
    },
    {
      eyebrow: "OFERTA POWITALNA",
      title: "+500% przy pierwszym depozycie",
      body: "Odbierz bonusowe środki, codzienny cashback i darmowe rundy w grach 1win.",
      cta: "Odbierz bonus",
      to: "/promotions",
      gradient: "linear-gradient(120deg, #7c3aed 0%, #ec4899 60%, #f59e0b 100%)",
      glyph: "🎁",
    },
    {
      eyebrow: "KASYNO NA ŻYWO",
      title: "Studio Kasyna na Żywo 1win",
      body: "Mines, Plinko, Crazy Time, Coin Flip i stoły do ruletki na żywo 24/7.",
      cta: "Wejdź do lobby",
      to: "/games/live",
      gradient: "linear-gradient(120deg, #f43f5e 0%, #fb923c 50%, #eab308 100%)",
      glyph: "🎥",
    },
    {
      eyebrow: "BANKI MDL, HUF I TJS",
      title: "Szybkie wpłaty bankowe",
      body: "Szybkie przelewy przez MAIB, MICB, VictoriaBank, PayNet, Revolut, MKB, Wise, Zen i Dushanbe Bank.",
      cta: "Wpłać teraz",
      to: "/wallet",
      gradient: "linear-gradient(120deg, #10b981 0%, #06b6d4 50%, #3b82f6 100%)",
      glyph: "🏛️",
    },
  ],
  uk: [
    {
      eyebrow: "РЕКОМЕНДОВАНЕ · ПОПУЛЯРНЕ",
      title: "1win Lucky Jet — лети високо",
      body: "Лети з Lucky Joe та забирай виграш до вильоту. Множники до 100x і більше!",
      cta: "Грати зараз",
      to: "/games/live/lucky-jet",
      gradient: "linear-gradient(120deg, #06b6d4 0%, #3b82f6 50%, #8b5cf6 100%)",
      glyph: "🚀",
    },
    {
      eyebrow: "ВІТАЛЬНА ПРОПОЗИЦІЯ",
      title: "+500% бонус на перший депозит",
      body: "Отримуй бонусні кошти, щоденний кешбек та безкоштовні раунди в іграх 1win.",
      cta: "Забрати бонус",
      to: "/promotions",
      gradient: "linear-gradient(120deg, #7c3aed 0%, #ec4899 60%, #f59e0b 100%)",
      glyph: "🎁",
    },
    {
      eyebrow: "ЛАЙВ КАЗИНО",
      title: "Студія Лайв Казино 1win",
      body: "Mines, Plinko, Crazy Time, Coin Flip та лайв рулетка в ефірі 24/7.",
      cta: "Увійти в лобі",
      to: "/games/live",
      gradient: "linear-gradient(120deg, #f43f5e 0%, #fb923c 50%, #eab308 100%)",
      glyph: "🎥",
    },
    {
      eyebrow: "БАНКИ MDL, HUF ТА TJS",
      title: "Миттєві депозити через Банки",
      body: "Швидкі перекази через MAIB, MICB, VictoriaBank, PayNet, Revolut, MKB, Wise, Zen та Dushanbe Bank.",
      cta: "Поповнити баланс",
      to: "/wallet",
      gradient: "linear-gradient(120deg, #10b981 0%, #06b6d4 50%, #3b82f6 100%)",
      glyph: "🏛️",
    },
  ],
  nl: [
    {
      eyebrow: "AANBEVOLEN · POPULAIR",
      title: "1win Lucky Jet — Vlieg hoog en cashen",
      body: "Vlieg mee met Lucky Joe en cash uit voordat hij wegvliegt. Vermenigvuldigers tot 100x en hoger!",
      cta: "Nu spelen",
      to: "/games/live/lucky-jet",
      gradient: "linear-gradient(120deg, #06b6d4 0%, #3b82f6 50%, #8b5cf6 100%)",
      glyph: "🚀",
    },
    {
      eyebrow: "WELKOMSTAANBOD",
      title: "+500% op je eerste storting",
      body: "Ontvang bonuscredits, dagelijkse cashback en gratis runs op 1win games.",
      cta: "Claim bonus",
      to: "/promotions",
      gradient: "linear-gradient(120deg, #7c3aed 0%, #ec4899 60%, #f59e0b 100%)",
      glyph: "🎁",
    },
    {
      eyebrow: "LIVE CASINO",
      title: "1win Live Casino studio",
      body: "Mines, Plinko, Crazy Time, Coin Flip en live roulettetafels 24/7 gestreamd.",
      cta: "Ga naar de lobby",
      to: "/games/live",
      gradient: "linear-gradient(120deg, #f43f5e 0%, #fb923c 50%, #eab308 100%)",
      glyph: "🎥",
    },
    {
      eyebrow: "MDL, HUF & TJS BANKEN",
      title: "Directe Bankstortingen",
      body: "Snelle overboekingen via MAIB, MICB, VictoriaBank, PayNet, Revolut, MKB, Wise, Zen & Dushanbe Bank.",
      cta: "Nu storten",
      to: "/wallet",
      gradient: "linear-gradient(120deg, #10b981 0%, #06b6d4 50%, #3b82f6 100%)",
      glyph: "🏛️",
    },
  ],
  tr: [
    {
      eyebrow: "ÖNE ÇIKAN · POPÜLER",
      title: "1win Lucky Jet — Yükseklere Uç ve Kazan",
      body: "Lucky Joe ile uçun ve gitmeden önce paranızı çekin. 100x ve üzeri çarpanlar!",
      cta: "Şimdi oyna",
      to: "/games/live/lucky-jet",
      gradient: "linear-gradient(120deg, #06b6d4 0%, #3b82f6 50%, #8b5cf6 100%)",
      glyph: "🚀",
    },
    {
      eyebrow: "HOŞ GELDİN TEKLİFİ",
      title: "İlk para yatırmaya +500% bonus",
      body: "1win oyunlarında bonus krediler, günlük nakit iade ve ücretsiz turlar kazanın.",
      cta: "Bonusu al",
      to: "/promotions",
      gradient: "linear-gradient(120deg, #7c3aed 0%, #ec4899 60%, #f59e0b 100%)",
      glyph: "🎁",
    },
    {
      eyebrow: "CANLI CASINO",
      title: "1win Canlı Casino stüdyosu",
      body: "Mines, Plinko, Crazy Time, Coin Flip ve canlı rulet masaları 7/24 yayında.",
      cta: "Lobiye gir",
      to: "/games/live",
      gradient: "linear-gradient(120deg, #f43f5e 0%, #fb923c 50%, #eab308 100%)",
      glyph: "🎥",
    },
    {
      eyebrow: "MDL, HUF & TJS BANKALARI",
      title: "Anında Banka Yatırımı",
      body: "MAIB, MICB, VictoriaBank, PayNet, Revolut, MKB, Wise, Zen ve Dushanbe Bank ile hızlı transfer.",
      cta: "Para yatır",
      to: "/wallet",
      gradient: "linear-gradient(120deg, #10b981 0%, #06b6d4 50%, #3b82f6 100%)",
      glyph: "🏛️",
    },
  ],
};

export function HeroCarousel() {
  const language = useLocale((s) => s.language);
  const slides = SLIDES_BY_LANG[language] || SLIDES_BY_LANG.en;
  const [i, setI] = useState(0);

  // Reset index if out of bounds on language change
  useEffect(() => {
    setI(0);
  }, [language]);

  useEffect(() => {
    const t = setInterval(() => setI((x) => (x + 1) % slides.length), 6000);
    return () => clearInterval(t);
  }, [slides.length]);

  return (
    <div className="relative overflow-hidden rounded-3xl border border-border/60 h-[260px] sm:h-[300px] md:h-[340px]">
      {slides.map((s, idx) => (
        <div
          key={idx}
          className="absolute inset-0 transition-opacity duration-700"
          style={{ opacity: i === idx ? 1 : 0, background: s.gradient }}
        >
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "radial-gradient(ellipse at 80% 30%, rgba(255,255,255,0.25), transparent 40%), radial-gradient(ellipse at 10% 90%, rgba(0,0,0,0.4), transparent 50%)",
            }}
          />
          <div className="relative h-full max-w-7xl mx-auto px-6 md:px-10 grid md:grid-cols-[1.3fr_1fr] items-center gap-6">
            <div className="text-white">
              <div className="text-xs font-bold uppercase tracking-wider opacity-90">
                {s.eyebrow}
              </div>
              <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-extrabold mt-2 drop-shadow leading-tight">
                {s.title}
              </h1>
              <p className="mt-2 text-sm md:text-base opacity-90 max-w-md">{s.body}</p>
              <Link
                href={s.to}
                className="inline-flex mt-4 px-6 py-3 rounded-full bg-white text-black text-sm font-bold hover:scale-105 transition-transform shadow-xl"
              >
                {s.cta} →
              </Link>
            </div>
            <div className="hidden md:flex items-center justify-center text-[180px] lg:text-[200px] opacity-80 drop-shadow-2xl select-none">
              {s.glyph}
            </div>
          </div>
        </div>
      ))}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
        {slides.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setI(idx)}
            aria-label={`Slide ${idx + 1}`}
            className={`h-1.5 rounded-full transition-all ${i === idx ? "w-8 bg-white" : "w-3 bg-white/40"}`}
          />
        ))}
      </div>
    </div>
  );
}



