import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  StartAudio,
} from '@livekit/components-react';
import '@livekit/components-styles';
import { getLiveKitToken } from '../api';
import { LiveKitHeader } from './livekit/LiveKitHeader';
import { ConferenceGrid } from './livekit/ConferenceGrid';
import { LiveKitChatDrawer } from './livekit/LiveKitChatDrawer';
import { LiveKitParticipantsDrawer } from './livekit/LiveKitParticipantsDrawer';
import { AudioDeviceDrawer } from './livekit/AudioDeviceDrawer';
import { LiveKitToolbar } from './livekit/LiveKitToolbar';
import { useAppDispatch } from '../store/hooks';
import { setRoomId as setStoreRoomId, closeAllDrawers } from '../store/slices/meetingSlice';

export const VideoRoom: React.FC = () => {
    const { id: roomId } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    
    const [token, setToken] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (roomId) {
            dispatch(setStoreRoomId(roomId));
        }
        dispatch(closeAllDrawers());
    }, [roomId, dispatch]);

    useEffect(() => {
        const fetchToken = async () => {
            try {
                if (!roomId) return;
                const apiToken = sessionStorage.getItem('api_token') || undefined;
                const displayName = sessionStorage.getItem('teams_display_name') || undefined;

                const data = await getLiveKitToken(roomId, apiToken, displayName);
                setToken(data.token);
            } catch (err: any) {
                setError(err.message || 'Could not connect to room');
            }
        };

        fetchToken();
    }, [roomId]);

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

    const liveKitUrl = import.meta.env.VITE_LIVEKIT_URL || 'wss://mychat-j2vuijbd.livekit.cloud';

    return (
        <div style={{ height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', background: '#0a0d14' }}>
            <LiveKitRoom
                video={true}
                audio={true}
                token={token}
                serverUrl={liveKitUrl}
                data-lk-theme="default"
                style={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}
                connect={true}
                connectOptions={{ autoSubscribe: true }}
                onDisconnected={() => navigate('/')}
            >
                {/* Header */}
                <LiveKitHeader roomId={roomId || 'general'} />

                {/* Adaptive Video Tiles Grid */}
                <ConferenceGrid />

                {/* Audio Engine */}
                <RoomAudioRenderer />
                <StartAudio label="Click anywhere to allow audio playback" />

                {/* Slide-out Drawers */}
                <LiveKitChatDrawer />
                <LiveKitParticipantsDrawer />
                <AudioDeviceDrawer />

                {/* Bottom Meeting Controls */}
                <LiveKitToolbar onLeave={() => navigate('/')} />
            </LiveKitRoom>
        </div>
    );
};
