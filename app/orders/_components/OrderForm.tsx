'use client';

import { useState, useTransition } from 'react';
import { submitOrderFormAction } from '../actions';

export function OrderForm() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      action={(formData) => {
        setError(null);
        startTransition(async () => {
          try {
            await submitOrderFormAction(formData);
          } catch (err) {
            setError(err instanceof Error ? err.message : '주문 실패');
          }
        });
      }}
      style={{ display: 'grid', gap: 8, padding: 12, border: '1px solid #e5e5e5', borderRadius: 8 }}
    >
      <h3 style={{ margin: 0 }}>새 주문</h3>
      <label>
        이름 <input name="name" required defaultValue="진강" />
      </label>
      <label>
        이메일 <input name="email" type="email" required defaultValue="jinkang@test.com" />
      </label>
      <label>
        상품 ID <input name="productId" required defaultValue="P001" />
      </label>
      <label>
        금액 <input name="amount" type="number" required defaultValue={15000} />
      </label>
      {error && <p style={{ color: '#dc2626', margin: 0 }}>{error}</p>}
      <button type="submit" disabled={pending}>
        {pending ? '처리 중…' : '주문 생성'}
      </button>
    </form>
  );
}
