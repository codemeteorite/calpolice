import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import API from '../../api';

export default function Feed() {
    const { user } = useAuth();
    const location = useLocation();
    const [posts, setPosts] = useState([]);
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(true);
    const [posting, setPosting] = useState(false);
    const [error, setError] = useState('');

    const fetchPosts = async () => {
        try {
            const res = await API.get('/feed');
            setPosts(res.data);
        } catch (err) {
            console.error('Failed to fetch feed', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPosts();
    }, [location.key]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!content.trim()) return;

        setPosting(true);
        setError('');

        try {
            const res = await API.post('/feed', { content });
            setPosts([res.data, ...posts]);
            setContent('');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to post message');
        } finally {
            setPosting(false);
        }
    };

    const formatDate = (dateString) => {
        const d = new Date(dateString);
        return d.toLocaleDateString() + ' at ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div>
            <div className="page-header">
                <h1>Community Feed 💬</h1>
                <p>Share your progress, tips, or just say hello to other CalPolice members!</p>
            </div>

            <div className="profile-card" style={{ marginBottom: 30 }}>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <textarea
                        className="form-input"
                        placeholder="What's on your mind?"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        rows={3}
                        style={{ resize: 'vertical' }}
                        maxLength={500}
                        required
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.8rem', color: content.length > 450 ? '#ff5555' : 'var(--text-muted)' }}>
                            {content.length}/500
                        </span>
                        <button type="submit" className="btn-primary" disabled={posting || !content.trim()}>
                            {posting ? 'Posting...' : 'Post to Feed'}
                        </button>
                    </div>
                    {error && <div style={{ color: '#ff5555', fontSize: '0.85rem' }}>{error}</div>}
                </form>
            </div>

            {loading ? (
                <div className="loading-spinner"><div className="spinner" /> Loading community posts...</div>
            ) : posts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                    No posts yet. Be the first to start the conversation!
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {posts.map(post => (
                        <div key={post._id} className="profile-card" style={{ padding: '20px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <div className="profile-avatar" style={{ width: 36, height: 36, fontSize: '1rem', background: post.user?._id === user?._id ? 'var(--accent-purple)' : 'var(--bg-lighter)' }}>
                                        {post.user?.name ? post.user.name.charAt(0).toUpperCase() : '?'}
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 600 }}>{post.user?.name || 'Unknown User'}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{formatDate(post.createdAt)}</div>
                                    </div>
                                </div>
                            </div>
                            <div style={{ color: 'var(--text-secondary)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                                {post.content}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
