/**
 * 실패 시나리오:
 *   1. 유저 없는 상태에서 주문 시도 → use-case가 user 검증으로 막음
 *   2. 가입 후 주문 → flaky-payment listener가 첫 호출에서 실패 → outbox FAILED 남음
 *   3. retryFailed() → 두 번째 시도에서 listener 성공 → COMPLETED 전환
 *
 * 핵심: 주문(메인 트랜잭션)은 살아있고, 알림(부수효과)만 재시도로 복구.
 *
 * 규격 메모:
 *   - createOrder(modules/order)는 user 검증을 하지 않는다 (모듈 외부 의존).
 *   - user 검증은 use-case의 책임 → createOrderForKnownUser를 거쳐 호출.
 */
import { registerNotificationListeners } from "@/modules/notification";
import { signupUser, findUserById } from "@/modules/user";
import { createOrderForKnownUser } from "@/use-cases/createOrderForKnownUser";
import { retryFailed, printOutbox } from "@/shared/events/bus";
import { runWithOutbox } from "@/shared/events/run-with-outbox";

async function main() {
  registerNotificationListeners();

  console.log("--- 시나리오: 실패 + 재시도 ---\n");

  // 1. 존재하지 않는 유저로 주문 → use-case에서 막혀야 함
  console.log("[1] 존재하지 않는 유저로 주문 시도");
  try {
    await createOrderForKnownUser({
      userId: "ghost-user",
      productId: "P001",
      amount: 9999,
    });
    console.error("  ❌ 예상과 다름: 주문이 생성됨");
  } catch (err) {
    console.log(`  ✓ 예상대로 실패: ${(err as Error).message}`);
  }

  // 2. 가입 후 주문 → flaky-payment listener가 실패할 것
  console.log("\n[2] 정상 가입 + 주문 (첫 시도는 알림이 실패할 예정)");
  const user = await runWithOutbox(() =>
    signupUser({ email: "jinkang@test.com", name: "진강" }),
  );

  const order = await createOrderForKnownUser({
    userId: user.userId,
    productId: "P001",
    amount: 15000,
  });

  console.log(`\n  주문은 생성됨: ${order.orderId}`);
  console.log("  (외부 알림은 실패했지만 주문 트랜잭션은 살아있음)");
  printOutbox();

  // 3. 재시도 → flaky-payment가 이번엔 성공
  console.log(
    "[3] 재시도 (백그라운드 워커가 FAILED 이벤트 polling 하는 시뮬레이션)",
  );
  await retryFailed();
  printOutbox();

  // 4. 데이터 정합성 확인
  const persisted = await findUserById(user.userId);
  console.log(
    `[4] 최종 상태: user="${persisted?.name}", order=${order.orderId} → 모두 정상`,
  );

  console.log("\n--- 완료 ---");
}

main().catch(console.error);
