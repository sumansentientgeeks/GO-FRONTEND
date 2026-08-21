import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Mic, MicOff, Video, VideoOff, 
    Users, Plus, ArrowRight, Shield, 
    Sparkles, Copy, Check, Settings,
    Radio, Zap, Lock, Headphones
} from 'lucide-react';
import { loginUser, registerUser } from '../api';

const AVATAR_GRADIENTS = [
    'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
    'linear-gradient(135deg, #3b82f6 0%, #2dd4bf 100%)',
    'linear-gradient(135deg, #ec4899 0%, #f43f5e 100%)',
    'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)',
    'linear-gradient(135deg, #10b981 0%, #059669 100%)',
];

export const TeamsLobby: React.FC = () => {
    const navigate = useNavigate();

    const [displayName, setDisplayName] = useState(() => sessionStorage.getItem('teams_display_name') || 'User_' + Math.floor(1000 + Math.random() * 9000));
    const [roomId, setRoomId] = useState(() => {
        const params = new URLSearchParams(window.location.search);
        return params.get('room') || 'teams-general';
    });
    const [userRole, setUserRole] = useState<'speaker' | 'audience'>('speaker');

    // Default: camera and mic are OFF (muted) by default for privacy
    const [isAudioMuted, setIsAudioMuted] = useState(true);
    const [isVideoMuted, setIsVideoMuted] = useState(true);
    const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);
    const [audioLevel, setAudioLevel] = useState<number>(0);
    const [copied, setCopied] = useState(false);
    const [showDeviceSettings, setShowDeviceSettings] = useState(false);

    // Audio/Video devices
    const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
    const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
    const [selectedAudioDevice, setSelectedAudioDevice] = useState('');
    const [selectedVideoDevice, setSelectedVideoDevice] = useState('');

    // Auth modal state
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [isRegisterMode, setIsRegisterMode] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [authError, setAuthError] = useState('');
    const [authLoading, setAuthLoading] = useState(false);

    const videoRef = useRef<HTMLVideoElement>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const animFrameRef = useRef<number | null>(null);

    // Fetch media devices
    useEffect(() => {
        const getDevices = async () => {
            try {
                const devices = await navigator.mediaDevices.enumerateDevices();
                setAudioDevices(devices.filter(d => d.kind === 'audioinput'));
                setVideoDevices(devices.filter(d => d.kind === 'videoinput'));
            } catch (e) {
                console.warn('Could not enumerate devices:', e);
            }
        };
        getDevices();
    }, []);

    // Start local camera preview if user turns it on
    useEffect(() => {
        let stream: MediaStream | null = null;
        let isMounted = true;

        const startPreview = async () => {
            if (isVideoMuted && isAudioMuted) {
                if (previewStream) {
                    previewStream.getTracks().forEach(t => t.stop());
                    setPreviewStream(null);
                }
                setAudioLevel(0);
                return;
            }

            try {
                const constraints: MediaStreamConstraints = {
                    video: !isVideoMuted ? {
                        deviceId: selectedVideoDevice ? { exact: selectedVideoDevice } : undefined,
                        width: { ideal: 1280 },
                        height: { ideal: 720 },
                    } : false,
                    audio: !isAudioMuted ? {
                        deviceId: selectedAudioDevice ? { exact: selectedAudioDevice } : undefined,
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true,
                    } : false,
                };

                stream = await navigator.mediaDevices.getUserMedia(constraints);

                if (!isMounted) {
                    stream.getTracks().forEach(t => t.stop());
                    return;
                }

                setPreviewStream(stream);
                if (videoRef.current && !isVideoMuted) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.play().catch(() => {});
                }

                // Audio level analyzer when mic is unmuted
                if (!isAudioMuted && stream.getAudioTracks().length > 0) {
                    try {
                        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
                        if (AudioCtx) {
                            const ctx = new AudioCtx();
                            const analyser = ctx.createAnalyser();
                            analyser.fftSize = 64;
                            const source = ctx.createMediaStreamSource(stream);
                            source.connect(analyser);

                            audioContextRef.current = ctx;
                            analyserRef.current = analyser;

                            const dataArr = new Uint8Array(analyser.frequencyBinCount);
                            const checkLevel = () => {
                                analyser.getByteFrequencyData(dataArr);
                                let sum = 0;
                                for (let i = 0; i < dataArr.length; i++) sum += dataArr[i];
                                const avg = sum / dataArr.length;
                                setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
                                animFrameRef.current = requestAnimationFrame(checkLevel);
                            };
                            checkLevel();
                        }
                    } catch (e) {
                        console.warn('Audio analyzer error:', e);
                    }
                }
            } catch (e) {
                console.warn('Could not initialize media preview:', e);
            }
        };

        startPreview();

        return () => {
            isMounted = false;
            if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
            if (audioContextRef.current) audioContextRef.current.close().catch(() => {});
            if (stream) stream.getTracks().forEach(t => t.stop());
        };
    }, [isVideoMuted, isAudioMuted, selectedAudioDevice, selectedVideoDevice]);

    const handleToggleVideo = () => {
        setIsVideoMuted(prev => !prev);
    };

    const handleToggleAudio = () => {
        setIsAudioMuted(prev => !prev);
    };

    const [callEngine, setCallEngine] = useState<'livekit' | 'sfu'>('livekit');

    const handleJoinMeeting = (targetRoomId?: string) => {
        const target = (targetRoomId || roomId || 'general').trim();
        const user = displayName.trim() || 'User_' + Math.floor(1000 + Math.random() * 9000);
        
        sessionStorage.setItem('teams_display_name', user);
        sessionStorage.setItem('teams_initial_audio', (!isAudioMuted).toString());
        sessionStorage.setItem('teams_initial_video', (!isVideoMuted).toString());
        sessionStorage.setItem('teams_role', userRole);

        if (previewStream) {
            previewStream.getTracks().forEach(t => t.stop());
        }

        if (callEngine === 'livekit') {
            navigate(`/room/${target}`);
        } else {
            navigate(`/meeting/${target}`);
        }
    };

    const handleCreateNewMeeting = () => {
        const randomId = 'teams-' + Math.random().toString(36).substring(2, 8);
        setRoomId(randomId);
        handleJoinMeeting(randomId);
    };

    const handleCopyInvite = () => {
        const url = `${window.location.origin}/?room=${encodeURIComponent(roomId)}`;
        navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleAuthSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setAuthError('');
        setAuthLoading(true);

        try {
            if (isRegisterMode) {
                await registerUser(displayName, email, password);
            }
            const data = await loginUser(email, password);
            sessionStorage.setItem('api_token', data.token);
            setShowAuthModal(false);
            handleJoinMeeting();
        } catch (err: any) {
            setAuthError(err.message || 'Authentication error');
        } finally {
            setAuthLoading(false);
        }
    };

    const popularRooms = [
        { id: 'teams-general', label: '🚀 General' },
        { id: 'daily-standup', label: '🎯 Standup' },
        { id: 'engineering-sync', label: '💻 Engineering' },
        { id: 'design-review', label: '🎨 Design' },
    ];

    const avatarBg = AVATAR_GRADIENTS[displayName.length % AVATAR_GRADIENTS.length];

    return (
        <div className="modern-lobby-root">
            {/* Ambient Background Glows */}
            <div className="modern-glow-sphere glow-1"></div>
            <div className="modern-glow-sphere glow-2"></div>

            {/* Top Navigation */}
            <header className="modern-lobby-nav">
                <div className="modern-logo">
                    <div className="modern-logo-icon">
                        <Users size={20} color="#ffffff" />
                    </div>
                    <div className="modern-logo-text">
                        <span className="brand-name">Microsoft Teams</span>
                        <span className="brand-badge">Pion SFU Hub</span>
                    </div>
                </div>

                <div className="modern-nav-right">
                    <div className="sfu-status-badge">
                        <span className="pulsing-green-dot"></span>
                        <span>SFU Mesh Online</span>
                    </div>
                    <button className="modern-btn-glass" onClick={() => setShowAuthModal(true)}>
                        <Shield size={15} /> Sign In
                    </button>
                </div>
            </header>

            {/* Main Stage */}
            <main className="modern-lobby-content">
                <div className="modern-lobby-glass-card">
                    {/* Left: Device & Camera Preview Panel */}
                    <div className="modern-preview-pane">
                        <div className="modern-video-box">
                            {!isVideoMuted ? (
                                <video 
                                    ref={videoRef} 
                                    autoPlay 
                                    playsInline 
                                    muted 
                                    className="modern-preview-video"
                                />
                            ) : (
                                <div className="modern-avatar-standby">
                                    <div className="modern-large-avatar" style={{ background: avatarBg }}>
                                        {displayName.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="standby-text">Camera is turned off</span>
                                </div>
                            )}

                            {/* Floating Media Action Pill */}
                            <div className="modern-floating-pill">
                                <button 
                                    className={`modern-pill-btn ${isAudioMuted ? 'muted' : 'active'}`}
                                    onClick={handleToggleAudio}
                                    title={isAudioMuted ? 'Turn on mic' : 'Mute mic'}
                                >
                                    {isAudioMuted ? <MicOff size={18} /> : <Mic size={18} />}
                                </button>
                                <button 
                                    className={`modern-pill-btn ${isVideoMuted ? 'muted' : 'active'}`}
                                    onClick={handleToggleVideo}
                                    title={isVideoMuted ? 'Turn on camera' : 'Turn off camera'}
                                >
                                    {isVideoMuted ? <VideoOff size={18} /> : <Video size={18} />}
                                </button>
                                <button 
                                    className={`modern-pill-btn ${showDeviceSettings ? 'active' : ''}`}
                                    onClick={() => setShowDeviceSettings(!showDeviceSettings)}
                                    title="Device settings"
                                >
                                    <Settings size={18} />
                                </button>
                            </div>

                            {/* Sound Level Wave Meter */}
                            {!isAudioMuted && (
                                <div className="modern-mic-meter" title="Mic input level">
                                    <div className="mic-meter-bar" style={{ width: `${audioLevel}%` }}></div>
                                </div>
                            )}
                        </div>

                        {/* Expandable Device Settings Drawer */}
                        {showDeviceSettings && (
                            <div className="modern-device-drawer">
                                <div className="device-drawer-row">
                                    <label><Headphones size={14} /> Microphone</label>
                                    <select 
                                        value={selectedAudioDevice} 
                                        onChange={(e) => setSelectedAudioDevice(e.target.value)}
                                        className="modern-select"
                                    >
                                        <option value="">Default Microphone</option>
                                        {audioDevices.map(d => (
                                            <option key={d.deviceId} value={d.deviceId}>{d.label || `Mic (${d.deviceId.slice(0, 5)})`}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="device-drawer-row">
                                    <label><Video size={14} /> Camera</label>
                                    <select 
                                        value={selectedVideoDevice} 
                                        onChange={(e) => setSelectedVideoDevice(e.target.value)}
                                        className="modern-select"
                                    >
                                        <option value="">Default Camera</option>
                                        {videoDevices.map(d => (
                                            <option key={d.deviceId} value={d.deviceId}>{d.label || `Camera (${d.deviceId.slice(0, 5)})`}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        )}

                        <div className="modern-preview-footer">
                            <span className="privacy-pill">
                                <Lock size={12} /> Mic & Cam are off by default
                            </span>
                        </div>
                    </div>

                    {/* Right: Join Configuration Panel */}
                    <div className="modern-join-pane">
                        <div className="join-pane-header">
                            <h2>Ready to join?</h2>
                            <p>Configure your display profile and meeting preferences</p>
                        </div>

                        {/* Name Input */}
                        <div className="modern-input-field">
                            <label>Display Name</label>
                            <input 
                                type="text"
                                className="modern-text-input"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                placeholder="Enter your name..."
                            />
                        </div>

                        {/* Meeting Room Input & Link Copy */}
                        <div className="modern-input-field">
                            <label>Meeting ID or Room Name</label>
                            <div className="modern-input-with-action">
                                <input 
                                    type="text"
                                    className="modern-text-input"
                                    value={roomId}
                                    onChange={(e) => setRoomId(e.target.value)}
                                    placeholder="e.g. daily-standup"
                                />
                                <button 
                                    type="button"
                                    className={`modern-copy-btn ${copied ? 'copied' : ''}`}
                                    onClick={handleCopyInvite}
                                    title="Copy meeting link"
                                >
                                    {copied ? <Check size={16} color="#10b981" /> : <Copy size={16} />}
                                    <span>{copied ? 'Copied' : 'Link'}</span>
                                </button>
                            </div>
                        </div>

                        {/* Quick Suggested Rooms */}
                        <div className="suggested-rooms-row">
                            <span className="suggested-label">Quick Join:</span>
                            <div className="suggested-chips">
                                {popularRooms.map(r => (
                                    <button 
                                        key={r.id}
                                        type="button"
                                        className={`suggested-chip ${roomId === r.id ? 'active' : ''}`}
                                        onClick={() => setRoomId(r.id)}
                                    >
                                        {r.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Role Selector */}
                        <div className="role-selector-box">
                            <span className="role-label">Your Role:</span>
                            <div className="role-toggle-group">
                                <button 
                                    type="button"
                                    className={`role-toggle-btn ${userRole === 'speaker' ? 'selected' : ''}`}
                                    onClick={() => setUserRole('speaker')}
                                >
                                    <Radio size={14} /> Speaker / Presenter
                                </button>
                                <button 
                                    type="button"
                                    className={`role-toggle-btn ${userRole === 'audience' ? 'selected' : ''}`}
                                    onClick={() => setUserRole('audience')}
                                >
                                    <Users size={14} /> Audience (1k+ scale)
                                </button>
                            </div>
                        </div>

                        {/* Engine Selector */}
                        <div className="role-selector-box" style={{ marginTop: '0.75rem' }}>
                            <span className="role-label">Meeting Engine:</span>
                            <div className="role-toggle-group">
                                <button 
                                    type="button" 
                                    className={`role-toggle-btn ${callEngine === 'livekit' ? 'selected' : ''}`}
                                    onClick={() => setCallEngine('livekit')}
                                    title="Uses LiveKit Cloud global edge network for guaranteed audio/video"
                                >
                                    <Zap size={14} color="#38bdf8" /> LiveKit Cloud (Recommended)
                                </button>
                                <button 
                                    type="button" 
                                    className={`role-toggle-btn ${callEngine === 'sfu' ? 'selected' : ''}`}
                                    onClick={() => setCallEngine('sfu')}
                                    title="Uses custom Pion SFU WebRTC engine"
                                >
                                    <Radio size={14} /> Pion SFU (Render)
                                </button>
                            </div>
                        </div>

                        {/* CTA Buttons */}
                        <div className="modern-cta-group">
                            <button 
                                type="button" 
                                className="modern-btn-primary"
                                onClick={() => handleJoinMeeting()}
                            >
                                <span>Join Meeting</span>
                                <ArrowRight size={18} />
                            </button>

                            <button 
                                type="button" 
                                className="modern-btn-secondary"
                                onClick={handleCreateNewMeeting}
                            >
                                <Plus size={18} />
                                <span>Create Instant Meeting</span>
                            </button>
                        </div>

                        {/* Features Bar */}
                        <div className="modern-perks-row">
                            <div className="perk-item">
                                <Zap size={14} className="perk-icon" />
                                <span>Go Pion SFU</span>
                            </div>
                            <div className="perk-item">
                                <Sparkles size={14} className="perk-icon" />
                                <span>Multi-user 1000+ Scale</span>
                            </div>
                            <div className="perk-item">
                                <Lock size={14} className="perk-icon" />
                                <span>Opus Audio & VP8</span>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Auth Modal */}
            {showAuthModal && (
                <div className="teams-modal-overlay">
                    <div className="teams-modal-card">
                        <div className="teams-modal-header">
                            <h3>{isRegisterMode ? 'Create Account' : 'Sign In to Teams'}</h3>
                            <button className="teams-btn-close" onClick={() => setShowAuthModal(false)}>×</button>
                        </div>

                        {authError && <div className="teams-error-badge">{authError}</div>}

                        <form onSubmit={handleAuthSubmit}>
                            <div className="teams-form-group">
                                <label>Email Address</label>
                                <input 
                                    type="email" 
                                    className="teams-input"
                                    required 
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="name@company.com"
                                />
                            </div>
                            <div className="teams-form-group">
                                <label>Password</label>
                                <input 
                                    type="password" 
                                    className="teams-input"
                                    required 
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter password"
                                />
                            </div>

                            <button 
                                type="submit" 
                                className="teams-btn teams-btn-primary teams-btn-full"
                                disabled={authLoading}
                                style={{ marginTop: '1.5rem' }}
                            >
                                {authLoading ? 'Signing in...' : (isRegisterMode ? 'Register & Join' : 'Sign In & Join')}
                            </button>
                        </form>

                        <div className="teams-modal-footer">
                            <button 
                                className="teams-btn-link"
                                onClick={() => setIsRegisterMode(!isRegisterMode)}
                            >
                                {isRegisterMode ? 'Already have an account? Sign In' : "Don't have an account? Register"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
