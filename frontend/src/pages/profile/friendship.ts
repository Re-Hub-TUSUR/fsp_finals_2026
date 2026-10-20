import { friendsApi } from '../../api';
import type { FriendshipState } from '../../types';

export type FriendshipAction = 'request' | 'remove' | 'accept' | 'reject';

const CALLS: Record<FriendshipAction, (userId: number) => Promise<unknown>> = {
  request: friendsApi.request,
  remove: friendsApi.remove,
  accept: friendsApi.accept,
  reject: friendsApi.reject,
};

/** Выполняет действие с дружбой и возвращает состояние отношений после него. */
export async function changeFriendship(action: FriendshipAction, userId: number): Promise<FriendshipState> {
  await CALLS[action](userId);
  return action === 'request' ? 'OUTGOING_PENDING' : action === 'accept' ? 'FRIENDS' : 'NONE';
}
