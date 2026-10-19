import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, MapPin } from 'lucide-react';

export const CreateEventPage: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sportId, setSportId] = useState('1');
  const [isCustomSport, setIsCustomSport] = useState(false);
  const [customSportName, setCustomSportName] = useState('');
  const [address, setAddress] = useState('Красноярск, остров Татышев');
  const [lat, setLat] = useState('56.0235');
  const [lng, setLng] = useState('92.9351');
  const [capacity, setCapacity] = useState(10);
  const [joinMode, setJoinMode] = useState<'OPEN' | 'APPROVAL'>('OPEN');
  const [skillLevel, setSkillLevel] = useState('ANY');
  const [equipment, setEquipment] = useState('');
  const [submitted, setSubmitted] = useState(false);

  // Check if unapproved org is trying to create (Scenario 2 validation)
  const isOrgBlocked = currentUser.role === 'ROLE_ORGANIZER' && currentUser.orgStatus !== 'APPROVED';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isOrgBlocked) return;
    setSubmitted(true);
    setTimeout(() => {
      navigate('/');
    }, 1500);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">
          Создать спортивное событие
        </h1>
        <p className="text-sm text-slate-500 mb-6">
          Организуйте игру, тренировку или турнир для жителей Красноярска.
        </p>

        {isOrgBlocked && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 text-amber-800">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm">
              <b>Организация ожидает одобрения администратора.</b>
              <p className="text-xs text-amber-700 mt-1">
                Клуб «{currentUser.fullName}» находится на рассмотрении. После модерации создание событий станет доступно мгновенно.
              </p>
            </div>
          </div>
        )}

        {submitted ? (
          <div className="p-8 text-center bg-emerald-50 rounded-xl border border-emerald-200 animate-in fade-in">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-900 mb-1">
              Событие успешно создано!
            </h3>
            <p className="text-xs text-slate-600">
              Метка появилась на карте Красноярска. Перенаправляем на главную...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Название мероприятия *
              </label>
              <input
                type="text"
                required
                disabled={isOrgBlocked}
                placeholder="Например: Воркаут на набережной"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            {/* Dynamic Sport Selection (Scenario 1) */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Вид спорта *
                </label>
                <button
                  type="button"
                  onClick={() => setIsCustomSport(!isCustomSport)}
                  className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold"
                >
                  {isCustomSport ? '← Выбрать из списка' : '+ Свой вид спорта'}
                </button>
              </div>

              {isCustomSport ? (
                <div className="space-y-1.5">
                  <input
                    type="text"
                    required
                    disabled={isOrgBlocked}
                    placeholder="Введите название (например: Петанк, Воркаут, Падел)"
                    value={customSportName}
                    onChange={(e) => setCustomSportName(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-emerald-400 bg-emerald-50/20 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/30"
                  />
                  <span className="text-[11px] text-slate-400">
                    Слаг будет сгенерирован автоматически и добавлен в общий каталог.
                  </span>
                </div>
              ) : (
                <select
                  value={sportId}
                  disabled={isOrgBlocked}
                  onChange={(e) => setSportId(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl outline-none focus:border-emerald-500 bg-white"
                >
                  <option value="1">Футбол</option>
                  <option value="2">Баскетбол</option>
                  <option value="3">Бег</option>
                  <option value="4">Волейбол</option>
                  <option value="5">Настольный теннис</option>
                  <option value="6">Шахматы</option>
                  <option value="7">Воркаут</option>
                </select>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Описание и правила
              </label>
              <textarea
                rows={3}
                disabled={isOrgBlocked}
                placeholder="Опишите формат встречи, уровень подготовки и план..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl outline-none focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  Режим записи
                </label>
                <select
                  value={joinMode}
                  disabled={isOrgBlocked}
                  onChange={(e) => setJoinMode(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl outline-none bg-white"
                >
                  <option value="OPEN">Свободный вход</option>
                  <option value="APPROVAL">По заявке</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  Уровень
                </label>
                <select
                  value={skillLevel}
                  disabled={isOrgBlocked}
                  onChange={(e) => setSkillLevel(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl outline-none bg-white"
                >
                  <option value="ANY">Любой</option>
                  <option value="NOVICE">Новичок</option>
                  <option value="AMATEUR">Любитель</option>
                  <option value="PRO">Профи</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  Лимит мест
                </label>
                <input
                  type="number"
                  min="2"
                  max="100"
                  disabled={isOrgBlocked}
                  value={capacity}
                  onChange={(e) => setCapacity(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Требуемая экипировка
              </label>
              <input
                type="text"
                disabled={isOrgBlocked}
                placeholder="Например: Своя ракетка, кроссовки"
                value={equipment}
                onChange={(e) => setEquipment(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Адрес места сбора в Красноярске
              </label>
              <div className="flex items-center gap-2 border border-slate-300 rounded-xl px-3 py-2">
                <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                <input
                  type="text"
                  required
                  disabled={isOrgBlocked}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full text-sm outline-none bg-transparent"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Широта (lat)</label>
                <input
                  type="text"
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg font-mono text-slate-600"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Долгота (lng)</label>
                <input
                  type="text"
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg font-mono text-slate-600"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isOrgBlocked}
              className={`w-full py-3 rounded-xl font-semibold text-sm transition-all shadow-md ${
                isOrgBlocked
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-98'
              }`}
            >
              Опубликовать событие
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
