import React from 'react';
import { ShieldCheck, Users } from 'lucide-react';
import { useParticipants } from '@livekit/components-react';

interface LiveKitHeaderProps {
    roomId: string;
}

export const LiveKitHeader: React.FC<LiveKitHeaderProps> = ({ roomId }) => {
    const participants = useParticipants();

    return (
        <div style={{ 
            height: '56px',
            padding: '0 1.5rem', 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            background: 'rgba(15, 23, 42, 0.88)',
            backdropFilter: 'blur(12px)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            zIndex: 20
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

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#94a3b8', fontSize: '0.8rem' }}>
                <Users size={14} color="#38bdf8" />
                <span>{participants.length} attendee{participants.length !== 1 ? 's' : ''} connected</span>
            </div>
        </div>
    );
};
