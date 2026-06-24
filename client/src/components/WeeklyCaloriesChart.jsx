import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

const CustomBarTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '10px 14px', borderRadius: '8px', color: '#fff', fontSize: '0.85rem' }}>
                <p style={{ fontWeight: 700, marginBottom: 8 }}>{label}</p>
                {payload.map((entry, index) => (
                    <p key={index} style={{ color: entry.color, marginBottom: 4 }}>
                        {entry.name === 'calories' ? 'Consumed' : 'Burned'}: {entry.value} kcal
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

const WeeklyCaloriesChart = ({ weekly, target }) => {
    return (
        <div className="chart-card">
            <h3>Weekly Calories</h3>
            <p>Your caloric intake over the last 7 days</p>
            <div style={{ height: 260, marginTop: 20 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weekly} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <XAxis dataKey="label" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip content={<CustomBarTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                        <ReferenceLine y={target} stroke="var(--accent-purple)" strokeDasharray="3 3" />
                        <Bar dataKey="calories" fill="var(--accent-green)" radius={[4, 4, 0, 0]} maxBarSize={32} />
                        <Bar dataKey="caloriesBurned" fill="var(--accent-purple)" radius={[4, 4, 0, 0]} maxBarSize={32} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default React.memo(WeeklyCaloriesChart);
