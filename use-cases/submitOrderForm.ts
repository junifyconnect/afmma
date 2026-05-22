/**
 * 폼 입력값으로 가입 + 주문을 한 흐름으로 실행.
 *
 * - 데모용: "처음 보는 이메일이면 자동 가입" 흐름.
 * - 실제 시스템이면 인증된 사용자 정보를 별도로 가져온 뒤 createOrder만 호출.
 */
import { signupUser } from "@/modules/user";
import { createOrder } from "@/modules/order";
import { runWithOutbox } from "@/shared/events/run-with-outbox";

export async function submitOrderForm(input: {
  email: string;
  name: string;
  productId: string;
  amount: number;
}) {
  return runWithOutbox(async () => {
    const user = await signupUser({ email: input.email, name: input.name });

    return createOrder({
      userId: user.userId,
      productId: input.productId,
      amount: input.amount,
    });
  });
}
