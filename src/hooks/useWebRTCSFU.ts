import { useState, useEffect, useRef, useCallback } from 'react';
import { getSFUSignalingURL } from '../api';

export interface Participant {
    userId: string;
    userName: string;
    role?: string;
    isAudioMuted?: boolean;
    isVideoMuted?: boolean;
    isHandRaised?: boolean;
    isScreenSharing?: boolean;
}

export interface ChatMessage {
    id: string;
    userId: string;
    userName: string;
    text: string;
    time: string;
    isSelf: boolean;
    isSystem?: boolean;
}

export interface FloatingReaction {
    id: string;
    emoji: string;
    userName: string;
}

export interface RemoteParticipantStream {
    userId: string;
    userName: string;
    role?: string;
    stream: MediaStream;
    isHandRaised?: boolean;
    isAudioMuted?: boolean;
    isVideoMuted?: boolean;
    isScreenSharing?: boolean;
}

export const DEFAULT_AUDIO_CONSTRAINTS: MediaTrackConstraints = {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    sampleRate: 48000,
    channelCount: 1,
};

const getRTCConfiguration = (): RTCConfiguration => {
    const iceServers: RTCIceServer[] = [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun.cloudflare.com:3478' },
    ];

    const turnUrl = import.meta.env.VITE_TURN_URL;
    const turnUsername = import.meta.env.VITE_TURN_USERNAME;
    const turnCredential = import.meta.env.VITE_TURN_CREDENTIAL;

    if (turnUrl) {
        const urls = turnUrl.split(',').map((u: string) => u.trim());
        iceServers.push({
            urls,
            username: turnUsername,
            credential: turnCredential,
        });
    } else {
        // Fallback open TURN servers for symmetric NAT traversal in production
        iceServers.push({
            urls: [
                'turn:openrelay.metered.ca:80',
                'turn:openrelay.metered.ca:443',
                'turn:openrelay.metered.ca:443?transport=tcp',
            ],
            username: 'openrelayproject',
            credential: 'openrelayproject',
        });
    }

    return {
        iceServers,
        iceCandidatePoolSize: 10,
        bundlePolicy: 'max-bundle',
        rtcpMuxPolicy: 'require',
    };
};

export const useWebRTCSFU = (
    roomId: string,
    userId: string,
    userName: string,
    initialAudio: boolean = false,
    initialVideo: boolean = false,
    role: string = 'speaker'
) => {
    const [connected, setConnected] = useState(false);
    const [connecting, setConnecting] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [isAudioEnabled, setIsAudioEnabled] = useState(initialAudio);
    const [isVideoEnabled, setIsVideoEnabled] = useState(initialVideo);
    const [isNoiseSuppression, setIsNoiseSuppression] = useState(true);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [isHandRaised, setIsHandRaised] = useState(false);

    // Recording State
    const [isRecording, setIsRecording] = useState(false);
    const [recorderName, setRecorderName] = useState<string | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const recordedChunksRef = useRef<Blob[]>([]);

    // Floating Reactions & Notifications
    const [reactions, setReactions] = useState<FloatingReaction[]>([]);
    const [toastMessage, setToastMessage] = useState<{ id: string; text: string; type?: string } | null>(null);

    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStreams, setRemoteStreams] = useState<Map<string, RemoteParticipantStream>>(new Map());
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [activeSpeakerId, setActiveSpeakerId] = useState<string | null>(null);

    const participantsRef = useRef<Participant[]>([]);
    useEffect(() => {
        participantsRef.current = participants;
    }, [participants]);

    const wsRef = useRef<WebSocket | null>(null);
    const pcRef = useRef<RTCPeerConnection | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const rawCameraStreamRef = useRef<MediaStream | null>(null);
    const cameraVideoTrackRef = useRef<MediaStreamTrack | null>(null);
    const screenStreamRef = useRef<MediaStream | null>(null);
    const videoSenderRef = useRef<RTCRtpSender | null>(null);

    // Audio level analysis for active speaker detection
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);

    const showToast = useCallback((text: string, type: string = 'info') => {
        const id = Math.random().toString(36).substring(2, 9);
        setToastMessage({ id, text, type });
        setTimeout(() => {
            setToastMessage((cur) => (cur?.id === id ? null : cur));
        }, 4000);
    }, []);

    const cleanup = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }

        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }

        if (pcRef.current) {
            pcRef.current.close();
            pcRef.current = null;
        }

        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach((t) => t.stop());
            localStreamRef.current = null;
        }

        if (rawCameraStreamRef.current) {
            rawCameraStreamRef.current.getTracks().forEach((t) => t.stop());
            rawCameraStreamRef.current = null;
        }

        if (screenStreamRef.current) {
            screenStreamRef.current.getTracks().forEach((t) => t.stop());
            screenStreamRef.current = null;
        }

        if (audioContextRef.current) {
            audioContextRef.current.close().catch(() => {});
            audioContextRef.current = null;
        }

        setConnected(false);
        setConnecting(false);
    }, []);

    // Send a message over WebSocket
    const sendWS = useCallback((data: any) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify(data));
        }
    }, []);

    // Connect to SFU WebSocket and start WebRTC
    useEffect(() => {
        if (!roomId || !userId) return;

        let isMounted = true;

        const startCall = async () => {
            try {
                setConnecting(true);
                setError(null);

                // 1. Get user media (mic + webcam)
                let stream: MediaStream;
                try {
                    stream = await navigator.mediaDevices.getUserMedia({
                        audio: DEFAULT_AUDIO_CONSTRAINTS,
                        video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { max: 30 } },
                    });
                } catch (e) {
                    try {
                        stream = await navigator.mediaDevices.getUserMedia({ audio: DEFAULT_AUDIO_CONSTRAINTS });
                    } catch (e2) {
                        try {
                            stream = await navigator.mediaDevices.getUserMedia({ video: true });
                        } catch (e3) {
                            stream = new MediaStream();
                        }
                    }
                }

                if (!isMounted) {
                    stream.getTracks().forEach((t) => t.stop());
                    return;
                }

                // Apply initial mute states
                stream.getAudioTracks().forEach((t) => (t.enabled = initialAudio));
                stream.getVideoTracks().forEach((t) => (t.enabled = initialVideo));

                localStreamRef.current = stream;
                rawCameraStreamRef.current = stream;
                cameraVideoTrackRef.current = stream.getVideoTracks()[0] || null;
                setLocalStream(stream);

                // 2. Setup AudioContext for local voice activity
                try {
                    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
                    if (AudioContextClass && stream.getAudioTracks().length > 0) {
                        const audioCtx = new AudioContextClass();
                        const analyser = audioCtx.createAnalyser();
                        analyser.fftSize = 256;
                        const source = audioCtx.createMediaStreamSource(stream);
                        source.connect(analyser);

                        audioContextRef.current = audioCtx;
                        analyserRef.current = analyser;
                    }
                } catch (e) {
                    console.warn('AudioContext setup error:', e);
                }

                // 3. Initialize RTCPeerConnection with STUN & TURN
                const pc = new RTCPeerConnection(getRTCConfiguration());
                pcRef.current = pc;

                // Add local tracks cleanly to PeerConnection
                const audioTrack = stream.getAudioTracks()[0];
                if (audioTrack) {
                    pc.addTrack(audioTrack, stream);
                } else {
                    try {
                        pc.addTransceiver('audio', { direction: 'sendrecv' });
                    } catch (trErr) {
                        console.warn('addTransceiver audio error:', trErr);
                    }
                }

                const videoTrack = stream.getVideoTracks()[0];
                if (videoTrack) {
                    videoSenderRef.current = pc.addTrack(videoTrack, stream);
                } else {
                    try {
                        const tr = pc.addTransceiver('video', { direction: 'sendrecv' });
                        if (tr.sender) {
                            videoSenderRef.current = tr.sender;
                        }
                    } catch (trErr) {
                        console.warn('addTransceiver video error:', trErr);
                    }
                }

                // Listen for incoming remote tracks forwarded by the SFU
                pc.ontrack = (event) => {
                    const remoteTrack = event.track;
                    const streamOwner = event.streams[0];
                    const rawId = streamOwner ? streamOwner.id : '';
                    const trackOwnerId = (rawId && rawId !== 'default' && rawId.length > 2) ? rawId : remoteTrack.id;

                    const knownParticipant = participantsRef.current.find((p) => p.userId === trackOwnerId);
                    const displayName = knownParticipant?.userName || `User ${trackOwnerId.slice(0, 5)}`;
                    const displayRole = knownParticipant?.role || 'speaker';

                    // Track listener to react immediately to track mute/unmute events
                    remoteTrack.onmute = () => {
                        if (remoteTrack.kind === 'video') {
                            setRemoteStreams((prev) => {
                                const next = new Map(prev);
                                const item = next.get(trackOwnerId);
                                if (item) next.set(trackOwnerId, { ...item, isVideoMuted: true });
                                return next;
                            });
                        }
                    };

                    remoteTrack.onunmute = () => {
                        if (remoteTrack.kind === 'video') {
                            setRemoteStreams((prev) => {
                                const next = new Map(prev);
                                const item = next.get(trackOwnerId);
                                if (item) next.set(trackOwnerId, { ...item, isVideoMuted: false });
                                return next;
                            });
                        }
                    };

                    setRemoteStreams((prev) => {
                        const next = new Map(prev);
                        const existing = next.get(trackOwnerId);

                        if (existing) {
                            const existingTracks = existing.stream.getTracks();
                            const hasTrack = existingTracks.some((t) => t.id === remoteTrack.id);
                            const updatedTracks = hasTrack ? existingTracks : [...existingTracks, remoteTrack];
                            const updatedStream = new MediaStream(updatedTracks);

                            next.set(trackOwnerId, {
                                ...existing,
                                userName: knownParticipant?.userName || existing.userName,
                                role: knownParticipant?.role || existing.role,
                                stream: updatedStream,
                                isVideoMuted: remoteTrack.kind === 'video' ? false : existing.isVideoMuted,
                                isAudioMuted: remoteTrack.kind === 'audio' ? false : existing.isAudioMuted,
                            });
                        } else {
                            const newMediaStream = streamOwner || new MediaStream([remoteTrack]);
                            next.set(trackOwnerId, {
                                userId: trackOwnerId,
                                userName: displayName,
                                role: displayRole,
                                stream: newMediaStream,
                                isAudioMuted: knownParticipant?.isAudioMuted ?? (remoteTrack.kind === 'audio' ? false : undefined),
                                isVideoMuted: knownParticipant?.isVideoMuted ?? (remoteTrack.kind === 'video' ? false : undefined),
                                isHandRaised: knownParticipant?.isHandRaised ?? false,
                                isScreenSharing: knownParticipant?.isScreenSharing ?? false,
                            });
                        }
                        return next;
                    });
                };

                // ICE Candidate handling
                pc.onicecandidate = (event) => {
                    if (event.candidate) {
                        sendWS({
                            type: 'ice_candidate',
                            room_id: roomId,
                            user_id: userId,
                            candidate: event.candidate.toJSON(),
                        });
                    }
                };

                pc.onconnectionstatechange = () => {
                    if (pc.connectionState === 'connected') {
                        setConnected(true);
                        setConnecting(false);
                    } else if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
                        setConnected(false);
                    }
                };

                // 4. Connect WebSocket Signaling
                const wsUrl = getSFUSignalingURL(roomId, userId, userName);
                const ws = new WebSocket(wsUrl);
                wsRef.current = ws;

                ws.onopen = async () => {
                    try {
                        const offer = await pc.createOffer({
                            offerToReceiveAudio: true,
                            offerToReceiveVideo: true,
                        });
                        await pc.setLocalDescription(offer);
                        sendWS({
                            type: 'offer',
                            room_id: roomId,
                            user_id: userId,
                            sdp: {
                                type: offer.type,
                                sdp: offer.sdp,
                            },
                        });

                        // Broadcast initial media states
                        sendWS({
                            type: 'media_state',
                            room_id: roomId,
                            user_id: userId,
                            payload: {
                                isAudioMuted: !initialAudio,
                                isVideoMuted: !initialVideo,
                                isScreenSharing: false,
                            },
                        });
                    } catch (err) {
                        console.error('Error creating offer:', err);
                    }
                };

                ws.onmessage = async (event) => {
                    try {
                        const msg = JSON.parse(event.data);

                        switch (msg.type) {
                            case 'answer':
                                if (msg.sdp && pcRef.current) {
                                    const sdpObj = typeof msg.sdp === 'string' ? JSON.parse(msg.sdp) : msg.sdp;
                                    if (pcRef.current.signalingState === 'have-local-offer') {
                                        await pcRef.current.setRemoteDescription(new RTCSessionDescription({
                                            type: 'answer',
                                            sdp: sdpObj.sdp || sdpObj,
                                        }));
                                    }
                                    setConnected(true);
                                    setConnecting(false);
                                }
                                break;

                            case 'offer':
                                if (msg.sdp && pcRef.current) {
                                    const sdpObj = typeof msg.sdp === 'string' ? JSON.parse(msg.sdp) : msg.sdp;
                                    
                                    // Handle WebRTC Glare / collision with rollback if needed
                                    if (pcRef.current.signalingState === 'have-local-offer') {
                                        await pcRef.current.setLocalDescription({ type: 'rollback' });
                                    }

                                    await pcRef.current.setRemoteDescription(new RTCSessionDescription({
                                        type: 'offer',
                                        sdp: sdpObj.sdp || sdpObj,
                                    }));
                                    const answer = await pcRef.current.createAnswer();
                                    await pcRef.current.setLocalDescription(answer);
                                    sendWS({
                                        type: 'answer',
                                        room_id: roomId,
                                        user_id: userId,
                                        sdp: {
                                            type: answer.type,
                                            sdp: answer.sdp,
                                        },
                                    });
                                }
                                break;

                            case 'ice_candidate':
                                if (msg.candidate && pcRef.current) {
                                    try {
                                        await pcRef.current.addIceCandidate(new RTCIceCandidate(msg.candidate));
                                    } catch (iceErr) {
                                        console.warn('Error adding ICE candidate:', iceErr);
                                    }
                                }
                                break;

                            case 'room_info':
                                if (msg.payload) {
                                    const raw = typeof msg.payload === 'string' ? JSON.parse(msg.payload) : msg.payload;
                                    if (Array.isArray(raw)) {
                                        const list: Participant[] = raw
                                            .filter((p: any) => p.user_id !== userId)
                                            .map((p: any) => ({
                                                userId: p.user_id,
                                                userName: p.user_name || `User ${p.user_id.slice(0, 5)}`,
                                                role: p.role || 'speaker',
                                                isAudioMuted: p.is_audio_muted,
                                                isVideoMuted: p.is_video_muted,
                                                isHandRaised: p.is_hand_raised,
                                                isScreenSharing: p.is_screen_sharing,
                                            }));
                                        setParticipants(list);

                                        setRemoteStreams((prev) => {
                                            const next = new Map(prev);
                                            list.forEach((p) => {
                                                const existing = next.get(p.userId);
                                                if (existing) {
                                                    next.set(p.userId, {
                                                        ...existing,
                                                        userName: p.userName,
                                                        role: p.role,
                                                        isAudioMuted: p.isAudioMuted,
                                                        isVideoMuted: p.isVideoMuted,
                                                        isHandRaised: p.isHandRaised,
                                                        isScreenSharing: p.isScreenSharing,
                                                    });
                                                }
                                            });
                                            return next;
                                        });
                                    }
                                }
                                break;

                            case 'peer_joined':
                                if (msg.user_id === userId) break;
                                showToast(`${msg.user_name || 'A user'} joined the meeting`, 'user_join');
                                
                                let joinedState: any = {};
                                if (msg.payload) {
                                    joinedState = typeof msg.payload === 'string' ? JSON.parse(msg.payload) : msg.payload;
                                }

                                setParticipants((prev) => {
                                    if (prev.some((p) => p.userId === msg.user_id)) {
                                        return prev.map((p) =>
                                            p.userId === msg.user_id
                                                ? {
                                                      ...p,
                                                      userName: msg.user_name || p.userName,
                                                      role: msg.role || p.role,
                                                      isAudioMuted: joinedState.is_audio_muted ?? p.isAudioMuted,
                                                      isVideoMuted: joinedState.is_video_muted ?? p.isVideoMuted,
                                                      isScreenSharing: joinedState.is_screen_sharing ?? p.isScreenSharing,
                                                      isHandRaised: joinedState.is_hand_raised ?? p.isHandRaised,
                                                  }
                                                : p
                                        );
                                    }
                                    return [
                                        ...prev,
                                        {
                                            userId: msg.user_id,
                                            userName: msg.user_name || `User ${msg.user_id.slice(0, 5)}`,
                                            role: msg.role || 'speaker',
                                            isAudioMuted: joinedState.is_audio_muted ?? false,
                                            isVideoMuted: joinedState.is_video_muted ?? false,
                                            isHandRaised: joinedState.is_hand_raised ?? false,
                                            isScreenSharing: joinedState.is_screen_sharing ?? false,
                                        },
                                    ];
                                });

                                setRemoteStreams((prev) => {
                                    const next = new Map(prev);
                                    const existing = next.get(msg.user_id);
                                    if (existing) {
                                        next.set(msg.user_id, {
                                            ...existing,
                                            userName: msg.user_name || existing.userName,
                                            role: msg.role || existing.role,
                                            isAudioMuted: joinedState.is_audio_muted ?? existing.isAudioMuted,
                                            isVideoMuted: joinedState.is_video_muted ?? existing.isVideoMuted,
                                            isScreenSharing: joinedState.is_screen_sharing ?? existing.isScreenSharing,
                                            isHandRaised: joinedState.is_hand_raised ?? existing.isHandRaised,
                                        });
                                    }
                                    return next;
                                });

                                // Add system notification message in chat
                                setMessages((prev) => [
                                    ...prev,
                                    {
                                        id: Math.random().toString(36).substring(2, 9),
                                        userId: 'system',
                                        userName: 'System',
                                        text: `${msg.user_name || 'A participant'} joined the meeting`,
                                        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                                        isSelf: false,
                                        isSystem: true,
                                    },
                                ]);
                                break;

                            case 'peer_left':
                                if (msg.user_id === userId) break;
                                showToast(`${msg.user_name || 'A user'} left the meeting`, 'user_leave');
                                setParticipants((prev) => prev.filter((p) => p.userId !== msg.user_id));
                                setRemoteStreams((prev) => {
                                    const next = new Map(prev);
                                    next.delete(msg.user_id);
                                    return next;
                                });
                                setMessages((prev) => [
                                    ...prev,
                                    {
                                        id: Math.random().toString(36).substring(2, 9),
                                        userId: 'system',
                                        userName: 'System',
                                        text: `${msg.user_name || 'A participant'} left the meeting`,
                                        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                                        isSelf: false,
                                        isSystem: true,
                                    },
                                ]);
                                break;

                            case 'recording_started':
                                setIsRecording(true);
                                setRecorderName(msg.user_name || 'A participant');
                                showToast(`🔴 Meeting recording was started by ${msg.user_name || 'a participant'}`, 'recording');
                                break;

                            case 'recording_stopped':
                                setIsRecording(false);
                                setRecorderName(null);
                                showToast(`⏹️ Meeting recording was stopped`, 'info');
                                break;

                            case 'reaction':
                                if (msg.text) {
                                    const reactionId = Math.random().toString(36).substring(2, 9);
                                    setReactions((prev) => [...prev, { id: reactionId, emoji: msg.text, userName: msg.user_name }]);
                                    setTimeout(() => {
                                        setReactions((prev) => prev.filter((r) => r.id !== reactionId));
                                    }, 3000);
                                }
                                break;

                            case 'chat_message':
                                if (msg.payload) {
                                    const chatData = typeof msg.payload === 'string' ? JSON.parse(msg.payload) : msg.payload;
                                    setMessages((prev) => [
                                        ...prev,
                                        {
                                            id: Math.random().toString(36).substring(2, 9),
                                            userId: chatData.user_id,
                                            userName: chatData.user_name,
                                            text: chatData.text,
                                            time: chatData.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                                            isSelf: chatData.user_id === userId,
                                            isSystem: false,
                                        },
                                    ]);
                                }
                                break;

                            case 'raise_hand':
                                showToast(`✋ ${msg.user_name || 'A user'} raised their hand`, 'hand');
                                setParticipants((prev) =>
                                    prev.map((p) => (p.userId === msg.user_id ? { ...p, isHandRaised: true } : p))
                                );
                                setRemoteStreams((prev) => {
                                    const next = new Map(prev);
                                    const item = next.get(msg.user_id);
                                    if (item) next.set(msg.user_id, { ...item, isHandRaised: true });
                                    return next;
                                });
                                break;

                            case 'lower_hand':
                                setParticipants((prev) =>
                                    prev.map((p) => (p.userId === msg.user_id ? { ...p, isHandRaised: false } : p))
                                );
                                setRemoteStreams((prev) => {
                                    const next = new Map(prev);
                                    const item = next.get(msg.user_id);
                                    if (item) next.set(msg.user_id, { ...item, isHandRaised: false });
                                    return next;
                                });
                                break;

                            case 'media_state':
                                if (msg.payload) {
                                    const st = typeof msg.payload === 'string' ? JSON.parse(msg.payload) : msg.payload;
                                    setParticipants((prev) =>
                                        prev.map((p) =>
                                            p.userId === msg.user_id
                                                ? {
                                                      ...p,
                                                      isAudioMuted: st.isAudioMuted,
                                                      isVideoMuted: st.isVideoMuted,
                                                      isScreenSharing: st.isScreenSharing,
                                                  }
                                                : p
                                        )
                                    );
                                    setRemoteStreams((prev) => {
                                        const next = new Map(prev);
                                        const item = next.get(msg.user_id);
                                        if (item) {
                                            next.set(msg.user_id, {
                                                ...item,
                                                isAudioMuted: st.isAudioMuted,
                                                isVideoMuted: st.isVideoMuted,
                                                isScreenSharing: st.isScreenSharing,
                                            });
                                        }
                                        return next;
                                    });
                                }
                                break;

                            default:
                                break;
                        }
                    } catch (e) {
                        console.error('Error handling WebSocket message:', e);
                    }
                };

                ws.onerror = (e) => {
                    console.error('SFU WebSocket Error:', e);
                    setError('Unable to connect to WebRTC SFU signaling server');
                    setConnecting(false);
                };

                ws.onclose = () => {
                    setConnected(false);
                };
            } catch (err: any) {
                console.error('SFU initialization error:', err);
                setError(err.message || 'Failed to initialize WebRTC call');
                setConnecting(false);
            }
        };

        startCall();

        return () => {
            isMounted = false;
            cleanup();
        };
    }, [roomId, userId, userName, initialAudio, initialVideo, role, cleanup, sendWS, showToast]);

    // Active Speaker Detection Loop
    useEffect(() => {
        if (!analyserRef.current) return;
        const analyser = analyserRef.current;
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        let animId: number;

        const checkSpeaking = () => {
            analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
                sum += dataArray[i];
            }
            const average = sum / dataArray.length;
            if (average > 25 && isAudioEnabled) {
                setActiveSpeakerId(userId);
            } else if (activeSpeakerId === userId) {
                setActiveSpeakerId(null);
            }
            animId = requestAnimationFrame(checkSpeaking);
        };

        animId = requestAnimationFrame(checkSpeaking);
        return () => cancelAnimationFrame(animId);
    }, [isAudioEnabled, userId, activeSpeakerId]);

    // Media Controls
    const toggleAudio = useCallback(async () => {
        const nextState = !isAudioEnabled;
        if (localStreamRef.current) {
            let tracks = localStreamRef.current.getAudioTracks();
            if (tracks.length === 0 && nextState) {
                try {
                    const audioStream = await navigator.mediaDevices.getUserMedia({ audio: DEFAULT_AUDIO_CONSTRAINTS });
                    const newAudioTrack = audioStream.getAudioTracks()[0];
                    if (newAudioTrack) {
                        localStreamRef.current.addTrack(newAudioTrack);
                        if (pcRef.current) {
                            pcRef.current.addTrack(newAudioTrack, localStreamRef.current);
                        }
                        tracks = [newAudioTrack];
                    }
                } catch (e) {
                    console.error('Failed to get microphone track on toggle:', e);
                }
            }
            tracks.forEach((t) => (t.enabled = nextState));
        }
        setIsAudioEnabled(nextState);
        sendWS({
            type: 'media_state',
            room_id: roomId,
            user_id: userId,
            payload: { isAudioMuted: !nextState, isVideoMuted: !isVideoEnabled, isScreenSharing },
        });
    }, [isAudioEnabled, isVideoEnabled, isScreenSharing, roomId, userId, sendWS]);

    const toggleVideo = useCallback(async () => {
        const nextState = !isVideoEnabled;
        if (localStreamRef.current) {
            let tracks = localStreamRef.current.getVideoTracks();
            if (tracks.length === 0 && nextState) {
                try {
                    const camStream = await navigator.mediaDevices.getUserMedia({
                        video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { max: 30 } }
                    });
                    const newVideoTrack = camStream.getVideoTracks()[0];
                    if (newVideoTrack) {
                        localStreamRef.current.addTrack(newVideoTrack);
                        rawCameraStreamRef.current = localStreamRef.current;
                        cameraVideoTrackRef.current = newVideoTrack;
                        if (pcRef.current) {
                            videoSenderRef.current = pcRef.current.addTrack(newVideoTrack, localStreamRef.current);
                        }
                        tracks = [newVideoTrack];
                    }
                } catch (e) {
                    console.error('Failed to get camera track on toggle:', e);
                }
            }
            tracks.forEach((t) => (t.enabled = nextState));
        }
        setIsVideoEnabled(nextState);
        sendWS({
            type: 'media_state',
            room_id: roomId,
            user_id: userId,
            payload: { isAudioMuted: !isAudioEnabled, isVideoMuted: !nextState, isScreenSharing },
        });
    }, [isAudioEnabled, isVideoEnabled, isScreenSharing, roomId, userId, sendWS]);

    const stopScreenShare = useCallback(async () => {
        if (screenStreamRef.current) {
            screenStreamRef.current.getTracks().forEach((t) => t.stop());
            screenStreamRef.current = null;
        }

        const camTrack = cameraVideoTrackRef.current;
        if (videoSenderRef.current) {
            try {
                await videoSenderRef.current.replaceTrack(camTrack && camTrack.readyState === 'live' ? camTrack : null);
            } catch (err) {
                console.warn('Error restoring video track:', err);
            }
        }

        if (rawCameraStreamRef.current) {
            setLocalStream(rawCameraStreamRef.current);
            localStreamRef.current = rawCameraStreamRef.current;
        }

        setIsScreenSharing(false);
        sendWS({
            type: 'media_state',
            room_id: roomId,
            user_id: userId,
            payload: { isAudioMuted: !isAudioEnabled, isVideoMuted: !isVideoEnabled, isScreenSharing: false },
        });
    }, [isAudioEnabled, isVideoEnabled, roomId, userId, sendWS]);

    const toggleScreenShare = useCallback(async () => {
        if (!isScreenSharing) {
            try {
                const screenStream = await navigator.mediaDevices.getDisplayMedia({
                    video: { frameRate: { max: 30 } },
                    audio: true,
                });
                screenStreamRef.current = screenStream;
                setIsScreenSharing(true);

                const screenVideoTrack = screenStream.getVideoTracks()[0];
                if (!screenVideoTrack) return;
                screenVideoTrack.enabled = true;

                let sender = videoSenderRef.current;
                if (!sender && pcRef.current) {
                    const videoTransceiver = pcRef.current.getTransceivers().find(
                        (t) => t.receiver?.track?.kind === 'video' || t.sender?.track?.kind === 'video'
                    );
                    if (videoTransceiver && videoTransceiver.sender) {
                        sender = videoTransceiver.sender;
                        videoSenderRef.current = sender;
                    }
                }

                if (sender) {
                    await sender.replaceTrack(screenVideoTrack);
                } else if (pcRef.current) {
                    const newSender = pcRef.current.addTrack(screenVideoTrack, screenStream);
                    videoSenderRef.current = newSender;
                    const offer = await pcRef.current.createOffer();
                    await pcRef.current.setLocalDescription(offer);
                    sendWS({
                        type: 'offer',
                        room_id: roomId,
                        user_id: userId,
                        sdp: {
                            type: offer.type,
                            sdp: offer.sdp,
                        },
                    });
                }

                // Show screen share in local preview
                const currentAudioTracks = localStreamRef.current ? localStreamRef.current.getAudioTracks() : [];
                const screenAudioTracks = screenStream.getAudioTracks();
                const updatedStream = new MediaStream([
                    ...currentAudioTracks,
                    ...screenAudioTracks,
                    screenVideoTrack,
                ]);
                setLocalStream(updatedStream);

                screenVideoTrack.onended = () => {
                    stopScreenShare();
                };

                sendWS({
                    type: 'media_state',
                    room_id: roomId,
                    user_id: userId,
                    payload: { isAudioMuted: !isAudioEnabled, isVideoMuted: false, isScreenSharing: true },
                });
            } catch (e) {
                console.warn('Screen share cancelled or failed:', e);
                setIsScreenSharing(false);
            }
        } else {
            await stopScreenShare();
        }
    }, [isScreenSharing, isAudioEnabled, isVideoEnabled, roomId, userId, sendWS, stopScreenShare]);

    // Meeting Video Recording
    const startRecording = useCallback(async () => {
        try {
            let recordStream: MediaStream;
            try {
                recordStream = await navigator.mediaDevices.getDisplayMedia({
                    video: { frameRate: { max: 30 } },
                    audio: true,
                });
            } catch (e) {
                recordStream = localStreamRef.current || new MediaStream();
            }

            recordedChunksRef.current = [];
            const mimeType = MediaRecorder.isTypeSupported('video/webm; codecs=vp9,opus')
                ? 'video/webm; codecs=vp9,opus'
                : 'video/webm';

            const recorder = new MediaRecorder(recordStream, { mimeType });

            recorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    recordedChunksRef.current.push(event.data);
                }
            };

            recorder.onstop = () => {
                const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `meeting-${roomId}-${Date.now()}.webm`;
                a.click();
                URL.revokeObjectURL(url);
                setIsRecording(false);
                sendWS({ type: 'recording_stopped', room_id: roomId, user_id: userId, user_name: userName });
            };

            recorder.start(1000);
            mediaRecorderRef.current = recorder;
            setIsRecording(true);
            setRecorderName(userName);

            sendWS({
                type: 'recording_started',
                room_id: roomId,
                user_id: userId,
                user_name: userName,
            });
        } catch (err) {
            console.error('Failed to start recording:', err);
        }
    }, [roomId, userId, userName, sendWS]);

    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }
    }, []);

    const toggleRaiseHand = useCallback(() => {
        const nextState = !isHandRaised;
        setIsHandRaised(nextState);
        sendWS({
            type: nextState ? 'raise_hand' : 'lower_hand',
            room_id: roomId,
            user_id: userId,
            user_name: userName,
        });
    }, [isHandRaised, roomId, userId, userName, sendWS]);

    // Send Flying Emoji Reaction
    const sendReaction = useCallback(
        (emoji: string) => {
            const reactionId = Math.random().toString(36).substring(2, 9);
            setReactions((prev) => [...prev, { id: reactionId, emoji, userName }]);
            setTimeout(() => {
                setReactions((prev) => prev.filter((r) => r.id !== reactionId));
            }, 3000);

            sendWS({
                type: 'reaction',
                room_id: roomId,
                user_id: userId,
                user_name: userName,
                text: emoji,
            });
        },
        [roomId, userId, userName, sendWS]
    );

    const sendChatMessage = useCallback(
        (text: string) => {
            if (!text.trim()) return;
            sendWS({
                type: 'chat_message',
                room_id: roomId,
                user_id: userId,
                user_name: userName,
                text: text.trim(),
            });
        },
        [roomId, userId, userName, sendWS]
    );

    const toggleNoiseSuppression = useCallback(async () => {
        if (localStreamRef.current) {
            const next = !isNoiseSuppression;
            for (const track of localStreamRef.current.getAudioTracks()) {
                try {
                    await track.applyConstraints({
                        echoCancellation: true,
                        noiseSuppression: next,
                        autoGainControl: true,
                    });
                } catch (err) {
                    console.warn('Could not apply noise suppression constraints:', err);
                }
            }
            setIsNoiseSuppression(next);
            showToast(next ? '🛡️ Noise Cancellation Enabled' : '🔇 Noise Cancellation Disabled', 'info');
        }
    }, [isNoiseSuppression, showToast]);

    return {
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
        leaveCall: cleanup,
    };
};
