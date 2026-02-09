// Player Controller - Centralized state management and event handling
import { getState, saveState, loadState, type PlayerState, type Track } from './playerState';

export interface PlayerControllerOptions {
    onVisibilityChange?: (isVisible: boolean) => void;
    onTrackChange?: (track: Track | null) => void;
    onPlayStateChange?: (isPlaying: boolean) => void;
}

class PlayerController {
    private audio: HTMLAudioElement | null = null;
    private options: PlayerControllerOptions;
    private progressInterval: number | null = null;
    private eventListeners: Map<string, Set<Function>> = new Map();
    private boundHandlers: Map<HTMLElement, Map<string, EventListener>> = new Map();
    
    constructor(options: PlayerControllerOptions = {}) {
        this.options = options;
        this.init();
    }
    
    // Initialize controller
    private init() {
        loadState();
        this.setupAudioListeners();
        this.emit('init');
    }
    
    // Set audio element
    setAudioElement(audio: HTMLAudioElement) {
        if (this.audio) {
            // Remove old listeners
            this.audio.removeEventListener('ended', this.handleAudioEnded);
            this.audio.removeEventListener('loadedmetadata', this.handleAudioMetadata);
        }
        this.audio = audio;
        this.setupAudioListeners();
    }
    
    private setupAudioListeners() {
        if (!this.audio) return;
        this.audio.addEventListener('ended', this.handleAudioEnded);
        this.audio.addEventListener('loadedmetadata', this.handleAudioMetadata);
    }
    
    private handleAudioEnded = () => {
        this.nextTrack();
    };
    
    private handleAudioMetadata = () => {
        if (this.audio) {
            getState().duration = this.audio.duration;
            this.emit('metadata', { duration: this.audio.duration });
            saveState(this.audio);
        }
    };
    
    // Event system
    on(event: string, callback: Function) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, new Set());
        }
        this.eventListeners.get(event)!.add(callback);
        return () => this.off(event, callback);
    }
    
    off(event: string, callback: Function) {
        this.eventListeners.get(event)?.delete(callback);
    }
    
    emit(event: string, data?: any) {
        this.eventListeners.get(event)?.forEach(callback => {
            try {
                callback(data);
            } catch (e) {
                console.error(`Error in event handler for ${event}:`, e);
            }
        });
    }
    
    // Visibility control
    toggleVisibility() {
        const s = getState();
        s.isVisible = !s.isVisible;
        saveState(this.audio || undefined);
        this.emit('visibilityChange', s.isVisible);
        this.options.onVisibilityChange?.(s.isVisible);
    }
    
    show() {
        const s = getState();
        if (!s.isVisible) {
            s.isVisible = true;
            saveState(this.audio || undefined);
            this.emit('visibilityChange', true);
            this.options.onVisibilityChange?.(true);
        }
    }
    
    hide() {
        const s = getState();
        if (s.isVisible) {
            s.isVisible = false;
            saveState(this.audio || undefined);
            this.emit('visibilityChange', false);
            this.options.onVisibilityChange?.(false);
        }
    }
    
    // Playback control
    togglePlay() {
        const s = getState();
        if (!s.currentPlaylist.length) return;
        
        s.isPlaying = !s.isPlaying;
        
        if (s.isPlaying) {
            this.audio?.play().catch(err => {
                console.log('Play failed:', err);
                s.isPlaying = false;
                this.emit('playStateChange', false);
                this.options.onPlayStateChange?.(false);
            });
            this.startProgress();
        } else {
            this.audio?.pause();
            this.stopProgress();
        }
        
        saveState(this.audio || undefined);
        this.emit('playStateChange', s.isPlaying);
        this.options.onPlayStateChange?.(s.isPlaying);
    }
    
    play() {
        const s = getState();
        if (!s.isPlaying && s.currentPlaylist.length) {
            s.isPlaying = true;
            this.audio?.play().catch(console.error);
            this.startProgress();
            saveState(this.audio || undefined);
            this.emit('playStateChange', true);
            this.options.onPlayStateChange?.(true);
        }
    }
    
    pause() {
        const s = getState();
        if (s.isPlaying) {
            s.isPlaying = false;
            this.audio?.pause();
            this.stopProgress();
            saveState(this.audio || undefined);
            this.emit('playStateChange', false);
            this.options.onPlayStateChange?.(false);
        }
    }
    
    // Track navigation
    previousTrack() {
        const s = getState();
        if (s.currentPlaylist.length > 0) {
            s.currentTrackIndex = (s.currentTrackIndex - 1 + s.currentPlaylist.length) % s.currentPlaylist.length;
            this.loadTrack(s.currentPlaylist[s.currentTrackIndex]);
        }
    }
    
    nextTrack() {
        const s = getState();
        if (s.currentPlaylist.length > 0) {
            s.currentTrackIndex = (s.currentTrackIndex + 1) % s.currentPlaylist.length;
            this.loadTrack(s.currentPlaylist[s.currentTrackIndex]);
        }
    }
    
    // Track loading
    loadTrack(track: Track) {
        if (!track || !this.audio) return;
        
        const s = getState();
        s.currentTrack = track;
        
        this.audio.pause();
        this.audio.src = track.file;
        this.audio.volume = (s.volume || 70) / 100;
        this.audio.muted = s.isMuted;
        
        if (s.isPlaying) {
            this.audio.play().catch(err => {
                console.log('Auto-play prevented:', err);
                s.isPlaying = false;
                this.emit('playStateChange', false);
                this.options.onPlayStateChange?.(false);
            });
        }
        
        saveState(this.audio);
        this.show();
        this.emit('trackChange', track);
        this.options.onTrackChange?.(track);
    }
    
    playTrack(track: Track) {
        const s = getState();
        s.currentPlaylist = [track];
        s.currentTrackIndex = 0;
        s.isPlaying = true;
        this.loadTrack(track);
        this.emit('playStateChange', true);
        this.options.onPlayStateChange?.(true);
    }
    
    playAlbum(album: any, startIndex = 0) {
        if (!album?.songs?.length) return;
        
        const s = getState();
        s.currentPlaylist = album.songs.map((song: any, index: number) => ({
            ...song,
            album: album.title,
            artist: album.artist,
            cover: album.cover
        }));
        s.currentTrackIndex = startIndex;
        s.isPlaying = true;
        this.loadTrack(s.currentPlaylist[startIndex]);
        this.emit('playStateChange', true);
        this.options.onPlayStateChange?.(true);
    }
    
    // Volume control
    setVolume(volume: number) {
        const s = getState();
        s.volume = volume;
        if (this.audio) {
            this.audio.volume = volume / 100;
        }
        saveState(this.audio || undefined);
        this.emit('volumeChange', volume);
    }
    
    toggleMute() {
        const s = getState();
        s.isMuted = !s.isMuted;
        if (this.audio) {
            this.audio.muted = s.isMuted;
        }
        saveState(this.audio || undefined);
        this.emit('muteChange', s.isMuted);
    }
    
    // Progress control
    seekTo(percentage: number) {
        if (!this.audio) return;
        this.audio.currentTime = percentage * this.audio.duration;
        getState().currentTime = this.audio.currentTime;
        saveState(this.audio);
        this.emit('seek', this.audio.currentTime);
    }
    
    private startProgress() {
        this.stopProgress();
        this.progressInterval = window.setInterval(() => {
            if (this.audio) {
                getState().currentTime = this.audio.currentTime;
                this.emit('progress', {
                    currentTime: this.audio.currentTime,
                    duration: this.audio.duration,
                    percentage: this.audio.duration > 0 ? (this.audio.currentTime / this.audio.duration) * 100 : 0
                });
            }
        }, 100);
    }
    
    private stopProgress() {
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
            this.progressInterval = null;
        }
    }
    
    // DOM event binding helper
    bindElement(element: HTMLElement | null, event: string, handler: EventListener) {
        if (!element) return;
        
        // Remove old handler if exists
        const elementBindings = this.boundHandlers.get(element);
        if (elementBindings?.has(event)) {
            element.removeEventListener(event, elementBindings.get(event)!);
        }
        
        // Add new handler
        element.addEventListener(event, handler);
        
        // Track binding
        if (!this.boundHandlers.has(element)) {
            this.boundHandlers.set(element, new Map());
        }
        this.boundHandlers.get(element)!.set(event, handler);
    }
    
    unbindElement(element: HTMLElement | null, event?: string) {
        if (!element) return;
        
        const elementBindings = this.boundHandlers.get(element);
        if (!elementBindings) return;
        
        if (event) {
            const handler = elementBindings.get(event);
            if (handler) {
                element.removeEventListener(event, handler);
                elementBindings.delete(event);
            }
        } else {
            elementBindings.forEach((handler, evt) => {
                element.removeEventListener(evt, handler);
            });
            this.boundHandlers.delete(element);
        }
    }
    
    // Get current state
    getState(): PlayerState {
        return getState();
    }
    
    // Cleanup
    destroy() {
        this.stopProgress();
        this.boundHandlers.forEach((bindings, element) => {
            bindings.forEach((handler, event) => {
                element.removeEventListener(event, handler);
            });
        });
        this.boundHandlers.clear();
        this.eventListeners.clear();
    }
}

// Singleton instance
let controllerInstance: PlayerController | null = null;

export function getPlayerController(options?: PlayerControllerOptions): PlayerController {
    if (!controllerInstance) {
        controllerInstance = new PlayerController(options);
    }
    return controllerInstance;
}

export function resetPlayerController() {
    if (controllerInstance) {
        controllerInstance.destroy();
        controllerInstance = null;
    }
}

export default PlayerController;
