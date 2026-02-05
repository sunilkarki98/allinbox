
export class CredentialService {
    /**
     * Validate a credential based on its key name.
     * Returns { isValid: true } only if the value matches the expected format.
     */
    static async validate(key: string, value: string): Promise<{ isValid: boolean; error?: string }> {
        if (!value || value.trim() === '') {
            return { isValid: false, error: 'Value cannot be empty' };
        }

        const validators: Record<string, (v: string) => { isValid: boolean; error?: string }> = {
            // AI Configuration
            'GEMINI_API_KEY': (v) => {
                if (!v.startsWith('AIza') || v.length < 30) {
                    return { isValid: false, error: "Invalid Gemini API Key. Must start with 'AIza' and be at least 30 characters." };
                }
                return { isValid: true };
            },
            'GEMINI_MODEL': (v) => {
                // Allow known models or any gemini-* pattern
                const validModels = ['', 'auto', 'gemini-2.0-flash', 'gemini-2.0-pro-exp', 'gemini-1.5-pro', 'gemini-1.5-flash'];
                if (validModels.includes(v) || /^gemini-[\w.-]+$/i.test(v)) {
                    return { isValid: true };
                }
                return { isValid: false, error: "Invalid Model ID. Must be 'auto', a preset model, or match 'gemini-*' pattern." };
            },

            // Instagram / Meta
            'INSTAGRAM_CLIENT_ID': (v) => {
                // Meta App IDs are typically 15-20 digit numbers
                if (!/^\d{10,25}$/.test(v)) {
                    return { isValid: false, error: 'Instagram Client ID must be a 10-25 digit number.' };
                }
                return { isValid: true };
            },
            'INSTAGRAM_CLIENT_SECRET': (v) => {
                // Meta App Secrets are 32-character hex strings
                if (!/^[a-f0-9]{32}$/i.test(v)) {
                    return { isValid: false, error: 'Instagram Client Secret must be a 32-character hexadecimal string.' };
                }
                return { isValid: true };
            },
            'META_APP_SECRET': (v) => {
                // Same as Instagram Client Secret
                if (!/^[a-f0-9]{32}$/i.test(v)) {
                    return { isValid: false, error: 'Meta App Secret must be a 32-character hexadecimal string.' };
                }
                return { isValid: true };
            },

            // TikTok
            'TIKTOK_CLIENT_KEY': (v) => {
                // TikTok Client Keys are alphanumeric, typically 20+ chars
                if (!/^[a-zA-Z0-9]{15,}$/.test(v)) {
                    return { isValid: false, error: 'TikTok Client Key must be at least 15 alphanumeric characters.' };
                }
                return { isValid: true };
            },
            'TIKTOK_CLIENT_SECRET': (v) => {
                // TikTok Client Secrets are alphanumeric, typically 32+ chars
                if (!/^[a-zA-Z0-9]{20,}$/.test(v)) {
                    return { isValid: false, error: 'TikTok Client Secret must be at least 20 alphanumeric characters.' };
                }
                return { isValid: true };
            },

            // Webhooks
            'WEBHOOK_URL': (v) => {
                try {
                    const parsed = new URL(v);
                    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
                        return { isValid: false, error: 'Webhook URL must use HTTP or HTTPS protocol.' };
                    }
                    return { isValid: true };
                } catch {
                    return { isValid: false, error: 'Invalid URL format.' };
                }
            },
            'WEBHOOK_SECRET': (v) => {
                // Must be at least 12 characters to be secure
                if (v.length < 12) {
                    return { isValid: false, error: 'Webhook Secret must be at least 12 characters long.' };
                }
                return { isValid: true };
            },
        };

        const validator = validators[key];
        if (validator) {
            return validator(value);
        }

        // For unknown keys, reject by default (security-first approach)
        console.warn(`[CredentialService] Unknown key attempted: ${key}`);
        return { isValid: false, error: `Unknown setting key: ${key}. Contact support if this is a new feature.` };
    }
}

