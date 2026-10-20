import { beforeEach, describe, expect, it, vi } from 'vitest';
import { friendsApi } from '../../api';
import { changeFriendship } from './friendship';

vi.mock('../../api', () => ({
  friendsApi: { request: vi.fn(), remove: vi.fn(), accept: vi.fn(), reject: vi.fn() },
}));

describe('changeFriendship', () => {
  beforeEach(() => vi.clearAllMocks());

  it.each([
    ['request', 'OUTGOING_PENDING'],
    ['accept', 'FRIENDS'],
    ['reject', 'NONE'],
    ['remove', 'NONE'],
  ] as const)('%s → %s', async (action, state) => {
    await expect(changeFriendship(action, 42)).resolves.toBe(state);
    expect(friendsApi[action]).toHaveBeenCalledWith(42);
  });

  it('propagates server errors', async () => {
    vi.mocked(friendsApi.request).mockRejectedValueOnce(new Error('409'));
    await expect(changeFriendship('request', 1)).rejects.toThrow('409');
  });
});
