import React, { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Compass,
  MapPin,
  PartyPopper,
  SlidersHorizontal,
  Sparkles,
  Ticket,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { InterestQuiz } from './InterestQuiz';

export interface TourStep {
  id: string;
  selector: string;
  title: string;
  badge: string;
  description: string;
  hint?: string;
  icon: React.ReactNode;
  arrowPosition?: 'top' | 'bottom' | 'center';
}

const TOUR_STEPS: TourStep[] = [
  {
    id: 'recommendations',
    selector: '[data-tour="nav-recommended"], [data-tour="nav-recommended-mobile"]',
    title: 'Персональные рекомендации',
    badge: 'Шаг 1 из 5',
    description:
      'Sportikus умеет составлять подборку лично под вас! Вкладка «Для вас» находит события по вашим любимым видам спорта, уровню и расписанию. Сейчас мы коротко покажем сайт, а в конце предложим пройти 1-минутный тест интересов.',
    hint: '✨ Первым делом покажем интерфейс, а в конце настроим рекомендации',
    icon: <Sparkles className="w-5 h-5 text-brand-ink" />,
    arrowPosition: 'top',
  },
  {
    id: 'map-and-feed',
    selector: '[data-tour="nav-map-feed"], [data-tour="nav-map-feed-mobile"]',
    title: 'Карта и Лента событий',
    badge: 'Шаг 2 из 5',
    description:
      'Переключайтесь между списком мероприятий в «Ленте» и интерактивной 2ГИС-картой: стадионы, парки, манежи и залы с указанием дистанции от вас, свободными местами и расписанием.',
    hint: '📍 На карте удобно находить тренировки прямо возле дома или работы',
    icon: <Compass className="w-5 h-5 text-brand-ink" />,
    arrowPosition: 'top',
  },
  {
    id: 'filters',
    selector: '[data-tour="filter-bar"], [data-tour="filter-button-mobile"]',
    title: 'Умные фильтры и радиус',
    badge: 'Шаг 3 из 5',
    description:
      'Выбирайте любимый спорт (футбол, волейбол, бег, теннис и др.), задавайте удобный радиус (1, 3, 5 км), фильтруйте по дате, времени суток и уровню сложности — от новичка до профи.',
    hint: '⚡ Нажмите на любой вид спорта в шапке для мгновенной фильтрации',
    icon: <SlidersHorizontal className="w-5 h-5 text-brand-ink" />,
    arrowPosition: 'top',
  },
  {
    id: 'search-and-city',
    selector: '[data-tour="search-bar"], [data-tour="city-selector"]',
    title: 'Поиск и локации',
    badge: 'Шаг 4 из 5',
    description:
      'Ищите тренировки по названию площадки, спортклубу или имени организатора. А если приехали в другой город — переключайте локацию в шапке в один клик.',
    hint: '🔍 Быстрый поиск работает по всем площадкам и городам',
    icon: <MapPin className="w-5 h-5 text-brand-ink" />,
    arrowPosition: 'top',
  },
  {
    id: 'create-and-tickets',
    selector: '[data-tour="create-event"], [data-tour="create-event-mobile"]',
    title: 'Организация и QR-билеты',
    badge: 'Шаг 5 из 5',
    description:
      'Создавайте собственные матчи и турниры в удобном конструкторе или записывайтесь на чужие. После подтверждения заявки вы получаете персональный QR-билет для быстрой отметки организатором.',
    hint: '🎫 Ваши билеты всегда доступны в разделе «Мои события»',
    icon: <Ticket className="w-5 h-5 text-brand-ink" />,
    arrowPosition: 'top',
  },
  {
    id: 'final-quiz-invitation',
    selector: '',
    title: 'Добро пожаловать в Sportikus!',
    badge: 'Финал',
    description:
      'Обучение завершено. Давайте настроим ваши рекомендации! Пройдите короткий 1-минутный тест: выберите виды спорта, район и ваш уровень. Мы сразу покажем лучшие события Для вас.',
    hint: '🎯 Займет всего 1 минуту, а лента станет персональной',
    icon: <PartyPopper className="w-6 h-6 text-brand-ink" />,
    arrowPosition: 'center',
  },
];

export const OnboardingTour: React.FC = () => {
  const { currentUser, preferences, refreshPreferences } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [quizOpen, setQuizOpen] = useState(false);

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
      // Если мы не на главной, переходим на главную
      if (location.pathname !== '/' && location.pathname !== '/events') {
        navigate('/');
      }
    };
    window.addEventListener('start-sportikus-tour', handleStartTour);
    return () => window.removeEventListener('start-sportikus-tour', handleStartTour);
  }, [location.pathname, navigate]);

  const currentStep = TOUR_STEPS[stepIndex] || TOUR_STEPS[0];
  const isFinalStep = stepIndex === TOUR_STEPS.length - 1;

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
      if (el && el.offsetParent !== null) {
        foundEl = el;
        break;
      }
    }

    if (foundEl) {
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
    // Удаляем tour из URL если был
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
    if (stepIndex < TOUR_STEPS.length - 1) {
      setStepIndex((i) => i + 1);
    } else {
      // На последнем шаге
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

  // Расчёт позиции карточки подсказки
  const pad = 8;
  const cardWidth = Math.min(420, typeof window !== 'undefined' ? window.innerWidth - 32 : 380);

  let tooltipStyle: React.CSSProperties = {};
  let showArrow = false;
  let arrowStyle: React.CSSProperties = {};

  if (!targetRect || isFinalStep) {
    // По центру экрана
    tooltipStyle = {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: `${cardWidth}px`,
      maxWidth: '92vw',
    };
  } else {
    // Интеллектуальное позиционирование относительно элемента
    const viewportH = window.innerHeight;
    const viewportW = window.innerWidth;
    const spaceBelow = viewportH - (targetRect.bottom + pad);
    const spaceAbove = targetRect.top - pad;

    let top: number;
    let placeBelow = true;

    if (spaceBelow >= 260 || spaceBelow >= spaceAbove) {
      top = targetRect.bottom + pad + 12;
      placeBelow = true;
    } else {
      top = Math.max(16, targetRect.top - pad - 280);
      placeBelow = false;
    }

    // Выравнивание по горизонтали
    let left = targetRect.left + targetRect.width / 2 - cardWidth / 2;
    if (left < 16) left = 16;
    if (left + cardWidth > viewportW - 16) left = viewportW - cardWidth - 16;

    tooltipStyle = {
      position: 'fixed',
      top: `${top}px`,
      left: `${left}px`,
      width: `${cardWidth}px`,
      maxWidth: '92vw',
    };

    showArrow = true;
    const arrowCenterX = targetRect.left + targetRect.width / 2 - left;
    arrowStyle = {
      position: 'absolute',
      left: `${Math.max(20, Math.min(cardWidth - 20, arrowCenterX))}px`,
      [placeBelow ? 'top' : 'bottom']: '-8px',
      transform: 'translateX(-50%)',
    };
  }

  return (
    <>
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Обучение по сайту"
          onClick={handleNext}
          className="fixed inset-0 z-[9990] select-none cursor-pointer"
        >
          {/* Полупрозрачная маска с вырезом подсвечиваемого элемента (без размытия) */}
          {targetRect && !isFinalStep ? (
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none transition-all duration-300"
              style={{ width: '100vw', height: '100vh' }}
            >
              <defs>
                <mask id="tour-spotlight-mask">
                  <rect x="0" y="0" width="100%" height="100%" fill="white" />
                  <rect
                    x={targetRect.left - pad}
                    y={targetRect.top - pad}
                    width={targetRect.width + pad * 2}
                    height={targetRect.height + pad * 2}
                    rx="16"
                    ry="16"
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

          {/* Светящаяся рамка вокруг целевого элемента */}
          {targetRect && !isFinalStep && (
            <div
              className="fixed pointer-events-none z-[9995] rounded-2xl transition-all duration-300 ease-out"
              style={{
                top: `${targetRect.top - pad}px`,
                left: `${targetRect.left - pad}px`,
                width: `${targetRect.width + pad * 2}px`,
                height: `${targetRect.height + pad * 2}px`,
                boxShadow:
                  '0 0 0 3px var(--brand, #04D793), 0 0 25px 6px rgba(4, 215, 147, 0.55), inset 0 0 15px rgba(4, 215, 147, 0.2)',
              }}
            >
              {/* Пульсирующий маркер внимания */}
              <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand opacity-80" />
                <span className="relative inline-flex rounded-full h-4 w-4 bg-brand" />
              </span>
            </div>
          )}

          {/* Кнопка «Пропустить обучение» в правом верхнем углу */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleSkip();
            }}
            className="fixed top-4 right-4 z-[9999] flex items-center gap-2 px-4 py-2.5 rounded-full bg-card hover:bg-surface text-ink border border-line-2 shadow-2xl text-xs sm:text-sm font-bold transition-all active:scale-95 cursor-pointer"
          >
            <span>Пропустить обучение</span>
            <X className="w-4 h-4 text-muted" />
          </button>

          {/* Интерактивная карточка подсказки */}
          <div
            onClick={(e) => e.stopPropagation()}
            style={tooltipStyle}
            className="z-[9996] bg-card text-ink border border-line-2 shadow-[0_20px_50px_rgba(0,0,0,0.4)] rounded-2xl p-5 sm:p-6 transition-all duration-300 anim-fade cursor-default"
          >
            {/* Стрелочка-указатель к элементу */}
            {showArrow && (
              <div style={arrowStyle} className="pointer-events-none">
                <div className="w-3.5 h-3.5 bg-card border-t border-l border-line-2 rotate-45 shadow-sm" />
              </div>
            )}

            {/* Заголовок и бейдж шага */}
            <div className="flex items-center justify-between gap-3 mb-2.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-extrabold bg-brand-tint text-brand-ink border border-brand-line">
                {currentStep.icon}
                {currentStep.badge}
              </span>
              <span className="text-xs font-semibold text-muted">
                {stepIndex + 1} из {TOUR_STEPS.length}
              </span>
            </div>

            <h3 className="text-lg sm:text-xl font-extrabold text-ink tracking-tight mb-2">
              {currentStep.title}
            </h3>

            <p className="text-sm text-muted leading-relaxed mb-4">
              {currentStep.description}
            </p>

            {currentStep.hint && (
              <div className="flex items-start gap-2 p-2.5 rounded-xl bg-surface border border-line-2 text-xs text-ink mb-5">
                <span className="shrink-0 text-base leading-none">💡</span>
                <span className="leading-snug">{currentStep.hint}</span>
              </div>
            )}

            {/* Навигация и кнопки */}
            {isFinalStep ? (
              <div className="flex flex-col gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={handleStartQuiz}
                  className="w-full flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-brand hover:bg-brand-hover text-on-brand font-bold text-sm sm:text-base shadow-lg transition-all active:scale-98"
                >
                  <Sparkles className="w-5 h-5" />
                  Пройти тест прямо сейчас
                </button>
                <button
                  type="button"
                  onClick={handleSkip}
                  className="w-full py-2.5 px-4 rounded-xl border border-line-2 bg-surface hover:bg-surface-2 text-ink text-sm font-semibold transition-colors"
                >
                  Позже, перейти к событиям
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-line-2">
                <div className="flex items-center gap-1.5">
                  {TOUR_STEPS.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setStepIndex(idx)}
                      aria-label={`Шаг ${idx + 1}`}
                      className={`h-2 rounded-full transition-all ${
                        idx === stepIndex
                          ? 'w-6 bg-brand shadow-[0_0_8px_rgba(4,215,147,0.8)]'
                          : 'w-2 bg-line-2 hover:bg-muted'
                      }`}
                    />
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  {stepIndex > 0 && (
                    <button
                      type="button"
                      onClick={handlePrev}
                      className="h-9 px-3 rounded-xl border border-line-2 bg-card hover:bg-surface text-ink text-xs font-semibold flex items-center gap-1 transition"
                    >
                      <ChevronLeft className="w-4 h-4" /> Назад
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleNext}
                    className="h-9 px-4 rounded-xl bg-brand hover:bg-brand-hover text-on-brand text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-sm transition active:scale-98"
                  >
                    Далее <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Подсказка о клике в любое место экрана */}
            {!isFinalStep && (
              <p className="mt-3 text-center text-[11px] text-muted font-medium">
                Щёлкните в любое место экрана для перехода дальше
              </p>
            )}
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
