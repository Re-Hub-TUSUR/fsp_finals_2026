import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, CheckCircle, XCircle, Ban, Building2 } from 'lucide-react';

interface OrgRequest {
  id: number;
  name: string;
  description: string;
  ownerName: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

export const AdminPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'orgs' | 'events' | 'comments'>('orgs');

  const [orgs, setOrgs] = useState<OrgRequest[]>([
    {
      id: 2,
      name: 'Шахматный клуб «Ладья»',
      description: 'Городской клуб любителей шахмат и интеллектуальных видов спорта на о. Татышев.',
      ownerName: 'Гроссмейстер Ладьи (ladya@sport.ru)',
      status: 'PENDING',
    },
    {
      id: 3,
      name: 'Подпольный боксерский клуб',
      description: 'Спарринги в подвале без тренера и экипировки.',
      ownerName: 'Алексей Профи (pro@sport.ru)',
      status: 'REJECTED',
    },
  ]);

  const [rejectDialogId, setRejectDialogId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const handleApproveOrg = (id: number) => {
    setOrgs((prev) =>
      prev.map((o) => (o.id === id ? { ...o, status: 'APPROVED' } : o))
    );
  };

  const handleRejectOrg = (id: number) => {
    if (!rejectReason.trim()) return;
    setOrgs((prev) =>
      prev.map((o) => (o.id === id ? { ...o, status: 'REJECTED' } : o))
    );
    setRejectDialogId(null);
    setRejectReason('');
  };

  if (currentUser.role !== 'ROLE_ADMIN') {
    return (
      <div className="max-w-md mx-auto my-12 p-6 bg-red-50 border border-red-200 rounded-2xl text-center">
        <ShieldAlert className="w-12 h-12 text-red-600 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-red-900 mb-1">Доступ ограничен</h2>
        <p className="text-xs text-red-700">
          Данный раздел доступен только Администратору. Переключите роль в верхней панели на «🛡️ Администратор».
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-md">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Панель администратора</h1>
          <p className="text-xs text-slate-500">
            Модерация организаций, событий и комментариев (Финал Чемпионата России)
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-4 mb-6">
        <button
          onClick={() => setActiveTab('orgs')}
          className={`pb-3 text-sm font-semibold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'orgs'
              ? 'border-purple-600 text-purple-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building2 className="w-4 h-4" />
          Заявки организаций ({orgs.filter(o => o.status === 'PENDING').length})
        </button>
        <button
          onClick={() => setActiveTab('events')}
          className={`pb-3 text-sm font-semibold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'events'
              ? 'border-purple-600 text-purple-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Ban className="w-4 h-4" />
          Снятие с публикации (Сценарий 6)
        </button>
      </div>

      {/* Tab: Organizations */}
      {activeTab === 'orgs' && (
        <div className="space-y-4">
          {orgs.map((org) => (
            <div
              key={org.id}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-900">{org.name}</h3>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                      org.status === 'APPROVED'
                        ? 'bg-emerald-100 text-emerald-700'
                        : org.status === 'REJECTED'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {org.status === 'PENDING' ? 'На рассмотрении' : org.status === 'APPROVED' ? 'Одобрено' : 'Отклонено'}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1">{org.description}</p>
                <span className="text-[11px] text-slate-400 mt-2 block">
                  Владелец: {org.ownerName}
                </span>
              </div>

              {org.status === 'PENDING' && (
                <div className="flex items-center gap-2 self-end md:self-auto">
                  <button
                    onClick={() => handleApproveOrg(org.id)}
                    className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl text-xs font-semibold shadow-sm transition-colors"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Одобрить
                  </button>
                  <button
                    onClick={() => setRejectDialogId(org.id)}
                    className="flex items-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-700 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors"
                  >
                    <XCircle className="w-4 h-4" />
                    Отклонить
                  </button>
                </div>
              )}
            </div>
          ))}

          {/* Rejection Modal */}
          {rejectDialogId && (
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
                <h3 className="font-bold text-slate-900 text-base mb-2">
                  Причина отклонения заявки
                </h3>
                <textarea
                  rows={3}
                  placeholder="Обязательно укажите причину для организатора..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full text-xs p-3 border border-slate-300 rounded-xl outline-none focus:border-red-500 mb-4"
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => {
                      setRejectDialogId(null);
                      setRejectReason('');
                    }}
                    className="text-xs px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    Отмена
                  </button>
                  <button
                    onClick={() => handleRejectOrg(rejectDialogId)}
                    className="text-xs px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg shadow-sm"
                  >
                    Подтвердить отказ
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Events Moderation (Scenario 6) */}
      {activeTab === 'events' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200">
          <h3 className="font-bold text-slate-900 mb-2">Модерация мероприятий (Сценарий 6 ТЗ)</h3>
          <p className="text-xs text-slate-500 mb-4">
            При снятии события с публикации оно мгновенно исчезает с карты и каталога. По прямой ссылке отображается причина снятия.
          </p>
          <div className="border border-slate-200 rounded-xl p-4 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">Воркаут</span>
              <h4 className="font-semibold text-slate-800 text-sm mt-1">Воркаут тренировка и разбор базы</h4>
              <p className="text-xs text-slate-500">Организатор: Иван Иванов</p>
            </div>
            <button className="text-xs bg-red-50 text-red-600 hover:bg-red-100 font-semibold px-3 py-2 rounded-xl transition-colors">
              Снять с публикации
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
