import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    Mic, MicOff, Video, VideoOff, 
    Monitor, MonitorOff, Hand, MessageSquare, 
    Users, PhoneOff, Copy, Check, 
    Send, Pin, Shield, CircleDot, StopCircle,
    Smile, Volume2, Info, Bell, Sparkles
} from 'lucide-react';
import { useWebRTCSFU } from '../hooks/useWebRTCSFU';

// Helper to generate consistent vibrant gradients based on username
const getAvatarGradient = (name: string) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const gradients = [
        'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
        'linear-gradient(135deg, #3b82f6 0%, #2dd4bf 100%)',
        'linear-gradient(135deg, #ec4899 0%, #f43f5e 100%)',
        'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)',
        'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
    ];
    return gradients[Math.abs(hash) % gradients.length];
};

// Video Tile Component
const VideoTile: React.FC<{
    stream: MediaStream | null;
    userName: string;
    role?: string;
    isSelf?: boolean;
    isAudioMuted?: boolean;
    isVideoMuted?: boolean;
    isHandRaised?: boolean;
    isScreenSharing?: boolean;
    isSpeaking?: boolean;
    isPinned?: boolean;
    onPin?: () => void;
    onAutoplayBlocked?: () => void;
}> = ({ stream, userName, role, isSelf, isAudioMuted, isVideoMuted, isHandRaised, isScreenSharing, isSpeaking, isPinned, onPin, onAutoplayBlocked }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const audioRef = useRef<HTMLAudioElement>(null);

    useEffect(() => {
        if (videoRef.current) {
            if (stream && stream.getVideoTracks().length > 0) {
                if (videoRef.current.srcObject !== stream) {
                    videoRef.current.srcObject = stream;
                }
                videoRef.current.play().catch(() => {});
            } else {
                videoRef.current.srcObject = null;
            }
        }
    }, [stream, isVideoMuted, isScreenSharing]);

    useEffect(() => {
        if (!isSelf && audioRef.current) {
            if (stream && stream.getAudioTracks().length > 0) {
                if (audioRef.current.srcObject !== stream) {
                    audioRef.current.srcObject = stream;
                }
                audioRef.current.volume = 1.0;
                audioRef.current.play().catch((err) => {
                    console.warn('Remote audio autoplay blocked:', err);
                    onAutoplayBlocked?.();
                });
            } else {
                audioRef.current.srcObject = null;
            }
        }
    }, [stream, isSelf, onAutoplayBlocked]);

    const hasLiveVideoTrack = !!(stream && stream.getVideoTracks().length > 0 && stream.getVideoTracks().some(t => t.readyState === 'live'));
    const showVideo = (isScreenSharing || !isVideoMuted) && hasLiveVideoTrack;
    const avatarBg = getAvatarGradient(userName);

    return (
        <div className={`teams-video-tile ${isSpeaking ? 'active-speaker' : ''} ${isPinned ? 'pinned-tile' : ''} ${isScreenSharing ? 'tile-screen-share' : ''}`}>
            {!isSelf && <audio ref={audioRef} autoPlay playsInline />}

            <video 
                ref={videoRef}
                autoPlay 
                playsInline 
                muted={true} 
                className={`teams-tile-video ${isSelf && !isScreenSharing ? 'mirror' : ''} ${isScreenSharing ? 'screen-share' : ''}`}
                style={{ display: showVideo ? 'block' : 'none' }}
            />

            {!showVideo && (
                <div className="teams-tile-avatar-view">
                    <div className="teams-tile-avatar" style={{ background: avatarBg }}>
                        {userName.charAt(0).toUpperCase()}
                    </div>
                </div>
            )}

            {/* Screen Sharing Floating Badge */}
            {isScreenSharing && (
                <div className="teams-screen-badge" title={`${userName} is sharing their screen`}>
                    <Monitor size={14} /> Screen Share
                </div>
            )}

            {/* Hand Raised Floating Badge */}
            {isHandRaised && (
                <div className="teams-hand-badge" title={`${userName} raised their hand`}>
                    ✋ Hand Raised
                </div>
            )}

            {/* Active speaking wave sound icon */}
            {isSpeaking && (
                <div className="teams-speaking-wave">
                    <Volume2 size={16} color="#60a5fa" />
                </div>
            )}

            {/* Tile Info Overlay */}
            <div className="teams-tile-overlay">
                <div className="teams-tile-user-tag">
                    <span className="teams-tile-mic-icon">
                        {isAudioMuted ? <MicOff size={14} color="#ef4444" /> : <Mic size={14} color="#10b981" />}
                    </span>
                    <span className="teams-tile-name">{userName} {isSelf && '(You)'}</span>
                    {role && <span className="teams-tile-role-tag">{role}</span>}
                </div>

                <div className="teams-tile-actions">
                    {onPin && (
                        <button 
                            className={`teams-tile-btn ${isPinned ? 'active' : ''}`}
                            onClick={onPin}
                            title={isPinned ? 'Unpin' : 'Pin tile'}
                        >
                            <Pin size={14} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export const TeamsMeetingRoom: React.FC = () => {
    const { id: roomIdParam } = useParams<{ id: string }>();
    const roomId = roomIdParam || 'general';
    const navigate = useNavigate();

    const [userId] = useState(() => 'usr_' + Math.random().toString(36).substring(2, 9));
    const [userName] = useState(() => sessionStorage.getItem('teams_display_name') || 'User_' + userId.substring(4, 8));
    const [userRole] = useState(() => sessionStorage.getItem('teams_role') || 'speaker');
    
    // By default camera and mic are OFF
    const initialAudio = sessionStorage.getItem('teams_initial_audio') === 'true';
    const initialVideo = sessionStorage.getItem('teams_initial_video') === 'true';

    const [autoplayBlocked, setAutoplayBlocked] = useState(false);

    const handleUnlockAudio = () => {
        try {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioContextClass) {
                const tempCtx = new AudioContextClass();
                tempCtx.resume().then(() => tempCtx.close()).catch(() => {});
            }
        } catch (e) {}
        document.querySelectorAll('audio').forEach((el) => {
            el.play().catch(() => {});
        });
        setAutoplayBlocked(false);
    };

    useEffect(() => {
        const handleUserGesture = () => {
            handleUnlockAudio();
        };
        window.addEventListener('click', handleUserGesture, { once: true });
        window.addEventListener('touchstart', handleUserGesture, { once: true });
        return () => {
            window.removeEventListener('click', handleUserGesture);
            window.removeEventListener('touchstart', handleUserGesture);
        };
    }, []);

    const {
        connected,
        connecting,
        error,
        localStream,
        remoteStreams,
        participants,
        messages,
        reactions,
        toastMessage,
        isAudioEnabled,
        isVideoEnabled,
        isNoiseSuppression,
        isScreenSharing,
        isHandRaised,
        isRecording,
        recorderName,
        activeSpeakerId,
        toggleAudio,
        toggleVideo,
        toggleNoiseSuppression,
        toggleScreenShare,
        toggleRaiseHand,
        sendReaction,
        startRecording,
        stopRecording,
        sendChatMessage,
        leaveCall
    } = useWebRTCSFU(roomId, userId, userName, initialAudio, initialVideo, userRole);

    // UI state
    const [sidebarTab, setSidebarTab] = useState<'chat' | 'people' | null>(null);
    const [chatInput, setChatInput] = useState('');
    const [showReactionsMenu, setShowReactionsMenu] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [copied, setCopied] = useState(false);
    const [callSeconds, setCallSeconds] = useState(0);
    const [pinnedUserId, setPinnedUserId] = useState<string | null>(null);
    const [unreadChatCount, setUnreadChatCount] = useState(0);

    const chatScrollRef = useRef<HTMLDivElement>(null);

    // Call duration timer
    useEffect(() => {
        const interval = setInterval(() => {
            setCallSeconds(prev => prev + 1);
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    // Scroll chat to bottom on new messages
    useEffect(() => {
        if (chatScrollRef.current) {
            chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
        }
        if (sidebarTab !== 'chat' && messages.length > 0) {
            setUnreadChatCount(prev => prev + 1);
        }
    }, [messages, sidebarTab]);

    const formatTime = (secs: number) => {
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const handleCopyInvite = () => {
        const url = `${window.location.origin}/?room=${encodeURIComponent(roomId)}`;
        navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleSendChat = (e: React.FormEvent) => {
        e.preventDefault();
        if (!chatInput.trim()) return;
        sendChatMessage(chatInput);
        setChatInput('');
        setShowEmojiPicker(false);
    };

    const handleInsertEmoji = (emoji: string) => {
        setChatInput(prev => prev + emoji);
    };

    const handleLeave = () => {
        if (isRecording) {
            stopRecording();
        }
        leaveCall();
        navigate('/');
    };

    const toggleSidebar = (tab: 'chat' | 'people') => {
        if (sidebarTab === tab) {
            setSidebarTab(null);
        } else {
            setSidebarTab(tab);
            if (tab === 'chat') setUnreadChatCount(0);
        }
    };    // Calculate dynamic grid columns
    const totalTiles = 1 + Math.max(participants.length, remoteStreams.size);
    let gridLayoutClass = 'grid-1';
    if (totalTiles === 2) gridLayoutClass = 'grid-2';
    else if (totalTiles <= 4) gridLayoutClass = 'grid-4';
    else if (totalTiles <= 6) gridLayoutClass = 'grid-6';
    else if (totalTiles <= 9) gridLayoutClass = 'grid-9';
    else gridLayoutClass = 'grid-many';

    const reactionEmojis = ['👍', '❤️', '👏', '😂', '🎉', '🔥', '🚀', '😮'];
    const chatEmojis = ['😊', '👍', '❤️', '🔥', '🎉', '👏', '🚀', '🙌', '💯', '✨'];

    return (
        <div className="teams-room-container">
            {/* Flying Reactions Stage Overlay */}
            <div className="teams-reactions-overlay">
                {reactions.map((r) => (
                    <div key={r.id} className="teams-flying-reaction">
                        <span className="reaction-emoji">{r.emoji}</span>
                        <span className="reaction-user">{r.userName}</span>
                    </div>
                ))}
            </div>

            {/* Top Toast Notification */}
            {toastMessage && (
                <div className="teams-toast-notification">
                    <Bell size={16} className="toast-icon" />
                    <span>{toastMessage.text}</span>
                </div>
            )}

            {/* Top Teams Navigation Bar */}
            <header className="teams-room-header">
                <div className="teams-room-meta">
                    <div className="teams-room-badge">
                        <span className="teams-live-dot"></span>
                        <span className="teams-room-title">{roomId}</span>
                    </div>
                    <span className="teams-timer">{formatTime(callSeconds)}</span>

                    {/* Recording Live Badge */}
                    {isRecording && (
                        <div className="teams-recording-badge">
                            <span className="recording-dot"></span>
                            <span>REC {recorderName ? `(${recorderName})` : ''}</span>
                        </div>
                    )}
                </div>

                <div className="teams-room-header-controls">
                    <button className="teams-btn teams-btn-ghost" onClick={handleCopyInvite}>
                        {copied ? <Check size={16} color="#10b981" /> : <Copy size={16} />}
                        <span>{copied ? 'Link Copied!' : 'Copy Meeting Link'}</span>
                    </button>
                    <div className="teams-status-pill">
                        <Shield size={14} color="#10b981" />
                        <span>Pion SFU Connected</span>
                    </div>
                </div>
            </header>

            {/* Notification Banner when Recording is Active */}
            {isRecording && (
                <div className="teams-recording-banner">
                    <CircleDot size={16} color="#ef4444" className="recording-icon-spin" />
                    <span>Recording is active. Meeting audio and video are being captured.</span>
                </div>
            )}

            {/* Audio Autoplay Blocked Banner */}
            {autoplayBlocked && (
                <div 
                    onClick={handleUnlockAudio} 
                    style={{
                        backgroundColor: '#f59e0b',
                        color: '#1e293b',
                        padding: '10px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '10px',
                        fontWeight: 600,
                        fontSize: '0.9rem',
                        cursor: 'pointer',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                        zIndex: 40,
                        transition: 'all 0.2s ease'
                    }}
                >
                    <Volume2 size={18} />
                    <span>⚠️ Audio autoplay blocked by browser. Click here to enable meeting audio.</span>
                </div>
            )}

            {/* Center Call Stage */}
            <div className="teams-stage-layout">
                {/* Main Video Area */}
                <main className="teams-video-stage">
                    {error && (
                        <div className="teams-error-banner">
                            <span>{error}</span>
                        </div>
                    )}

                    {connecting && !connected && (
                        <div className="teams-loading-overlay">
                            <div className="teams-spinner"></div>
                            <p>Connecting to WebRTC SFU Server...</p>
                        </div>
                    )}

                    {(() => {
                        let activeScreenShare: any = null;
                        if (isScreenSharing) {
                            activeScreenShare = {
                                userId,
                                stream: localStream,
                                userName,
                                role: userRole,
                                isSelf: true,
                                isAudioMuted: !isAudioEnabled,
                                isVideoMuted: false,
                                isHandRaised,
                            };
                        } else {
                            const sharingParticipant = participants.find(p => p.isScreenSharing ?? remoteStreams.get(p.userId)?.isScreenSharing ?? false);
                            if (sharingParticipant) {
                                const remote = remoteStreams.get(sharingParticipant.userId);
                                activeScreenShare = {
                                    userId: sharingParticipant.userId,
                                    stream: remote?.stream || null,
                                    userName: sharingParticipant.userName || remote?.userName || `User ${sharingParticipant.userId.slice(0, 5)}`,
                                    role: sharingParticipant.role || remote?.role || 'speaker',
                                    isSelf: false,
                                    isAudioMuted: sharingParticipant.isAudioMuted ?? remote?.isAudioMuted ?? true,
                                    isVideoMuted: false,
                                    isHandRaised: sharingParticipant.isHandRaised ?? remote?.isHandRaised,
                                };
                            } else {
                                for (const [peerId, remote] of remoteStreams.entries()) {
                                    if (remote.isScreenSharing && !participants.some(p => p.userId === peerId)) {
                                        activeScreenShare = {
                                            userId: peerId,
                                            stream: remote.stream,
                                            userName: remote.userName || `User ${peerId.slice(0, 5)}`,
                                            role: remote.role || 'speaker',
                                            isSelf: false,
                                            isAudioMuted: remote.isAudioMuted ?? true,
                                            isVideoMuted: false,
                                            isHandRaised: remote.isHandRaised,
                                        };
                                        break;
                                    }
                                }
                            }
                        }

                        const renderTiles = () => (
                            <>
                                {/* Local User Tile */}
                                {(!activeScreenShare || activeScreenShare.userId !== userId) && (
                                    <VideoTile 
                                        stream={localStream}
                                        userName={userName}
                                        role={userRole}
                                        isSelf={true}
                                        isAudioMuted={!isAudioEnabled}
                                        isVideoMuted={!isVideoEnabled && !isScreenSharing}
                                        isHandRaised={isHandRaised}
                                        isScreenSharing={isScreenSharing}
                                        isSpeaking={activeSpeakerId === userId}
                                        isPinned={pinnedUserId === userId}
                                        onPin={() => setPinnedUserId(pinnedUserId === userId ? null : userId)}
                                    />
                                )}

                                {/* Remote Participants Tiles */}
                                {participants.map((p) => {
                                    if (activeScreenShare && activeScreenShare.userId === p.userId) return null;
                                    const remote = remoteStreams.get(p.userId);
                                    const sharing = p.isScreenSharing ?? remote?.isScreenSharing ?? false;
                                    return (
                                        <VideoTile 
                                            key={p.userId}
                                            stream={remote?.stream || null}
                                            userName={p.userName || remote?.userName || `User ${p.userId.slice(0, 5)}`}
                                            role={p.role || remote?.role || 'speaker'}
                                            isSelf={false}
                                            isAudioMuted={p.isAudioMuted ?? remote?.isAudioMuted ?? false}
                                            isVideoMuted={sharing ? false : (p.isVideoMuted ?? remote?.isVideoMuted ?? false)}
                                            isHandRaised={p.isHandRaised ?? remote?.isHandRaised}
                                            isScreenSharing={sharing}
                                            isSpeaking={activeSpeakerId === p.userId}
                                            isPinned={pinnedUserId === p.userId}
                                            onPin={() => setPinnedUserId(pinnedUserId === p.userId ? null : p.userId)}
                                            onAutoplayBlocked={() => setAutoplayBlocked(true)}
                                        />
                                    );
                                })}

                                {/* Extra fallback for any stream not yet mapped in participants list */}
                                {Array.from(remoteStreams.entries())
                                    .filter(([peerId]) => !participants.some((p) => p.userId === peerId))
                                    .map(([peerId, remote]) => {
                                        if (activeScreenShare && activeScreenShare.userId === peerId) return null;
                                        const sharing = remote.isScreenSharing ?? false;
                                        return (
                                            <VideoTile 
                                                key={peerId}
                                                stream={remote.stream}
                                                userName={remote.userName || `User ${peerId.slice(0, 5)}`}
                                                role={remote.role || 'speaker'}
                                                isSelf={false}
                                                isAudioMuted={remote.isAudioMuted ?? false}
                                                isVideoMuted={sharing ? false : (remote.isVideoMuted ?? false)}
                                                isHandRaised={remote.isHandRaised}
                                                isScreenSharing={sharing}
                                                isSpeaking={activeSpeakerId === peerId}
                                                isPinned={pinnedUserId === peerId}
                                                onPin={() => setPinnedUserId(pinnedUserId === peerId ? null : peerId)}
                                                onAutoplayBlocked={() => setAutoplayBlocked(true)}
                                            />
                                        );
                                    })}
                            </>
                        );

                        if (activeScreenShare) {
                            return (
                                <div className="teams-presentation-layout">
                                    <div className="teams-presentation-main">
                                        <VideoTile 
                                            stream={activeScreenShare.stream}
                                            userName={activeScreenShare.userName}
                                            role={activeScreenShare.role}
                                            isSelf={activeScreenShare.isSelf}
                                            isAudioMuted={activeScreenShare.isAudioMuted}
                                            isVideoMuted={activeScreenShare.isVideoMuted}
                                            isHandRaised={activeScreenShare.isHandRaised}
                                            isScreenSharing={true}
                                            isSpeaking={activeSpeakerId === activeScreenShare.userId}
                                            isPinned={false}
                                            onAutoplayBlocked={() => setAutoplayBlocked(true)}
                                        />
                                    </div>
                                    <div className="teams-presentation-sidebar">
                                        {renderTiles()}
                                    </div>
                                </div>
                            );
                        }

                        return (
                            <div className={`teams-video-grid ${gridLayoutClass}`}>
                                {renderTiles()}
                            </div>
                        );
                    })()}
                </main>

                {/* Collapsible Right Sidebar (Chat / Participants) */}
                {sidebarTab && (
                    <aside className="teams-sidebar">
                        <div className="teams-sidebar-header">
                            <h3>{sidebarTab === 'chat' ? 'In-Meeting Chat' : 'Meeting Participants'}</h3>
                            <button className="teams-btn-close" onClick={() => setSidebarTab(null)}>×</button>
                        </div>

                        {sidebarTab === 'chat' ? (
                            <div className="teams-chat-pane">
                                <div className="teams-chat-messages" ref={chatScrollRef}>
                                    {messages.length === 0 ? (
                                        <div className="teams-chat-empty">
                                            <div className="teams-chat-empty-icon">
                                                <MessageSquare size={36} color="var(--teams-purple-light)" />
                                            </div>
                                            <h4>Start the conversation</h4>
                                            <p>Send messages, links, and emojis to everyone in the room.</p>
                                        </div>
                                    ) : (
                                        messages.map(msg => (
                                            msg.isSystem ? (
                                                <div key={msg.id} className="teams-chat-system-event">
                                                    <Info size={12} />
                                                    <span>{msg.text}</span>
                                                    <span className="system-time">{msg.time}</span>
                                                </div>
                                            ) : (
                                                <div key={msg.id} className={`teams-chat-msg ${msg.isSelf ? 'self' : 'other'}`}>
                                                    <div className="teams-chat-msg-header">
                                                        <div className="chat-avatar" style={{ background: getAvatarGradient(msg.userName) }}>
                                                            {msg.userName.charAt(0).toUpperCase()}
                                                        </div>
                                                        <span className="sender-name">{msg.userName} {msg.isSelf && '(You)'}</span>
                                                        <span className="timestamp">{msg.time}</span>
                                                    </div>
                                                    <div className="teams-chat-bubble">{msg.text}</div>
                                                </div>
                                            )
                                        ))
                                    )}
                                </div>

                                {/* Quick Emoji Bar */}
                                {showEmojiPicker && (
                                    <div className="teams-emoji-quick-bar">
                                        {chatEmojis.map(emoji => (
                                            <button 
                                                key={emoji} 
                                                type="button" 
                                                className="emoji-btn" 
                                                onClick={() => handleInsertEmoji(emoji)}
                                            >
                                                {emoji}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                <form className="teams-chat-input-form" onSubmit={handleSendChat}>
                                    <button 
                                        type="button" 
                                        className={`teams-btn-emoji-toggle ${showEmojiPicker ? 'active' : ''}`}
                                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                        title="Emojis"
                                    >
                                        <Smile size={18} />
                                    </button>
                                    <input 
                                        type="text" 
                                        className="teams-chat-input"
                                        placeholder="Type a message..."
                                        value={chatInput}
                                        onChange={(e) => setChatInput(e.target.value)}
                                    />
                                    <button type="submit" className="teams-btn-send" disabled={!chatInput.trim()}>
                                        <Send size={16} />
                                    </button>
                                </form>
                            </div>
                        ) : (
                            <div className="teams-people-pane">
                                <div className="teams-people-count">
                                    <Users size={16} color="var(--teams-purple-light)" />
                                    <span>{1 + participants.length} People in Meeting</span>
                                </div>

                                <div className="teams-people-list">
                                    {/* Self */}
                                    <div className="teams-person-item self">
                                        <div className="person-avatar" style={{ background: getAvatarGradient(userName) }}>
                                            {userName.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="person-info">
                                            <span className="person-name">{userName} (You)</span>
                                            <span className="person-role">{userRole === 'host' ? 'Organizer' : 'Speaker'}</span>
                                        </div>
                                        <div className="person-status">
                                            {isHandRaised && <span className="hand-icon">✋</span>}
                                            {isAudioEnabled ? <Mic size={16} color="#10b981" /> : <MicOff size={16} color="#ef4444" />}
                                        </div>
                                    </div>

                                    {/* Other Attendees */}
                                    {participants.map(p => (
                                        <div key={p.userId} className="teams-person-item">
                                            <div className="person-avatar" style={{ background: getAvatarGradient(p.userName) }}>
                                                {p.userName.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="person-info">
                                                <span className="person-name">{p.userName}</span>
                                                <span className="person-role">{p.role || 'Attendee'}</span>
                                            </div>
                                            <div className="person-status">
                                                {p.isHandRaised && <span className="hand-icon">✋</span>}
                                                {p.isAudioMuted ? <MicOff size={16} color="#ef4444" /> : <Mic size={16} color="#10b981" />}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </aside>
                )}
            </div>

            {/* Bottom Floating Teams Control Bar */}
            <footer className="teams-control-bar-wrapper">
                {/* Floating Emoji Reactions Popup */}
                {showReactionsMenu && (
                    <div className="teams-reactions-menu" onMouseLeave={() => setShowReactionsMenu(false)}>
                        {reactionEmojis.map(emoji => (
                            <button 
                                key={emoji} 
                                className="reaction-select-btn" 
                                onClick={() => {
                                    sendReaction(emoji);
                                    setShowReactionsMenu(false);
                                }}
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>
                )}

                <div className="teams-control-bar">
                    {/* Audio Toggle */}
                    <button 
                        className={`teams-ctrl-btn ${!isAudioEnabled ? 'danger' : ''}`}
                        onClick={toggleAudio}
                        title={isAudioEnabled ? 'Mute Mic' : 'Unmute Mic'}
                    >
                        {isAudioEnabled ? <Mic size={20} /> : <MicOff size={20} />}
                        <span>{isAudioEnabled ? 'Mute' : 'Unmuted'}</span>
                    </button>

                    {/* Video Toggle */}
                    <button 
                        className={`teams-ctrl-btn ${!isVideoEnabled ? 'danger' : ''}`}
                        onClick={toggleVideo}
                        title={isVideoEnabled ? 'Stop Camera' : 'Start Camera'}
                    >
                        {isVideoEnabled ? <Video size={20} /> : <VideoOff size={20} />}
                        <span>{isVideoEnabled ? 'Camera' : 'Cam Off'}</span>
                    </button>

                    {/* Screen Share */}
                    <button 
                        className={`teams-ctrl-btn ${isScreenSharing ? 'active-share' : ''}`}
                        onClick={toggleScreenShare}
                        title={isScreenSharing ? 'Stop Screen Share' : 'Share Screen'}
                    >
                        {isScreenSharing ? <MonitorOff size={20} /> : <Monitor size={20} />}
                        <span>{isScreenSharing ? 'Stop Share' : 'Share'}</span>
                    </button>

                    {/* Meeting Recording */}
                    <button 
                        className={`teams-ctrl-btn ${isRecording ? 'active-recording' : ''}`}
                        onClick={isRecording ? stopRecording : startRecording}
                        title={isRecording ? 'Stop Recording' : 'Start Recording'}
                    >
                        {isRecording ? <StopCircle size={20} color="#ef4444" /> : <CircleDot size={20} />}
                        <span>{isRecording ? 'Stop Rec' : 'Record'}</span>
                    </button>

                    {/* Reactions Button */}
                    <div className="reaction-btn-wrapper" onMouseEnter={() => setShowReactionsMenu(true)}>
                        <button 
                            className="teams-ctrl-btn"
                            onClick={() => setShowReactionsMenu(!showReactionsMenu)}
                            title="Send Reaction"
                        >
                            <Smile size={20} />
                            <span>React</span>
                        </button>
                    </div>

                    {/* Raise Hand */}
                    <button 
                        className={`teams-ctrl-btn ${isHandRaised ? 'active-hand' : ''}`}
                        onClick={toggleRaiseHand}
                        title={isHandRaised ? 'Lower Hand' : 'Raise Hand'}
                    >
                        <Hand size={20} />
                        <span>{isHandRaised ? 'Lower' : 'Raise'}</span>
                    </button>

                    {/* AI Noise Cancellation */}
                    <button 
                        className={`teams-ctrl-btn ${isNoiseSuppression ? 'active-tab' : ''}`}
                        onClick={toggleNoiseSuppression}
                        title={isNoiseSuppression ? 'Noise Cancellation Active (Click to disable)' : 'Noise Cancellation Disabled (Click to enable)'}
                    >
                        <Sparkles size={20} color={isNoiseSuppression ? '#60a5fa' : '#9ca3af'} />
                        <span>{isNoiseSuppression ? 'Noise AI' : 'Raw Mic'}</span>
                    </button>

                    <div className="teams-ctrl-divider"></div>

                    {/* Chat Drawer Toggle */}
                    <button 
                        className={`teams-ctrl-btn ${sidebarTab === 'chat' ? 'active-tab' : ''}`}
                        onClick={() => toggleSidebar('chat')}
                        title="Chat"
                    >
                        <div className="badge-wrap">
                            <MessageSquare size={20} />
                            {unreadChatCount > 0 && <span className="teams-unread-badge">{unreadChatCount}</span>}
                        </div>
                        <span>Chat</span>
                    </button>

                    {/* People Drawer Toggle */}
                    <button 
                        className={`teams-ctrl-btn ${sidebarTab === 'people' ? 'active-tab' : ''}`}
                        onClick={() => toggleSidebar('people')}
                        title="Participants"
                    >
                        <Users size={20} />
                        <span>People</span>
                    </button>

                    <div className="teams-ctrl-divider"></div>

                    {/* Leave Call */}
                    <button 
                        className="teams-ctrl-btn teams-ctrl-leave"
                        onClick={handleLeave}
                        title="Leave Meeting"
                    >
                        <PhoneOff size={20} />
                        <span>Leave</span>
                    </button>
                </div>
            </footer>
        </div>
    );
};
