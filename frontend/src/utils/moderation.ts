import type { ModerationCategory, SportEvent } from '../types';

/** Символ, которым помечаются мероприятия, требующие внимания администратора. */
export const ATTENTION_SYMBOL = '⚠';

/** Префикс причины, которую бэкенд пишет при отклонении автопроверкой. */
export const AUTO_REJECT_PREFIX = 'Не прошло автоматическую проверку: ';

export const MODERATION_CATEGORY_LABELS: Record<ModerationCategory, string> = {
  POLITICS: 'политика',
  ALCOHOL: 'алкоголь',
  TOBACCO: 'табак и никотин',
  DRUGS: 'наркотики и допинг',
  GAMBLING: 'азартные игры и ставки',
  DISCRIMINATION: 'дискриминация',
  VIOLENCE: 'насилие и экстремизм',
  ADULT: 'контент 18+',
  FRAUD: 'финансовые схемы и спам',
  PROFANITY: 'нецензурная лексика',
  TOPIC: 'тематика под вопросом',
};

export const isAutoRejected = (event: Pick<SportEvent, 'unpublishReason'>) =>
  !!event.unpublishReason?.startsWith(AUTO_REJECT_PREFIX);

/** Причина отказа без служебного префикса — для показа автору. */
export const autoRejectReason = (reason?: string) =>
  reason?.startsWith(AUTO_REJECT_PREFIX) ? reason.slice(AUTO_REJECT_PREFIX.length) : reason;

export const needsAdminAttention = (event: Pick<SportEvent, 'moderation'>) => event.moderation?.status === 'FLAGGED';
