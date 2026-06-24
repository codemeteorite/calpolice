import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import API from '../../api';
import { playChewSound } from '../../utils/audio';

// Helper: get a food image via Unsplash source (free, no key needed)
function getFoodImage(name) {
    const query = encodeURIComponent(name.split(' ').slice(0, 2).join(' ') + ' food');
    return `https://source.unsplash.com/400x220/?${query}`;
}

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

    const fetchAiFoods = async (isManual = false) => {
        setLoadingAi(true);
        console.log('[FOODS] Fetching with filterVeg:', filterVeg);
        try {
            const excludeNames = cachedAiSuggestions.map(item => item.name).join(',');
            const res = await API.get(`/recommendations/food?isVeg=${filterVeg}&exclude=${encodeURIComponent(excludeNames)}`);
            console.log('[FOODS] Response:', res.data);
            const newAi = res.data.aiSuggestions || [];
            const advice = res.data.wellnessAdvice || '';
            console.log('[FOODS] Got suggestions:', newAi.length, 'advice:', advice);
            setCachedWellnessAdvice(advice);
            setCachedAiSuggestions(prev => {
                const existingNames = new Set(prev.map(i => i.name));
                const uniqueNew = newAi.filter(i => !existingNames.has(i.name));
                return [...uniqueNew, ...prev];
            });
        } catch (err) {
            console.error('[FOODS] Error fetching:', err);
        } finally {
            setLoadingAi(false);
        }
    };

    useEffect(() => {
        console.log('[FOODS MOUNT] Component mounted, cachedAiSuggestions:', cachedAiSuggestions.length);
        if (cachedAiSuggestions.length === 0) {
            console.log('[FOODS MOUNT] Cache empty, fetching...');
            fetchAiFoods();
        }
    }, []);

    useEffect(() => {
        console.log('[FOODS FILTER] Filter changed to:', filterVeg);
        // If we don't have any items matching the new filter, fetch some!
        const matchingItems = cachedAiSuggestions.filter(item => filterVeg ? item.isVeg : !item.isVeg);
        if (matchingItems.length === 0) {
            console.log('[FOODS FILTER] No matching items in cache, fetching...');
            fetchAiFoods();
        }
    }, [filterVeg]);

    const displayedFoods = cachedAiSuggestions.filter(item => filterVeg ? item.isVeg : !item.isVeg);

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
                isVeg: !!item.isVeg
            }];
        }

        try {
            const res = await API.put('/users/me', { favoriteMeals: newFavs });
            login(res.data.user, token);
        } catch (e) {
            console.error("Failed to update favorites", e);
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
                    fat: item.fat || 0
                }]
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
                <h1>Food Recommendations 🥗</h1>
                <p>Curated specifically for your goal to <strong>{user?.goal?.replace(/_/g, ' ')}</strong></p>
            </div>

            <div className="food-tabs">
                <button className={`food-tab ${filterVeg ? 'active' : ''}`} onClick={() => setFilterVeg(true)}>🥦 Vegetarian</button>
                <button className={`food-tab ${!filterVeg ? 'active' : ''}`} onClick={() => setFilterVeg(false)}>🍗 Non-Veg</button>
            </div>

            {successMsg && (
                <div style={{ marginBottom: 20, padding: '12px 16px', background: 'rgba(34,217,138,0.1)', border: '1px solid rgba(34,217,138,0.3)', borderRadius: 10, color: 'var(--accent-green)', fontWeight: 600 }}>
                    {successMsg}
                </div>
            )}

            {/* AI Suggestions */}
            {(cachedAiSuggestions.length > 0 || loadingAi) && (
                <div style={{ marginBottom: 36 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 }}>
                        <h2 style={{ fontSize: '1.2rem', margin: 0 }}>✨ AI Daily Picks</h2>
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
                                fontWeight: 500
                            }}>
                                <span>💧</span> {cachedWellnessAdvice}
                            </div>
                        )}
                    </div>

                    {loadingAi && cachedAiSuggestions.length === 0 ? (
                        <div className="loading-spinner"><div className="spinner" /> Getting AI picks...</div>
                    ) : (
                        <div className="food-grid">
                            {displayedFoods.map((item, i) => (
                                <div key={i} className="food-card" style={{ borderColor: 'var(--accent-purple-dim)', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
                                    {/* Food Image */}
                                    <div 
                                        style={{ position: 'relative', width: '100%', height: 160, background: 'var(--bg-lighter)', flexShrink: 0, cursor: 'pointer' }}
                                        onClick={() => window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(item.name + ' recipe')}`, '_blank')}
                                        title={`Watch recipe for ${item.name}`}
                                    >
                                        {/* Play icon overlay */}
                                        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '3rem', zIndex: 10, filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.5))', pointerEvents: 'none' }}>
                                            ▶️
                                        </div>
                                        {!imgErrors[item.name] ? (
                                            <img
                                                src={getFoodImage(item.name)}
                                                alt={item.name}
                                                onError={() => handleImgError(item.name)}
                                                style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s' }}
                                                onMouseOver={e => e.currentTarget.style.transform = 'scale(1.05)'}
                                                onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                                            />
                                        ) : (
                                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem', background: 'linear-gradient(135deg, var(--accent-purple-dim), var(--bg-lighter))' }}>
                                                🍽️
                                            </div>
                                        )}
                                        {/* Gradient overlay + name */}
                                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(transparent, rgba(0,0,0,0.8))', padding: '24px 12px 10px' }}>
                                            <div style={{ fontWeight: 700, fontSize: '1rem', color: '#fff' }}>{item.name}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)' }}>{item.portionSize}</div>
                                        </div>
                                        <span className={item.isVeg ? 'badge-veg' : 'badge-nonveg'} style={{ position: 'absolute', top: 8, right: 8 }}>
                                            {item.isVeg ? 'Veg' : 'Non-Veg'}
                                        </span>
                                    </div>

                                    <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', flex: 1, gap: 10 }}>
                                        {/* Macro bullets */}
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 12px', fontSize: '0.82rem', fontWeight: 600 }}>
                                            <span style={{ color: 'var(--accent-green)' }}>🔥 {item.calories} kcal</span>
                                            <span style={{ color: '#e07b54' }}>🥩 {item.protein}g protein</span>
                                            <span style={{ color: '#c8a951' }}>🍞 {item.carbs}g carbs</span>
                                            <span style={{ color: '#7ec8a4' }}>🥑 {item.fat}g fat</span>
                                        </div>

                                        {/* Reason */}
                                        <div style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.03)', padding: '8px 10px', borderRadius: 8, borderLeft: '2px solid var(--accent-purple)', flex: 1 }}>
                                            {item.reason}
                                        </div>

                                        <div style={{ display: 'flex', gap: 10 }}>
                                            <button className="btn-secondary" style={{ flex: 1, padding: '10px' }} onClick={() => handleLogFood(item)} disabled={addingItem === item.name}>
                                                {addingItem === item.name ? 'Adding...' : '+ Log to Diary'}
                                            </button>
                                            <button
                                                onClick={() => handleToggleFavorite(item)}
                                                style={{
                                                    width: 44,
                                                    height: 44,
                                                    borderRadius: 8,
                                                    border: '1px solid var(--border)',
                                                    background: 'var(--bg-card)',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: '1.2rem',
                                                    transition: 'all 0.2s',
                                                    transform: 'scale(1)'
                                                }}
                                                onMouseDown={e => e.currentTarget.style.transform = 'scale(0.9)'}
                                                onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                                                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                                            >
                                                {user?.favoriteMeals?.some(f => f.name === item.name) ? '❤️' : '🤍'}
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
                <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>Want more meals? ✨</p>
                <button
                    className="btn-secondary"
                    onClick={() => fetchAiFoods(true)}
                    disabled={loadingAi}
                >
                    {loadingAi ? 'Asking AI for more...' : 'Generate more suggestions'}
                </button>
            </div>
        </div>
    );
}
