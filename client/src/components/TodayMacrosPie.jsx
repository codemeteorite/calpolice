import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const CustomPieTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '10px 14px', borderRadius: '8px', color: '#fff', fontSize: '0.85rem' }}>
                <p style={{ color: data.color, fontWeight: 700 }}>{data.name}: {Math.round(data.value / (data.name === 'Fat' ? 9 : 4))}g</p>
                <p style={{ color: 'var(--text-muted)' }}>{Math.round(data.value)} kcal</p>
            </div>
        );
    }
    return null;
};

const TodayMacrosPie = ({ macros }) => {
    const pieData = useMemo(() => {
        return macros ? [
            { name: 'Protein', value: macros.protein * 4, color: '#f064a1' },
            { name: 'Carbs', value: macros.carbs * 4, color: '#45a3f5' },
            { name: 'Fat', value: macros.fat * 9, color: '#ff7d52' }
        ].filter(d => d.value > 0) : [];
    }, [macros]);

    return (
        <div className="chart-card">
            <h3>Today's Macros</h3>
            <p>Protein, Carbs, and Fat breakdown</p>
            <div style={{ height: 260, marginTop: 20, position: 'relative' }}>
                {pieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Tooltip content={<CustomPieTooltip />} />
                            <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" stroke="var(--bg-card)" strokeWidth={3}>
                                {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                            </Pie>
                        </PieChart>
                    </ResponsiveContainer>
                ) : (
                    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                        No meals logged today yet.
                    </div>
                )}
                {pieData.length > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: -10 }}>
                        {pieData.map(d => (
                            <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: d.color }} />
                                {d.name}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default React.memo(TodayMacrosPie);
