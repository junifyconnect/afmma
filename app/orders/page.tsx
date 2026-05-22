import { registerNotificationListeners } from "@/modules/notification";
import { OrderList } from "@/modules/order";
import { UserBadge } from "@/modules/user";
import { OrderForm } from "./_components/OrderForm";

registerNotificationListeners();

export const dynamic = "force-dynamic";

export default function OrdersPage() {
  return (
    <main>
      <h1>주문</h1>
      <section style={{ marginTop: 24, display: "grid", gap: 16 }}>
        <OrderForm />
        <OrderList renderUser={(userId) => <UserBadge userId={userId} />} />
      </section>
    </main>
  );
}
