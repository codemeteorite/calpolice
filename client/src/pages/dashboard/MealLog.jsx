import { useState, useEffect } from 'react';
import API from '../../api';
import { playChewSound } from '../../utils/audio';

export default function MealLog() {
    const [data, setData] = useState({ meals: [], totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0 });
    const [loading, setLoading] = useState(true);

    // AI Form state
    const [aiInput, setAiInput] = useState('');
    const [aiLoading, setAiLoading] = useState(false);
    const [aiResult, setAiResult] = useState(null);
    const [aiError, setAiError] = useState('');

    // Manual Form state
    const [showManual, setShowManual] = useState(false);
    const [mealType, setMealType] = useState('lunch');
    const [foodName, setFoodName] = useState('');
    const [calories, setCalories] = useState('');

    const fetchMeals = async () => {
        try {
            const res = await API.get('/meals/today');
            setData(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchMeals(); }, []);

    const handleAiAnalyze = async (e) => {
        e.preventDefault();
        if (!aiInput.trim()) return;

        setAiLoading(true); setAiResult(null); setAiError('');
        try {
            const profileInfo = JSON.parse(localStorage.getItem('cp_user') || '{}');
            const res = await API.post('/ai/analyze', {
                mealDescription: aiInput,
                userProfile: profileInfo
            });
            setAiResult(res.data);
        } catch (err) {
            setAiError(err.response?.data?.message || 'Error communicating with AI service. Make sure calpolice-ai is running.');
        } finally {
            setAiLoading(false);
        }
    };

    const handleSaveAiMeal = async () => {
        if (!aiResult) return;
        playChewSound();
        try {
            await API.post('/meals', {
                mealType: 'lunch', // default, could allow user to choose
                foods: aiResult.items || [{ name: 'Custom Meal', calories: aiResult.estimatedCalories, protein: aiResult.protein, carbs: aiResult.carbs, fat: aiResult.fat }]
            });
            setAiResult(null);
            setAiInput('');
            fetchMeals();
        } catch (err) {
            console.error(err);
        }
    };

    const handleManualSave = async (e) => {
        e.preventDefault();
        if (!foodName || !calories) return;
        playChewSound();

        try {
            await API.post('/meals', {
                mealType,
                foods: [{ name: foodName, calories: Number(calories) }]
            });
            setFoodName(''); setCalories(''); setShowManual(false);
            fetchMeals();
        } catch (err) {
            console.error(err);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this meal?')) return;
        try {
            await API.delete(`/meals/${id}`);
            fetchMeals();
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div>
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1>Meal Log 🍽️</h1>
                    <p>Track today's food intake and get AI analysis</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-green)' }}>{data.totalCalories} kcal</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Total Today</div>
                </div>
            </div>

            <div className="ai-panel">
                <h3>✨ AI Food Analyzer</h3>
                <p>Type what you ate in plain English. Groq AI will estimate calories and macros instantly.</p>

                <form onSubmit={handleAiAnalyze} className="ai-input-row">
                    <input
                        className="form-input"
                        style={{ flex: 1, background: 'rgba(255,255,255,0.06)' }}
                        placeholder="e.g. 2 pieces of whole wheat toast with avocado and 2 boiled eggs"
                        value={aiInput}
                        onChange={e => setAiInput(e.target.value)}
                    />
                    <button type="submit" className="btn-primary" disabled={aiLoading || !aiInput.trim()}>
                        {aiLoading ? 'Thinking...' : 'Analyze'}
                    </button>
                </form>

                {aiError && <div style={{ color: '#ff5555', fontSize: '0.85rem', marginTop: 12 }}>{aiError}</div>}

                {aiResult && (
                    <div className="ai-result">
                        <div className="ai-result-grid">
                            <div className="ai-result-item"><div className="val">{aiResult.estimatedCalories}</div><div className="lbl">Kcal</div></div>
                            <div className="ai-result-item"><div className="val">{aiResult.protein}g</div><div className="lbl">Protein</div></div>
                            <div className="ai-result-item"><div className="val">{aiResult.carbs}g</div><div className="lbl">Carbs</div></div>
                            <div className="ai-result-item"><div className="val">{aiResult.fat}g</div><div className="lbl">Fat</div></div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}><strong>AI Feedback:</strong> {aiResult.feedback}</div>
                                {aiResult.suggestions?.length > 0 && (
                                    <div className="ai-suggestions">
                                        <ul>{aiResult.suggestions.map((s, i) => <li key={i}>{s}</li>)}</ul>
                                    </div>
                                )}
                            </div>
                            <div style={{ marginLeft: 20 }}>
                                <button onClick={handleSaveAiMeal} className="btn-primary" style={{ padding: '8px 20px' }}>Log this to Diary</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h2 style={{ fontSize: '1.2rem' }}>Today's Meals</h2>
                <button onClick={() => setShowManual(!showManual)} className="btn-secondary" style={{ padding: '6px 16px', fontSize: '0.8rem' }}>
                    {showManual ? 'Cancel' : '+ Add Manually'}
                </button>
            </div>

            {showManual && (
                <form onSubmit={handleManualSave} className="add-meal-panel">
                    <div className="food-item-row">
                        <div className="form-group">
                            <label>Food Name</label>
                            <input className="form-input" placeholder="e.g. Banana" value={foodName} onChange={e => setFoodName(e.target.value)} required />
                        </div>
                        <div className="form-group">
                            <label>Calories</label>
                            <input className="form-input" type="number" placeholder="kcal" value={calories} onChange={e => setCalories(e.target.value)} required />
                        </div>
                        <div className="form-group">
                            <label>Meal Type</label>
                            <select className="form-input" value={mealType} onChange={e => setMealType(e.target.value)}>
                                <option value="breakfast">Breakfast</option>
                                <option value="lunch">Lunch</option>
                                <option value="dinner">Dinner</option>
                                <option value="snack">Snack</option>
                            </select>
                        </div>
                        <button type="submit" className="btn-primary" style={{ marginBottom: 4, gridColumn: 'span 2' }}>Add Meal</button>
                    </div>
                </form>
            )}

            {loading ? (
                <div className="loading-spinner"><div className="spinner" /> Loading meals...</div>
            ) : data.meals.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">🍽️</div>
                    <p>No meals logged today. Use the AI analyzer above to start tracking!</p>
                </div>
            ) : (
                <div className="meal-cards-grid">
                    {data.meals.map(meal => (
                        <div key={meal._id} className="meal-card">
                            <div className="meal-card-header">
                                <span className="meal-type-badge glass">{meal.mealType}</span>
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                    {new Date(meal.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                <button className="delete-btn" onClick={() => handleDelete(meal._id)}>✕</button>
                            </div>

                            <div className="meal-food-list">
                                {meal.foods.map((food, i) => (
                                    <div key={i} className="meal-food-item">
                                        <span style={{ fontWeight: 600 }}>{food.name}</span>
                                        <span style={{ color: 'var(--accent-green)', fontWeight: 700 }}>{food.calories} kcal</span>
                                    </div>
                                ))}
                            </div>

                            <div className="meal-macros">
                                <span className="macro-pill">P: {Math.round(meal.totalProtein)}g</span>
                                <span className="macro-pill">C: {Math.round(meal.totalCarbs)}g</span>
                                <span className="macro-pill">F: {Math.round(meal.totalFat)}g</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
