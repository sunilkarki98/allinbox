/**
 * Shared JWT Utilities
 * Centralizes JWT configuration and secret management
 */

/**
 * Get JWT secret from environment with validation
 * Throws if secret is missing or using default value
 */
export const getJWTSecret = (): string => {
    const secret = process.env.JWT_SECRET;
    if (!secret || secret === 'secret' || secret === 'supersecretrandomstring') {
        throw new Error('JWT_SECRET environment variable must be set to a secure value (not default)');
    }
    return secret;
};

/**
 * JWT token expiration times
 */
export const JWT_EXPIRY = {
    ACCESS_TOKEN: '7d',
    REFRESH_TOKEN: '30d',
} as const;
