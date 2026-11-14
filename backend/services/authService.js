import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export const SALT_ROUNDS = 10;
const SOMAIYA_EMAIL_REGEX = /^[^\s@]+@somaiya\.edu$/;

/**
 * Hashes a plaintext password using bcrypt.
 */
export async function hashPassword(password) {
    return await bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Validates an input password against a stored password.
 * Supports bcrypt hashes ($2...) and legacy plaintext passwords with on-the-fly hash upgrading.
 */
export async function verifyPassword(inputPassword, storedPassword, onLegacyMatch = null) {
    if (!storedPassword || !inputPassword) return false;

    if (storedPassword.startsWith("$2")) {
        return await bcrypt.compare(inputPassword, storedPassword);
    }

    if (storedPassword === inputPassword) {
        if (typeof onLegacyMatch === 'function') {
            const newHash = await hashPassword(inputPassword);
            await onLegacyMatch(newHash);
        }
        return true;
    }

    return false;
}

/**
 * Generates a secure 64-character verification token.
 */
export function generateVerificationToken() {
    return crypto.randomBytes(32).toString('hex');
}

/**
 * Validates if an email address belongs to @somaiya.edu domain.
 */
export function isValidSomaiyaEmail(email) {
    if (!email || typeof email !== 'string') return false;
    return SOMAIYA_EMAIL_REGEX.test(email.trim().toLowerCase());
}
