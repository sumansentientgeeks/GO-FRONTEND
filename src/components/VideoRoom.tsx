import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  StartAudio,
  useLocalParticipant,
  useParticipants,
  useMediaDeviceSelect,
  VideoTrack,
} from '@livekit/components-react';
import '@livekit/components-styles';
import { Track } from 'livekit-client';
import { getLiveKitToken } from '../api';
import { 
    Mic, MicOff, Video, VideoOff, 
    Monitor, LogOut, Sparkles, ShieldCheck, 
    Headphones, Settings,
    Hand, Check, X
} from 'lucide-react';
import { KrispNoiseFilter, isKrispNoiseFilterSupported } from '@livekit/krisp-noise-filter';

const AVATAR_GRADIENTS = [
    'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
    'linear-gradient(135deg, #3b82f6 0%, #2dd4bf 100%)',
    'linear-gradient(135deg, #ec4899 0%, #f43f5e 100%)',
    'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)',
    'linear-gradient(135deg, #10b981 0%, #059669 100%)',
];

const getAvatarColor = (name: string) => {
    return AVATAR_GRADIENTS[(name || '').length % AVATAR_GRADIENTS.length];
};

// Headphone & Audio Device Selector Drawer
const AudioOutputSelector: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    const {
        devices: audioOutputs,
        activeDeviceId: activeOutputId,
        setActiveMediaDevice: setActiveOutput,
    } = useMediaDeviceSelect({ kind: 'audiooutput' });

    const {
        devices: audioInputs,
        activeDeviceId: activeInputId,
        setActiveMediaDevice: setActiveInput,
    } = useMediaDeviceSelect({ kind: 'audioinput' });

    const {
        devices: videoInputs,
        activeDeviceId: activeVideoId,
        setActiveMediaDevice: setActiveVideo,
    } = useMediaDeviceSelect({ kind: 'videoinput' });

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'absolute',
            bottom: '80px',
            right: '20px',
            width: '320px',
            background: 'rgba(15, 23, 42, 0.95)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '12px',
            padding: '1.25rem',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
            zIndex: 100,
            color: '#f8fafc'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Settings size={16} color="#38bdf8" /> Audio & Video Devices
                </h3>
                <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                    <X size={16} />
                </button>
            </div>

            {/* Headphone / Speaker Selection (Audio Output) */}
            <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.35rem' }}>
                    <Headphones size={14} color="#38bdf8" /> Headphone / Speaker (Output)
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', maxHeight: '120px', overflowY: 'auto' }}>
                    {audioOutputs.length === 0 && (
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>System Default Audio Output</div>
                    )}
                    {audioOutputs.map(d => (
                        <button
                            key={d.deviceId}
                            onClick={() => setActiveOutput(d.deviceId)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                background: d.deviceId === activeOutputId ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                                border: d.deviceId === activeOutputId ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.08)',
                                color: d.deviceId === activeOutputId ? '#38bdf8' : '#cbd5e1',
                                padding: '0.4rem 0.6rem',
                                borderRadius: '6px',
                                fontSize: '0.75rem',
                                cursor: 'pointer',
                                textAlign: 'left',
                            }}
                        >
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {d.label || `Speaker (${d.deviceId.slice(0, 5)})`}
                            </span>
                            {d.deviceId === activeOutputId && <Check size={14} color="#38bdf8" />}
                        </button>
                    ))}
                </div>
            </div>

            {/* Microphone Selection */}
            <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.35rem' }}>
                    <Mic size={14} color="#38bdf8" /> Microphone (Input)
                </label>
                <select 
                    value={activeInputId}
                    onChange={(e) => setActiveInput(e.target.value)}
                    style={{
                        width: '100%',
                        padding: '0.45rem',
                        background: 'rgba(255, 255, 255, 0.06)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        color: '#f8fafc',
                        borderRadius: '6px',
                        fontSize: '0.78rem'
                    }}
                >
                    {audioInputs.map(d => (
                        <option key={d.deviceId} value={d.deviceId} style={{ background: '#0f172a' }}>
                            {d.label || `Mic (${d.deviceId.slice(0, 5)})`}
                        </option>
                    ))}
                </select>
            </div>

            {/* Camera Selection */}
            <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.35rem' }}>
                    <Video size={14} color="#38bdf8" /> Camera
                </label>
                <select 
                    value={activeVideoId}
                    onChange={(e) => setActiveVideo(e.target.value)}
                    style={{
                        width: '100%',
                        padding: '0.45rem',
                        background: 'rgba(255, 255, 255, 0.06)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        color: '#f8fafc',
                        borderRadius: '6px',
                        fontSize: '0.78rem'
                    }}
                >
                    {videoInputs.map(d => (
                        <option key={d.deviceId} value={d.deviceId} style={{ background: '#0f172a' }}>
                            {d.label || `Camera (${d.deviceId.slice(0, 5)})`}
                        </option>
                    ))}
                </select>
            </div>
        </div>
    );
};

// Individual Participant Card in Microsoft Teams Style
interface ParticipantTileProps {
    participant: any;
    isPinned?: boolean;
    onPin?: () => void;
}

const ParticipantTile: React.FC<ParticipantTileProps> = ({ participant, isPinned, onPin }) => {
    const isSpeaking = participant.isSpeaking;
    const isLocal = participant.isLocal;
    const isMuted = !participant.isMicrophoneEnabled;
    const isCameraEnabled = participant.isCameraEnabled;
    const isScreenSharing = participant.isScreenShareEnabled;

    const cameraPub = participant.getTrackPublication(Track.Source.Camera);
    const screenPub = participant.getTrackPublication(Track.Source.ScreenShare);

    const displayName = participant.name || participant.identity || (isLocal ? 'You' : 'Participant');
    const avatarBg = getAvatarColor(displayName);

    return (
        <div 
            className={`teams-video-tile ${isSpeaking ? 'active-speaker' : ''} ${isPinned ? 'pinned-tile' : ''} ${isScreenSharing ? 'tile-screen-share' : ''}`}
            onClick={onPin}
            style={{
                position: 'relative',
                width: '100%',
                height: '100%',
                minHeight: '200px',
                background: '#1f1f23',
                borderRadius: '10px',
                overflow: 'hidden',
                cursor: onPin ? 'pointer' : 'default',
                border: isSpeaking ? '2px solid #5b5fc7' : '1px solid rgba(255, 255, 255, 0.08)',
                boxShadow: isSpeaking ? '0 0 16px rgba(91, 95, 199, 0.45)' : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
            }}
        >
            {/* Live Video / Screen Share View */}
            {isScreenSharing && screenPub && screenPub.track ? (
                <VideoTrack
                    trackRef={{ participant, source: Track.Source.ScreenShare, publication: screenPub }}
                    style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                    }}
                />
            ) : isCameraEnabled && cameraPub && cameraPub.track ? (
                <VideoTrack
                    trackRef={{ participant, source: Track.Source.Camera, publication: cameraPub }}
                    style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        transform: isLocal ? 'scaleX(-1)' : 'none',
                    }}
                />
            ) : (
                /* Teams Avatar Circle View when Camera is OFF */
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.75rem',
                    width: '100%',
                    height: '100%',
                    background: 'radial-gradient(circle at 50% 40%, #26252b 0%, #151419 100%)',
                }}>
                    <div style={{
                        width: '84px',
                        height: '84px',
                        borderRadius: '50%',
                        background: avatarBg,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '2rem',
                        fontWeight: 700,
                        color: '#ffffff',
                        boxShadow: isSpeaking ? '0 0 0 4px #5b5fc7, 0 4px 20px rgba(0,0,0,0.5)' : '0 4px 16px rgba(0,0,0,0.4)',
                        transition: 'all 0.2s ease',
                    }}>
                        {displayName.charAt(0).toUpperCase()}
                    </div>
                </div>
            )}

            {/* Top Right Badges: Screen Share or Hand */}
            <div style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                zIndex: 10
            }}>
                {isScreenSharing && (
                    <div style={{
                        background: 'rgba(59, 130, 246, 0.85)',
                        backdropFilter: 'blur(8px)',
                        color: '#ffffff',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '6px',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem'
                    }}>
                        <Monitor size={12} /> Presenting
                    </div>
                )}
            </div>

            {/* Bottom Left: Participant Name Tag & Mic Status */}
            <div style={{
                position: 'absolute',
                bottom: '10px',
                left: '10px',
                background: 'rgba(24, 24, 28, 0.85)',
                backdropFilter: 'blur(10px)',
                padding: '0.3rem 0.65rem',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                fontSize: '0.8rem',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                zIndex: 10
            }}>
                <span style={{ fontWeight: 500, maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {displayName} {isLocal ? '(You)' : ''}
                </span>

                {isMuted ? (
                    <span title="Muted" style={{ display: 'inline-flex', alignItems: 'center' }}>
                        <MicOff size={13} color="#f87171" />
                    </span>
                ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                        <Mic size={13} color="#34d399" />
                        {isSpeaking && (
                            <span style={{
                                width: '6px',
                                height: '6px',
                                borderRadius: '50%',
                                background: '#38bdf8',
                                display: 'inline-block',
                                animation: 'pulseDot 1s infinite'
                            }} />
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

// Custom Video Grid for All Participants
const CustomLiveKitConference: React.FC = () => {
    const participants = useParticipants();
    const [pinnedId, setPinnedId] = useState<string | null>(null);

    const count = participants.length;
    const gridClass = count === 1 ? 'grid-1' : count === 2 ? 'grid-2' : count <= 4 ? 'grid-4' : count <= 6 ? 'grid-6' : 'grid-many';

    return (
        <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            background: '#111014',
            overflow: 'hidden',
            position: 'relative'
        }}>
            <div 
                className={`teams-video-grid ${gridClass}`}
                style={{
                    display: 'grid',
                    gap: '0.75rem',
                    width: '100%',
                    height: '100%',
                    maxHeight: 'calc(100vh - 140px)',
                    gridTemplateColumns: count === 1 ? '1fr' : count === 2 ? 'repeat(2, 1fr)' : count <= 4 ? 'repeat(2, 1fr)' : count <= 6 ? 'repeat(3, 1fr)' : 'repeat(auto-fit, minmax(280px, 1fr))',
                    gridTemplateRows: count <= 2 ? '1fr' : count <= 4 ? 'repeat(2, 1fr)' : count <= 6 ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(200px, 1fr))',
                }}
            >
                {participants.map((p: any) => (
                    <ParticipantTile 
                        key={p.identity} 
                        participant={p} 
                        isPinned={pinnedId === p.identity}
                        onPin={() => setPinnedId(prev => prev === p.identity ? null : p.identity)}
                    />
                ))}
            </div>
        </div>
    );
};

// Custom Bottom Meeting Control Toolbar
const CustomMeetingToolbar: React.FC<{ onLeave: () => void }> = ({ onLeave }) => {
    const {
        isMicrophoneEnabled,
        isCameraEnabled,
        isScreenShareEnabled,
        microphoneTrack,
        localParticipant,
    } = useLocalParticipant();

    const [isNoiseCancelled, setIsNoiseCancelled] = useState(true);
    const [isKrispSupported, setIsKrispSupported] = useState(false);
    const [showDeviceSettings, setShowDeviceSettings] = useState(false);
    const [isHandRaised, setIsHandRaised] = useState(false);
    const krispProcessorRef = useRef<any>(null);

    // Initialize Krisp
    useEffect(() => {
        const supported = isKrispNoiseFilterSupported();
        setIsKrispSupported(supported);
        if (supported) {
            try {
                krispProcessorRef.current = KrispNoiseFilter();
            } catch (e) {
                console.warn('Krisp init error:', e);
            }
        }
    }, []);

    // Toggle Krisp Processor on mic track
    useEffect(() => {
        if (!microphoneTrack?.track || !isKrispSupported || !krispProcessorRef.current) return;
        const track = microphoneTrack.track as any;
        if (isNoiseCancelled && isMicrophoneEnabled) {
            track.setProcessor(krispProcessorRef.current).catch((err: any) => console.warn('Krisp enable err:', err));
        } else {
            track.stopProcessor?.().catch((err: any) => console.warn('Krisp disable err:', err));
        }
    }, [microphoneTrack, isNoiseCancelled, isMicrophoneEnabled, isKrispSupported]);

    const toggleMic = useCallback(async () => {
        await localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled);
    }, [localParticipant, isMicrophoneEnabled]);

    const toggleCam = useCallback(async () => {
        await localParticipant.setCameraEnabled(!isCameraEnabled);
    }, [localParticipant, isCameraEnabled]);

    const toggleScreen = useCallback(async () => {
        await localParticipant.setScreenShareEnabled(!isScreenShareEnabled);
    }, [localParticipant, isScreenShareEnabled]);

    return (
        <div style={{
            height: '76px',
            background: 'rgba(15, 23, 42, 0.92)',
            backdropFilter: 'blur(16px)',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 1.5rem',
            zIndex: 50,
            position: 'relative'
        }}>
            {/* Left Tools: AI Noise Cancellation Badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {isKrispSupported && (
                    <button
                        onClick={() => setIsNoiseCancelled(prev => !prev)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            padding: '0.45rem 0.85rem',
                            background: isNoiseCancelled ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255, 255, 255, 0.06)',
                            border: isNoiseCancelled ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid rgba(255, 255, 255, 0.12)',
                            color: isNoiseCancelled ? '#38bdf8' : '#94a3b8',
                            borderRadius: '8px',
                            fontSize: '0.8rem',
                            cursor: 'pointer'
                        }}
                        title="LiveKit AI Noise Suppression"
                    >
                        <Sparkles size={15} color={isNoiseCancelled ? '#38bdf8' : '#94a3b8'} />
                        <span>AI Noise Filter: {isNoiseCancelled ? 'ON' : 'OFF'}</span>
                    </button>
                )}
            </div>

            {/* Center Controls: Mic, Cam, Screen, Hand */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {/* Microphone Toggle */}
                <button
                    onClick={toggleMic}
                    style={{
                        width: '46px',
                        height: '46px',
                        borderRadius: '50%',
                        background: isMicrophoneEnabled ? 'rgba(255, 255, 255, 0.08)' : '#ef4444',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                    }}
                    title={isMicrophoneEnabled ? 'Mute Microphone' : 'Unmute Microphone'}
                >
                    {isMicrophoneEnabled ? <Mic size={20} /> : <MicOff size={20} />}
                </button>

                {/* Camera Toggle */}
                <button
                    onClick={toggleCam}
                    style={{
                        width: '46px',
                        height: '46px',
                        borderRadius: '50%',
                        background: isCameraEnabled ? 'rgba(255, 255, 255, 0.08)' : '#ef4444',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                    }}
                    title={isCameraEnabled ? 'Turn Off Camera' : 'Turn On Camera'}
                >
                    {isCameraEnabled ? <Video size={20} /> : <VideoOff size={20} />}
                </button>

                {/* Screen Share */}
                <button
                    onClick={toggleScreen}
                    style={{
                        width: '46px',
                        height: '46px',
                        borderRadius: '50%',
                        background: isScreenShareEnabled ? '#38bdf8' : 'rgba(255, 255, 255, 0.08)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        color: isScreenShareEnabled ? '#0f172a' : '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                    }}
                    title={isScreenShareEnabled ? 'Stop Screen Share' : 'Share Screen'}
                >
                    <Monitor size={20} />
                </button>

                {/* Raise Hand */}
                <button
                    onClick={() => setIsHandRaised(prev => !prev)}
                    style={{
                        width: '46px',
                        height: '46px',
                        borderRadius: '50%',
                        background: isHandRaised ? '#f59e0b' : 'rgba(255, 255, 255, 0.08)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        color: isHandRaised ? '#0f172a' : '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                    }}
                    title="Raise Hand"
                >
                    <Hand size={20} />
                </button>

                {/* Headphone & Device Settings Drawer Toggle */}
                <button
                    onClick={() => setShowDeviceSettings(prev => !prev)}
                    style={{
                        width: '46px',
                        height: '46px',
                        borderRadius: '50%',
                        background: showDeviceSettings ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                        border: showDeviceSettings ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.15)',
                        color: showDeviceSettings ? '#38bdf8' : '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                    }}
                    title="Headphone & Device Settings"
                >
                    <Headphones size={20} />
                </button>
            </div>

            {/* Right Controls: Leave Meeting */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <button
                    onClick={onLeave}
                    style={{
                        background: '#dc2626',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '0.55rem 1.2rem',
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        cursor: 'pointer',
                        transition: 'background 0.2s ease'
                    }}
                >
                    <LogOut size={16} /> Leave
                </button>
            </div>

            {/* Expandable Audio Output / Headphone Settings Panel */}
            <AudioOutputSelector 
                isOpen={showDeviceSettings} 
                onClose={() => setShowDeviceSettings(false)} 
            />
        </div>
    );
};

export const VideoRoom = () => {
    const { id: roomId } = useParams<{ id: string }>();
    const navigate = useNavigate();
    
    const [token, setToken] = useState('');
    const [error, setError] = useState('');

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

    const liveKitUrl = import.meta.env.VITE_LIVEKIT_URL || 'wss://mychat-j2vuijbd.livekit.cloud';

    return (
        <div style={{ height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', background: '#0a0d14' }}>
            <LiveKitRoom
                video={true}
                audio={true}
                token={token}
                serverUrl={liveKitUrl}
                data-lk-theme="default"
                style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
                connect={true}
                connectOptions={{ autoSubscribe: true }}
                onDisconnected={() => navigate('/')}
            >
                {/* Custom Header */}
                <div style={{ 
                    padding: '0.75rem 1.5rem', 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    background: 'rgba(15, 23, 42, 0.85)',
                    backdropFilter: 'blur(12px)',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                    zIndex: 10
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            background: 'rgba(16, 185, 129, 0.12)',
                            color: '#10b981',
                            padding: '0.25rem 0.6rem',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                        }}>
                            <ShieldCheck size={14} /> LiveKit Cloud HD
                        </div>
                        <h2 style={{ margin: 0, fontSize: '1.05rem', color: '#f8fafc', fontWeight: 600 }}>
                            Room: {roomId}
                        </h2>
                    </div>
                </div>

                {/* Custom Video Tiles Grid */}
                <CustomLiveKitConference />

                {/* Room Audio Renderer & Autoplay Unlock */}
                <RoomAudioRenderer />
                <StartAudio label="Click anywhere to allow audio playback" />

                {/* Custom Bottom Control Toolbar with Headphone / Audio Output Switcher */}
                <CustomMeetingToolbar onLeave={() => navigate('/')} />
            </LiveKitRoom>
        </div>
    );
};
