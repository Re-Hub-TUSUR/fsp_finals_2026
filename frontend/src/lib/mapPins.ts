import type { SportEvent } from '../types';
import { initials, isFull, isHot, isLive, isMine, startLabel } from '../utils/eventView';

/**
 * HTML-метки поверх карты 2GIS (стили — .sp-pin* в index.css), по референсу редизайна.
 * В центре — фото или инициалы организатора, кольцо в цвет фона отделяет метку от подложки.
 * Спутник справа сверху несёт один статус: мало мест (огонёк) или идёт сейчас (точка + пульс).
 * Выбрана — заливка акцентом и подпись; кластер — акцентный круг со счётчиком; мест нет — серая.
 */

export const PIN_SIZE = 44;
export const PIN_SIZE_SELECTED = 48;

const FLAME =
  '<svg width="11" height="11" viewBox="0 0 24 24" fill="#fff"><path d="M12 1.5c1.2 3.8 6 6.4 6 12a6 6 0 0 1-12 0c0-2.7 1.3-4.6 2.8-5.7.1 2 1.1 3.3 2.4 3.8-.3-3.6.1-7.4.8-10.1z"/></svg>';
const CHECK =
  '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';

const escapeHtml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function element(html: string): HTMLElement {
  const el = document.createElement('div');
  el.innerHTML = html.trim();
  return el.firstElementChild as HTMLElement;
}

export function pinElement(event: SportEvent, selected: boolean): HTMLElement {
  const live = isLive(event);
  const size = selected ? PIN_SIZE_SELECTED : PIN_SIZE;
  // Фото организатора не показываем на выбранной метке — там акцентная заливка с инициалами
  const face =
    event.organizerAvatar && !selected
      ? `<img src="${escapeHtml(event.organizerAvatar)}" alt="" />`
      : escapeHtml(initials(event.organizerName));

  const badge = isHot(event)
    ? `<span class="sp-pin-badge sp-pin-badge--hot">${FLAME}</span>`
    : live
      ? '<span class="sp-pin-badge sp-pin-badge--live"><i></i></span>'
      : '';

  return element(`
    <div class="sp-pin${selected ? ' is-selected' : ''}${isFull(event) ? ' is-full' : ''}" style="width:${size}px;height:${size}px"
         role="button" aria-label="${escapeHtml(event.title)}">
      ${live ? '<span class="sp-pin-pulse"></span>' : ''}
      <span class="sp-pin-face">${face}</span>
      ${badge}
      ${isMine(event) ? `<span class="sp-pin-badge sp-pin-badge--mine">${CHECK}</span>` : ''}
      ${selected ? `<span class="sp-pin-caption">${escapeHtml(`${startLabel(event)} · ${event.sport.name}`)}</span>` : ''}
    </div>`);
}

export function clusterSize(count: number): number {
  return Math.min(58, 40 + count * 3);
}

export function clusterElement(events: SportEvent[]): HTMLElement {
  const n = events.length;
  const size = clusterSize(n);
  const live = events.some((e) => isLive(e));
  return element(`
    <div class="sp-pin sp-cluster" style="width:${size}px;height:${size}px" role="button" aria-label="${n} мероприятий">
      ${live ? '<span class="sp-pin-pulse"></span>' : ''}
      <span class="sp-pin-face" style="font-size:${n > 9 ? 15 : 17}px">${n}</span>
      ${events.some(isHot) ? `<span class="sp-pin-badge sp-pin-badge--hot">${FLAME}</span>` : ''}
    </div>`);
}

export const ME_SIZE = 18;

export function meElement(): HTMLElement {
  return element('<div class="sp-me" aria-label="Вы здесь"><span class="sp-me-halo"></span><span class="sp-me-dot"></span></div>');
}
