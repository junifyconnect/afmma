import { on } from "@/shared/events/bus";

export function registerOrderCreatedListener(): void {
  on("order.created", async ({ orderId, userId, amount }) => {
    console.log(
      `    📱 카카오톡: 주문 ${orderId} 접수 완료 (${amount}원, userId=${userId})`,
    );
  });
}
