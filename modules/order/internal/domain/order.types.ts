export type Order = {
  orderId: string;
  userId: string;
  productId: string;
  amount: number;
  status: 'CREATED' | 'PAID' | 'CANCELLED';
  createdAt: string;
};
