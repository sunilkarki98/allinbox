import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Encrypts a string using AES-256-GCM.
 * Format: iv:authTag:encryptedText
 */
export const encrypt = (text: string): string => {
    const key = process.env.ENCRYPTION_KEY;
    if (!key || key.length !== 64) {
        throw new Error('ENCRYPTION_KEY must be a 64-character hex string (32 bytes)');
    }

    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(key, 'hex'), iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag().toString('hex');

    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
};

/**
 * Decrypts a string using AES-256-GCM.
 */
export const decrypt = (encryptedData: string): string => {
    const key = process.env.ENCRYPTION_KEY;
    if (!key || key.length !== 64) {
        throw new Error('ENCRYPTION_KEY must be a 64-character hex string (32 bytes)');
    }

    const [ivHex, authTagHex, encryptedText] = encryptedData.split(':');
    if (!ivHex || !authTagHex || !encryptedText) {
        throw new Error('Invalid encrypted data format');
    }

    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(key, 'hex'), iv);

    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
};
