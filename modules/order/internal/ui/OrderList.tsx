import { listOrders } from '../actions/list-orders';
import type { Order } from '../domain/order.types';

type Props = {
  /** userId → 표시할 ReactNode 매핑. app(라우트)에서 user 정보 조합. */
  renderUser?: (userId: string) => React.ReactNode;
};

export async function OrderList({ renderUser }: Props = {}) {
  const orders = await listOrders();

  if (orders.length === 0) {
    return <p style={{ color: '#666' }}>아직 주문이 없습니다.</p>;
  }

  return (
    <ul style={{ padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
      {orders.map((o) => (
        <OrderRow key={o.orderId} order={o} userSlot={renderUser?.(o.userId)} />
      ))}
    </ul>
  );
}

function OrderRow({ order, userSlot }: { order: Order; userSlot?: React.ReactNode }) {
  return (
    <li
      style={{
        border: '1px solid #e5e5e5',
        borderRadius: 8,
        padding: 12,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <div>
        <div style={{ fontSize: 13, color: '#666' }}>주문 {order.orderId}</div>
        {userSlot && <div style={{ marginTop: 4 }}>{userSlot}</div>}
        <div style={{ marginTop: 4, fontSize: 14 }}>
          상품 <code>{order.productId}</code> · {order.amount.toLocaleString()}원
        </div>
      </div>
      <span
        style={{
          fontSize: 12,
          padding: '2px 8px',
          borderRadius: 12,
          background: order.status === 'CREATED' ? '#dcfce7' : '#fee2e2',
          color: '#166534',
        }}
      >
        {order.status}
      </span>
    </li>
  );
}
