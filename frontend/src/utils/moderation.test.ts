import { describe, expect, it } from 'vitest';
import { AUTO_REJECT_PREFIX, autoRejectReason, isAutoRejected, needsAdminAttention } from './moderation';

describe('isAutoRejected', () => {
  it('is true when unpublishReason carries the auto-reject prefix', () => {
    expect(isAutoRejected({ unpublishReason: `${AUTO_REJECT_PREFIX}алкоголь` })).toBe(true);
  });

  it('is false for a manual unpublish reason', () => {
    expect(isAutoRejected({ unpublishReason: 'Организатор отменил мероприятие' })).toBe(false);
  });

  it('is false when there is no reason at all', () => {
    expect(isAutoRejected({})).toBe(false);
  });
});

describe('autoRejectReason', () => {
  it('strips the service prefix', () => {
    expect(autoRejectReason(`${AUTO_REJECT_PREFIX}упоминание алкоголя`)).toBe('упоминание алкоголя');
  });

  it('passes through a reason without the prefix unchanged', () => {
    expect(autoRejectReason('Организатор отменил мероприятие')).toBe('Организатор отменил мероприятие');
  });

  it('passes through undefined', () => {
    expect(autoRejectReason(undefined)).toBeUndefined();
  });
});

describe('needsAdminAttention', () => {
  it('is true only when moderation status is FLAGGED', () => {
    expect(needsAdminAttention({ moderation: { status: 'FLAGGED', hits: [] } })).toBe(true);
    expect(needsAdminAttention({ moderation: { status: 'CLEAN', hits: [] } })).toBe(false);
    expect(needsAdminAttention({ moderation: { status: 'REJECTED', hits: [] } })).toBe(false);
  });

  it('is false when there is no moderation info', () => {
    expect(needsAdminAttention({})).toBe(false);
  });
});
