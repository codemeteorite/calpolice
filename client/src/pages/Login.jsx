import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../api';

export default function Login() {
    const [form, setForm] = useState({ email: 'demo@calpolice.com', password: 'password123' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!sessionStorage.getItem('auto_logged_in')) {
            sessionStorage.setItem('auto_logged_in', 'true');
            const autoLogin = async () => {
                setLoading(true); setError('');
                try {
                    const res = await API.post('/auth/login', { email: 'demo@calpolice.com', password: 'password123' });
                    login(res.data.user, res.data.token);
                    navigate('/dashboard');
                } catch (err) {
                    setError('Auto-login failed. Please sign in manually.');
                } finally {
                    setLoading(false);
                }
            };
            autoLogin();
        }
    }, [login, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true); setError('');
        try {
            const res = await API.post('/auth/login', form);
            login(res.data.user, res.data.token);
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="auth-logo">
                    <div className="logo-icon">🔥</div>
                    <span className="logo-text">CalPolice</span>
                </div>
                <h1 className="auth-title">Welcome back</h1>
                <p className="auth-subtitle">Sign in to continue tracking your progress</p>

                {error && <div style={{ marginBottom: '16px', padding: '12px 16px', background: 'rgba(255,85,85,0.08)', border: '1px solid rgba(255,85,85,0.2)', borderRadius: '10px', color: '#ff5555', fontSize: '0.87rem' }}>{error}</div>}

                <form className="auth-form" onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Email</label>
                        <input className="form-input" type="email" placeholder="you@example.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
                    </div>
                    <div className="form-group">
                        <label>Password</label>
                        <input className="form-input" type="password" placeholder="••••••••" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
                    </div>
                    <button className="btn-primary" type="submit" disabled={loading} style={{ marginTop: '8px' }}>
                        {loading ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>

                <div className="auth-footer">
                    Don't have an account? <Link to="/signup">Sign up</Link>
                </div>
            </div>
        </div>
    );
}
