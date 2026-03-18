/**
 * SOVEREIGN OS - AUDIO ENGINE
 * Manages the "Hardware" audio context and system-wide gain.
 */
export const AudioEngine = {
    init(kernel) {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            kernel.audioContext = new AudioContext();
            kernel.masterGain = kernel.audioContext.createGain();
            kernel.masterGain.connect(kernel.audioContext.destination);
            
            kernel.systemVolume = 80;
            kernel.masterGain.gain.value = 0.8;
            console.log("Kernel: Audio Engine Online.");
        } catch (e) {
            console.warn("Kernel: Audio hardware deferred until user interaction.");
        }
    },

    setVolume(kernel, value) {
        if (kernel.audioContext?.state === 'suspended') {
            kernel.audioContext.resume();
        }

        kernel.systemVolume = value;
        const level = value / 100;

        if (kernel.masterGain) {
            kernel.masterGain.gain.setTargetAtTime(level, kernel.audioContext.currentTime, 0.02);
        }

        // Sync all DOM media tags
        document.querySelectorAll('audio, video').forEach(media => {
            media.volume = level;
        });
    }
};

