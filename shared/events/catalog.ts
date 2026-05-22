import { z } from "zod";

export const eventCatalog = {
  "user.signup": {
    schema: z.object({
      userId: z.string(),
      email: z.string(),
    }),
    description: "신규 가입 — 환영 알림 발송",
  },
  "order.created": {
    schema: z.object({
      orderId: z.string(),
      userId: z.string(),
      productId: z.string(),
      amount: z.number(),
    }),
    description: "주문 생성 — 알림 + 재고 차감",
  },
} as const;

export type EventName = keyof typeof eventCatalog;
export type EventPayload<T extends EventName> = z.infer<
  (typeof eventCatalog)[T]["schema"]
>;
