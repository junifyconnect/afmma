/**
 * 시나리오: 가입 → 첫 주문 (use-case 사용)
 */
import { registerNotificationListeners } from "@/modules/notification";
import { submitOrderForm } from "@/use-cases/submitOrderForm";
import { printOutbox } from "@/shared/events/bus";

async function main() {
  registerNotificationListeners();

  console.log("--- 시나리오: 가입 → 주문 (use-case) ---\n");

  const order = await submitOrderForm({
    email: "jinkang@test.com",
    name: "진강",
    productId: "P001",
    amount: 15000,
  });

  console.log(`\n주문 ID: ${order.orderId}`);
  printOutbox();
}

main().catch(console.error);
