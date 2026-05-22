import { on } from "@/shared/events/bus";

export function registerUserSignupListener(): void {
  on("user.signup", async ({ userId, email }) => {
    console.log(`    📧 환영 이메일 발송: ${email} (userId=${userId})`);
  });
}
