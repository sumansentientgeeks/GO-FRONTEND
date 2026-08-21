import React, { memo } from 'react';
import { Track } from 'livekit-client';
import { VideoTrack } from '@livekit/components-react';
import { Mic, MicOff, Monitor, Hand } from 'lucide-react';

const AVATAR_GRADIENTS = [
    'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
    'linear-gradient(135deg, #3b82f6 0%, #2dd4bf 100%)',
    'linear-gradient(135deg, #ec4899 0%, #f43f5e 100%)',
    'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)',
    'linear-gradient(135deg, #10b981 0%, #059669 100%)',
];

export const getAvatarColor = (name: string) => {
    return AVATAR_GRADIENTS[(name || '').length % AVATAR_GRADIENTS.length];
};

interface ParticipantTileProps {
    participant: any;
    isPinned?: boolean;
    onPin?: () => void;
}

export const ParticipantTile: React.FC<ParticipantTileProps> = memo(({ participant, isPinned, onPin }) => {
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
});
