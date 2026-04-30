import { authenticator } from "otplib";

authenticator.options = { window: 1 };

export function generateSecret() {
  return authenticator.generateSecret();
}

export function generateTotp(secret: string) {
  return authenticator.generate(secret);
}

export function verifyTotp(token: string, secret: string) {
  return authenticator.check(token, secret);
}
