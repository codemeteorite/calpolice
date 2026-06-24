import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../api';

const STEPS = ['Personal Info', 'Body Stats', 'Your Goals'];

export default function Signup() {
    const [step, setStep] = useState(0);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const [form, setForm] = useState({
        name: '', email: '', password: '',
        age: '', height: '', weight: '', gender: 'male',
        heartConditions: '', goal: 'lose_weight',
        activityLevel: 'moderate', dietPreference: 'both'
    });

    const set = (field, val) => setForm(f => ({ ...f, [field]: val }));

    const nextStep = () => {
        setError('');
        if (step === 0 && (!form.name || !form.email || !form.password)) return setError('Please fill all fields');
        if (step === 1 && (!form.age || !form.height || !form.weight)) return setError('Please fill all body stats');
        setStep(s => s + 1);
    };

    const handleSubmit = async () => {
        setLoading(true); setError('');
        try {
            const res = await API.post('/auth/signup', form);
            login(res.data.user, res.data.token);
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.message || 'Signup failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card" style={{ maxWidth: 520 }}>
                <div className="auth-logo">
                    <div className="logo-icon">🔥</div>
                    <span className="logo-text">CalPolice</span>
                </div>

                <div className="step-indicator">
                    {STEPS.map((_, i) => (
                        <div key={i} className={`step-dot ${i < step ? 'done' : i === step ? 'active' : 'inactive'}`} />
                    ))}
                </div>

                <h1 className="auth-title">{STEPS[step]}</h1>
                <p className="auth-subtitle" style={{ marginBottom: 22 }}>Step {step + 1} of {STEPS.length}</p>

                {error && <div style={{ marginBottom: '16px', padding: '12px 16px', background: 'rgba(255,85,85,0.08)', border: '1px solid rgba(255,85,85,0.2)', borderRadius: '10px', color: '#ff5555', fontSize: '0.87rem' }}>{error}</div>}

                <div className="auth-form">
                    {step === 0 && (
                        <>
                            <div className="form-group">
                                <label>Full Name</label>
                                <input className="form-input" placeholder="John Doe" value={form.name} onChange={e => set('name', e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label>Email</label>
                                <input className="form-input" type="email" placeholder="you@example.com" value={form.email} onChange={e => set('email', e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label>Password</label>
                                <input className="form-input" type="password" placeholder="Min 6 characters" value={form.password} onChange={e => set('password', e.target.value)} />
                            </div>
                        </>
                    )}

                    {step === 1 && (
                        <>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Age</label>
                                    <input className="form-input" type="number" placeholder="25" value={form.age} onChange={e => set('age', e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label>Gender</label>
                                    <select className="form-input" value={form.gender} onChange={e => set('gender', e.target.value)}>
                                        <option value="male">Male</option>
                                        <option value="female">Female</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Height (cm)</label>
                                    <input className="form-input" type="number" placeholder="175" value={form.height} onChange={e => set('height', e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label>Weight (kg)</label>
                                    <input className="form-input" type="number" placeholder="70" value={form.weight} onChange={e => set('weight', e.target.value)} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Heart Conditions (if any)</label>
                                <input className="form-input" placeholder="e.g. hypertension, arrhythmia, or leave blank" value={form.heartConditions} onChange={e => set('heartConditions', e.target.value)} />
                            </div>
                        </>
                    )}

                    {step === 2 && (
                        <>
                            <div className="form-group">
                                <label>Your Goal</label>
                                <select className="form-input" value={form.goal} onChange={e => set('goal', e.target.value)}>
                                    <option value="lose_weight">🔥 Lose Weight</option>
                                    <option value="gain_weight">💪 Gain Weight / Muscle</option>
                                    <option value="maintain">⚖️ Maintain Weight</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Activity Level</label>
                                <select className="form-input" value={form.activityLevel} onChange={e => set('activityLevel', e.target.value)}>
                                    <option value="sedentary">Sedentary (desk job, no exercise)</option>
                                    <option value="light">Light (1–2 days/week exercise)</option>
                                    <option value="moderate">Moderate (3–5 days/week)</option>
                                    <option value="active">Active (6–7 days/week)</option>
                                    <option value="very_active">Very Active (athlete / physical job)</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Diet Preference</label>
                                <select className="form-input" value={form.dietPreference} onChange={e => set('dietPreference', e.target.value)}>
                                    <option value="veg">🥦 Vegetarian</option>
                                    <option value="non_veg">🍗 Non-Vegetarian</option>
                                    <option value="both">🍽️ Both</option>
                                </select>
                            </div>
                        </>
                    )}

                    <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                        {step > 0 && (
                            <button className="btn-secondary" onClick={() => setStep(s => s - 1)} style={{ flex: 1 }}>← Back</button>
                        )}
                        {step < STEPS.length - 1 ? (
                            <button className="btn-primary" onClick={nextStep} style={{ flex: 2 }}>Continue →</button>
                        ) : (
                            <button className="btn-primary" onClick={handleSubmit} disabled={loading} style={{ flex: 2 }}>
                                {loading ? 'Creating account...' : '🚀 Create Account'}
                            </button>
                        )}
                    </div>
                </div>

                <div className="auth-footer">
                    Already have an account? <Link to="/login">Sign in</Link>
                </div>
            </div>
        </div>
    );
}
