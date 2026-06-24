import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import API from '../../api';

export default function WorkoutLog() {
    const location = useLocation();
    const [data, setData] = useState({ logs: [], totalBurned: 0 });
    const [loading, setLoading] = useState(true);

    const fetchLogs = async () => {
        try {
            const res = await API.get('/exercises/today');
            setData(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchLogs(); }, [location.key]);

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this workout log?')) return;
        try {
            await API.delete(`/exercises/${id}`);
            fetchLogs();
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div>
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1>Workout Log 🏋️</h1>
                    <p>Manage today's exercises and calories burned</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-purple)' }}>{data.totalBurned} kcal</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Burned Today</div>
                </div>
            </div>

            {loading ? (
                <div className="loading-spinner"><div className="spinner" /> Loading workouts...</div>
            ) : data.logs.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">🏃</div>
                    <p>No workouts logged today. Head over to the Exercises page to log your progress!</p>
                </div>
            ) : (
                <div className="meal-cards-grid">
                    {data.logs.map(log => (
                        <div key={log._id} className="meal-card" style={{ borderLeft: '4px solid var(--accent-purple)' }}>
                            <div className="meal-card-header">
                                <span className="meal-type-badge glass" style={{ color: 'var(--accent-purple)' }}>
                                    {log.exercises.length} Exercise{log.exercises.length > 1 ? 's' : ''}
                                </span>
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                    {new Date(log.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                <button className="delete-btn" onClick={() => handleDelete(log._id)}>✕</button>
                            </div>

                            <div className="meal-food-list">
                                {log.exercises.map((ex, i) => (
                                    <div key={i} className="meal-food-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                                            <span style={{ fontWeight: 600 }}>{ex.name}</span>
                                            <span style={{ color: 'var(--accent-purple)', fontWeight: 700 }}>{ex.caloriesBurned} kcal</span>
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                            {ex.durationMinutes} mins • {ex.category}
                                            {ex.sets ? ` • ${ex.sets} sets` : ''}
                                            {ex.reps ? ` • ${ex.reps} reps` : ''}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
