import { useState, useCallback } from 'react';
import API from '../../api';

export default function DayHistory() {
    const [selectedDate, setSelectedDate] = useState(() => {
        const d = new Date();
        return d.toISOString().split('T')[0];
    });
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);

    const fetchDayData = useCallback(async (date) => {
        setLoading(true);
        try {
            const [macrosRes, waterRes] = await Promise.all([
                API.get(`/progress/macros-by-date?date=${date}`),
                API.get(`/wellness/water-by-date?date=${date}`)
            ]);
            setData({
                macros: macrosRes.data,
                water: waterRes.data
            });
        } catch (err) {
            console.error(err);
            alert('Error fetching day data');
        } finally {
            setLoading(false);
        }
    }, []);

    const handleDateChange = (e) => {
        const date = e.target.value;
        setSelectedDate(date);
        fetchDayData(date);
    };

    const goYesterday = () => {
        const d = new Date(selectedDate);
        d.setDate(d.getDate() - 1);
        const newDate = d.toISOString().split('T')[0];
        setSelectedDate(newDate);
        fetchDayData(newDate);
    };

    const goTomorrow = () => {
        const d = new Date(selectedDate);
        d.setDate(d.getDate() + 1);
        const today = new Date().toISOString().split('T')[0];
        if (d.toISOString().split('T')[0] <= today) {
            const newDate = d.toISOString().split('T')[0];
            setSelectedDate(newDate);
            fetchDayData(newDate);
        }
    };

    return (
        <div>
            <div className="page-header">
                <h1>Daily History 📅</h1>
                <p>View your nutrition and water intake for any day</p>
            </div>

            <div style={{ marginBottom: 20, display: 'flex', gap: 10, alignItems: 'center' }}>
                <button onClick={goYesterday} className="btn-secondary" style={{ padding: '8px 16px' }}>← Yesterday</button>
                <input 
                    type="date" 
                    value={selectedDate} 
                    onChange={handleDateChange} 
                    style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', cursor: 'pointer' }}
                />
                <button onClick={goTomorrow} className="btn-secondary" style={{ padding: '8px 16px' }} disabled={selectedDate >= new Date().toISOString().split('T')[0]}>Tomorrow →</button>
            </div>

            {loading ? (
                <div className="loading-spinner"><div className="spinner" /> Loading...</div>
            ) : data ? (
                <div>
                    {/* Macros Section */}
                    <div className="stat-card glass" style={{ marginBottom: 20, padding: 24 }}>
                        <h2 style={{ marginBottom: 16, fontSize: '1.1rem' }}>Nutrition</h2>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 16, marginBottom: 20 }}>
                            <div style={{ background: 'rgba(255,255,255,0.05)', padding: 16, borderRadius: 12, textAlign: 'center' }}>
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 8 }}>Calories</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{data.macros.totalCalories}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>/ {data.macros.target} kcal</div>
                            </div>
                            <div style={{ background: 'rgba(255,255,255,0.05)', padding: 16, borderRadius: 12, textAlign: 'center' }}>
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 8 }}>Protein</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-green)' }}>{data.macros.protein}g</div>
                            </div>
                            <div style={{ background: 'rgba(255,255,255,0.05)', padding: 16, borderRadius: 12, textAlign: 'center' }}>
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 8 }}>Carbs</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-orange)' }}>{data.macros.carbs}g</div>
                            </div>
                            <div style={{ background: 'rgba(255,255,255,0.05)', padding: 16, borderRadius: 12, textAlign: 'center' }}>
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 8 }}>Fat</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-pink)' }}>{data.macros.fat}g</div>
                            </div>
                        </div>
                        {data.macros.meals && data.macros.meals.length > 0 && (
                            <div>
                                <h3 style={{ marginBottom: 12, fontSize: '0.95rem', color: 'var(--text-secondary)' }}>Meals Logged</h3>
                                <div style={{ display: 'grid', gap: 8 }}>
                                    {data.macros.meals.map((meal, i) => (
                                        <div key={i} style={{ background: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{meal.mealType}</div>
                                                {meal.foods.map((f, j) => (
                                                    <div key={j} style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{f.name}</div>
                                                ))}
                                            </div>
                                            <div style={{ fontWeight: 700, color: 'var(--accent-blue)' }}>{meal.totalCalories} kcal</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Water Section */}
                    <div className="stat-card glass" style={{ padding: 24 }}>
                        <h2 style={{ marginBottom: 16, fontSize: '1.1rem' }}>💧 Hydration</h2>
                        <div style={{ marginBottom: 16 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                <span>{data.water.totalWaterMl}ml</span>
                                <span style={{ color: 'var(--text-muted)' }}>{data.water.waterTarget}ml goal</span>
                            </div>
                            <div style={{ background: 'rgba(255,255,255,0.05)', height: 12, borderRadius: 6, overflow: 'hidden' }}>
                                <div 
                                    style={{
                                        width: `${Math.min(100, (data.water.totalWaterMl / data.water.waterTarget) * 100)}%`,
                                        height: '100%',
                                        background: 'var(--accent-blue)',
                                        boxShadow: '0 0 10px rgba(69, 163, 245, 0.4)',
                                        transition: 'width 0.3s'
                                    }}
                                />
                            </div>
                        </div>
                        {data.water.logs && data.water.logs.length > 0 ? (
                            <div>
                                <h3 style={{ marginBottom: 12, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Water Logs ({data.water.logs.length})</h3>
                                <div style={{ display: 'grid', gap: 6, maxHeight: 200, overflowY: 'auto' }}>
                                    {data.water.logs.map((log, i) => (
                                        <div key={i} style={{ fontSize: '0.85rem', background: 'rgba(255,255,255,0.02)', padding: '8px 10px', borderRadius: 6, display: 'flex', justifyContent: 'space-between' }}>
                                            <span>{new Date(log.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            <span style={{ color: 'var(--accent-blue)' }}>+{log.amountMl}ml</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No water logged this day</p>
                        )}
                    </div>
                </div>
            ) : null}
        </div>
    );
}
