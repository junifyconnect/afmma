/**
 * Transactional Outbox 패턴 (in-memory 버전).
 *
 * Spring Modulith의 Event Publication Registry 흉내.
 *
 * 핵심 설계:
 *   - publication = (이벤트 × listener) 쌍 단위로 상태 추적
 *   - 한 이벤트가 N개 listener 가지면 N개 publication 생성
 *   - 재시도 시 PENDING/FAILED publication만 재실행 → 멱등성 보장
 *
 * 흐름:
 *   1. action 내부에서 emit() → 이벤트 + listener 수만큼 PENDING publication 생성
 *   2. flushOutbox() → PENDING publication을 dispatch
 *   3. listener 성공 시 COMPLETED, 실패 시 FAILED + lastError
 *   4. retryFailed() → FAILED publication만 재시도 (성공한 건 안 건드림)
 */
import { ulid } from "ulid";
import { eventCatalog, type EventName, type EventPayload } from "./catalog";

type Status = "PENDING" | "COMPLETED" | "FAILED";

type Listener<T extends EventName> = (
  payload: EventPayload<T>,
) => Promise<void> | void;
type RegisteredListener = (payload: unknown) => Promise<void> | void;

type Publication<T extends EventName = EventName> = {
  publicationId: string;
  eventId: string;
  eventName: T;
  payload: EventPayload<T>;
  listenerId: string; // listener 식별 (멱등성 키)
  dispatch: () => Promise<void> | void;
  status: Status;
  attempts: number;
  lastError?: string;
  occurredAt: string;
  completedAt?: string;
};

const publications: Publication[] = [];
const listenerRegistry: {
  name: EventName;
  id: string;
  fn: RegisteredListener;
}[] = [];

export function subscribe<T extends EventName>(
  name: T,
  listener: Listener<T>,
): void {
  const id = `${name}#${listenerRegistry.filter((l) => l.name === name).length}`;
  listenerRegistry.push({ name, id, fn: listener as RegisteredListener });
}

export function enqueue<T extends EventName>(
  name: T,
  payload: EventPayload<T>,
): void {
  const validated = eventCatalog[name].schema.parse(payload) as EventPayload<T>;
  const eventId = ulid();
  const occurredAt = new Date().toISOString();

  const matched = listenerRegistry.filter((l) => l.name === name);
  if (matched.length === 0) {
    console.log(`  [outbox] enqueued ${name} (${eventId}) — no listeners`);
    return;
  }

  for (const { id, fn } of matched) {
    publications.push({
      publicationId: ulid(),
      eventId,
      eventName: name,
      payload: validated,
      listenerId: id,
      dispatch: () => fn(validated),
      status: "PENDING",
      attempts: 0,
      occurredAt,
    });
  }
  console.log(
    `  [outbox] enqueued ${name} (${eventId}) → ${matched.length} publication(s)`,
  );
}

async function runPublication(p: Publication): Promise<void> {
  p.attempts += 1;
  try {
    await p.dispatch();
    p.status = "COMPLETED";
    p.completedAt = new Date().toISOString();
    p.lastError = undefined;
    console.log(`  ↳ [${p.eventName} / ${p.listenerId}] OK`);
  } catch (err) {
    p.status = "FAILED";
    p.lastError = err instanceof Error ? err.message : String(err);
    console.error(
      `  ↳ [${p.eventName} / ${p.listenerId}] FAILED: ${p.lastError}`,
    );
  }
}

export async function flushOutbox(): Promise<void> {
  const pending = publications.filter((p) => p.status === "PENDING");
  if (pending.length === 0) return;
  console.log(`  [outbox] flushing ${pending.length} pending publication(s)`);
  for (const p of pending) await runPublication(p);
}

export async function retryFailed(): Promise<void> {
  const failed = publications.filter((p) => p.status === "FAILED");
  if (failed.length === 0) {
    console.log("  [outbox] no failed publications to retry");
    return;
  }
  console.log(
    `  [outbox] retrying ${failed.length} failed publication(s) — COMPLETED ones skipped`,
  );
  for (const p of failed) await runPublication(p);
}

export function getPublications(): readonly Publication[] {
  return publications;
}

export function printOutbox(): void {
  console.log(
    "\n┌─ Outbox State (per-listener publications) ──────────────────────────",
  );
  for (const p of publications) {
    const icon =
      p.status === "COMPLETED" ? "✓" : p.status === "FAILED" ? "✗" : "·";
    const tail =
      p.lastError && p.status === "FAILED" ? `  err="${p.lastError}"` : "";
    console.log(
      `│  ${icon} ${p.eventName.padEnd(16)} ${p.listenerId.padEnd(20)} ${p.status.padEnd(10)} attempts=${p.attempts}${tail}`,
    );
  }
  console.log(
    "└──────────────────────────────────────────────────────────────────────\n",
  );
}
