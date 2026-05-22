import { registerFlakyPaymentListener } from "./internal/listeners/flaky-payment";
import { registerOrderCreatedListener } from "./internal/listeners/order-created";
import { registerUserSignupListener } from "./internal/listeners/user-signup";

let registered = false;

export function registerNotificationListeners(): void {
  if (registered) return;
  registered = true;

  registerUserSignupListener();
  registerOrderCreatedListener();
  registerFlakyPaymentListener();
}
