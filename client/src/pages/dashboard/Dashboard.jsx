import { useState, useEffect } from 'react';
import { NavLink, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Overview from './Overview';
import MealLog from './MealLog';
import FoodRecommendations from './FoodRecommendations';
import Exercises from './Exercises';
import Profile from './Profile';
import Feed from './Feed';
import WorkoutLog from './WorkoutLog';
import DayHistory from './DayHistory';

const navItems = [
    { path: 'overview', icon: '📊', label: 'Overview' },
    { path: 'meals', icon: '🍽️', label: 'Meals' },
    { path: 'food', icon: '🥗', label: 'Food' },
    { path: 'exercises', icon: '🏋️', label: 'Exercises' },
    { path: 'workouts', icon: '🏃', label: 'Workouts' },
    { path: 'history', icon: '📅', label: 'History' },
    { path: 'feed', icon: '💬', label: 'Community' },
    { path: 'profile', icon: '👤', label: 'Profile' },
];

export default function Dashboard() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    // Lifted AI state — survives tab switches and page refreshes
    const [aiSuggestions, setAiSuggestions] = useState(() => {
        const saved = localStorage.getItem('cp_ai_foods');
        return saved ? JSON.parse(saved) : [];
    });
    const [wellnessAdvice, setWellnessAdvice] = useState(() => {
        return localStorage.getItem('cp_ai_advice') || '';
    });
    const [aiExercises, setAiExercises] = useState(() => {
        const saved = localStorage.getItem('cp_ai_exercises');
        return saved ? JSON.parse(saved) : [];
    });

    useEffect(() => {
        localStorage.setItem('cp_ai_foods', JSON.stringify(aiSuggestions));
    }, [aiSuggestions]);

    useEffect(() => {
        localStorage.setItem('cp_ai_advice', wellnessAdvice);
    }, [wellnessAdvice]);

    useEffect(() => {
        localStorage.setItem('cp_ai_exercises', JSON.stringify(aiExercises));
    }, [aiExercises]);

    const handleLogout = () => { logout(); navigate('/'); };

    return (
        <div className="dashboard-layout">
            {/* ── Mobile top bar (hidden on desktop / tablet) ── */}
            <div className="mobile-topbar">
                <div className="mobile-logo">
                    <span>🔥</span> CalPolice
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span className="mobile-user">{user?.name?.split(' ')[0]}</span>
                    <button
                        onClick={handleLogout}
                        style={{
                            background: 'rgba(255,255,255,0.06)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: 8,
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            color: 'var(--text-muted)',
                            padding: '5px 10px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            transition: 'all 0.2s ease',
                        }}
                        title="Logout"
                    >
                        🚪
                    </button>
                </div>
            </div>

            <aside className="sidebar">
                <div className="sidebar-logo">
                    <div className="logo-icon">🔥</div>
                    <span className="logo-text">CalPolice</span>
                </div>

                <div className="nav-section-label">Main</div>
                {navItems.map(item => (
                    <NavLink
                        key={item.path}
                        to={`/dashboard/${item.path}`}
                        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                    >
                        <span className="nav-icon">{item.icon}</span>
                        <span>{item.label}</span>
                    </NavLink>
                ))}

                <div className="sidebar-user" style={{ marginTop: 'auto' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                        <div className="user-details">
                            <div className="user-name">{user?.name || 'User'}</div>
                            <div className="user-goal">{user?.goal?.replace(/_/g, ' ')}</div>
                        </div>
                        <button
                            onClick={handleLogout}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', color: 'var(--text-muted)', padding: '4px' }}
                            title="Logout"
                        >🚪</button>
                    </div>
                </div>
            </aside>

            <main className="dashboard-content">
                <Routes>
                    <Route index element={<Navigate to="overview" replace />} />
                    <Route path="overview" element={<Overview />} />
                    <Route path="meals" element={<MealLog />} />
                    <Route path="food" element={
                        <FoodRecommendations
                            cachedAiSuggestions={aiSuggestions}
                            setCachedAiSuggestions={setAiSuggestions}
                            cachedWellnessAdvice={wellnessAdvice}
                            setCachedWellnessAdvice={setWellnessAdvice}
                        />
                    } />
                    <Route path="exercises" element={
                        <Exercises
                            cachedAiExercises={aiExercises}
                            setCachedAiExercises={setAiExercises}
                        />
                    } />
                    <Route path="workouts" element={<WorkoutLog />} />
                    <Route path="history" element={<DayHistory />} />
                    <Route path="feed" element={<Feed />} />
                    <Route path="profile" element={<Profile />} />
                </Routes>
            </main>
        </div>
    );
}
