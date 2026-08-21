import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useChat } from '@livekit/components-react';
import { MessageSquare, X, Send } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { toggleChat } from '../../store/slices/meetingSlice';

export const LiveKitChatDrawer: React.FC = () => {
    const isOpen = useAppSelector((state) => state.meeting.isChatOpen);
    const dispatch = useAppDispatch();
    const { chatMessages, send, isSending } = useChat();
    const [text, setText] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [chatMessages, isOpen]);

    const handleSend = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = text.trim();
        if (!trimmed || isSending) return;
        try {
            await send(trimmed);
            setText('');
        } catch (err) {
            console.warn('[LiveKit Chat] Send message error:', err);
        }
    }, [text, isSending, send]);

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
                <button onClick={() => dispatch(toggleChat())} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
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
