// Player State Management
const STORAGE_KEY = 'musicPlayerState';

export interface PlayerState {
    isPlaying: boolean;
    currentTrackIndex: number;
    currentPlaylist: Track[];
    isMuted: boolean;
    isVisible: boolean;
    currentTime: number;
    duration: number;
    currentTrack: Track | null;
    volume: number;
}

export interface Track {
    title: string;
    artist?: string;
    file: string;
    cover?: string;
    album?: string;
}

// Initialize global state if not exists
if (!window.__PLAYER_STATE__) {
    window.__PLAYER_STATE__ = {
        isPlaying: false,
        currentTrackIndex: 0,
        currentPlaylist: [],
        isMuted: false,
        isVisible: false,
        currentTime: 0,
        duration: 0,
        currentTrack: null,
        volume: 10
    };
}

export function getState(): PlayerState {
    return window.__PLAYER_STATE__;
}

export function saveState(audioElement?: HTMLAudioElement) {
    try {
        const s = getState();
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            isPlaying: s.isPlaying,
            currentTrackIndex: s.currentTrackIndex,
            currentPlaylist: s.currentPlaylist,
            isMuted: s.isMuted,
            isVisible: s.isVisible,
            currentTime: audioElement ? audioElement.currentTime : s.currentTime,
            duration: audioElement ? audioElement.duration : s.duration,
            currentTrack: s.currentTrack,
            volume: s.volume,
            savedAt: Date.now()
        }));
    } catch (e) {
        console.error('Failed to save player state:', e);
    }
}

export function loadState(): boolean {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            // Only restore if saved within last 30 minutes
            if (Date.now() - (parsed.savedAt || 0) < 30 * 60 * 1000) {
                Object.assign(getState(), parsed);
                return true;
            }
        }
    } catch (e) {
        console.error('Failed to load player state:', e);
    }
    return false;
}

// Extend Window interface
declare global {
    interface Window {
        __PLAYER_STATE__: PlayerState;
        updateShowBtnState: () => void;
        updatePlayerVisibility: () => void;
    }
}
