import type { SportEvent } from '../../types';
import { registrationClosesAt } from '../../utils/format';

/** Состояние мероприятия, от которого зависят панель записи и баннеры страницы. */
export interface EventPhase {
  ended: boolean;
  /** Запись закрыта: мероприятие прошло или истёк срок приёма заявок. */
  closed: boolean;
  full: boolean;
  archived: boolean;
  /** Не опубликовано и не в архиве: на модерации или снято. */
  unpublished: boolean;
  onReview: boolean;
}

export function eventPhase(event: SportEvent, now: number): EventPhase {
  const ended = new Date(event.endTime).getTime() <= now;
  const archived = event.status === 'ARCHIVED';
  return {
    ended,
    closed: ended || registrationClosesAt(event).getTime() <= now,
    full: event.confirmedCount >= event.capacity,
    archived,
    unpublished: event.status !== 'PUBLISHED' && !archived,
    onReview: event.status === 'MODERATION',
  };
}
