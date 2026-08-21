import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocalParticipant } from '@livekit/components-react';
import { 
    Mic, MicOff, Video, VideoOff, 
    Monitor, LogOut, Sparkles, 
    Headphones, Users, MessageSquare, Hand 
} from 'lucide-react';
import { KrispNoiseFilter, isKrispNoiseFilterSupported } from '@livekit/krisp-noise-filter';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { 
    toggleChat, 
    toggleParticipants, 
    toggleDeviceSettings,
    toggleNoiseFilter,
    toggleHandRaise
} from '../../store/slices/meetingSlice';

interface LiveKitToolbarProps {
    onLeave: () => void;
}

export const LiveKitToolbar: React.FC<LiveKitToolbarProps> = ({ onLeave }) => {
    const dispatch = useAppDispatch();
    const isChatOpen = useAppSelector((state) => state.meeting.isChatOpen);
    const isParticipantsOpen = useAppSelector((state) => state.meeting.isParticipantsOpen);
    const isDeviceSettingsOpen = useAppSelector((state) => state.meeting.isDeviceSettingsOpen);
    const isNoiseCancelled = useAppSelector((state) => state.meeting.isNoiseFilterEnabled);
    const isHandRaised = useAppSelector((state) => state.meeting.isHandRaised);

    const {
        isMicrophoneEnabled,
        isCameraEnabled,
        isScreenShareEnabled,
        microphoneTrack,
        localParticipant,
    } = useLocalParticipant();

    const [isKrispSupported, setIsKrispSupported] = useState(false);
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

    const handleToggleHandRaise = useCallback(async () => {
        const nextState = !isHandRaised;
        dispatch(toggleHandRaise());
        try {
            await localParticipant.setMetadata(JSON.stringify({ isHandRaised: nextState }));
        } catch (e) {
            console.warn('Set metadata error:', e);
        }
    }, [localParticipant, isHandRaised, dispatch]);

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
                        onClick={() => dispatch(toggleNoiseFilter())}
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
                    onClick={handleToggleHandRaise}
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
                    onClick={() => dispatch(toggleDeviceSettings())}
                    style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '50%',
                        background: isDeviceSettingsOpen ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                        border: isDeviceSettingsOpen ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.15)',
                        color: showDeviceSettingsColor(isDeviceSettingsOpen),
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
                    onClick={() => dispatch(toggleChat())}
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
                    onClick={() => dispatch(toggleParticipants())}
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
        </div>
    );
};

const showDeviceSettingsColor = (open: boolean) => (open ? '#38bdf8' : '#ffffff');
