import { flushOutbox } from './bus';

/**
 * Application/use-case boundary helper.
 *
 * Modules only enqueue events via emit(). The boundary that successfully
 * completes a workflow is responsible for flushing the outbox.
 */
export async function runWithOutbox<T>(work: () => Promise<T>): Promise<T> {
  const result = await work();
  await flushOutbox();
  return result;
}
