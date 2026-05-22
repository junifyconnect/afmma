import { orderRepository } from '../data/order.repository';
import type { Order } from '../domain/order.types';

export async function listOrders(): Promise<Order[]> {
  return orderRepository.list();
}
