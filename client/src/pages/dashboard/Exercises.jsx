import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import API from '../../api';
import { mergeRecommendationObjects } from '../../utils/storage';

const getRetrySeconds = (err) => {
    const retryAfter = Number(err?.response?.data?.retryAfter || err?.response?.headers?.['retry-after'] || 30);
    return Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : 30;
};

const normalizeName = (value) => String(value || '').trim().toLowerCase();

const getLocalDateKey = () => {
    const date = new Date();
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 10);
};

const validVideoId = (value) => typeof value === 'string' && /^[A-Za-z0-9_-]{11}$/.test(value.trim()) && value.trim() !== 'dQw4w9WgXcQ';

const buildShortsUrl = (exercise) => {
    const id = exercise?.youtubeVideoId || exercise?.videoId || '';
    if (validVideoId(id)) {
        return `https://www.youtube.com/shorts/${id.trim()}`;
    }
    const query = encodeURIComponent(`${exercise?.name || 'exercise'} ${exercise?.category || 'fitness'} short workout tutorial`);
    return `https://www.youtube.com/results?search_query=${query}`;
};

const mergeUniqueByName = (items = []) => {
    const merged = [];
    const indices = new Map();
    items.forEach(item => {
        if (!item || typeof item !== 'object' || Array.isArray(item)) return;
        const key = normalizeName(item.name);
        if (!key) return;
        const existingIndex = indices.get(key);
        if (existingIndex === undefined) {
            indices.set(key, merged.length);
            merged.push(item);
        } else {
            merged[existingIndex] = mergeRecommendationObjects(merged[existingIndex], item);
        }
    });
    return merged;
};

export default function Exercises({ cachedAiExercises, setCachedAiExercises }) {
    const { user } = useAuth();
    const [loadingAi, setLoadingAi] = useState(false);
    const [filter, setFilter] = useState('all');
    const [successMsg, setSuccessMsg] = useState('');
    const [loggingId, setLoggingId] = useState(null);
    const [dailyPick, setDailyPick] = useState(null);
    const [dailyLoading, setDailyLoading] = useState(false);
    const [rateLimitUntil, setRateLimitUntil] = useState(0);
    const [rateLimitMessage, setRateLimitMessage] = useState('');
    const [videoFailures, setVideoFailures] = useState({});
    const inFlightRef = useRef(false);

    const categories = ['all', 'cardio', 'strength', 'dumbbells', 'flexibility'];

    const loadDailyPick = async (nextFilter = filter) => {
        setDailyLoading(true);
        try {
            const res = await API.get(`/recommendations/daily?type=exercise&category=${nextFilter === 'all' ? 'all' : nextFilter}&dateKey=${getLocalDateKey()}`);
            const pick = res.data?.pick || null;
            setDailyPick(pick && pick.name ? pick : null);
        } catch (err) {
            console.error('[EXERCISES] Failed to load daily pick:', err);
            setDailyPick(null);
        } finally {
            setDailyLoading(false);
        }
    };

    useEffect(() => {
        loadDailyPick(filter);
    }, [filter, user?.id]);

    useEffect(() => {
        if (!rateLimitUntil) return;

        const timer = setInterval(() => {
            if (Date.now() >= rateLimitUntil) {
                setRateLimitUntil(0);
                setRateLimitMessage('');
                clearInterval(timer);
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [rateLimitUntil]);

    const fetchAiExercises = async () => {
        const now = Date.now();
        if (inFlightRef.current || loadingAi || now < rateLimitUntil) {
            return;
        }

        const excludeNames = [
            ...(dailyPick ? [dailyPick.name] : []),
            ...(Array.isArray(cachedAiExercises) ? cachedAiExercises : []).map(ex => ex?.name || ''),
        ].filter(Boolean).map(normalizeName);

        inFlightRef.current = true;
        setLoadingAi(true);
        try {
            const res = await API.post('/recommendations/exercise/ai', {
                goal: user?.goal || 'maintain',
                category: filter === 'all' ? '' : filter,
                recentExercises: excludeNames,
            });

            const newAi = Array.isArray(res.data?.suggestions) ? mergeUniqueByName(res.data.suggestions) : [];
            if (!newAi.length) return;
            setCachedAiExercises(prev => mergeUniqueByName([...(Array.isArray(prev) ? prev : []), ...newAi]));
        } catch (err) {
            console.error(err);
            if (err?.response?.status === 429 || err?.code === 'ECONNABORTED' || /timeout/i.test(err?.message || '')) {
                const retrySeconds = getRetrySeconds(err);
                const until = Date.now() + retrySeconds * 1000;
                setRateLimitUntil(until);
                setRateLimitMessage(`Exercise suggestions are paused for ${retrySeconds} seconds while the service recovers.`);
            }
        } finally {
            inFlightRef.current = false;
            setLoadingAi(false);
        }
    };

    const handleVideoError = (exerciseId) => {
        setVideoFailures(prev => ({ ...prev, [exerciseId]: true }));
    };

    const displayExercises = mergeUniqueByName([
        ...(dailyPick && (filter === 'all' || (dailyPick.category || '').toLowerCase() === filter.toLowerCase() || (filter === 'dumbbells' && (dailyPick.name || '').toLowerCase().includes('dumbbell'))) ? [dailyPick] : []),
        ...(Array.isArray(cachedAiExercises) ? cachedAiExercises : []),
    ]).filter(ex => {
        const name = (ex?.name || '').toLowerCase();
        const videoId = (ex?.youtubeVideoId || '');
        const category = (ex?.category || 'cardio').toLowerCase();
        if (name.includes('brisk walking') || name.includes('rick roll') || videoId === 'dQw4w9WgXcQ') return false;
        return filter === 'all' || category === filter.toLowerCase() || (filter === 'dumbbells' && name.includes('dumbbell'));
    });

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
                    reps: parseInt(ex.suggestedReps?.split('-')[0]) || 0,
                }],
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
                <h1>Exercises</h1>
                <p>Recommended workouts to help you <strong>{user?.goal?.replace(/_/g, ' ')}</strong></p>
            </div>

            {successMsg && (
                <div style={{ marginBottom: 20, padding: '12px 16px', background: 'rgba(34,217,138,0.1)', border: '1px solid rgba(34,217,138,0.3)', borderRadius: 10, color: 'var(--accent-green)', fontWeight: 600 }}>
                    {successMsg}
                </div>
            )}

            {rateLimitMessage && Date.now() < rateLimitUntil && (
                <div style={{ marginBottom: 20, padding: '12px 16px', background: 'rgba(255, 180, 66, 0.1)', border: '1px solid rgba(255, 180, 66, 0.4)', borderRadius: 10, color: '#f5c86f', fontWeight: 600 }}>
                    {rateLimitMessage}
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

            <div style={{ marginTop: 18, marginBottom: 28 }}>
                {dailyLoading ? (
                    <div className="loading-spinner"><div className="spinner" /> Loading today's exercise...</div>
                ) : dailyPick && (filter === 'all' || (dailyPick.category || '').toLowerCase() === filter.toLowerCase() || (filter === 'dumbbells' && (dailyPick.name || '').toLowerCase().includes('dumbbell'))) ? (
                    <div className="exercise-card" style={{ display: 'flex', flexDirection: 'column', border: '1px solid var(--accent-green)', borderLeft: '4px solid var(--accent-green)' }}>
                        {(!validVideoId(dailyPick.youtubeVideoId) || videoFailures[dailyPick._id]) ? (
                            <div className="yt-thumbnail" onClick={() => window.open(buildShortsUrl(dailyPick), '_blank', 'noopener,noreferrer')} style={{ cursor: 'pointer', background: 'linear-gradient(135deg, var(--accent-purple-dim), var(--bg-lighter))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', padding: 20, color: 'var(--text-secondary)' }}>
                                <div style={{ fontSize: '2rem', marginBottom: 8 }}>🎥</div>
                                <div style={{ fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>{dailyPick.name}</div>
                                <div style={{ fontSize: '0.8rem', textAlign: 'center', marginBottom: 12 }}>No verified video found for this move.</div>
                                <button className="btn-secondary" type="button">Search YouTube</button>
                            </div>
                        ) : (
                            <div className="yt-thumbnail" onClick={() => window.open(buildShortsUrl(dailyPick), '_blank', 'noopener,noreferrer')} style={{ cursor: 'pointer' }}>
                                <img
                                    src={`https://img.youtube.com/vi/${dailyPick.youtubeVideoId}/maxresdefault.jpg`}
                                    alt={dailyPick.name}
                                    onError={() => handleVideoError(dailyPick._id)}
                                />
                                <div className="yt-play-btn">
                                    <div className="play-circle">▶</div>
                                </div>
                            </div>
                        )}
                        <div className="exercise-info" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                <span style={{ background: 'rgba(40, 200, 120, 0.18)', color: 'var(--accent-green)', fontWeight: 700, fontSize: '0.7rem', padding: '6px 10px', borderRadius: 999, border: '1px solid rgba(40, 200, 120, 0.3)' }}>Exercise of the Day</span>
                            </div>
                            <div className="exercise-name">{dailyPick.name}</div>
                            <div className="exercise-desc" style={{ flex: 1 }}>{dailyPick.description}</div>
                            {dailyPick.suggestedSets && (
                                <div style={{ display: 'flex', gap: 12, marginBottom: 16, background: 'rgba(255,255,255,0.03)', padding: 10, borderRadius: 8 }}>
                                    <div style={{ flex: 1, textAlign: 'center' }}><div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Sets</div><div style={{ fontWeight: 600 }}>{dailyPick.suggestedSets}</div></div>
                                    <div style={{ flex: 1, textAlign: 'center', borderLeft: '1px solid rgba(255,255,255,0.1)', borderRight: '1px solid rgba(255,255,255,0.1)' }}><div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Reps</div><div style={{ fontWeight: 600 }}>{dailyPick.suggestedReps}</div></div>
                                    <div style={{ flex: 1, textAlign: 'center' }}><div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Rest</div><div style={{ fontWeight: 600 }}>{dailyPick.restBetweenSets || '60s'}</div></div>
                                </div>
                            )}
                            {dailyPick.context && (
                                <div className="wellness-badge" style={{ background: 'var(--accent-orange-dim)', color: 'var(--accent-orange)', fontSize: '0.75rem', padding: '4px 8px', borderRadius: '4px', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid var(--accent-orange-dim)' }}>
                                    {dailyPick.context}
                                </div>
                            )}
                            <div className="exercise-meta" style={{ marginBottom: 16 }}>
                                <span className={`difficulty-badge ${dailyPick.difficulty}`}>{dailyPick.difficulty}</span>
                                <span className="calories-badge">~{Math.round(dailyPick.caloriesBurnedPerHour * (parseInt(dailyPick.duration) / 60))} kcal / {dailyPick.duration}m</span>
                            </div>
                            <button className="btn-primary" style={{ width: '100%' }} onClick={() => handleLogWorkout(dailyPick)} disabled={loggingId === dailyPick._id}>
                                {loggingId === dailyPick._id ? 'Logging...' : 'Log Workout'}
                            </button>
                        </div>
                    </div>
                ) : null}
            </div>

            <div className="exercise-grid">
                {displayExercises.map(ex => {
                    const shortsUrl = buildShortsUrl(ex);
                    const hasVideoError = !validVideoId(ex.youtubeVideoId) || Boolean(videoFailures[ex._id]);
                    return (
                        <div key={ex._id} className="exercise-card" style={{ display: 'flex', flexDirection: 'column', border: '1px solid var(--accent-purple-dim)' }}>
                            {hasVideoError ? (
                                <div className="yt-thumbnail" onClick={() => window.open(shortsUrl, '_blank', 'noopener,noreferrer')} style={{ cursor: 'pointer', background: 'linear-gradient(135deg, var(--accent-purple-dim), var(--bg-lighter))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', padding: 20, color: 'var(--text-secondary)' }}>
                                    <div style={{ fontSize: '2rem', marginBottom: 8 }}>🎥</div>
                                    <div style={{ fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>{ex.name.replace(/^(?:✨\s*)?AI:\s*/i, '').replace(/^AI:\s*/i, '')}</div>
                                    <div style={{ fontSize: '0.8rem', textAlign: 'center', marginBottom: 12 }}>Search YouTube for a verified demo.</div>
                                    <button className="btn-secondary" type="button">Open YouTube</button>
                                </div>
                            ) : (
                                <div className="yt-thumbnail" onClick={() => window.open(shortsUrl, '_blank', 'noopener,noreferrer')} style={{ cursor: 'pointer' }}>
                                    <img
                                        src={`https://img.youtube.com/vi/${ex.youtubeVideoId}/maxresdefault.jpg`}
                                        alt={ex.name}
                                        onError={() => handleVideoError(ex._id)}
                                    />
                                    <div className="yt-play-btn"><div className="play-circle">▶</div></div>
                                </div>
                            )}

                            <div className="exercise-info" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                <div className="exercise-name">{ex.name.replace(/^(?:✨\s*)?AI:\s*/i, '').replace(/^AI:\s*/i, '')}</div>
                                <div className="exercise-desc" style={{ flex: 1 }}>{ex.description}</div>

                                {ex.suggestedSets && (
                                    <div style={{ display: 'flex', gap: 12, marginBottom: 16, background: 'rgba(255,255,255,0.03)', padding: 10, borderRadius: 8 }}>
                                        <div style={{ flex: 1, textAlign: 'center' }}><div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Sets</div><div style={{ fontWeight: 600 }}>{ex.suggestedSets}</div></div>
                                        <div style={{ flex: 1, textAlign: 'center', borderLeft: '1px solid rgba(255,255,255,0.1)', borderRight: '1px solid rgba(255,255,255,0.1)' }}><div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Reps</div><div style={{ fontWeight: 600 }}>{ex.suggestedReps}</div></div>
                                        <div style={{ flex: 1, textAlign: 'center' }}><div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Rest</div><div style={{ fontWeight: 600 }}>{ex.restBetweenSets || '60s'}</div></div>
                                    </div>
                                )}

                                {ex.context && (
                                    <div className="wellness-badge" style={{ background: 'var(--accent-orange-dim)', color: 'var(--accent-orange)', fontSize: '0.75rem', padding: '4px 8px', borderRadius: '4px', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid var(--accent-orange-dim)' }}>
                                        {ex.context}
                                    </div>
                                )}

                                <div className="exercise-meta" style={{ marginBottom: 16 }}>
                                    <span className={`difficulty-badge ${ex.difficulty}`}>{ex.difficulty}</span>
                                    <span className="calories-badge">~{Math.round(ex.caloriesBurnedPerHour * (parseInt(ex.duration) / 60))} kcal / {ex.duration}m</span>
                                </div>

                                <button className="btn-primary" style={{ width: '100%' }} onClick={() => handleLogWorkout(ex)} disabled={loggingId === ex._id}>
                                    {loggingId === ex._id ? 'Logging...' : 'Log Workout'}
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div style={{ marginTop: 40, textAlign: 'center', padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: '1px dashed rgba(255,255,255,0.1)' }}>
                <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>Want other exercises?</p>
                <button className="btn-secondary" onClick={fetchAiExercises} disabled={loadingAi || inFlightRef.current || Date.now() < rateLimitUntil} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    {loadingAi || inFlightRef.current ? (
                        <>
                            <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2, margin: 0 }} />
                            <span>Generating...</span>
                        </>
                    ) : Date.now() < rateLimitUntil ? 'Retry soon...' : 'Get more suggestions'}
                </button>
            </div>
        </div>
    );
}
