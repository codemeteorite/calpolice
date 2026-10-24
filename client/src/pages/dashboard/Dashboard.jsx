import { useState, useEffect } from 'react';
import { NavLink, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { applyStoredTheme, getStoredTheme, readExerciseRecommendationCache, readFoodRecommendationCache, saveExerciseRecommendationCache, saveFoodRecommendationCache } from '../../utils/storage';
import Overview from './Overview';
import MealLog from './MealLog';
import FoodRecommendations from './FoodRecommendations';
import Exercises from './Exercises';
import Profile from './Profile';
import Feed from './Feed';
import WorkoutLog from './WorkoutLog';
import DayHistory from './DayHistory';

const navItems = [
    { path: 'overview', icon: 'OV', label: 'Overview' },
    { path: 'meals', icon: 'ME', label: 'Meals' },
    { path: 'food', icon: 'FD', label: 'Food' },
    { path: 'exercises', icon: 'EX', label: 'Exercises' },
    { path: 'workouts', icon: 'WT', label: 'Workouts' },
    { path: 'history', icon: 'HI', label: 'History' },
    { path: 'feed', icon: 'CM', label: 'Community' },
    { path: 'profile', icon: 'PR', label: 'Profile' },
];

export default function Dashboard() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const userId = user?.id || user?._id || null;

    const [theme, setTheme] = useState(getStoredTheme);

    useEffect(() => {
        const nextTheme = applyStoredTheme(theme);
        try {
            localStorage.setItem('calpolice:v1:theme', nextTheme);
        } catch {
            // ignore storage failures
        }
    }, [theme]);

    const [aiSuggestions, setAiSuggestions] = useState(() => {
        if (!userId) return [];
        return readFoodRecommendationCache(userId).suggestions;
    });
    const [wellnessAdvice, setWellnessAdvice] = useState(() => {
        if (!userId) return '';
        return readFoodRecommendationCache(userId).wellnessAdvice;
    });
    const [aiExercises, setAiExercises] = useState(() => {
        if (!userId) return [];
        return readExerciseRecommendationCache(userId);
    });
    const [recommendationOwnerId, setRecommendationOwnerId] = useState(userId);

    useEffect(() => {
        if (!userId) {
            setAiSuggestions([]);
            setWellnessAdvice('');
            setAiExercises([]);
            setRecommendationOwnerId(null);
            return;
        }

        if (recommendationOwnerId === userId) return;

        const storedFood = readFoodRecommendationCache(userId);
        setAiSuggestions(storedFood.suggestions);
        setWellnessAdvice(storedFood.wellnessAdvice);
        setAiExercises(readExerciseRecommendationCache(userId));
        setRecommendationOwnerId(userId);
    }, [userId, recommendationOwnerId]);

    useEffect(() => {
        if (!userId || recommendationOwnerId !== userId) return;
        if (aiSuggestions.length || wellnessAdvice) {
            saveFoodRecommendationCache(userId, aiSuggestions, wellnessAdvice);
        }
    }, [userId, recommendationOwnerId, aiSuggestions, wellnessAdvice]);

    useEffect(() => {
        if (!userId || recommendationOwnerId !== userId) return;
        if (aiExercises.length) {
            saveExerciseRecommendationCache(userId, aiExercises);
        }
    }, [userId, recommendationOwnerId, aiExercises]);

    const recommendationsReady = Boolean(userId && recommendationOwnerId === userId);
    const visibleAiSuggestions = recommendationsReady ? aiSuggestions : [];
    const visibleWellnessAdvice = recommendationsReady ? wellnessAdvice : '';
    const visibleAiExercises = recommendationsReady ? aiExercises : [];

    const handleLogout = () => { logout(); navigate('/'); };

    return (
        <div className="dashboard-layout">
            {/* ── Mobile top bar (hidden on desktop / tablet) ── */}
            <div className="mobile-topbar">
                <div className="mobile-logo">
                    <span>C</span> CalPolice
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
                            fontSize: '0.8rem',
                            color: 'var(--text-muted)',
                            padding: '5px 10px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            transition: 'all 0.2s ease',
                        }}
                        title="Logout"
                    >
                        OUT
                    </button>
                </div>
            </div>

            <aside className="sidebar">
                <div className="sidebar-logo">
                    <div className="logo-icon">C</div>
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

                <div style={{ marginTop: 8, marginBottom: 16 }}>
                    <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
                        style={{ width: '100%', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: 8 }}
                    >
                        <span>{theme === 'dark' ? '☀️ Light' : '🌙 Dark'}</span>
                    </button>
                </div>

                <div className="sidebar-user" style={{ marginTop: 'auto' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                        <div className="user-details">
                            <div className="user-name">{user?.name || 'User'}</div>
                            <div className="user-goal">{user?.goal?.replace(/_/g, ' ')}</div>
                        </div>
                        <button
                            onClick={handleLogout}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-muted)', padding: '4px' }}
                            title="Logout"
                        >OUT</button>
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
                            cachedAiSuggestions={visibleAiSuggestions}
                            setCachedAiSuggestions={setAiSuggestions}
                            cachedWellnessAdvice={visibleWellnessAdvice}
                            setCachedWellnessAdvice={setWellnessAdvice}
                        />
                    } />
                    <Route path="exercises" element={
                        <Exercises
                            cachedAiExercises={visibleAiExercises}
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
