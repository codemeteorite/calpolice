import React from 'react';
import { PieChart, Pie, ResponsiveContainer } from 'recharts';

const MacrosRing = ({ macros, target }) => {
    return (
        <div className="calorie-ring-wrapper">
            <div className="ring-container" style={{ width: 140, height: 140 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={[
                                { value: macros?.totalCalories || 0, fill: 'var(--accent-green)' },
                                { value: macros?.remaining || 1, fill: 'rgba(255,255,255,0.05)' }
                            ]}
                            cx="50%" cy="50%" innerRadius={55} outerRadius={70}
                            dataKey="value" startAngle={90} endAngle={-270}
                            stroke="none" cornerRadius={10}
                        />
                    </PieChart>
                </ResponsiveContainer>
                <div className="ring-center-text">
                    <span className="kcal">{macros?.totalCalories || 0}</span>
                    <span className="kcal-label">Kcal</span>
                </div>
            </div>

            <div className="ring-stats">
                <div className="ring-stat">
                    <div className="ring-dot" style={{ background: 'var(--accent-green)' }} />
                    <div className="ring-stat-text">
                        <div className="label">Consumed</div>
                        <div className="value">{macros?.totalCalories || 0} kcal</div>
                    </div>
                </div>
                <div className="ring-stat">
                    <div className="ring-dot" style={{ background: 'var(--accent-purple)' }} />
                    <div className="ring-stat-text">
                        <div className="label">Burned</div>
                        <div className="value">{macros?.burned || 0} kcal</div>
                    </div>
                </div>
                <div className="ring-stat">
                    <div className="ring-dot" style={{ background: 'var(--text-muted)' }} />
                    <div className="ring-stat-text">
                        <div className="label">Remaining</div>
                        <div className="value">{macros?.remaining || target} kcal</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default React.memo(MacrosRing);
