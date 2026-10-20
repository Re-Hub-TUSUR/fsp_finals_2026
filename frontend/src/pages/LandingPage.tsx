import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUpRight,
  BellRing,
  CalendarPlus,
  ClipboardCheck,
  MapPin,
  MessagesSquare,
  QrCode,
  Scale,
  SlidersHorizontal,
  Sparkles,
  Sunrise,
  Users,
} from 'lucide-react';
import { eventsApi, publicApi } from '../api';
import type { PublicStats, SportEvent } from '../types';
import { HeroEventCard } from '../components/landing/HeroEventCard';
import { SportIcon } from '../components/EventBits';
import { plural } from '../utils/eventView';
import { formatShortDateTime, spotsLeft } from '../utils/format';
import { authLink } from '../utils/redirect';

/*
 * Приветственная страница для гостя. Визуальный язык — крупные фото и тонкие заголовки
 * (Onest 300). Тёмные фото-секции используют night/snow: эти токены не инвертируются темой,
 * потому что текст лежит поверх фотографии, а не поверх фона страницы.
 */

const IMG = (name: string) => `/landing/${name}.webp`;

/*
 * У каждой картинки есть облегчённая версия «-m» (≈480–900 px) для телефонов.
 * srcSet + sizes отдают браузеру выбор: на узком экране он не качает десктопный файл.
 */
const srcSet = (name: string, mobileWidth: number, fullWidth: number) =>
  `/landing/${name}-m.webp ${mobileWidth}w, /landing/${name}.webp ${fullWidth}w`;

/** Куда гость шёл до редиректа на лендинг (?next=): передаём дальше во вход и регистрацию. */
function useNext(): string | undefined {
  const [params] = useSearchParams();
  return params.get('next') ?? undefined;
}

export function LandingPage() {
  const [stats, setStats] = useState<PublicStats | null>(null);
  const [upcoming, setUpcoming] = useState<SportEvent[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    publicApi
      .stats()
      .then((s) => !cancelled && setStats(s))
      .catch(() => {
        /* без цифр лендинг всё равно работает */
      });
    eventsApi
      .list()
      .then((events) => {
        if (cancelled) return;
        const now = Date.now();
        setUpcoming(
          events
            .filter((e) => new Date(e.startTime).getTime() > now)
            .sort((a, b) => a.startTime.localeCompare(b.startTime))
            .slice(0, 3),
        );
      })
      .catch(() => !cancelled && setUpcoming([]));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="text-ink">
      <Hero stats={stats} />
      <CitySection />
      <BalanceSection />
      <WhoSection />
      <WinterBand />
      <FeaturesSection />
      <AppSection />
      <Upcoming events={upcoming} />
      <ForOrganizations />
      <FinalCta />
      <footer className="border-t border-line py-8 text-center text-sm text-muted">
        Sportikus — совместный спорт рядом с домом
      </footer>
    </div>
  );
}

/* ---------- Общие элементы ---------- */

const Container: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`mx-auto max-w-6xl px-4 sm:px-6 ${className}`}>{children}</div>
);

/** Заголовок в духе референса: тонкий, вторая строка со сдвигом вправо. */
const DisplayTitle: React.FC<{ first: string; second: React.ReactNode; id?: string; className?: string }> = ({
  first,
  second,
  id,
  className = '',
}) => (
  <h2 id={id} className={`sp-reveal text-[32px] font-light leading-[1.05] tracking-[-0.035em] sm:text-[56px] ${className}`}>
    <span className="block">{first}</span>
    <span className="block pl-[8%]">{second}</span>
  </h2>
);

/** Слово-плашка внутри заголовка, как «who value» в референсе. */
const Pill: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="rounded-[14px] bg-ink px-3 text-page [box-decoration-break:clone]">{children}</span>
);

/** Маркер пункта списка: один, два или три квадратика. */
const Squares: React.FC<{ n: number }> = ({ n }) => (
  <span className="flex gap-1" aria-hidden="true">
    {Array.from({ length: n }, (_, i) => (
      <span key={i} className="h-2 w-2 rounded-[2px] bg-brand" />
    ))}
  </span>
);

const Eyebrow: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <p className={`flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.08em] ${className}`}>
    <span className="h-2 w-2 rounded-[2px] bg-brand" aria-hidden="true" />
    {children}
  </p>
);

/* ---------- 1. Герой ---------- */

const Hero: React.FC<{ stats: PublicStats | null }> = ({ stats }) => {
  const next = useNext();
  return (
    <section className="relative isolate overflow-hidden bg-night text-snow">
      {/* Телефон: фото отдельным блоком сверху (вертикальный кроп), текст на сплошном фоне ниже.
          Планшет и десктоп: текст поверх широкого фото. Разные кадры — поэтому <picture>, а не srcSet. */}
      <div className="relative -z-10 h-[58svh] min-h-[360px] sm:absolute sm:inset-0 sm:h-auto">
        <picture>
          <source media="(max-width: 639px)" srcSet={IMG('hero-football-m')} width={665} height={887} />
          <img
            src={IMG('hero-football')}
            alt=""
            width={1774}
            height={887}
            fetchPriority="high"
            className="h-full w-full object-cover object-[60%_center] sm:object-[70%_center]"
          />
        </picture>
        {/* Затемнение снизу и слева — под текст, фото остаётся живым справа */}
        <div className="absolute inset-0 bg-gradient-to-t from-night via-night/30 to-transparent sm:via-night/40 sm:to-night/5" aria-hidden="true" />
        <div className="absolute inset-0 hidden bg-gradient-to-r from-night/70 via-night/10 to-transparent sm:block" aria-hidden="true" />
      </div>

      <Container className="-mt-28 flex flex-col justify-end pb-10 sm:mt-0 sm:min-h-[calc(100dvh-4rem)] sm:pb-14 sm:pt-24 lg:min-h-[760px]">
        <div className="grid items-end gap-10 lg:grid-cols-[1.3fr_1fr]">
          <div className="anim-rise">
            <Eyebrow className="text-snow/80">Любительский спорт рядом с домом</Eyebrow>
            <h1 className="mt-4 text-balance text-[38px] font-light leading-[1.04] tracking-[-0.04em] sm:mt-5 sm:text-[76px]">
              Хочется спорта, но&nbsp;не&nbsp;с&nbsp;кем? Теперь есть&nbsp;с&nbsp;кем.
            </h1>
          </div>

          <div className="anim-fade flex flex-col gap-5 sm:gap-6 lg:items-end">
            <div className="hidden sm:block">
              <HeroEventCard />
            </div>
            <p className="max-w-sm text-base leading-relaxed text-snow/85 sm:text-[17px] lg:text-right">
              Футбол во дворе, пробежки по набережной, йога в парке и турниры клубов. Найдите встречу на карте,
              запишитесь и приходите.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                to={authLink('user', next)}
                className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-snow px-7 text-lg font-semibold text-night hover:opacity-90"
              >
                Зарегистрироваться
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                to={authLink('login', next)}
                className="inline-flex h-14 items-center justify-center rounded-full border border-snow/40 bg-snow/10 px-7 text-lg font-semibold text-snow hover:bg-snow/20 sm:backdrop-blur-md"
              >
                Войти
              </Link>
            </div>
          </div>
        </div>

        <StatsRow stats={stats} />
      </Container>
    </section>
  );
};

const StatsRow: React.FC<{ stats: PublicStats | null }> = ({ stats }) => {
  const items = stats
    ? [
        { value: stats.upcomingEvents, label: plural(stats.upcomingEvents, 'встреча впереди', 'встречи впереди', 'встреч впереди') },
        { value: stats.athletes, label: plural(stats.athletes, 'спортсмен', 'спортсмена', 'спортсменов') },
        { value: stats.sports, label: plural(stats.sports, 'вид спорта', 'вида спорта', 'видов спорта') },
        { value: stats.organizations, label: plural(stats.organizations, 'клуб', 'клуба', 'клубов') },
      ]
    : null;

  return (
    <dl
      className="mt-8 grid grid-cols-4 gap-px overflow-hidden rounded-[18px] border border-snow/15 bg-snow/15 sm:mt-12 sm:rounded-[22px] sm:backdrop-blur-md"
      aria-busy={!items}
    >
      {(items ?? Array.from({ length: 4 }, () => null)).map((it, i) => (
        <div key={i} className="flex flex-col-reverse bg-night/80 px-2.5 py-3 sm:bg-night/40 sm:px-5 sm:py-4">
          <dt className="text-xs leading-tight text-snow/75 sm:text-[15px]">{it ? it.label : ' '}</dt>
          <dd className="text-xl font-light tabular-nums tracking-[-0.02em] sm:text-3xl">{it ? it.value.toLocaleString('ru-RU') : '—'}</dd>
        </div>
      ))}
    </dl>
  );
};

/* ---------- 2. Город полон спорта (3D-диорама) ---------- */

const CITY_POINTS = [
  { n: 1, title: 'Рядом с домом', text: 'Встречи в пешей доступности: двор, парк, ближайший зал.' },
  { n: 2, title: 'Любой уровень', text: 'От первой тренировки до спаррингов и любительских турниров.' },
  { n: 3, title: 'Честная запись', text: 'Свободная или по заявке, с листом ожидания, если мест нет.' },
];

const CitySection: React.FC = () => (
  <section aria-labelledby="city-title" className="overflow-hidden">
    <Container className="grid items-center gap-8 py-12 sm:gap-10 sm:py-24 lg:grid-cols-[0.9fr_1.1fr]">
      <div>
        <DisplayTitle id="city-title" first="Город, где всегда" second="есть с кем играть" />
        <ul className="mt-8 space-y-5 sm:mt-10 sm:space-y-7">
          {CITY_POINTS.map((p) => (
            <li key={p.title} className="sp-reveal max-w-sm">
              <Squares n={p.n} />
              <h3 className="mt-2.5 text-xl font-medium">{p.title}</h3>
              <p className="mt-1 text-[17px] leading-relaxed text-muted">{p.text}</p>
            </li>
          ))}
        </ul>
      </div>
      <figure className="sp-reveal relative">
        {/* Рендер на светлой «сцене»: в светлой теме сливается с фоном, в тёмной — светлая карточка */}
        <div className="overflow-hidden rounded-[32px] bg-stage">
          <img
            src={IMG('iso-district')}
            srcSet={srcSet('iso-district', 800, 1536)}
            sizes="(min-width: 1024px) 620px, 100vw"
            alt="Объёмная схема района: дворовое поле, баскетбольная площадка, беговая дорожка в парке и набережная с метками встреч"
            width={1536}
            height={1024}
            loading="lazy"
            className="h-auto w-full"
          />
        </div>
        <figcaption className="absolute bottom-4 left-4 right-4 flex flex-wrap gap-2 sm:bottom-6 sm:left-6">
          {['Футбол · 19:00 · 7/10', 'Пробежка · 07:30', 'Стритбол · сб 12:00'].map((t, i) => (
            <span
              key={t}
              className={`rounded-full bg-night/85 px-3 py-1 text-[13px] font-medium text-snow sm:px-3.5 sm:py-1.5 sm:text-sm ${i === 2 ? 'hidden sm:inline' : ''}`}
            >
              {t}
            </span>
          ))}
        </figcaption>
      </figure>
    </Container>
  </section>
);

/* ---------- 3. Баланс: фото + тёмная панель ---------- */

const BALANCE = [
  { icon: Scale, text: 'Работой и движением' },
  { icon: Users, text: 'Своим темпом и командой' },
  { icon: Sunrise, text: 'Спонтанностью и планом' },
];

const BalanceSection: React.FC = () => (
  <section aria-labelledby="balance-title" className="grid bg-night text-snow lg:grid-cols-2">
    <img
      src={IMG('embankment')}
      srcSet={srcSet('embankment', 800, 1400)}
      sizes="(min-width: 1024px) 50vw, 100vw"
      alt="Утренняя набережная Енисея: бегуны и велосипедисты среди осенних деревьев"
      width={1400}
      height={788}
      loading="lazy"
      className="hidden w-full object-cover sm:block sm:h-96 lg:h-full lg:min-h-[560px]"
    />
    <div className="flex flex-col justify-center px-4 py-12 sm:px-12 sm:py-14 lg:px-16">
      <h2 id="balance-title" className="sp-reveal max-w-md text-[28px] font-light leading-[1.1] tracking-[-0.03em] sm:text-[44px]">
        Sportikus — для тех, кто ищет баланс между:
      </h2>
      <ul className="mt-6 max-w-lg sm:mt-10">
        {BALANCE.map((b) => (
          <li key={b.text} className="sp-reveal flex items-center justify-between gap-4 border-b border-snow/15 py-4 text-[17px] sm:py-5 sm:text-lg">
            {b.text}
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-snow/10">
              <b.icon className="h-5 w-5" aria-hidden="true" />
            </span>
          </li>
        ))}
      </ul>
    </div>
  </section>
);

/* ---------- 4. Для кого ---------- */

const WHO = [
  { img: 'who-beginners', width: 800, title: 'Новичкам', text: 'Первая тренировка без неловкости', alt: 'Девушка учится играть в волейбол с новыми знакомыми' },
  { img: 'who-pros', width: 1100, title: 'Опытным', text: 'Спарринги и трейлы своего уровня', alt: 'Бегунья на горной тропе у красноярских Столбов' },
  { img: 'who-families', width: 800, title: 'Семьям', text: 'Выходные в движении всей семьёй', alt: 'Родители с детьми едут на велосипедах по осеннему парку' },
  { img: 'who-seniors', width: 800, title: 'Старшему поколению', text: 'Скандинавская ходьба и йога рядом', alt: 'Пожилые люди занимаются скандинавской ходьбой в сосновом лесу' },
];

const WhoSection: React.FC = () => (
  <section aria-labelledby="who-title">
    <Container className="py-12 sm:py-24">
      <div className="grid gap-1 md:grid-cols-2 md:items-end md:gap-4">
        <h2 id="who-title" className="sp-reveal text-[28px] font-light leading-[1.1] tracking-[-0.03em] sm:text-[48px]">
          Здесь занимаются все,
        </h2>
        <p className="sp-reveal text-[28px] font-light leading-[1.15] tracking-[-0.03em] sm:text-[48px]">
          <Pill>кто ценит</Pill> движение, людей и&nbsp;своё время
        </p>
      </div>
      {/* Телефон: горизонтальная карусель со snap (свайп, без JS); с sm — сетка */}
      <ul
        tabIndex={0}
        aria-label="Для кого Sportikus"
        className="no-scrollbar -mx-4 mt-8 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:mt-12 sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:px-0 lg:grid-cols-4"
      >
        {WHO.map((w) => (
          <li
            key={w.img}
            className="relative aspect-[3/4] w-[72%] shrink-0 snap-start overflow-hidden rounded-[22px] bg-surface-2 sm:w-auto"
          >
            <img
              src={IMG(w.img)}
              srcSet={srcSet(w.img, 480, w.width)}
              sizes="(min-width: 1024px) 270px, (min-width: 640px) 45vw, 72vw"
              alt={w.alt}
              loading="lazy"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-x-2 bottom-2 rounded-2xl border border-snow/15 bg-night/75 p-3 text-snow sm:inset-x-3 sm:bottom-3 sm:bg-night/45 sm:p-4 sm:backdrop-blur-md">
              <h3 className="font-semibold leading-tight">{w.title}</h3>
              <p className="mt-0.5 text-sm leading-snug text-snow/80">{w.text}</p>
            </div>
          </li>
        ))}
      </ul>
    </Container>
  </section>
);

/* ---------- 5. Широкая фото-лента ---------- */

const WinterBand: React.FC = () => (
  <section className="relative isolate hidden overflow-hidden bg-night text-snow sm:block">
    <img
      src={IMG('band-winter')}
      srcSet={srcSet('band-winter', 900, 1916)}
      sizes="100vw"
      alt="Вечерний городской каток в парке: люди разных возрастов катаются под гирляндами"
      width={1916}
      height={821}
      loading="lazy"
      className="absolute inset-0 -z-10 h-full w-full object-cover"
    />
    <div className="absolute inset-0 -z-10 bg-gradient-to-t from-night/90 via-night/30 to-transparent" aria-hidden="true" />
    <div className="absolute inset-0 -z-10 bg-gradient-to-r from-night/60 to-transparent" aria-hidden="true" />
    <Container className="flex min-h-[420px] items-end pb-10 sm:min-h-[560px]">
      <p className="sp-reveal max-w-xl text-[30px] font-light leading-[1.15] tracking-[-0.03em] sm:text-[40px]">
        Круглый год: летом корты и набережные, зимой катки и лыжня.
      </p>
    </Container>
  </section>
);

/* ---------- 6. Возможности ---------- */

const FEATURES = [
  { icon: MapPin, title: 'Карта и лента встреч', text: 'Адрес, время и свободные места' },
  { icon: SlidersHorizontal, title: 'Фильтры', text: 'Спорт, уровень, расстояние' },
  { icon: ClipboardCheck, title: 'Запись или заявка', text: 'И лист ожидания' },
  { icon: MessagesSquare, title: 'Обсуждение', text: 'Договориться о деталях' },
  { icon: Sparkles, title: 'Подборка для вас', text: 'По интересам и времени' },
  { icon: BellRing, title: 'Друзья и напоминания', text: 'Не пропустить начало' },
];

const FeaturesSection: React.FC = () => (
  <section aria-labelledby="features-title">
    <Container className="py-12 sm:py-24">
      <DisplayTitle id="features-title" first="Всё для спорта —" second="без лишнего шума" className="sm:pl-[12%]" />
      <div className="mt-8 grid gap-6 sm:mt-12 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1.25fr] lg:items-start">
        <img
          src={IMG('feat-yoga')}
          srcSet={srcSet('feat-yoga', 600, 900)}
          sizes="(min-width: 1024px) 300px, (min-width: 640px) 50vw, 100vw"
          alt="Утренняя йога на траве среди берёз у реки"
          width={900}
          height={1350}
          loading="lazy"
          className="sp-reveal aspect-[16/10] w-full rounded-[22px] object-cover sm:aspect-[4/5]"
        />
        <img
          src={IMG('feat-gym')}
          srcSet={srcSet('feat-gym', 600, 900)}
          sizes="(min-width: 1024px) 300px, 50vw"
          alt="Любительская игра в баскетбол в школьном зале, участники дают друг другу пять"
          width={900}
          height={1350}
          loading="lazy"
          className="sp-reveal hidden aspect-[4/5] w-full rounded-[22px] object-cover sm:block"
        />
        <div className="sp-reveal sm:col-span-2 lg:col-span-1">
          <p className="text-lg font-medium leading-snug sm:text-xl">В приложении есть всё, чтобы найти компанию и дойти до тренировки:</p>
          <ul className="mt-6 grid grid-cols-2 gap-x-4 gap-y-5 sm:mt-8 sm:gap-x-6 sm:gap-y-7">
            {FEATURES.map((f) => (
              <li key={f.title}>
                <span className="flex h-11 w-11 items-center justify-center rounded-full border border-line-2">
                  <f.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 className="mt-3 font-semibold leading-tight">{f.title}</h3>
                <p className="mt-1 text-[15px] leading-snug text-muted">{f.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Container>
  </section>
);

/* ---------- 7. Приложение (3D-рендер) + как это работает ---------- */

const STEPS = [
  { title: 'Найдите встречу', text: 'На карте или в ленте — рядом с домом, по виду спорта и уровню.' },
  { title: 'Запишитесь', text: 'В один клик или через заявку, которую подтвердит организатор.' },
  { title: 'Приходите играть', text: 'Детали — в обсуждении под встречей, напоминание придёт заранее.' },
];

const AppSection: React.FC = () => (
  <section aria-labelledby="app-title" className="border-y border-line bg-card">
    <Container className="grid items-center gap-8 py-12 sm:gap-10 sm:py-24 lg:grid-cols-2">
      <div className="sp-reveal overflow-hidden rounded-[32px] bg-stage">
        <img
          src={IMG('phone-3d')}
          srcSet={srcSet('phone-3d', 800, 1536)}
          sizes="(min-width: 1024px) 560px, 100vw"
          alt="Объёмный рендер смартфона с картой встреч Sportikus, вокруг мяч, кроссовок и аватарки участников"
          width={1536}
          height={1024}
          loading="lazy"
          className="sp-float h-auto w-full"
        />
      </div>
      <div>
        <Eyebrow className="text-muted">Как это работает</Eyebrow>
        <h2 id="app-title" className="sp-reveal mt-4 text-[28px] font-light leading-[1.1] tracking-[-0.03em] sm:text-[48px]">
          Три шага от «не с кем» до первой игры
        </h2>
        <ol className="mt-6 sm:mt-10">
          {STEPS.map((s, i) => (
            <li key={s.title} className="sp-reveal grid grid-cols-[2.5rem_1fr] gap-3 border-t border-line py-5 sm:grid-cols-[3rem_1fr] sm:gap-4 sm:py-6">
              <span className="text-3xl font-light tabular-nums text-muted">0{i + 1}</span>
              <div>
                <h3 className="text-xl font-medium">{s.title}</h3>
                <p className="mt-1 text-[17px] leading-relaxed text-muted">{s.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </Container>
  </section>
);

/* ---------- 8. Ближайшие встречи (живые данные) ---------- */

const Upcoming: React.FC<{ events: SportEvent[] | null }> = ({ events }) => {
  if (events && events.length === 0) return null;
  return (
    <section aria-labelledby="upcoming-title">
      <Container className="py-12 sm:py-24">
        <div className="grid gap-4 lg:grid-cols-[1fr_20rem] lg:items-end">
          <DisplayTitle id="upcoming-title" first="Уже собираются" second="ближайшие встречи" />
          <p className="sp-reveal max-w-xs text-[17px] text-muted">Зарегистрируйтесь, чтобы записаться и увидеть все встречи на карте.</p>
        </div>
        <ul className="mt-8 grid gap-3 sm:mt-12 sm:gap-4 md:grid-cols-3" aria-busy={!events}>
          {events
            ? events.map((e) => {
                const left = spotsLeft(e);
                return (
                  <li key={e.id} className="sp-reveal">
                    <Link
                      to={authLink('user', `/events/${e.id}`)}
                      className="group flex h-full flex-col rounded-[22px] border border-line bg-card p-5 hover:border-line-2 sm:p-6"
                    >
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-3 text-muted">
                          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-surface text-ink">
                            <SportIcon name={e.sport.name} size={22} />
                          </span>
                          {e.sport.name}
                        </span>
                        <ArrowUpRight className="h-5 w-5 text-muted transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
                      </div>
                      <h3 className="mt-4 text-lg font-medium leading-snug sm:mt-6 sm:text-xl">{e.title}</h3>
                      <p className="mt-2 text-[15px] text-muted">{formatShortDateTime(e.startTime, e.timeZone)}</p>
                      <p className="mt-1 line-clamp-2 text-[15px] text-muted">{e.address}</p>
                      <p className="mt-auto pt-4 font-semibold sm:pt-6">
                        {left === 0 ? 'Мест нет, есть лист ожидания' : `${left} ${plural(left, 'место', 'места', 'мест')} свободно`}
                      </p>
                    </Link>
                  </li>
                );
              })
            : Array.from({ length: 3 }, (_, i) => <li key={i} aria-hidden="true" className="h-60 rounded-[22px] bg-surface-2" />)}
        </ul>
      </Container>
    </section>
  );
};

/* ---------- 9. Для клубов и организаций ---------- */

const ORG_POINTS = [
  { icon: CalendarPlus, title: 'Публикуйте занятия', text: 'Тренировки, турниры, регулярные встречи' },
  { icon: ClipboardCheck, title: 'Принимайте заявки', text: 'Анкеты участников и лист ожидания' },
  { icon: QrCode, title: 'Отмечайте пришедших', text: 'QR-билеты и выгрузка списков' },
];

const ForOrganizations: React.FC = () => {
  const next = useNext();
  return (
    <section aria-labelledby="orgs-title" className="relative isolate overflow-hidden bg-night text-snow">
      <img
        src={IMG('org-coach')}
        srcSet={srcSet('org-coach', 800, 1600)}
        sizes="100vw"
        alt=""
        width={1600}
        height={742}
        loading="lazy"
        className="absolute inset-0 -z-10 h-full w-full object-cover opacity-60"
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-night via-night/70 to-night/20" aria-hidden="true" />
      <Container className="py-12 sm:py-24">
        <Eyebrow className="text-snow/70">Для клубов и организаций</Eyebrow>
        <h2 id="orgs-title" className="sp-reveal mt-4 max-w-2xl text-[28px] font-light leading-[1.1] tracking-[-0.03em] sm:text-[52px]">
          Соберите <span className="rounded-[14px] bg-snow px-3 text-night">свою группу</span> из тех, кто живёт рядом
        </h2>
        <p className="sp-reveal mt-5 max-w-xl text-[17px] leading-relaxed text-snow/75">
          После проверки администратором вы сможете публиковать события от имени организации.
        </p>
        {/* Телефон: компактный список без карточек и размытия; с md — стеклянные карточки */}
        <ul className="mt-6 md:mt-10 md:grid md:grid-cols-3 md:gap-3">
          {ORG_POINTS.map((p) => (
            <li
              key={p.title}
              className="sp-reveal flex gap-3 border-b border-snow/15 py-4 md:block md:rounded-[22px] md:border md:bg-snow/10 md:p-5 md:backdrop-blur-md"
            >
              <p.icon className="mt-0.5 h-6 w-6 shrink-0 text-brand" aria-hidden="true" />
              <div>
                <h3 className="text-lg font-medium md:mt-6">{p.title}</h3>
                <p className="mt-1 text-[15px] text-snow/75">{p.text}</p>
              </div>
            </li>
          ))}
        </ul>
        <Link
          to={authLink('organization', next)}
          className="mt-8 inline-flex h-14 w-full items-center justify-center gap-2 rounded-full bg-snow px-7 text-lg font-semibold text-night hover:opacity-90 sm:mt-10 sm:w-auto"
        >
          Зарегистрировать организацию
          <ArrowRight className="h-5 w-5" />
        </Link>
      </Container>
    </section>
  );
};

/* ---------- 10. Финальный призыв ---------- */

const FinalCta: React.FC = () => {
  const next = useNext();
  return (
    <section className="bg-page">
      <Container className="py-14 text-center sm:py-28">
        <h2 className="sp-reveal text-[34px] font-light leading-[1.05] tracking-[-0.04em] sm:text-[64px]">
          Ваша компания <Pill>уже рядом</Pill>
        </h2>
        <p className="sp-reveal mt-5 text-lg text-muted">Регистрация займёт минуту.</p>
        <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            to={authLink('user', next)}
            className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-ink px-8 text-lg font-semibold text-page hover:opacity-90"
          >
            Зарегистрироваться
            <ArrowRight className="h-5 w-5" />
          </Link>
          <Link
            to={authLink('login', next)}
            className="inline-flex h-14 items-center justify-center rounded-full border border-line-2 px-8 text-lg font-semibold text-ink hover:bg-surface"
          >
            Войти
          </Link>
        </div>
      </Container>
    </section>
  );
};
