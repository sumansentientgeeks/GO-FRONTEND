import React from 'react';
import { useParticipants } from '@livekit/components-react';
import { Users, X, Mic, MicOff, Video, VideoOff } from 'lucide-react';
import { getAvatarColor } from './ParticipantTile';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { toggleParticipants } from '../../store/slices/meetingSlice';

export const LiveKitParticipantsDrawer: React.FC = () => {
    const isOpen = useAppSelector((state) => state.meeting.isParticipantsOpen);
    const dispatch = useAppDispatch();
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
                <button onClick={() => dispatch(toggleParticipants())} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
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
