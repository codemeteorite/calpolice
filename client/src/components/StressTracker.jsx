import React from 'react';

const StressTracker = ({ stressLevel, handleUpdateStress }) => {
    return (
        <div className="stat-card glass" style={{ border: '1px solid var(--accent-orange-dim)', padding: 24 }}>
            <div className="stat-label" style={{ color: 'var(--accent-orange)', display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.9rem', fontWeight: 600, marginBottom: 15 }}>
                <span style={{ fontSize: '1.2rem' }}>🧠</span> Stress & Cortisol
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                {[
                    { l: 2, e: '😊', t: 'Calm' },
                    { l: 4, e: '😐', t: 'Steady' },
                    { l: 6, e: '😟', t: 'Tense' },
                    { l: 8, e: '😫', t: 'Stressed' },
                    { l: 10, e: '🌋', t: 'Burnout' }
                ].map(s => (
                    <button
                        key={s.l}
                        onClick={() => handleUpdateStress(s.l)}
                        title={s.t}
                        style={{
                            background: stressLevel === s.l ? 'var(--accent-orange-dim)' : 'transparent',
                            border: stressLevel === s.l ? '1px solid var(--accent-orange)' : '1px solid transparent',
                            fontSize: '1.6rem', borderRadius: 12, cursor: 'pointer', padding: '4px 8px',
                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                            transform: stressLevel === s.l ? 'scale(1.1)' : 'scale(1)'
                        }}
                    >
                        {s.e}
                    </button>
                ))}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center', fontWeight: 500 }}>
                {stressLevel === 0 ? 'How is your energy today?' : `Status: ${[
                    { l: 2, t: 'Calm & Balanced' }, { l: 4, t: 'Steady & Focused' },
                    { l: 6, t: 'Mildly Tense' }, { l: 8, t: 'High Stress' }, { l: 10, t: 'Cortisol Peak / Burnout' }
                ].find(x => x.l === stressLevel)?.t}`}
            </div>
        </div>
    );
};

export default React.memo(StressTracker);
