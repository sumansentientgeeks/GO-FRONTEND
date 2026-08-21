import React, { useMemo } from 'react';
import { useParticipants } from '@livekit/components-react';
import { ParticipantTile } from './ParticipantTile';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { setPinnedParticipant } from '../../store/slices/meetingSlice';

export const ConferenceGrid: React.FC = () => {
    const participants = useParticipants();
    const dispatch = useAppDispatch();
    const pinnedId = useAppSelector((state) => state.meeting.pinnedParticipantId);

    const count = participants.length;
    const gridClass = useMemo(() => {
        if (count === 1) return 'grid-1';
        if (count === 2) return 'grid-2';
        if (count <= 4) return 'grid-4';
        if (count <= 6) return 'grid-6';
        return 'grid-many';
    }, [count]);

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
                        onPin={() => dispatch(setPinnedParticipant(pinnedId === p.identity ? null : p.identity))}
                    />
                ))}
            </div>
        </div>
    );
};
