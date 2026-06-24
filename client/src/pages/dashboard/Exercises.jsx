import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import API from '../../api';

export default function Exercises({ cachedAiExercises, setCachedAiExercises }) {
    const { user } = useAuth();
    const [loadingAi, setLoadingAi] = useState(false);
    const [filter, setFilter] = useState('all');
    const [activeVideo, setActiveVideo] = useState(null);

    // On mount: only fetch AI if no cached data
    useEffect(() => {
        if (cachedAiExercises.length === 0) {
            fetchAiExercises();
        }
    }, []);

    const fetchAiExercises = async (isManual = false) => {
        setLoadingAi(true);
        try {
            const catParam = isManual ? (filter === 'all' ? '' : filter) : '';
            const excludeNames = cachedAiExercises.map(ex => ex.name.replace('✨ AI: ', '')).join(',');
            const res = await API.get(`/recommendations/exercise?category=${catParam}&exclude=${encodeURIComponent(excludeNames)}`);
            const newAi = res.data.filter(ex => ex._id.startsWith('ai-ex'));
            setCachedAiExercises(prev => {
                const existingIds = new Set(prev.map(i => i._id));
                const uniqueNew = newAi.filter(i => !existingIds.has(i._id));
                return [...uniqueNew, ...prev];
            });
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingAi(false);
        }
    };


    const categories = ['all', 'cardio', 'strength', 'dumbbells', 'flexibility'];

    const [successMsg, setSuccessMsg] = useState('');
    const [loggingId, setLoggingId] = useState(null);

    const handleLogWorkout = async (ex) => {
        setLoggingId(ex._id);
        setSuccessMsg('');
        try {
            await API.post('/exercises', {
                exercises: [{
                    ...(ex._id.startsWith('ai-ex') ? {} : { exercise: ex._id }),
                    name: ex.name,
                    category: ex.category,
                    durationMinutes: parseInt(ex.duration),
                    caloriesBurned: Math.round(ex.caloriesBurnedPerHour * (parseInt(ex.duration) / 60)),
                    sets: ex.suggestedSets,
                    reps: parseInt(ex.suggestedReps?.split('-')[0]) || 0
                }]
            });
            setSuccessMsg(`Successfully logged ${ex.name}!`);
            setTimeout(() => setSuccessMsg(''), 4000);
        } catch (err) {
            console.error(err);
        } finally {
            setLoggingId(null);
        }
    };

    return (
        <div>
            <div className="page-header">
                <h1>Exercises 🏋️</h1>
                <p>Recommended workouts to help you <strong>{user?.goal?.replace(/_/g, ' ')}</strong></p>
            </div>

            {successMsg && (
                <div style={{ marginBottom: 20, padding: '12px 16px', background: 'rgba(34,217,138,0.1)', border: '1px solid rgba(34,217,138,0.3)', borderRadius: 10, color: 'var(--accent-green)', fontWeight: 600 }}>
                    {successMsg}
                </div>
            )}

            <div className="exercise-filters">
                {categories.map(cat => (
                    <button
                        key={cat}
                        className={`filter-btn ${filter === cat ? 'active' : ''}`}
                        onClick={() => setFilter(cat)}
                        style={{ textTransform: 'capitalize' }}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            <div className="exercise-grid">
                {/* AI Suggestions Section - Filtered by category */}
                {cachedAiExercises
                    .filter(ex => filter === 'all' || ex.category.toLowerCase() === filter.toLowerCase() || (filter === 'dumbbells' && ex.name.toLowerCase().includes('dumbbell')))
                    .map(ex => (
                        <div key={ex._id} className="exercise-card" style={{ display: 'flex', flexDirection: 'column', border: '1px solid var(--accent-purple-dim)' }}>
                            {activeVideo === ex._id ? (
                                <div className="yt-embed">
                                    <iframe
                                        src={`https://www.youtube.com/embed/${ex.youtubeVideoId}?autoplay=1`}
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                    ></iframe>
                                </div>
                            ) : (
                                <div className="yt-thumbnail" onClick={() => setActiveVideo(ex._id)}>
                                    <img src={`https://img.youtube.com/vi/${ex.youtubeVideoId}/maxresdefault.jpg`} alt={ex.name} />
                                    <div className="yt-play-btn">
                                        <div className="play-circle">▶</div>
                                    </div>
                                </div>
                            )}

                            <div className="exercise-info" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                <div className="exercise-name">{ex.name}</div>
                                <div className="exercise-desc" style={{ flex: 1 }}>{ex.description}</div>

                                {ex.suggestedSets && (
                                    <div style={{ display: 'flex', gap: 12, marginBottom: 16, background: 'rgba(255,255,255,0.03)', padding: 10, borderRadius: 8 }}>
                                        <div style={{ flex: 1, textAlign: 'center' }}>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Sets</div>
                                            <div style={{ fontWeight: 600 }}>{ex.suggestedSets}</div>
                                        </div>
                                        <div style={{ flex: 1, textAlign: 'center', borderLeft: '1px solid rgba(255,255,255,0.1)', borderRight: '1px solid rgba(255,255,255,0.1)' }}>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Reps</div>
                                            <div style={{ fontWeight: 600 }}>{ex.suggestedReps}</div>
                                        </div>
                                        <div style={{ flex: 1, textAlign: 'center' }}>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Rest</div>
                                            <div style={{ fontWeight: 600 }}>{ex.restBetweenSets || '60s'}</div>
                                        </div>
                                    </div>
                                )}

                                {/* Wellness Context Badge */}
                                {ex.context && (
                                    <div className="wellness-badge" style={{
                                        background: 'var(--accent-orange-dim)',
                                        color: 'var(--accent-orange)',
                                        fontSize: '0.75rem',
                                        padding: '4px 8px',
                                        borderRadius: '4px',
                                        marginTop: '8px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        border: '1px solid var(--accent-orange-dim)'
                                    }}>
                                        ✨ {ex.context}
                                    </div>
                                )}

                                <div className="exercise-meta" style={{ marginBottom: 16 }}>
                                    <span className={`difficulty-badge ${ex.difficulty}`}>{ex.difficulty}</span>
                                    <span className="calories-badge">
                                        <span>🔥</span> ~{Math.round(ex.caloriesBurnedPerHour * (parseInt(ex.duration) / 60))} kcal / {ex.duration}m
                                    </span>
                                </div>

                                <button
                                    className="btn-primary"
                                    style={{ width: '100%' }}
                                    onClick={() => handleLogWorkout(ex)}
                                    disabled={loggingId === ex._id}
                                >
                                    {loggingId === ex._id ? 'Logging...' : 'Log Workout'}
                                </button>
                            </div>
                        </div>
                    ))}


            </div>

            <div style={{ marginTop: 40, textAlign: 'center', padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: '1px dashed rgba(255,255,255,0.1)' }}>
                <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>Want other exercises? ✨</p>
                <button
                    className="btn-secondary"
                    onClick={() => fetchAiExercises(true)}
                    disabled={loadingAi}
                >
                    {loadingAi ? 'Generating new plans...' : 'Generate more suggestions'}
                </button>
            </div>
        </div>
    );
}
