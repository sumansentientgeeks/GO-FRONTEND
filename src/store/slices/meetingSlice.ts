import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type CallEngine = 'livekit' | 'sfu';
export type UserRole = 'speaker' | 'audience';

interface MeetingState {
    roomId: string;
    engine: CallEngine;
    userRole: UserRole;
    isAudioMuted: boolean;
    isVideoMuted: boolean;
    isScreenSharing: boolean;
    isHandRaised: boolean;
    isNoiseFilterEnabled: boolean;
    isChatOpen: boolean;
    isParticipantsOpen: boolean;
    isDeviceSettingsOpen: boolean;
    pinnedParticipantId: string | null;
}

const initialState: MeetingState = {
    roomId: 'teams-general',
    engine: 'livekit',
    userRole: 'speaker',
    isAudioMuted: false,
    isVideoMuted: false,
    isScreenSharing: false,
    isHandRaised: false,
    isNoiseFilterEnabled: true,
    isChatOpen: false,
    isParticipantsOpen: false,
    isDeviceSettingsOpen: false,
    pinnedParticipantId: null,
};

export const meetingSlice = createSlice({
    name: 'meeting',
    initialState,
    reducers: {
        setRoomId: (state, action: PayloadAction<string>) => {
            state.roomId = action.payload;
        },
        setEngine: (state, action: PayloadAction<CallEngine>) => {
            state.engine = action.payload;
        },
        setUserRole: (state, action: PayloadAction<UserRole>) => {
            state.userRole = action.payload;
        },
        toggleAudioMute: (state) => {
            state.isAudioMuted = !state.isAudioMuted;
        },
        setAudioMuted: (state, action: PayloadAction<boolean>) => {
            state.isAudioMuted = action.payload;
        },
        toggleVideoMute: (state) => {
            state.isVideoMuted = !state.isVideoMuted;
        },
        setVideoMuted: (state, action: PayloadAction<boolean>) => {
            state.isVideoMuted = action.payload;
        },
        setScreenSharing: (state, action: PayloadAction<boolean>) => {
            state.isScreenSharing = action.payload;
        },
        toggleHandRaise: (state) => {
            state.isHandRaised = !state.isHandRaised;
        },
        setHandRaised: (state, action: PayloadAction<boolean>) => {
            state.isHandRaised = action.payload;
        },
        toggleNoiseFilter: (state) => {
            state.isNoiseFilterEnabled = !state.isNoiseFilterEnabled;
        },
        setNoiseFilterEnabled: (state, action: PayloadAction<boolean>) => {
            state.isNoiseFilterEnabled = action.payload;
        },
        toggleChat: (state) => {
            state.isChatOpen = !state.isChatOpen;
            if (state.isChatOpen) {
                state.isParticipantsOpen = false;
                state.isDeviceSettingsOpen = false;
            }
        },
        toggleParticipants: (state) => {
            state.isParticipantsOpen = !state.isParticipantsOpen;
            if (state.isParticipantsOpen) {
                state.isChatOpen = false;
                state.isDeviceSettingsOpen = false;
            }
        },
        toggleDeviceSettings: (state) => {
            state.isDeviceSettingsOpen = !state.isDeviceSettingsOpen;
        },
        closeAllDrawers: (state) => {
            state.isChatOpen = false;
            state.isParticipantsOpen = false;
            state.isDeviceSettingsOpen = false;
        },
        setPinnedParticipant: (state, action: PayloadAction<string | null>) => {
            state.pinnedParticipantId = action.payload;
        },
    },
});

export const {
    setRoomId,
    setEngine,
    setUserRole,
    toggleAudioMute,
    setAudioMuted,
    toggleVideoMute,
    setVideoMuted,
    setScreenSharing,
    toggleHandRaise,
    setHandRaised,
    toggleNoiseFilter,
    setNoiseFilterEnabled,
    toggleChat,
    toggleParticipants,
    toggleDeviceSettings,
    closeAllDrawers,
    setPinnedParticipant,
} = meetingSlice.actions;

export default meetingSlice.reducer;
