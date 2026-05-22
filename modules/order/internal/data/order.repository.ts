import type { Order } from '../domain/order.types';

const store = new Map<string, Order>();

export const orderRepository = {
  async create(order: Order): Promise<Order> {
    store.set(order.orderId, order);
    return order;
  },

  async findById(orderId: string): Promise<Order | null> {
    return store.get(orderId) ?? null;
  },

  async list(): Promise<Order[]> {
    return [...store.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
};
