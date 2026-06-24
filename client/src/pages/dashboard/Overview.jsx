import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import API from '../../api';
import { playGulpSound } from '../../utils/audio';
import WaterTracker from '../../components/WaterTracker';
import StressTracker from '../../components/StressTracker';
import MacrosRing from '../../components/MacrosRing';
import WeeklyCaloriesChart from '../../components/WeeklyCaloriesChart';
import TodayMacrosPie from '../../components/TodayMacrosPie';

export default function Overview() {
    const { user } = useAuth();
    const [weekly, setWeekly] = useState([]);
    const [macros, setMacros] = useState(null);
    const [loading, setLoading] = useState(true);
    const [wellness, setWellness] = useState({ totalWaterMl: 0, stressLevel: 0 });
    const [workouts, setWorkouts] = useState([]);
    const [showWaterEffect, setShowWaterEffect] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [weekRes, macroRes, wellnessRes, workoutRes] = await Promise.all([
                    API.get('/progress/weekly'),
                    API.get('/progress/macros-today'),
                    API.get('/wellness/today'),
                    API.get('/exercises/today')
                ]);
                setWeekly(weekRes.data);
                setMacros(macroRes.data);
                setWellness(wellnessRes.data);
                setWorkouts(workoutRes.data.logs);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleAddWater = useCallback(async (amount) => {
        // Optimistic update
        setWellness(prev => ({ ...prev, totalWaterMl: Math.max(0, prev.totalWaterMl + amount) }));

        if (amount > 0) {
            playGulpSound();
            setShowWaterEffect(true);
            setTimeout(() => setShowWaterEffect(false), 2000);
        }

        try {
            await API.post('/wellness/water', { amountMl: amount });
        } catch (err) {
            console.error(err);
            // Rollback on error
            setWellness(prev => ({ ...prev, totalWaterMl: Math.max(0, prev.totalWaterMl - amount) }));
            alert('Failed to save water log. Please try again.');
        }
    }, []);

    const handleUpdateStress = useCallback(async (level) => {
        try {
            await API.post('/wellness/stress', { stressLevel: level });
            setWellness(prev => ({ ...prev, stressLevel: level }));
        } catch (err) {
            console.error(err);
        }
    }, []);

    if (loading) return <div className="loading-spinner"><div className="spinner" /> Loading dashboard...</div>;

    const target = user?.dailyCalorieTarget || 2000;
    const waterTarget = 2500; // 2.5L standard target



    return (
        <div>
            <div className="page-header">
                <h1>Welcome, {user?.name?.split(' ')[0]} 👋</h1>
                <p>Here's how you're tracking towards your {target} kcal daily goal.</p>
            </div>

            <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20, marginBottom: 30 }}>
                {/* Water Tracker Card */}
                <WaterTracker
                    totalWaterMl={wellness.totalWaterMl}
                    waterTarget={waterTarget}
                    handleAddWater={handleAddWater}
                />

                {/* Cortisol/Stress Tracker Card */}
                <StressTracker
                    stressLevel={wellness.stressLevel}
                    handleUpdateStress={handleUpdateStress}
                />
            </div>

            <MacrosRing macros={macros} target={target} />

            <div className="charts-grid">
                <WeeklyCaloriesChart weekly={weekly} target={target} />
                <TodayMacrosPie macros={macros} />
            </div>

            <div className="recent-activity-section" style={{ marginTop: 30 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <h2 style={{ fontSize: '1.2rem' }}>Recent Workouts 🏃</h2>
                    <button className="btn-secondary" style={{ padding: '4px 12px', fontSize: '0.8rem' }} onClick={() => window.location.hash = '#/dashboard/workouts'}>View All</button>
                </div>
                {workouts.length === 0 ? (
                    <div style={{ padding: 30, textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: '1px dashed rgba(255,255,255,0.1)' }}>
                        <p style={{ color: 'var(--text-muted)' }}>No workouts logged today.</p>
                    </div>
                ) : (
                    <div className="workout-list-mini" style={{ display: 'grid', gap: 12 }}>
                        {workouts.slice(0, 3).map(log => (
                            log.exercises.map((ex, i) => (
                                <div key={`${log._id}-${i}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '12px 16px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.05)' }}>
                                    <div>
                                        <div style={{ fontWeight: 600 }}>{ex.name}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{ex.durationMinutes} mins • {ex.category}</div>
                                    </div>
                                    <div style={{ color: 'var(--accent-purple)', fontWeight: 700 }}>+{ex.caloriesBurned} kcal</div>
                                </div>
                            ))
                        ))}
                    </div>
                )}
            </div>

            {/* Water screen visual effect overlay */}
            {showWaterEffect && (
                <div className="water-splash-overlay">
                    {[...Array(15)].map((_, i) => (
                        <div
                            key={i}
                            className="water-bubble"
                            style={{
                                left: `${Math.random() * 100}%`,
                                width: `${Math.random() * 30 + 10}px`,
                                height: `${Math.random() * 30 + 10}px`,
                                animationDelay: `${Math.random() * 0.5}s`,
                                animationDuration: `${Math.random() * 1 + 1}s`
                            }}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
