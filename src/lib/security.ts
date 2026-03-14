import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "crypto";

const MIN_PASSWORD_LENGTH = 8;
const USERNAME_PATTERN = /^[a-z0-9_]{3,24}$/;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validateUsername(username: string): string | null {
  if (!USERNAME_PATTERN.test(username)) {
    return "Username must be 3-24 characters using letters, numbers, or underscores.";
  }

  return null;
}

export function validatePassword(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }

  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  if (!hasLetter || !hasNumber) {
    return "Password must include at least one letter and one number.";
  }

  return null;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(
  password: string,
  passwordHash: string
): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}

export function generateOpaqueToken(): string {
  return randomBytes(32).toString("hex");
}

export function hashOpaqueToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
