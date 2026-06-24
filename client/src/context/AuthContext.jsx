import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('cp_token'));

    useEffect(() => {
        const stored = localStorage.getItem('cp_user');
        if (stored) setUser(JSON.parse(stored));
    }, []);

    const login = (userData, tokenVal) => {
        setUser(userData);
        setToken(tokenVal);
        localStorage.setItem('cp_token', tokenVal);
        localStorage.setItem('cp_user', JSON.stringify(userData));
    };

    const logout = () => {
        setUser(null);
        setToken(null);
        localStorage.removeItem('cp_token');
        localStorage.removeItem('cp_user');
        localStorage.removeItem('cp_ai_foods');
        localStorage.removeItem('cp_ai_advice');
        localStorage.removeItem('cp_ai_exercises');
    };

    return (
        <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!token }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
