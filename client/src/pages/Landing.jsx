import { Link } from 'react-router-dom';

const features = [
    { icon: '🍽️', title: 'Meal Logging', desc: 'Track every meal with detailed macro breakdowns. Log breakfast, lunch, dinner and snacks effortlessly.' },
    { icon: '🤖', title: 'AI Food Analyzer', desc: 'Just type what you ate in plain language — our Groq AI instantly estimates calories and gives feedback.' },
    { icon: '📊', title: 'Progress Charts', desc: 'Visual weekly bar charts and daily macro pie charts to see exactly how you\'re tracking your goals.' },
    { icon: '🥗', title: 'Smart Food Recs', desc: 'Personalized veg and non-veg food recommendations based on your goal and dietary preferences.' },
    { icon: '🏋️', title: 'Exercise Guide', desc: 'Curated workout videos with YouTube previews. From HIIT to yoga, filtered by your fitness goal.' },
    { icon: '🧬', title: 'Science-Based Target', desc: 'Calorie targets auto-calculated using the Mifflin-St Jeor formula based on your age, weight, and goal.' },
];

export default function Landing() {
    return (
        <div className="landing">
            <nav className="landing-nav">
                <div className="landing-logo">
                    <span>🔥</span> CalPolice
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <Link to="/login"><button className="btn-secondary" style={{ padding: '9px 22px' }}>Log In</button></Link>
                    <Link to="/signup"><button className="btn-primary" style={{ padding: '9px 22px' }}>Get Started</button></Link>
                </div>
            </nav>

            <section className="hero-section">
                <div className="hero-badge">
                    <span>✨</span> AI-Powered Calorie Tracking
                </div>
                <h1 className="hero-title">
                    Take Control of<br />
                    <span className="gradient-text">Your Calories.</span>
                </h1>
                <p className="hero-subtitle">
                    CalPolice helps you log meals, get AI-powered nutritional analysis,
                    track progress with live charts, and reach your fitness goals — all in one place.
                </p>
                <div className="hero-btns">
                    <Link to="/signup"><button className="btn-primary" style={{ fontSize: '1rem', padding: '14px 36px' }}>Start Free →</button></Link>
                    <Link to="/login"><button className="btn-secondary" style={{ fontSize: '1rem', padding: '14px 36px' }}>Sign In</button></Link>
                </div>
            </section>

            <section className="features-section">
                <h2>Everything you need to stay on track</h2>
                <div className="features-grid">
                    {features.map((f, i) => (
                        <div key={i} className="feature-card">
                            <div className="feature-icon">{f.icon}</div>
                            <h3>{f.title}</h3>
                            <p>{f.desc}</p>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}
