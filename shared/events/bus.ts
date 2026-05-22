/**
 * Event bus public API.
 *
 * 실제 발송은 outbox.ts가 담당. 여기서는 action에서 쓰기 좋은
 * thin wrapper만 노출.
 *
 * - emit(): outbox에 PENDING 등록만 함 (전송 X)
 * - on(): outbox dispatcher에 listener 등록
 * - flushOutbox(): 트랜잭션 커밋 후 호출 → 실제 발송
 */
import {
  enqueue,
  subscribe,
  flushOutbox as _flush,
  retryFailed as _retry,
  printOutbox as _print,
} from './outbox';
import type { EventName, EventPayload } from './catalog';

export function emit<T extends EventName>(name: T, payload: EventPayload<T>): void {
  enqueue(name, payload);
}

export function on<T extends EventName>(
  name: T,
  listener: (payload: EventPayload<T>) => Promise<void> | void,
): void {
  subscribe(name, listener);
}

export const flushOutbox = _flush;
export const retryFailed = _retry;
export const printOutbox = _print;
