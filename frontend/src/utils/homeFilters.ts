import type { JoinMode, SkillLevel, Sport } from '../types';
import type { When } from '../utils/eventView';

/** Состояние фильтров Ленты и Карты: что выбрано, значения по умолчанию и счётчики для бейджей. */

export type Radius = '1' | '3' | '5' | '10' | 'all';

export const RADIUS_OPTIONS: { value: Radius; label: string }[] = [
  { value: '1', label: '1 км' },
  { value: '3', label: '3 км' },
  { value: '5', label: '5 км' },
  { value: '10', label: '10 км' },
  { value: 'all', label: 'Без ограничения' },
];

export const radiusValue = (r: Radius) => (r === 'all' ? 'Без ограничения' : `${r} км`);

export interface HomeFilterState {
  sports: string[];
  radius: Radius;
  when: When;
  skill: SkillLevel | '';
  joinMode: JoinMode | '';
  freeOnly: boolean;
  freeCost: boolean;
}

export const DEFAULT_FILTERS: HomeFilterState = {
  sports: [],
  radius: 'all',
  when: { kind: 'all' },
  skill: '',
  joinMode: '',
  freeOnly: false,
  freeCost: false,
};

/** Сколько «дополнительных» фильтров включено (без спорта, радиуса и времени — они видны в баре). */
export const extraFilterCount = (f: HomeFilterState) =>
  (f.skill ? 1 : 0) + (f.joinMode ? 1 : 0) + (f.freeOnly ? 1 : 0) + (f.freeCost ? 1 : 0);

export const allFilterCount = (f: HomeFilterState) =>
  extraFilterCount(f) + (f.when.kind !== 'all' ? 1 : 0);

export const sportsLabel = (selected: string[], sports: Sport[]) => {
  if (selected.length === 0) return 'Все виды';
  if (selected.length === 1) return sports.find((s) => s.slug === selected[0])?.name ?? '1 вид';
  return `${selected.length} вида`;
};
