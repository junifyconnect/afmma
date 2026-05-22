'use server';

import { revalidatePath } from 'next/cache';
import { submitOrderForm } from '@/use-cases/submitOrderForm';

export async function submitOrderFormAction(formData: FormData): Promise<void> {
  const email = String(formData.get('email') ?? '').trim();
  const name = String(formData.get('name') ?? '').trim();
  const productId = String(formData.get('productId') ?? '').trim();
  const amount = Number(formData.get('amount') ?? 0);

  if (!email || !name || !productId || !Number.isFinite(amount) || amount <= 0) {
    throw new Error('필수 입력값이 누락되었거나 잘못되었습니다.');
  }

  await submitOrderForm({ email, name, productId, amount });
  revalidatePath('/orders');
}
