import { createContext, useContext, useState } from 'react';
import { clearRecommendationCaches } from '../utils/storage';

const AuthContext = createContext(null);

const getStoredAuth = () => {
    try {
        const token = localStorage.getItem('cp_token');
        const storedUser = localStorage.getItem('cp_user');
        const parsedUser = storedUser ? JSON.parse(storedUser) : null;
        if (!parsedUser || typeof parsedUser !== 'object' || Array.isArray(parsedUser)) {
            return { token, user: null };
        }
        const userId = parsedUser?.id || parsedUser?._id;

        return {
            token,
            user: parsedUser && userId ? { ...parsedUser, id: String(userId) } : parsedUser,
        };
    } catch {
        return { token: null, user: null };
    }
};

const normalizeUser = (userData) => {
    if (!userData || typeof userData !== 'object') return userData;
    const userId = userData.id || userData._id;
    return userId ? { ...userData, id: String(userId) } : userData;
};

export function AuthProvider({ children }) {
    const [storedAuth] = useState(getStoredAuth);
    const [user, setUser] = useState(storedAuth.user);
    const [token, setToken] = useState(storedAuth.token);

    const login = (userData, tokenVal) => {
        const normalizedUser = normalizeUser(userData);
        setUser(normalizedUser);
        setToken(tokenVal);
        try {
            localStorage.setItem('cp_token', tokenVal);
            localStorage.setItem('cp_user', JSON.stringify(normalizedUser));
        } catch {
            // Keep the in-memory session active if browser storage is unavailable.
        }
    };

    const logout = () => {
        let currentUserId = user?.id || user?._id;
        try {
            const storedUser = JSON.parse(localStorage.getItem('cp_user') || 'null');
            currentUserId = currentUserId || storedUser?.id || storedUser?._id;
        } catch {
            currentUserId = currentUserId || null;
        }

        setUser(null);
        setToken(null);
        try {
            localStorage.removeItem('cp_token');
            localStorage.removeItem('cp_user');
        } catch {
            // Keep logout functional if browser storage is unavailable.
        }
        clearRecommendationCaches(currentUserId);
    };

    return (
        <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!token }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
