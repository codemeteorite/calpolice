import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import API from '../../api';

export default function Profile() {
    const { user, login, logout } = useAuth();
    const [form, setForm] = useState(user || {});
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState('');

    // Hydrate form properly on mount
    useEffect(() => {
        if (user) setForm(user);
    }, [user]);

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true); setSuccess('');
        try {
            const res = await API.put('/users/me', {
                age: form.age, height: form.height, weight: form.weight,
                goal: form.goal, activityLevel: form.activityLevel, dietPreference: form.dietPreference
            });
            // Update context and resync
            const token = localStorage.getItem('cp_token');
            login(res.data.user, token);
            setSuccess('Profile updated successfully! Target calories recalculated.');
            setTimeout(() => setSuccess(''), 4000);
        } catch (err) {
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    const handleRemoveFavorite = async (item) => {
        const newFavs = (user.favoriteMeals || []).filter(fav => fav.name !== item.name);
        try {
            const res = await API.put('/users/me', { favoriteMeals: newFavs });
            const token = localStorage.getItem('cp_token');
            login(res.data.user, token);
            setSuccess(`Removed ${item.name} from liked meals.`);
            setTimeout(() => setSuccess(''), 4000);
        } catch (e) {
            console.error("Failed to remove favorite", e);
        }
    };

    const handleLogFavorite = async (item) => {
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
            setSuccess(`Successfully logged ${item.name} to today's diary!`);
            setTimeout(() => setSuccess(''), 4000);
        } catch (err) {
            console.error('Failed to log food', err);
        }
    };


    if (!user) return null;

    return (
        <div>
            <div className="page-header">
                <h1>Your Profile 👤</h1>
                <p>Manage your health data and application settings</p>
            </div>

            {success && (
                <div style={{ marginBottom: 24, padding: '14px 20px', background: 'rgba(34,217,138,0.1)', border: '1px solid rgba(34,217,138,0.3)', borderRadius: 12, color: 'var(--accent-green)', fontWeight: 600 }}>
                    {success}
                </div>
            )}

            <div className="profile-grid">
                <div>
                    <div className="profile-card" style={{ position: 'sticky', top: 32 }}>
                        <div className="profile-avatar">{user.name.charAt(0).toUpperCase()}</div>
                        <div className="profile-name">{user.name}</div>
                        <div className="profile-email">{user.email}</div>

                        <div className="profile-stat-row">
                            <div className="profile-stat-item">
                                <div className="pval">{user.weight}</div>
                                <div className="plbl">Weight (kg)</div>
                            </div>
                            <div className="profile-stat-item">
                                <div className="pval">{user.height}</div>
                                <div className="plbl">Height (cm)</div>
                            </div>
                            <div className="profile-stat-item">
                                <div className="pval">{user.age}</div>
                                <div className="plbl">Age</div>
                            </div>
                        </div>

                        <div style={{ marginBottom: 24 }}>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Daily Target</div>
                            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent-green)', lineHeight: 1 }}>{user.dailyCalorieTarget}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>kcal</div>
                        </div>

                        <button className="btn-secondary" style={{ width: '100%', borderColor: 'rgba(255,85,85,0.3)', color: '#ff5555' }} onClick={logout}>
                            Sign Out
                        </button>
                    </div>
                </div>

                <div>
                    <div className="profile-card" style={{ textAlign: 'left' }}>
                        <h2 style={{ fontSize: '1.2rem', marginBottom: 24 }}>Edit Settings</h2>

                        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                            {/* Responsive 3→2→1 col grid */}
                            <div className="profile-settings-grid">
                                <div className="form-group">
                                    <label>Age</label>
                                    <input className="form-input" name="age" type="number" value={form.age || ''} onChange={handleChange} required />
                                </div>
                                <div className="form-group">
                                    <label>Height (cm)</label>
                                    <input className="form-input" name="height" type="number" value={form.height || ''} onChange={handleChange} required />
                                </div>
                                <div className="form-group">
                                    <label>Weight (kg)</label>
                                    <input className="form-input" name="weight" type="number" value={form.weight || ''} onChange={handleChange} required />
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Primary Goal</label>
                                <select className="form-input" name="goal" value={form.goal || ''} onChange={handleChange}>
                                    <option value="lose_weight">Lose Weight</option>
                                    <option value="maintain">Maintain Weight</option>
                                    <option value="gain_weight">Gain Weight / Muscle</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Activity Level</label>
                                <select className="form-input" name="activityLevel" value={form.activityLevel || ''} onChange={handleChange}>
                                    <option value="sedentary">Sedentary (desk job)</option>
                                    <option value="light">Light (1-2 days/week)</option>
                                    <option value="moderate">Moderate (3-5 days/week)</option>
                                    <option value="active">Active (6-7 days/week)</option>
                                    <option value="very_active">Very Active (athlete)</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Dietary Preference</label>
                                <select className="form-input" name="dietPreference" value={form.dietPreference || ''} onChange={handleChange}>
                                    <option value="veg">Vegetarian</option>
                                    <option value="non_veg">Non-Vegetarian</option>
                                    <option value="both">No Restriction</option>
                                </select>
                            </div>

                            <div style={{ marginTop: 12, textAlign: 'right' }}>
                                <button type="submit" className="btn-primary" disabled={saving}>
                                    {saving ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>

                    <div className="profile-card" style={{ textAlign: 'left', marginTop: 24 }}>
                        <h2 style={{ fontSize: '1.2rem', marginBottom: 16 }}>❤️ Liked Meals</h2>
                        {(!user.favoriteMeals || user.favoriteMeals.length === 0) ? (
                            <p style={{ color: 'var(--text-secondary)' }}>You haven't liked any meals yet! Go to Food Recommendations to find meals you like.</p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {user.favoriteMeals.map((meal, index) => (
                                    <div key={index} className="fav-meal-card">
                                        <div className="fav-meal-info">
                                            <div style={{ fontWeight: 600, fontSize: '1rem', marginBottom: 4 }}>{meal.name}</div>
                                            <div className="fav-meal-macros">
                                                <span style={{ color: 'var(--accent-green)' }}>{meal.calories} kcal</span>
                                                <span style={{ color: '#e07b54' }}>{meal.protein}g P</span>
                                                <span style={{ color: '#c8a951' }}>{meal.carbs}g C</span>
                                                <span style={{ color: '#7ec8a4' }}>{meal.fat}g F</span>
                                            </div>
                                        </div>
                                        <div className="fav-meal-actions">
                                            <button className="btn-secondary" style={{ padding: '8px 12px', fontSize: '0.85rem' }} onClick={() => handleLogFavorite(meal)}>
                                                + Log
                                            </button>
                                            <button className="btn-secondary" style={{ padding: '8px 12px', fontSize: '0.85rem', borderColor: 'rgba(255,85,85,0.3)', color: '#ff5555' }} onClick={() => handleRemoveFavorite(meal)}>
                                                Unlike
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
