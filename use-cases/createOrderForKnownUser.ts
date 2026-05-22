/**
 * 이미 가입된 유저가 주문하는 흐름.
 *
 * - module(order)은 더 이상 user 존재를 검증하지 않는다 (자기 책임 아님).
 * - 유저 존재 확인 같은 외부 의존 검증은 use-case가 책임진다.
 */
import { findUserById } from "@/modules/user";
import { createOrder } from "@/modules/order";
import { runWithOutbox } from "@/shared/events/run-with-outbox";

export async function createOrderForKnownUser(input: {
  userId: string;
  productId: string;
  amount: number;
}) {
  return runWithOutbox(async () => {
    const user = await findUserById(input.userId);
    if (!user) {
      throw new Error(`User not found: ${input.userId}`);
    }

    return createOrder({
      userId: user.userId,
      productId: input.productId,
      amount: input.amount,
    });
  });
}
