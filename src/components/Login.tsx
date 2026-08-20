import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginUser, registerUser } from '../api';
import { Video } from 'lucide-react';

export const Login = () => {
    const [email, setEmail] = useState('test@example.com');
    const [password, setPassword] = useState('password123');
    const [username, setUsername] = useState('testuser');
    const [roomId, setRoomId] = useState('general');
    const [isRegister, setIsRegister] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (isRegister) {
                await registerUser(username, email, password);
            }
            const data = await loginUser(email, password);
            const token = data.token;
            sessionStorage.setItem('api_token', token);
            navigate(`/room/${roomId}`);
        } catch (err: any) {
            setError(err.message || `An error occurred during ${isRegister ? 'registration' : 'login'}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="center-screen">
            <div className="glass-panel login-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                    <Video size={32} color="var(--primary)" />
                    <h1 style={{ margin: 0 }}>Join Call</h1>
                </div>

                <p style={{ marginBottom: '1.5rem' }}>{isRegister ? 'Create an account to join rooms.' : 'Authenticate to access secure video rooms.'}</p>

                <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
                    <button
                        className={`btn ${!isRegister ? '' : 'btn-danger'}`}
                        style={{ flex: 1, backgroundColor: !isRegister ? 'var(--primary)' : 'rgba(255,255,255,0.1)' }}
                        onClick={() => { setIsRegister(false); setError(''); }}
                    >
                        Login
                    </button>
                    <button
                        className={`btn ${isRegister ? '' : 'btn-danger'}`}
                        style={{ flex: 1, backgroundColor: isRegister ? 'var(--primary)' : 'rgba(255,255,255,0.1)' }}
                        onClick={() => { setIsRegister(true); setError(''); }}
                    >
                        Register
                    </button>
                </div>

                {error && (
                    <div style={{ padding: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.875rem' }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin}>
                    {isRegister && (
                        <div className="form-group">
                            <label>Username</label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required={isRegister}
                                placeholder="Choose a username"
                            />
                        </div>
                    )}
                    <div className="form-group">
                        <label>Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            placeholder="Enter your email"
                        />
                    </div>

                    <div className="form-group">
                        <label>Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            placeholder="Enter password"
                        />
                    </div>

                    <div className="form-group" style={{ marginTop: '1.5rem' }}>
                        <label>Room ID</label>
                        <input
                            type="text"
                            value={roomId}
                            onChange={(e) => setRoomId(e.target.value)}
                            required
                            placeholder="Room to join"
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn"
                        style={{ width: '100%', marginTop: '1.5rem' }}
                        disabled={loading}
                    >
                        {loading ? 'Connecting...' : (isRegister ? 'Register & Join' : 'Login & Join')}
                    </button>
                </form>
            </div>
        </div>
    );
};
