const API_BASE_URL = '/api';

export const api = {
    get: async (endpoint: string, token?: string) => {
        const res = await fetch(`${API_BASE_URL}${endpoint}`, {
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            credentials: 'include',
        });
        return handleResponse(res);
    },

    post: async (endpoint: string, data: any, token?: string) => {
        const res = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify(data),
        });
        return handleResponse(res);
    },

    put: async (endpoint: string, data: any, token?: string) => {
        const res = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify(data),
        });
        return handleResponse(res);
    },

    patch: async (endpoint: string, data: any, token?: string) => {
        const res = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify(data),
        });
        return handleResponse(res);
    },

    delete: async (endpoint: string, token?: string) => {
        const res = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            credentials: 'include',
        });
        return handleResponse(res);
    },
};

async function handleResponse(res: Response) {
    // Try to parse JSON, fallback to text if it fails
    let data;
    try {
        data = await res.json();
    } catch {
        const text = await res.text().catch(() => 'Unknown error');
        throw new Error(text || `HTTP ${res.status}`);
    }

    if (!res.ok) {
        throw new Error(data.error || 'Something went wrong');
    }
    return data;
}
