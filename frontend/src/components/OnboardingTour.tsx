import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  ClipboardPen,
  Compass,
  FileText,
  MapPin,
  MousePointerClick,
  PartyPopper,
  QrCode,
  SlidersHorizontal,
  Sparkles,
  Ticket,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { InterestQuiz } from './InterestQuiz';
import { TourDemoStand, type TourDemoKind } from './TourDemoStand';
import { tourDemo, useTourDemo } from '../utils/tourDemo';

export interface TourStep {
  id: string;
  selector: string;
  title: string;
  /** Подпись вместо «Шаг N из M» (только у финала). */
  badge?: string;
  description: string;
  /** Показательный стенд записи вместо подсветки элемента интерфейса. */
  demo?: TourDemoKind;
  /** Стенд, если подсвечивать нечего (например, карточку закрыли). */
  fallbackDemo?: TourDemoKind;
  /** Подсвеченный элемент можно нажать: клики по нему проходят сквозь затемнение. */
  interactive?: boolean;
  hint?: string;
  icon: React.ReactNode;
}

const TOUR_STEPS: TourStep[] = [
  {
    id: 'recommendations',
    selector: '[data-tour="nav-recommended-mobile"], [data-tour="nav-recommended"]',
    title: 'Персональные рекомендации',
    description:
      'Sportikus умеет составлять подборку лично под вас! Вкладка «Для вас» находит события по вашим любимым видам спорта, уровню и расписанию. Сейчас мы покажем сайт, а в конце предложим пройти 1-минутный тест интересов.',
    hint: '✨ Сначала покажем интерфейс, а затем настроим рекомендации',
    icon: <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-brand-ink" />,
  },
  {
    id: 'map-and-feed',
    selector: '[data-tour="nav-map-feed-mobile"], [data-tour="nav-map-feed"]',
    title: 'Карта и Лента событий',
    description:
      'Переключайтесь между списком мероприятий в «Ленте» и интерактивной 2ГИС-картой: стадионы, парки, манежи и залы с указанием дистанции от вас, свободными местами и расписанием.',
    hint: '📍 На карте удобно находить тренировки прямо возле дома или работы',
    icon: <Compass className="w-4 h-4 sm:w-5 sm:h-5 text-brand-ink" />,
  },
  {
    id: 'filters',
    selector: '[data-tour="filter-button-mobile"], [data-tour="filter-bar"]',
    title: 'Умные фильтры и радиус',
    description:
      'Выбирайте любимый спорт (футбол, волейбол, бег, теннис и др.), задавайте удобный радиус (1, 3, 5 км), фильтруйте по дате, времени суток и уровню сложности — от новичка до профи.',
    hint: '⚡ Нажмите на фильтры или вид спорта для мгновенного поиска',
    icon: <SlidersHorizontal className="w-4 h-4 sm:w-5 sm:h-5 text-brand-ink" />,
  },
  {
    id: 'search-and-city',
    selector: '[data-tour="search-bar-mobile"], [data-tour="city-selector"], [data-tour="search-bar"]',
    title: 'Поиск и локации',
    description:
      'Ищите тренировки по названию площадки, спортклубу или имени организатора. А если приехали в другой город — переключайте локацию в шапке в один клик.',
    hint: '🔍 Быстрый поиск работает по всем площадкам и городам',
    icon: <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-brand-ink" />,
  },
  {
    id: 'create-and-tickets',
    selector: '[data-tour="create-event-mobile"], [data-tour="create-event"]',
    title: 'Организация и QR-билеты',
    description:
      'Создавайте собственные матчи и турниры в удобном конструкторе или записывайтесь на чужие. После подтверждения заявки вы получаете персональный QR-билет для быстрой отметки организатором.',
    hint: '🎫 Ваши билеты всегда доступны в разделе «Мои события»',
    icon: <Ticket className="w-4 h-4 sm:w-5 sm:h-5 text-brand-ink" />,
  },
  {
    id: 'demo-pin',
    selector: '[data-tour="demo-pin"]',
    interactive: true,
    title: 'Найдите встречу на карте',
    description:
      'Пройдём запись на примере. Мы поставили на карту учебную встречу «Утренняя пробежка в парке» — нажмите на метку, чтобы открыть её. После обучения метка исчезнет.',
    hint: '👆 Так же открываются настоящие встречи: метка на карте или строка в списке',
    icon: <MousePointerClick className="w-4 h-4 sm:w-5 sm:h-5 text-brand-ink" />,
  },
  {
    id: 'demo-card',
    selector: '[data-tour="demo-card-mobile"], [data-tour="demo-card"]',
    interactive: true,
    fallbackDemo: 'event',
    title: 'Карточка встречи',
    description:
      'Здесь главное: когда, где, сколько свободных мест и цена. Всё подходит — нажмите «Подать заявку». Это пример: на сервер ничего не уйдёт.',
    hint: '👀 Условия видны до записи — сюрпризов на месте не будет',
    icon: <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-brand-ink" />,
  },
  {
    id: 'demo-form',
    selector: '',
    demo: 'form',
    title: 'Как записаться: заявка',
    description:
      'При записи по заявке организатор может задать пару вопросов: ответьте, подтвердите условия и отправьте. При свободной записи вы участвуете сразу.',
    hint: '🔔 О решении организатора придёт уведомление',
    icon: <ClipboardPen className="w-4 h-4 sm:w-5 sm:h-5 text-brand-ink" />,
  },
  {
    id: 'demo-ticket',
    selector: '',
    demo: 'ticket',
    title: 'Как записаться: QR-билет',
    description:
      'Когда участие подтверждено, появляется билет с QR-кодом. На входе покажите его организатору — он отсканирует код телефоном. Билет открывается даже без интернета.',
    hint: '🎫 Билет лежит в «Моих событиях», а за сутки до начала придёт напоминание',
    icon: <QrCode className="w-4 h-4 sm:w-5 sm:h-5 text-brand-ink" />,
  },
  {
    id: 'final-quiz-invitation',
    selector: '',
    title: 'Добро пожаловать в Sportikus!',
    badge: 'Финал',
    description:
      'Обучение завершено. Давайте настроим ваши рекомендации! Пройдите короткий 1-минутный тест: расскажите про возраст, любимые виды спорта, свой уровень и город. Мы сразу покажем лучшие события Для вас.',
    hint: '🎯 Займет всего 1 минуту, а лента станет персональной',
    icon: <PartyPopper className="w-5 h-5 sm:w-6 sm:h-6 text-brand-ink" />,
  },
];

const DEMO_PIN_STEP = TOUR_STEPS.findIndex((step) => step.id === 'demo-pin');
const DEMO_CARD_STEP = TOUR_STEPS.findIndex((step) => step.id === 'demo-card');

export const OnboardingTour: React.FC = () => {
  const { currentUser, preferences, refreshPreferences } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [quizOpen, setQuizOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const [cardHeight, setCardHeight] = useState(280);

  // Проверка: нужно ли автоматически запустить обучение
  useEffect(() => {
    // 1. Принудительный запуск через query param ?tour=1
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get('tour') === '1') {
      setStepIndex(0);
      setIsOpen(true);
      return;
    }

    // 2. Флаг регистрации в sessionStorage
    if (sessionStorage.getItem('sportikus_start_tour') === '1') {
      sessionStorage.removeItem('sportikus_start_tour');
      setStepIndex(0);
      setIsOpen(true);
      return;
    }

    // 3. Первый вход зарегистрированного пользователя (ROLE_USER)
    if (currentUser && currentUser.role === 'ROLE_USER') {
      const completedKey = `sportikus_tour_completed_${currentUser.id}`;
      if (localStorage.getItem(completedKey) !== 'true') {
        // Запускаем только на главной странице, чтобы были видны все элементы
        if (location.pathname === '/' || location.pathname === '/events') {
          setStepIndex(0);
          setIsOpen(true);
        }
      }
    }
  }, [currentUser, location.pathname, location.search]);

  // Слушатель глобального события для ручного запуска из профиля или меню
  useEffect(() => {
    const handleStartTour = () => {
      setStepIndex(0);
      setIsOpen(true);
      if (location.pathname !== '/' && location.pathname !== '/events') {
        navigate('/');
      }
    };
    window.addEventListener('start-sportikus-tour', handleStartTour);
    return () => window.removeEventListener('start-sportikus-tour', handleStartTour);
  }, [location.pathname, navigate]);

  // Блокировка фонового скролла на мобильных устройствах во время обучения
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  const currentStep = TOUR_STEPS[stepIndex] || TOUR_STEPS[0];
  const demo = useTourDemo();
  const isFinalStep = stepIndex === TOUR_STEPS.length - 1;
  // Финал не считается шагом: «Шаг N из M» только для обучающих шагов
  const stepBadge = currentStep.badge ?? `Шаг ${stepIndex + 1} из ${TOUR_STEPS.length - 1}`;

  // Учебная встреча на карте живёт с шага с меткой до конца записи; финал и закрытие тура её убирают
  const demoActive = isOpen && stepIndex >= DEMO_PIN_STEP && stepIndex < TOUR_STEPS.length - 1;
  useEffect(() => {
    if (demoActive) tourDemo.activate();
    else tourDemo.deactivate();
  }, [demoActive]);
  useEffect(() => () => tourDemo.deactivate(), []);

  // Пользователь сам открыл метку или нажал «Подать заявку» — тур идёт за ним, как по настоящему пути
  const seen = useRef({ opened: demo.opened, joinClicked: demo.joinClicked });
  useEffect(() => {
    const prev = seen.current;
    seen.current = { opened: demo.opened, joinClicked: demo.joinClicked };
    if (!isOpen) return;
    if (demo.opened > prev.opened && stepIndex === DEMO_PIN_STEP) setStepIndex(DEMO_CARD_STEP);
    else if (demo.joinClicked > prev.joinClicked && stepIndex === DEMO_CARD_STEP) setStepIndex(DEMO_CARD_STEP + 1);
  }, [demo.opened, demo.joinClicked, isOpen, stepIndex]);

  // Измерение высоты карточки
  useLayoutEffect(() => {
    if (cardRef.current) {
      const h = cardRef.current.getBoundingClientRect().height;
      if (h > 0) setCardHeight(h);
    }
  }, [stepIndex, isOpen]);

  // Обновление координат подсвечиваемого элемента
  const updateRect = useCallback(() => {
    if (!isOpen || !currentStep.selector) {
      setTargetRect(null);
      return;
    }

    const selectors = currentStep.selector.split(',').map((s) => s.trim());
    let foundEl: HTMLElement | null = null;

    for (const sel of selectors) {
      const el = document.querySelector<HTMLElement>(sel);
      if (el) {
        const r = el.getBoundingClientRect();
        // Проверяем видимость элемента на экране
        if (el.offsetParent !== null && r.width > 0 && r.height > 0) {
          foundEl = el;
          break;
        }
      }
    }

    if (foundEl) {
      // Скроллим к элементу, если он не на экране
      try {
        foundEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      } catch {
        // Fallback for jsdom
      }
      const rect = foundEl.getBoundingClientRect();
      setTargetRect(rect);
    } else {
      setTargetRect(null);
    }
  }, [isOpen, currentStep.selector]);

  useLayoutEffect(() => {
    updateRect();
    const timer = setTimeout(updateRect, 100);
    return () => clearTimeout(timer);
  }, [updateRect, stepIndex]);

  // Метка и карточка на карте появляются не сразу и двигаются вместе с картой — перемеряем их положение
  useEffect(() => {
    if (!isOpen || !currentStep.interactive) return;
    const timer = setInterval(updateRect, 250);
    return () => clearInterval(timer);
  }, [isOpen, currentStep.interactive, updateRect]);

  useEffect(() => {
    if (!isOpen) return;
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true);
    return () => {
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
    };
  }, [isOpen, updateRect]);

  const markTourCompleted = useCallback(() => {
    if (currentUser) {
      localStorage.setItem(`sportikus_tour_completed_${currentUser.id}`, 'true');
    }
    const p = new URLSearchParams(location.search);
    if (p.has('tour')) {
      p.delete('tour');
      navigate({ search: p.toString() }, { replace: true });
    }
  }, [currentUser, location.search, navigate]);

  const handleSkip = useCallback(() => {
    markTourCompleted();
    setIsOpen(false);
  }, [markTourCompleted]);

  const handleNext = useCallback(() => {
    // «Далее» на шаге с меткой открывает карточку учебной встречи — как если бы нажали на метку
    if (stepIndex === DEMO_PIN_STEP) tourDemo.requestOpen();
    if (stepIndex < TOUR_STEPS.length - 1) {
      setStepIndex((i) => i + 1);
    } else {
      markTourCompleted();
      setIsOpen(false);
    }
  }, [stepIndex, markTourCompleted]);

  const handlePrev = useCallback(() => {
    if (stepIndex > 0) {
      setStepIndex((i) => i - 1);
    }
  }, [stepIndex]);

  const handleStartQuiz = useCallback(() => {
    markTourCompleted();
    setIsOpen(false);
    setQuizOpen(true);
  }, [markTourCompleted]);

  // Навигация с клавиатуры
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleSkip();
      } else if (e.key === 'ArrowRight' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, handleSkip, handleNext, handlePrev]);

  if (!isOpen && !quizOpen) return null;

  // Геометрия вьюпорта и адаптивное позиционирование
  const viewportW = typeof window !== 'undefined' ? window.innerWidth : 380;
  const viewportH = typeof window !== 'undefined' ? window.innerHeight : 700;
  const isMobile = viewportW < 640;
  const pad = isMobile ? 5 : 8;

  // Стенд записи: на своих шагах всегда, на интерактивных — только если подсвечивать нечего
  const standKind = currentStep.demo ?? (targetRect ? undefined : currentStep.fallbackDemo);
  let tooltipStyle: React.CSSProperties = {};
  let showArrow = false;
  let arrowPlaceBelow = true;
  let arrowLeftPx = 50;

  if (!targetRect || isFinalStep) {
    // Центрирование финального шага или при отсутствии элемента
    tooltipStyle = {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      // На десктопе стенд записи стоит справа от текста, поэтому карточка шире, но не выше экрана
      width: isMobile ? 'calc(100vw - 24px)' : standKind ? `${Math.min(760, viewportW - 32)}px` : '400px',
      maxWidth: standKind ? '760px' : '420px',
    };
  } else {
    const targetCenterX = targetRect.left + targetRect.width / 2;
    const isTargetInBottomHalf = targetRect.top > viewportH * 0.45;

    if (isMobile) {
      // Мобильная раскладка
      const cardW = Math.min(390, viewportW - 24);
      const left = Math.max(12, (viewportW - cardW) / 2);

      if (isTargetInBottomHalf) {
        // Элемент внизу (например нижняя навигация) -> карточка сверху
        arrowPlaceBelow = false;
        const bottom = Math.max(12, viewportH - targetRect.top + pad + 10);
        tooltipStyle = {
          position: 'fixed',
          bottom: `${bottom}px`,
          left: `${left}px`,
          width: `${cardW}px`,
          maxWidth: 'calc(100vw - 24px)',
        };
      } else {
        // Элемент вверху (шапка, фильтры) -> карточка снизу
        arrowPlaceBelow = true;
        const top = Math.max(12, targetRect.bottom + pad + 10);
        tooltipStyle = {
          position: 'fixed',
          top: `${top}px`,
          left: `${left}px`,
          width: `${cardW}px`,
          maxWidth: 'calc(100vw - 24px)',
        };
      }

      showArrow = true;
      arrowLeftPx = Math.max(24, Math.min(cardW - 24, targetCenterX - left));
    } else {
      // Десктопная раскладка
      const cardW = Math.min(420, viewportW - 32);
      const spaceBelow = viewportH - (targetRect.bottom + pad);
      const placeBelow = spaceBelow >= cardHeight + 24 || spaceBelow >= targetRect.top;

      arrowPlaceBelow = placeBelow;

      let top: number;
      if (placeBelow) {
        top = targetRect.bottom + pad + 12;
      } else {
        top = Math.max(16, targetRect.top - pad - cardHeight - 12);
      }

      let left = targetCenterX - cardW / 2;
      if (left < 16) left = 16;
      if (left + cardW > viewportW - 16) left = viewportW - cardW - 16;

      tooltipStyle = {
        position: 'fixed',
        top: `${top}px`,
        left: `${left}px`,
        width: `${cardW}px`,
        maxWidth: '420px',
      };

      showArrow = true;
      arrowLeftPx = Math.max(24, Math.min(cardW - 24, targetCenterX - left));
    }
  }

  // Клики по подсвеченной метке или карточке проходят сквозь затемнение; остальной экран по-прежнему ведёт дальше
  const passThrough = !!currentStep.interactive && !!targetRect && !isFinalStep;
  const demoStand = standKind ? (
    <TourDemoStand key={currentStep.id} kind={standKind} participantName={currentUser?.fullName} />
  ) : null;

  // Расчёт размеров spotlight выреза
  const spotX = targetRect ? Math.max(0, targetRect.left - pad) : 0;
  const spotY = targetRect ? Math.max(0, targetRect.top - pad) : 0;
  const spotW = targetRect ? Math.min(viewportW - spotX, targetRect.width + pad * 2) : 0;
  const spotH = targetRect ? Math.min(viewportH - spotY, targetRect.height + pad * 2) : 0;
  const spotRadius = Math.min(14, spotH / 2);

  return (
    <>
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Обучение по сайту"
          onClick={passThrough ? undefined : handleNext}
          className={`fixed inset-0 z-tour select-none cursor-pointer ${passThrough ? 'pointer-events-none' : ''}`}
        >
          {/* Полупрозрачная маска с вырезом подсвечиваемого элемента (без блюра) */}
          {targetRect && !isFinalStep ? (
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none transition-all duration-300"
              style={{ width: '100vw', height: '100vh' }}
            >
              <defs>
                <mask id="tour-spotlight-mask">
                  <rect x="0" y="0" width="100%" height="100%" fill="white" />
                  <rect
                    x={spotX}
                    y={spotY}
                    width={spotW}
                    height={spotH}
                    rx={spotRadius}
                    ry={spotRadius}
                    fill="black"
                  />
                </mask>
              </defs>
              <rect
                x="0"
                y="0"
                width="100%"
                height="100%"
                fill="rgba(0, 0, 0, 0.65)"
                mask="url(#tour-spotlight-mask)"
              />
            </svg>
          ) : (
            <div className="absolute inset-0 bg-black/65 transition-all duration-300 pointer-events-none" />
          )}

          {/* Интерактивный шаг: вокруг выреза — четыре «заслонки», клик по ним ведёт дальше, а сам вырез кликается насквозь */}
          {passThrough &&
            [
              { top: 0, left: 0, right: 0, height: spotY },
              { top: spotY + spotH, left: 0, right: 0, bottom: 0 },
              { top: spotY, left: 0, width: spotX, height: spotH },
              { top: spotY, left: spotX + spotW, right: 0, height: spotH },
            ].map((box, i) => (
              <div key={i} onClick={handleNext} className="fixed pointer-events-auto" style={box} />
            ))}

          {/* Светящаяся рамка вокруг целевого элемента */}
          {targetRect && !isFinalStep && (
            <div
              className="fixed pointer-events-none z-tour-spotlight rounded-xl sm:rounded-2xl transition-all duration-300 ease-out"
              style={{
                top: `${spotY}px`,
                left: `${spotX}px`,
                width: `${spotW}px`,
                height: `${spotH}px`,
                boxShadow:
                  '0 0 0 2.5px var(--color-brand), 0 0 20px 4px var(--color-brand-glow), inset 0 0 10px var(--color-brand-glow)',
              }}
            >
              {/* Пульсирующий маркер внимания */}
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 sm:h-4 sm:w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand opacity-80" />
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 sm:h-4 sm:w-4 bg-brand" />
              </span>
            </div>
          )}

          {/* Кнопка «Пропустить обучение» в правом верхнем углу (адаптивная) */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleSkip();
            }}
            className="pointer-events-auto fixed top-3 sm:top-4 right-3 sm:right-4 z-tour-controls flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-card hover:bg-surface text-ink border border-line-2 shadow-xl text-xs sm:text-sm font-bold transition-all active:scale-95 cursor-pointer"
          >
            <span>{isMobile ? 'Пропустить' : 'Пропустить обучение'}</span>
            <X className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted" />
          </button>

          {/* Интерактивная карточка подсказки */}
          <div
            ref={cardRef}
            onClick={(e) => e.stopPropagation()}
            style={tooltipStyle}
            className="pointer-events-auto z-tour-card bg-card text-ink border border-line-2 shadow-[0_16px_40px_rgba(0,0,0,0.45)] rounded-2xl p-4 sm:p-5 transition-all duration-300 anim-fade cursor-default max-h-[82vh] overflow-y-auto"
          >
            {/* Стрелочка-указатель к элементу */}
            {showArrow && (
              <div
                style={{
                  position: 'absolute',
                  left: `${arrowLeftPx}px`,
                  [arrowPlaceBelow ? 'top' : 'bottom']: '-7px',
                  transform: 'translateX(-50%)',
                }}
                className="pointer-events-none"
              >
                <div
                  className={`w-3.5 h-3.5 bg-card border-line-2 rotate-45 shadow-sm ${
                    arrowPlaceBelow ? 'border-t border-l' : 'border-b border-r'
                  }`}
                />
              </div>
            )}

            <div
              className={
                standKind && !isMobile
                  ? 'grid grid-cols-[minmax(0,1fr)_minmax(0,330px)] items-center gap-5'
                  : undefined
              }
            >
            <div className="min-w-0">
            {/* Заголовок и бейдж шага */}
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:py-1 rounded-full text-caption sm:text-xs font-extrabold bg-brand-tint text-brand-ink border border-brand-line">
                {currentStep.icon}
                {stepBadge}
              </span>
            </div>

            <h3 className="text-base sm:text-lg font-extrabold text-ink tracking-tight mb-1.5">
              {currentStep.title}
            </h3>

            <p className="text-xs sm:text-sm text-muted leading-relaxed mb-3">
              {currentStep.description}
            </p>

            {/* На телефоне стенд идёт сразу под текстом, на десктопе — отдельной колонкой справа */}
            {standKind && isMobile && demoStand}

            {/* На телефоне у шагов стенда подсказку убираем: иначе карточка не помещается в экран */}
            {currentStep.hint && !(standKind && isMobile) && (
              <div className="flex items-start gap-1.5 p-2 sm:p-2.5 rounded-xl bg-surface border border-line-2 text-caption sm:text-xs text-ink mb-3 sm:mb-4">
                <span className="shrink-0 text-sm sm:text-base leading-none">💡</span>
                <span className="leading-snug">{currentStep.hint}</span>
              </div>
            )}

            {/* Навигация и кнопки */}
            {isFinalStep ? (
              <div className="flex flex-col gap-2 pt-1 sm:pt-2">
                <button
                  type="button"
                  onClick={handleStartQuiz}
                  className="w-full flex items-center justify-center gap-2 py-2.5 sm:py-3 px-4 rounded-xl bg-brand hover:bg-brand-hover text-on-brand font-bold text-xs sm:text-sm shadow-md transition-all active:scale-98"
                >
                  <Sparkles className="w-4 h-4" />
                  Пройти тест прямо сейчас
                </button>
                <button
                  type="button"
                  onClick={handleSkip}
                  className="w-full py-2 px-3 rounded-xl border border-line-2 bg-surface hover:bg-surface-2 text-ink text-xs sm:text-sm font-semibold transition-colors"
                >
                  Позже, перейти к событиям
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-line-2">
                <div className="flex items-center gap-1">
                  {TOUR_STEPS.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setStepIndex(idx)}
                      aria-label={`Шаг ${idx + 1}`}
                      className={`h-1.5 rounded-full transition-all ${
                        idx === stepIndex
                          ? 'w-5 bg-brand shadow-glow-ring'
                          : 'w-1.5 bg-line-2 hover:bg-muted'
                      }`}
                    />
                  ))}
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2">
                  {stepIndex > 0 && (
                    <button
                      type="button"
                      onClick={handlePrev}
                      className="h-8 sm:h-9 px-2.5 sm:px-3 rounded-xl border border-line-2 bg-card hover:bg-surface text-ink text-xs font-semibold flex items-center gap-1 transition"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" /> Назад
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleNext}
                    className="h-8 sm:h-9 px-3 sm:px-4 rounded-xl bg-brand hover:bg-brand-hover text-on-brand text-xs sm:text-sm font-bold flex items-center gap-1 shadow-sm transition active:scale-98"
                  >
                    Далее <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Подсказка о клике в любое место экрана */}
            {!isFinalStep && (
              <p className="mt-2 text-center text-micro sm:text-caption text-muted font-medium">
                Щёлкните в любое место экрана для перехода
              </p>
            )}
            </div>
            {standKind && !isMobile && demoStand}
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно квиза интересов после завершения обучения */}
      {quizOpen && (
        <InterestQuiz
          initial={preferences}
          onClose={() => setQuizOpen(false)}
          onSaved={async () => {
            await refreshPreferences();
          }}
          onFinish={() => {
            setQuizOpen(false);
            navigate('/recommended');
          }}
        />
      )}
    </>
  );
};
