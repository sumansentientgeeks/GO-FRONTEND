import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
} from '@livekit/components-react';
import '@livekit/components-styles';
import { getLiveKitToken } from '../api';
import { LogOut } from 'lucide-react';

export const VideoRoom = () => {
    const { id: roomId } = useParams<{ id: string }>();
    const navigate = useNavigate();
    
    const [token, setToken] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchToken = async () => {
            try {
                const apiToken = sessionStorage.getItem('api_token');
                if (!apiToken) {
                    navigate('/');
                    return;
                }

                if (!roomId) return;

                const data = await getLiveKitToken(roomId, apiToken);
                setToken(data.token);
            } catch (err: any) {
                setError(err.message || 'Could not connect to room');
            }
        };

        fetchToken();
    }, [roomId, navigate]);

    if (error) {
        return (
            <div className="center-screen">
                <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
                    <h2 style={{ color: 'var(--danger)' }}>Connection Error</h2>
                    <p style={{ marginBottom: '1.5rem' }}>{error}</p>
                    <button className="btn" onClick={() => navigate('/')}>Back to Login</button>
                </div>
            </div>
        );
    }

    if (token === '') {
        return (
            <div className="center-screen">
                <div style={{ color: 'var(--text-secondary)' }}>Getting access token...</div>
            </div>
        );
    }

    // In a real app, this would be injected via environment variables
    const liveKitUrl = 'ws://localhost:7880';

    return (
        <div style={{ height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column' }}>
            <div style={{ 
                padding: '1rem 2rem', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                background: 'rgba(15, 23, 42, 0.8)',
                backdropFilter: 'blur(10px)',
                borderBottom: '1px solid var(--surface-border)',
                zIndex: 10
            }}>
                <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Room: {roomId}</h2>
                <button 
                    className="btn btn-danger" 
                    onClick={() => navigate('/')}
                    style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                >
                    <LogOut size={16} /> Leave Room
                </button>
            </div>

            <LiveKitRoom
                video={true}
                audio={true}
                token={token}
                serverUrl={liveKitUrl}
                data-lk-theme="default"
                style={{ flex: 1 }}
                onDisconnected={() => navigate('/')}
            >
                <VideoConference />
                <RoomAudioRenderer />
            </LiveKitRoom>
        </div>
    );
};
