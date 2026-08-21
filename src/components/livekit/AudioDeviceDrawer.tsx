import React from 'react';
import { useMediaDeviceSelect } from '@livekit/components-react';
import { Settings, X, Headphones, Mic, Video, Check } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { toggleDeviceSettings } from '../../store/slices/meetingSlice';

export const AudioDeviceDrawer: React.FC = () => {
    const isOpen = useAppSelector((state) => state.meeting.isDeviceSettingsOpen);
    const dispatch = useAppDispatch();

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
                <button onClick={() => dispatch(toggleDeviceSettings())} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
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
