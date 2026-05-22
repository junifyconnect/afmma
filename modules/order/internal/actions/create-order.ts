import { ulid } from 'ulid';
import { emit } from '@/shared/events/bus';
import { orderRepository } from '../data/order.repository';
import type { Order } from '../domain/order.types';

/**
 * 순수 주문 생성. user 존재 확인 같은 모듈 외부 검증은 호출자(use-case)의 책임.
 * 부수효과(알림, 재고 등)는 'order.created' 이벤트로.
 */
export async function createOrder(input: {
  userId: string;
  productId: string;
  amount: number;
}): Promise<Order> {
  const order: Order = {
    orderId: ulid(),
    userId: input.userId,
    productId: input.productId,
    amount: input.amount,
    status: 'CREATED',
    createdAt: new Date().toISOString(),
  };
  await orderRepository.create(order);

  emit('order.created', {
    orderId: order.orderId,
    userId: order.userId,
    productId: order.productId,
    amount: order.amount,
  });

  return order;
}
