import { apiClient, API_BASE } from './api/client';

export { API_BASE, apiClient };

export interface UserAuthResponse {
    token: string;
    user: {
        id: string;
        username: string;
        email: string;
    };
}

export const registerUser = async (username: string, email: string, password: string): Promise<UserAuthResponse> => {
    const response = await apiClient.post<UserAuthResponse>('/users/register', {
        username,
        email,
        password,
    });
    return response.data;
};

export const loginUser = async (email: string, password: string): Promise<UserAuthResponse> => {
    const response = await apiClient.post<UserAuthResponse>('/users/login', {
        email,
        password,
    });
    return response.data;
};

export const getLiveKitToken = async (roomId: string, token?: string, userName?: string): Promise<{ token: string; room_name: string }> => {
    const headers: Record<string, string> = {};
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    const params: Record<string, string> = {};
    if (userName) {
        params['user_name'] = userName;
    }

    const response = await apiClient.get<{ token: string; room_name: string }>(`/rooms/${roomId}/call-token`, {
        headers,
        params,
    });
    return response.data;
};

export const createRoom = async (roomId: string): Promise<{ status: string; room_id: string }> => {
    const response = await apiClient.post<{ status: string; room_id: string }>('/rooms/create', {
        room_id: roomId,
    });
    return response.data;
};

export const getSFUSignalingURL = (roomId: string, userId: string, userName: string): string => {
    const envApiUrl = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
    const isLocalDev = typeof window !== 'undefined' && (window.location.port === '5173' || window.location.port === '3000');
    
    let wsBase: string;
    if (envApiUrl) {
        wsBase = envApiUrl.replace(/^http(s?):/, 'ws$1:');
    } else if (typeof window !== 'undefined') {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        wsBase = isLocalDev ? `${protocol}//${window.location.hostname}:8080` : `${protocol}//${window.location.host}`;
    } else {
        wsBase = 'ws://localhost:8080';
    }
    return `${wsBase}/ws/sfu?room_id=${encodeURIComponent(roomId)}&user_id=${encodeURIComponent(userId)}&user_name=${encodeURIComponent(userName)}`;
};
