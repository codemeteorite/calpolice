import React from 'react';

const WaterTracker = ({ totalWaterMl, waterTarget, handleAddWater }) => {
    return (
        <div className="stat-card glass" style={{ border: '1px solid var(--accent-blue-dim)', padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                <div className="stat-label" style={{ color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.9rem', fontWeight: 600 }}>
                    <span style={{ fontSize: '1.2rem' }}>💧</span> Hydration
                </div>
                <div className="stat-value" style={{ fontSize: '1.1rem', fontWeight: 700 }}>{totalWaterMl} / {waterTarget}ml</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.05)', height: 10, borderRadius: 5, overflow: 'hidden', marginBottom: 20 }}>
                <div style={{
                    width: `${Math.min(100, (totalWaterMl / waterTarget) * 100)}%`,
                    height: '100%',
                    background: 'var(--accent-blue)',
                    boxShadow: '0 0 10px rgba(69, 163, 245, 0.4)',
                    transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
                }} />
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
                <button onClick={() => handleAddWater(250)} className="btn-secondary" style={{ flex: 1, padding: '8px 0', fontSize: '0.85rem' }}>+250ml</button>
                <button onClick={() => handleAddWater(-250)} className="btn-secondary" style={{ flex: 1, padding: '8px 0', fontSize: '0.85rem' }}>-250ml</button>
            </div>
        </div>
    );
};

export default React.memo(WaterTracker);
