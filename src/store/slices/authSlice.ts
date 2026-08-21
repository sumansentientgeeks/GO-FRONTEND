import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface User {
    id: string;
    username: string;
    email: string;
}

interface AuthState {
    token: string | null;
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
}

const initialToken = typeof window !== 'undefined' ? sessionStorage.getItem('api_token') : null;
const initialDisplayName = typeof window !== 'undefined' ? sessionStorage.getItem('teams_display_name') : null;

const initialState: AuthState = {
    token: initialToken,
    user: initialDisplayName ? { id: 'usr_' + Math.random().toString(36).slice(2, 8), username: initialDisplayName, email: '' } : null,
    isAuthenticated: !!initialToken,
    isLoading: false,
    error: null,
};

export const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        setCredentials: (
            state,
            action: PayloadAction<{ token: string; user?: User; displayName?: string }>
        ) => {
            state.token = action.payload.token;
            if (action.payload.user) {
                state.user = action.payload.user;
            } else if (action.payload.displayName) {
                state.user = { id: 'usr_guest', username: action.payload.displayName, email: '' };
            }
            state.isAuthenticated = true;
            state.error = null;
            sessionStorage.setItem('api_token', action.payload.token);
            if (state.user?.username) {
                sessionStorage.setItem('teams_display_name', state.user.username);
            }
        },
        setDisplayName: (state, action: PayloadAction<string>) => {
            if (state.user) {
                state.user.username = action.payload;
            } else {
                state.user = { id: 'usr_guest', username: action.payload, email: '' };
            }
            sessionStorage.setItem('teams_display_name', action.payload);
        },
        setAuthLoading: (state, action: PayloadAction<boolean>) => {
            state.isLoading = action.payload;
        },
        setAuthError: (state, action: PayloadAction<string | null>) => {
            state.error = action.payload;
            state.isLoading = false;
        },
        logout: (state) => {
            state.token = null;
            state.user = null;
            state.isAuthenticated = false;
            state.error = null;
            sessionStorage.removeItem('api_token');
        },
    },
});

export const { setCredentials, setDisplayName, setAuthLoading, setAuthError, logout } = authSlice.actions;
export default authSlice.reducer;
