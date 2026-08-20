const envApiUrl = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
const isLocalDev = typeof window !== 'undefined' && (window.location.port === '5173' || window.location.port === '3000');

export const API_BASE = isLocalDev ? '/api' : (envApiUrl ? `${envApiUrl}/api` : `http://${window.location.hostname || 'localhost'}:8080/api`);

export interface UserAuthResponse {
    token: string;
    user: {
        id: string;
        username: string;
        email: string;
    };
}

export const registerUser = async (username: string, email: string, password: string): Promise<UserAuthResponse> => {
    const response = await fetch(`${API_BASE}/users/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Registration failed' }));
        throw new Error(error.error || 'Registration failed');
    }

    return response.json();
};

export const loginUser = async (email: string, password: string): Promise<UserAuthResponse> => {
    const response = await fetch(`${API_BASE}/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Login failed' }));
        throw new Error(error.error || 'Login failed');
    }

    return response.json();
};

export const getLiveKitToken = async (roomId: string, token: string) => {
    const response = await fetch(`${API_BASE}/rooms/${roomId}/call-token`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`
        },
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to get room token' }));
        throw new Error(error.error || 'Failed to get room token');
    }

    return response.json();
};

export const createRoom = async (roomId: string): Promise<{ status: string; room_id: string }> => {
    const response = await fetch(`${API_BASE}/rooms/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room_id: roomId }),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to create room' }));
        throw new Error(error.error || 'Failed to create room');
    }

    return response.json();
};

export const getSFUSignalingURL = (roomId: string, userId: string, userName: string): string => {
    let wsBase: string;
    if (isLocalDev) {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        wsBase = `${protocol}//${window.location.host}`;
    } else if (envApiUrl) {
        wsBase = envApiUrl.replace(/^http(s?):/, 'ws$1:');
    } else {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        wsBase = `${protocol}//${window.location.host}`;
    }
    return `${wsBase}/ws/sfu?room_id=${encodeURIComponent(roomId)}&user_id=${encodeURIComponent(userId)}&user_name=${encodeURIComponent(userName)}`;
};
