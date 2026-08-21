import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  StartAudio,
  useLocalParticipant,
  useParticipants,
  useMediaDeviceSelect,
  useChat,
  VideoTrack,
} from '@livekit/components-react';
import '@livekit/components-styles';
import { Track } from 'livekit-client';
import { getLiveKitToken } from '../api';
import { 
    Mic, MicOff, Video, VideoOff, 
    Monitor, LogOut, Sparkles, ShieldCheck, 
    Headphones, Settings, Users, MessageSquare,
    Hand, Check, X, Send
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

// Chat Flyout Drawer
const LiveKitChatDrawer: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    const { chatMessages, send, isSending } = useChat();
    const [text, setText] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [chatMessages, isOpen]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = text.trim();
        if (!trimmed || isSending) return;
        try {
            await send(trimmed);
            setText('');
        } catch (err) {
            console.warn('[LiveKit Chat] Send message error:', err);
        }
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'absolute',
            top: '56px',
            right: 0,
            bottom: '76px',
            width: '340px',
            background: 'rgba(15, 23, 42, 0.96)',
            backdropFilter: 'blur(16px)',
            borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 90,
            boxShadow: '-10px 0 30px rgba(0, 0, 0, 0.5)'
        }}>
            {/* Chat Header */}
            <div style={{
                padding: '0.9rem 1.2rem',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
            }}>
                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f8fafc' }}>
                    <MessageSquare size={16} color="#38bdf8" /> Meeting Chat
                </h3>
                <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                    <X size={16} />
                </button>
            </div>

            {/* Message List */}
            <div style={{ flex: 1, padding: '1rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {chatMessages.length === 0 && (
                    <div style={{ textAlign: 'center', color: '#64748b', fontSize: '0.82rem', marginTop: '2rem' }}>
                        No messages yet. Start the conversation!
                    </div>
                )}
                {chatMessages.map((msg, idx) => {
                    const isSelf = msg.from?.isLocal;
                    const senderName = msg.from?.name || msg.from?.identity || 'Anonymous';
                    const timeStr = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                    return (
                        <div 
                            key={idx} 
                            style={{ 
                                display: 'flex', 
                                flexDirection: 'column', 
                                alignItems: isSelf ? 'flex-end' : 'flex-start',
                                maxWidth: '100%' 
                            }}
                        >
                            <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginBottom: '0.2rem', padding: '0 0.2rem' }}>
                                {isSelf ? 'You' : senderName} • {timeStr}
                            </div>
                            <div style={{
                                background: isSelf ? '#5b5fc7' : 'rgba(255, 255, 255, 0.08)',
                                color: '#f8fafc',
                                padding: '0.55rem 0.85rem',
                                borderRadius: isSelf ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                                fontSize: '0.85rem',
                                wordBreak: 'break-word',
                                maxWidth: '85%'
                            }}>
                                {msg.message}
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Composer */}
            <form onSubmit={handleSend} style={{
                padding: '0.75rem 1rem',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                gap: '0.5rem',
                alignItems: 'center'
            }}>
                <input
                    type="text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Type a message..."
                    style={{
                        flex: 1,
                        background: 'rgba(255, 255, 255, 0.06)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        color: '#f8fafc',
                        padding: '0.55rem 0.8rem',
                        borderRadius: '8px',
                        fontSize: '0.84rem',
                        outline: 'none'
                    }}
                />
                <button
                    type="submit"
                    disabled={!text.trim() || isSending}
                    style={{
                        background: '#5b5fc7',
                        border: 'none',
                        color: '#ffffff',
                        width: '36px',
                        height: '36px',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: text.trim() ? 'pointer' : 'not-allowed',
                        opacity: text.trim() ? 1 : 0.5
                    }}
                >
                    <Send size={16} />
                </button>
            </form>
        </div>
    );
};

// Participants List Flyout Drawer
const LiveKitParticipantsDrawer: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    const participants = useParticipants();

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'absolute',
            top: '56px',
            right: 0,
            bottom: '76px',
            width: '320px',
            background: 'rgba(15, 23, 42, 0.96)',
            backdropFilter: 'blur(16px)',
            borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 90,
            boxShadow: '-10px 0 30px rgba(0, 0, 0, 0.5)'
        }}>
            <div style={{
                padding: '0.9rem 1.2rem',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
            }}>
                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f8fafc' }}>
                    <Users size={16} color="#38bdf8" /> Participants ({participants.length})
                </h3>
                <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                    <X size={16} />
                </button>
            </div>

            <div style={{ flex: 1, padding: '0.75rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {participants.map((p: any) => {
                    const name = p.name || p.identity || 'Participant';
                    const isLocal = p.isLocal;
                    const isMuted = !p.isMicrophoneEnabled;
                    const isCam = p.isCameraEnabled;

                    let isHandRaised = false;
                    try {
                        if (p.metadata) {
                            const meta = JSON.parse(p.metadata);
                            isHandRaised = !!meta.isHandRaised;
                        }
                    } catch {}

                    return (
                        <div key={p.identity} style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '0.5rem 0.75rem',
                            background: 'rgba(255, 255, 255, 0.04)',
                            borderRadius: '8px',
                            border: '1px solid rgba(255, 255, 255, 0.06)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                <div style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '50%',
                                    background: getAvatarColor(name),
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.85rem',
                                    fontWeight: 700,
                                    color: '#ffffff'
                                }}>
                                    {name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.82rem', color: '#f8fafc', fontWeight: 500 }}>
                                        {name} {isLocal ? '(You)' : ''}
                                    </div>
                                    {isHandRaised && (
                                        <span style={{ fontSize: '0.7rem', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                                            ✋ Hand Raised
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                {isCam ? <Video size={14} color="#38bdf8" /> : <VideoOff size={14} color="#64748b" />}
                                {isMuted ? <MicOff size={14} color="#f87171" /> : <Mic size={14} color="#34d399" />}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
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

    let isHandRaised = false;
    try {
        if (participant.metadata) {
            const meta = JSON.parse(participant.metadata);
            isHandRaised = !!meta.isHandRaised;
        }
    } catch {}

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
                border: isSpeaking ? '2px solid #5b5fc7' : isHandRaised ? '2px solid #f59e0b' : '1px solid rgba(255, 255, 255, 0.08)',
                boxShadow: isSpeaking ? '0 0 16px rgba(91, 95, 199, 0.45)' : isHandRaised ? '0 0 16px rgba(245, 158, 11, 0.45)' : 'none',
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

            {/* Top Left: Hand Raised Badge */}
            {isHandRaised && (
                <div style={{
                    position: 'absolute',
                    top: '10px',
                    left: '10px',
                    background: 'rgba(245, 158, 11, 0.9)',
                    backdropFilter: 'blur(8px)',
                    color: '#ffffff',
                    padding: '0.25rem 0.55rem',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    zIndex: 10,
                }}>
                    <Hand size={13} /> Hand Raised
                </div>
            )}

            {/* Top Right Badges: Screen Share */}
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
interface ToolbarProps {
    onLeave: () => void;
    onToggleChat: () => void;
    onToggleParticipants: () => void;
    isChatOpen: boolean;
    isParticipantsOpen: boolean;
}

const CustomMeetingToolbar: React.FC<ToolbarProps> = ({ 
    onLeave, 
    onToggleChat, 
    onToggleParticipants, 
    isChatOpen, 
    isParticipantsOpen 
}) => {
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

    const toggleRaiseHand = useCallback(async () => {
        const nextState = !isHandRaised;
        setIsHandRaised(nextState);
        try {
            await localParticipant.setMetadata(JSON.stringify({ isHandRaised: nextState }));
        } catch (e) {
            console.warn('Set metadata error:', e);
        }
    }, [localParticipant, isHandRaised]);

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

            {/* Center Controls: Mic, Cam, Screen, Hand, Headphone, Chat, Participants */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                {/* Microphone Toggle */}
                <button
                    onClick={toggleMic}
                    style={{
                        width: '44px',
                        height: '44px',
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
                    {isMicrophoneEnabled ? <Mic size={19} /> : <MicOff size={19} />}
                </button>

                {/* Camera Toggle */}
                <button
                    onClick={toggleCam}
                    style={{
                        width: '44px',
                        height: '44px',
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
                    {isCameraEnabled ? <Video size={19} /> : <VideoOff size={19} />}
                </button>

                {/* Screen Share */}
                <button
                    onClick={toggleScreen}
                    style={{
                        width: '44px',
                        height: '44px',
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
                    <Monitor size={19} />
                </button>

                {/* Raise Hand Toggle */}
                <button
                    onClick={toggleRaiseHand}
                    style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '50%',
                        background: isHandRaised ? '#f59e0b' : 'rgba(255, 255, 255, 0.08)',
                        border: isHandRaised ? '1px solid #f59e0b' : '1px solid rgba(255, 255, 255, 0.15)',
                        color: isHandRaised ? '#0f172a' : '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                    }}
                    title={isHandRaised ? 'Lower Hand' : 'Raise Hand'}
                >
                    <Hand size={19} />
                </button>

                {/* Headphone & Device Settings Toggle */}
                <button
                    onClick={() => setShowDeviceSettings(prev => !prev)}
                    style={{
                        width: '44px',
                        height: '44px',
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
                    <Headphones size={19} />
                </button>

                {/* Chat Drawer Toggle */}
                <button
                    onClick={onToggleChat}
                    style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '50%',
                        background: isChatOpen ? '#5b5fc7' : 'rgba(255, 255, 255, 0.08)',
                        border: isChatOpen ? '1px solid #5b5fc7' : '1px solid rgba(255, 255, 255, 0.15)',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                    }}
                    title="Meeting Chat"
                >
                    <MessageSquare size={19} />
                </button>

                {/* Participants Drawer Toggle */}
                <button
                    onClick={onToggleParticipants}
                    style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '50%',
                        background: isParticipantsOpen ? '#5b5fc7' : 'rgba(255, 255, 255, 0.08)',
                        border: isParticipantsOpen ? '1px solid #5b5fc7' : '1px solid rgba(255, 255, 255, 0.15)',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                    }}
                    title="Participants List"
                >
                    <Users size={19} />
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
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [isParticipantsOpen, setIsParticipantsOpen] = useState(false);

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
                style={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}
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

                {/* Flyout Drawers: Chat and Participants */}
                <LiveKitChatDrawer 
                    isOpen={isChatOpen} 
                    onClose={() => setIsChatOpen(false)} 
                />
                <LiveKitParticipantsDrawer 
                    isOpen={isParticipantsOpen} 
                    onClose={() => setIsParticipantsOpen(false)} 
                />

                {/* Custom Bottom Control Toolbar */}
                <CustomMeetingToolbar 
                    onLeave={() => navigate('/')} 
                    onToggleChat={() => {
                        setIsChatOpen(prev => !prev);
                        setIsParticipantsOpen(false);
                    }}
                    onToggleParticipants={() => {
                        setIsParticipantsOpen(prev => !prev);
                        setIsChatOpen(false);
                    }}
                    isChatOpen={isChatOpen}
                    isParticipantsOpen={isParticipantsOpen}
                />
            </LiveKitRoom>
        </div>
    );
};
