import React, { useState } from 'react';
import type { SportEvent } from '../types';
import { BlinkMap } from '../components/BlinkMap';
import { EventCard } from '../components/EventCard';
import { Map as MapIcon, List, Search } from 'lucide-react';

const INITIAL_EVENTS: SportEvent[] = [
  {
    id: 1,
    title: 'Утренний забег на о. Татышев',
    description: 'Легкий темповый бег 5 км по живописным дорожкам острова. Разминка и чай после финиша.',
    sport: { id: 3, name: 'Бег', slug: 'beg', isCustom: false },
    organizerName: 'СК «Енисей»',
    organizerAvatar: 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?w=120',
    isOrganization: true,
    startTime: new Date(Date.now() + 2 * 3600 * 1000).toISOString(),
    endTime: new Date(Date.now() + 3.5 * 3600 * 1000).toISOString(),
    lat: 56.0235,
    lng: 92.9351,
    address: 'Красноярск, остров Татышев, павильон дирекции',
    capacity: 20,
    confirmedCount: 1,
    joinMode: 'OPEN',
    skillLevel: 'ANY',
    requiredEquipment: 'Кроссовки для бега, вода',
    status: 'PUBLISHED',
  },
  {
    id: 2,
    title: 'Дворовый футбол 5x5',
    description: 'Собираем 2 команды для дружеского матча. Нужен вратарь и пара полевых игроков.',
    sport: { id: 1, name: 'Футбол', slug: 'futbol', isCustom: false },
    organizerName: 'Иван Иванов',
    organizerAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120',
    isOrganization: false,
    startTime: new Date(Date.now() + 4 * 3600 * 1000).toISOString(),
    endTime: new Date(Date.now() + 6 * 3600 * 1000).toISOString(),
    lat: 56.0125,
    lng: 92.8680,
    address: 'Красноярск, ул. Ленина, д. 118 (коробка во дворе)',
    capacity: 10,
    confirmedCount: 1,
    joinMode: 'OPEN',
    skillLevel: 'AMATEUR',
    requiredEquipment: 'Кроссовки с грунтовой подошвой, щитки по желанию',
    status: 'PUBLISHED',
  },
  {
    id: 3,
    title: 'Товарищеский турнир по настольному теннису',
    description: 'Играем на вылет до двух побед. Запись по предварительной заявке, уровень от любителя.',
    sport: { id: 5, name: 'Настольный теннис', slug: 'nastolnyj-tennis', isCustom: false },
    organizerName: 'Алексей Профи',
    organizerAvatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=120',
    isOrganization: false,
    startTime: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    endTime: new Date(Date.now() + 27 * 3600 * 1000).toISOString(),
    lat: 56.0410,
    lng: 92.9150,
    address: 'Красноярск, о. Отдыха, Дворец спорта им. Ивана Ярыгина',
    capacity: 8,
    confirmedCount: 0,
    joinMode: 'APPROVAL',
    skillLevel: 'AMATEUR',
    requiredEquipment: 'Своя ракетка (пара мячей есть)',
    status: 'PUBLISHED',
  },
  {
    id: 4,
    title: 'Воркаут тренировка и разбор базы',
    description: 'Учимся правильным подтягиваниям, выходам силой и базовой статике. Приглашаются новички!',
    sport: { id: 7, name: 'Воркаут', slug: 'vorkaut', isCustom: true },
    organizerName: 'Иван Иванов',
    organizerAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120',
    isOrganization: false,
    startTime: new Date(Date.now() + 29 * 3600 * 1000).toISOString(),
    endTime: new Date(Date.now() + 31 * 3600 * 1000).toISOString(),
    lat: 56.0090,
    lng: 92.8720,
    address: 'Красноярск, Центральная набережная Енисея, площадка воркаута',
    capacity: 15,
    confirmedCount: 0,
    joinMode: 'OPEN',
    skillLevel: 'NOVICE',
    requiredEquipment: 'Перчатки, бутылка воды',
    status: 'PUBLISHED',
  },
];

export const HomePage: React.FC = () => {
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [selectedSport, setSelectedSport] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedEvent, setSelectedEvent] = useState<SportEvent | null>(null);

  const sports = [
    { slug: 'all', name: 'Все виды' },
    { slug: 'beg', name: 'Бег' },
    { slug: 'futbol', name: 'Футбол' },
    { slug: 'nastolnyj-tennis', name: 'Настольный теннис' },
    { slug: 'vorkaut', name: 'Воркаут' },
  ];

  const filteredEvents = INITIAL_EVENTS.filter((e) => {
    if (selectedSport !== 'all' && e.sport.slug !== selectedSport) return false;
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      return (
        e.title.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        e.address.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Top Controls: Search, Filters, View Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2 flex-1 max-w-md bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Поиск по названию, адресу, описанию..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-sm outline-none bg-transparent text-slate-800 placeholder-slate-400"
          />
        </div>

        {/* View Switcher: Map / List */}
        <div className="flex items-center bg-slate-200/80 p-1 rounded-xl self-start md:self-auto">
          <button
            onClick={() => setViewMode('map')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'map'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <MapIcon className="w-4 h-4" />
            <span>Карта Blink</span>
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'list'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <List className="w-4 h-4" />
            <span>Список ({filteredEvents.length})</span>
          </button>
        </div>
      </div>

      {/* Sport Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-4 scrollbar-none">
        {sports.map((s) => (
          <button
            key={s.slug}
            onClick={() => setSelectedSport(s.slug)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              selectedSport === s.slug
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {s.name}
          </button>
        ))}
      </div>

      {/* Main Content Area */}
      {viewMode === 'map' ? (
        <div className="h-[calc(100vh-250px)] min-h-[500px]">
          <BlinkMap
            events={filteredEvents}
            selectedEvent={selectedEvent}
            onSelectEvent={setSelectedEvent}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
};
