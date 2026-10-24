import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import API from '../../api';
import { playChewSound } from '../../utils/audio';
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

function getFoodImage(name) {
    const query = encodeURIComponent((name || 'meal').split(' ').slice(0, 2).join(' ') + ' food');
    return `https://source.unsplash.com/400x220/?${query}`;
}

const mergeUniqueByName = (items = []) => {
    const merged = [];
    const indices = new Map();
    items.forEach(item => {
        if (!item || typeof item !== 'object' || Array.isArray(item)) return;
        const name = normalizeName(item.name);
        if (!name) return;
        const existingIndex = indices.get(name);
        if (existingIndex === undefined) {
            indices.set(name, merged.length);
            merged.push(item);
        } else {
            merged[existingIndex] = mergeRecommendationObjects(merged[existingIndex], item);
        }
    });
    return merged;
};

export default function FoodRecommendations({
    cachedAiSuggestions,
    setCachedAiSuggestions,
    cachedWellnessAdvice,
    setCachedWellnessAdvice,
}) {
    const { user, login, token } = useAuth();
    const [filterVeg, setFilterVeg] = useState(user?.dietPreference === 'veg' || user?.dietPreference === 'both');
    const [loadingAi, setLoadingAi] = useState(false);
    const [addingItem, setAddingItem] = useState(null);
    const [successMsg, setSuccessMsg] = useState('');
    const [imgErrors, setImgErrors] = useState({});
    const [liveAiFoods, setLiveAiFoods] = useState([]);
    const [dailyPick, setDailyPick] = useState(null);
    const [dailyLoading, setDailyLoading] = useState(false);
    const [rateLimitUntil, setRateLimitUntil] = useState(0);
    const [rateLimitMessage, setRateLimitMessage] = useState('');
    const inFlightRef = useRef(false);

    const loadDailyPick = async (nextFilter = filterVeg) => {
        setDailyLoading(true);
        try {
            const res = await API.get(`/recommendations/daily?type=food&isVeg=${Boolean(nextFilter)}&dateKey=${getLocalDateKey()}`);
            const pick = res.data?.pick || null;
            setDailyPick(pick && pick.name ? pick : null);
        } catch (err) {
            console.error('[FOODS] Failed to load daily pick:', err);
            setDailyPick(null);
        } finally {
            setDailyLoading(false);
        }
    };

    const fetchAiFoods = async () => {
        const now = Date.now();
        if (inFlightRef.current || loadingAi || now < rateLimitUntil) {
            return;
        }

        const seenNames = new Set([
            dailyPick ? dailyPick.name : '',
            ...(Array.isArray(cachedAiSuggestions) ? cachedAiSuggestions : []).map(item => item?.name),
            ...liveAiFoods.map(item => item?.name),
        ].filter(Boolean).map(normalizeName));

        inFlightRef.current = true;
        setLoadingAi(true);

        try {
            const res = await API.post('/recommendations/food/ai', {
                goal: user?.goal || 'maintain',
                isVeg: filterVeg,
                recentMeals: [...seenNames],
            });

            const newAi = Array.isArray(res.data?.suggestions) ? mergeUniqueByName(res.data.suggestions) : [];
            if (!newAi.length) return;

            const advice = typeof res.data?.wellnessAdvice === 'string' ? res.data.wellnessAdvice.trim() : '';
            if (advice) setCachedWellnessAdvice(advice);
            setLiveAiFoods(prev => mergeUniqueByName([...prev, ...newAi]));
            setCachedAiSuggestions(prev => mergeUniqueByName([...(Array.isArray(prev) ? prev : []), ...newAi]));
        } catch (err) {
            console.error('[FOODS] Error fetching:', err);
            if (err?.response?.status === 429 || err?.code === 'ECONNABORTED' || /timeout/i.test(err?.message || '')) {
                const retrySeconds = getRetrySeconds(err);
                const until = Date.now() + retrySeconds * 1000;
                setRateLimitUntil(until);
                setRateLimitMessage(`AI suggestions are paused for ${retrySeconds} seconds while the service recovers.`);
            }
        } finally {
            inFlightRef.current = false;
            setLoadingAi(false);
        }
    };

    useEffect(() => {
        loadDailyPick(filterVeg);
    }, [filterVeg, user?.id]);

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

    const allVisibleFoods = mergeUniqueByName([
        ...(dailyPick && (filterVeg ? dailyPick.isVeg : !dailyPick.isVeg) ? [dailyPick] : []),
        ...liveAiFoods,
        ...(Array.isArray(cachedAiSuggestions) ? cachedAiSuggestions : []),
    ]).filter(item => {
        const isVegItem = typeof item.isVeg === 'boolean' ? item.isVeg : true;
        return filterVeg ? isVegItem : !isVegItem;
    });

    const showAiSection = Boolean(dailyPick || liveAiFoods.length > 0 || cachedAiSuggestions.length > 0 || loadingAi || dailyLoading);

    const handleToggleFavorite = async (item) => {
        const isFav = user?.favoriteMeals?.some(fav => fav.name === item.name);
        let newFavs;

        if (isFav) {
            newFavs = (user.favoriteMeals || []).filter(fav => fav.name !== item.name);
        } else {
            newFavs = [...(user.favoriteMeals || []), {
                name: item.name,
                calories: item.calories,
                protein: item.protein,
                carbs: item.carbs,
                fat: item.fat,
                portionSize: item.portionSize,
                isVeg: !!item.isVeg,
            }];
        }

        try {
            const res = await API.put('/users/me', { favoriteMeals: newFavs });
            login(res.data.user, token);
        } catch (e) {
            console.error('Failed to update favorites', e);
        }
    };

    const handleLogFood = async (item) => {
        playChewSound();
        setAddingItem(item.name);
        setSuccessMsg('');
        try {
            await API.post('/meals', {
                mealType: 'snack',
                foods: [{
                    name: item.name,
                    calories: item.calories,
                    protein: item.protein || 0,
                    carbs: item.carbs || 0,
                    fat: item.fat || 0,
                }],
            });
            setSuccessMsg(`Successfully added ${item.name} to today's diary!`);
            setTimeout(() => setSuccessMsg(''), 4000);
        } catch (err) {
            console.error('Failed to log food', err);
        } finally {
            setAddingItem(null);
        }
    };

    const handleImgError = (name) => {
        setImgErrors(prev => ({ ...prev, [name]: true }));
    };

    return (
        <div>
            <div className="page-header">
                <h1>Food Recommendations</h1>
                <p>Curated specifically for your goal to <strong>{user?.goal?.replace(/_/g, ' ')}</strong></p>
            </div>

            <div className="food-tabs">
                <button className={`food-tab ${filterVeg ? 'active' : ''}`} onClick={() => setFilterVeg(true)}>Vegetarian</button>
                <button className={`food-tab ${!filterVeg ? 'active' : ''}`} onClick={() => setFilterVeg(false)}>Non-Veg</button>
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

            {showAiSection && (
                <div style={{ marginBottom: 36 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 }}>
                        <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Meal of the Day</h2>
                        {cachedWellnessAdvice && (
                            <div className="wellness-banner" style={{
                                background: 'var(--accent-blue-dim)',
                                color: 'var(--accent-blue)',
                                fontSize: '0.85rem',
                                padding: '6px 14px',
                                borderRadius: '20px',
                                border: '1px solid var(--accent-blue-dim)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                fontWeight: 500,
                            }}>
                                {cachedWellnessAdvice}
                            </div>
                        )}
                    </div>

                    {dailyLoading ? (
                        <div className="loading-spinner"><div className="spinner" /> Loading today's meal...</div>
                    ) : (
                        <div className="food-grid" style={{ marginBottom: 24 }}>
                            {dailyPick && (filterVeg ? dailyPick.isVeg : !dailyPick.isVeg) ? (
                                <div className="food-card" style={{ borderColor: 'var(--accent-purple-dim)', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden', borderLeft: '4px solid var(--accent-green)' }}>
                                    <div style={{ position: 'relative', width: '100%', height: 160, background: 'var(--bg-lighter)', flexShrink: 0 }}>
                                        <div style={{ position: 'absolute', top: 12, left: 12, background: 'rgba(40, 200, 120, 0.18)', color: 'var(--accent-green)', fontWeight: 700, fontSize: '0.7rem', padding: '6px 10px', borderRadius: 999, border: '1px solid rgba(40, 200, 120, 0.3)' }}>
                                            Meal of the Day
                                        </div>
                                        {!imgErrors[dailyPick.name] ? (
                                            <img
                                                src={getFoodImage(dailyPick.name)}
                                                alt={dailyPick.name}
                                                onError={() => handleImgError(dailyPick.name)}
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                            />
                                        ) : (
                                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.2rem', background: 'linear-gradient(135deg, var(--accent-purple-dim), var(--bg-lighter))', color: 'var(--text-muted)' }}>
                                                Meal
                                            </div>
                                        )}
                                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(transparent, rgba(0,0,0,0.8))', padding: '24px 12px 10px' }}>
                                            <div style={{ fontWeight: 700, fontSize: '1rem', color: '#fff' }}>{dailyPick.name}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)' }}>{dailyPick.portionSize || '1 serving'}</div>
                                        </div>
                                        <span className={dailyPick.isVeg ? 'badge-veg' : 'badge-nonveg'} style={{ position: 'absolute', top: 12, right: 12 }}>
                                            {dailyPick.isVeg ? 'Veg' : 'Non-Veg'}
                                        </span>
                                    </div>

                                    <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', flex: 1, gap: 10 }}>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 12px', fontSize: '0.82rem', fontWeight: 600 }}>
                                            <span style={{ color: 'var(--accent-green)' }}>{dailyPick.calories} kcal</span>
                                            <span style={{ color: '#e07b54' }}>{dailyPick.protein}g protein</span>
                                            <span style={{ color: '#c8a951' }}>{dailyPick.carbs}g carbs</span>
                                            <span style={{ color: '#7ec8a4' }}>{dailyPick.fat}g fat</span>
                                        </div>
                                        <div style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.03)', padding: '8px 10px', borderRadius: 8, borderLeft: '2px solid var(--accent-green)', flex: 1 }}>
                                            {dailyPick.reason || 'A balanced pick that fits your goals.'}
                                        </div>
                                        <div style={{ display: 'flex', gap: 10 }}>
                                            <button className="btn-secondary" style={{ flex: 1, padding: '10px' }} onClick={() => handleLogFood(dailyPick)} disabled={addingItem === dailyPick.name}>
                                                {addingItem === dailyPick.name ? 'Adding...' : '+ Log to Diary'}
                                            </button>
                                            <button onClick={() => handleToggleFavorite(dailyPick)} style={{ width: 44, height: 44, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-red)' }}>
                                                {user?.favoriteMeals?.some(f => f.name === dailyPick.name) ? 'Liked' : 'Save'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    )}

                    <div style={{ marginBottom: 12 }}>
                        <h2 style={{ fontSize: '1.15rem', margin: 0 }}>More Suggestions</h2>
                    </div>

                    {loadingAi && allVisibleFoods.length === 0 ? (
                        <div className="loading-spinner"><div className="spinner" /> Getting AI picks...</div>
                    ) : (
                        <div className="food-grid">
                            {allVisibleFoods.map((item, i) => (
                                <div key={`${item.name}-${i}`} className="food-card" style={{ borderColor: 'var(--accent-purple-dim)', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
                                    <div style={{ position: 'relative', width: '100%', height: 160, background: 'var(--bg-lighter)', flexShrink: 0, cursor: 'pointer' }} onClick={() => window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(item.name + ' recipe')}`, '_blank')} title={`Watch recipe for ${item.name}`}>
                                        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '1.15rem', zIndex: 10, filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.5))', pointerEvents: 'none', color: '#fff', fontWeight: 700 }}>PLAY</div>
                                        {!imgErrors[item.name] ? (
                                            <img src={getFoodImage(item.name)} alt={item.name} onError={() => handleImgError(item.name)} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s' }} onMouseOver={e => e.currentTarget.style.transform = 'scale(1.05)'} onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'} />
                                        ) : (
                                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.2rem', background: 'linear-gradient(135deg, var(--accent-purple-dim), var(--bg-lighter))', color: 'var(--text-muted)' }}>Meal</div>
                                        )}
                                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(transparent, rgba(0,0,0,0.8))', padding: '24px 12px 10px' }}>
                                            <div style={{ fontWeight: 700, fontSize: '1rem', color: '#fff' }}>{item.name}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)' }}>{item.portionSize || '1 serving'}</div>
                                        </div>
                                        <span className={item.isVeg ? 'badge-veg' : 'badge-nonveg'} style={{ position: 'absolute', top: 8, right: 8 }}>{item.isVeg ? 'Veg' : 'Non-Veg'}</span>
                                    </div>

                                    <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', flex: 1, gap: 10 }}>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 12px', fontSize: '0.82rem', fontWeight: 600 }}>
                                            <span style={{ color: 'var(--accent-green)' }}>{item.calories} kcal</span>
                                            <span style={{ color: '#e07b54' }}>{item.protein}g protein</span>
                                            <span style={{ color: '#c8a951' }}>{item.carbs}g carbs</span>
                                            <span style={{ color: '#7ec8a4' }}>{item.fat}g fat</span>
                                        </div>
                                        <div style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.03)', padding: '8px 10px', borderRadius: 8, borderLeft: '2px solid var(--accent-purple)', flex: 1 }}>
                                            {item.reason}
                                        </div>
                                        <div style={{ display: 'flex', gap: 10 }}>
                                            <button className="btn-secondary" style={{ flex: 1, padding: '10px' }} onClick={() => handleLogFood(item)} disabled={addingItem === item.name}>
                                                {addingItem === item.name ? 'Adding...' : '+ Log to Diary'}
                                            </button>
                                            <button onClick={() => handleToggleFavorite(item)} style={{ width: 44, height: 44, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-red)' }}>
                                                {user?.favoriteMeals?.some(f => f.name === item.name) ? 'Liked' : 'Save'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            <div style={{ marginTop: 40, textAlign: 'center', padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: '1px dashed rgba(255,255,255,0.1)' }}>
                <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>Want more meals?</p>
                <button className="btn-secondary" onClick={fetchAiFoods} disabled={loadingAi || Date.now() < rateLimitUntil || inFlightRef.current} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    {loadingAi || inFlightRef.current ? (
                        <>
                            <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2, margin: 0 }} />
                            <span>Generating...</span>
                        </>
                    ) : Date.now() < rateLimitUntil ? 'Retry soon...' : 'Generate more suggestions'}
                </button>
            </div>
        </div>
    );
}
