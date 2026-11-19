import { betterAuth } from "better-auth";
import { admin, twoFactor } from "better-auth/plugins";

export const auth = betterAuth({
  emailAndPassword: { enabled: true, disableSignUp: true, minPasswordLength: 12 },
  session: {
    additionalFields: {
      mfaVerified: { type: "boolean", required: true, defaultValue: false, input: false },
    },
  },
  plugins: [admin({ defaultRole: "maintenance" }), twoFactor()],
});
