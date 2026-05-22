/**
 * 불안정한 외부 결제 알림 시뮬레이션.
 * 첫 호출은 실패, 두 번째는 성공.
 * → outbox 재시도 동작 검증용.
 */
import { on } from "@/shared/events/bus";

let attempts = 0;

export function registerFlakyPaymentListener(): void {
  on("order.created", async ({ orderId }) => {
    attempts += 1;
    if (attempts === 1) {
      throw new Error(`💥 결제 알림 외부 API 일시 장애 (orderId=${orderId})`);
    }
    console.log(
      `    💳 결제 알림 발송 성공 (orderId=${orderId}, attempt=${attempts})`,
    );
  });
}
