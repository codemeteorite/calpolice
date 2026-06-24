export const playGulpSound = () => {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();

        // 3 quick gulp-like bubbles
        [0, 0.15, 0.3].forEach((delay, i) => {
            setTimeout(() => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();

                osc.connect(gain);
                gain.connect(ctx.destination);

                osc.type = 'sine';

                const startFreq = 350 - (i * 40);
                osc.frequency.setValueAtTime(startFreq, ctx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.1);

                gain.gain.setValueAtTime(0, ctx.currentTime);
                gain.gain.linearRampToValueAtTime(8.0, ctx.currentTime + 0.01);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);

                osc.start(ctx.currentTime);
                osc.stop(ctx.currentTime + 0.15);
            }, delay * 1000);
        });
    } catch (e) {
        console.log("Audio not supported");
    }
};

export const playChewSound = () => {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();

        // 3 quick chewy crunches
        [0, 0.18, 0.36].forEach(delay => {
            setTimeout(() => {
                // Noise buffer for the crunch
                const bufferSize = ctx.sampleRate * 0.1; // 100ms
                const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
                const data = buffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) {
                    data[i] = Math.random() * 2 - 1;
                }

                const noise = ctx.createBufferSource();
                noise.buffer = buffer;

                // Crisp crunch effect
                const filter = ctx.createBiquadFilter();
                filter.type = 'bandpass';
                filter.frequency.value = 3500;

                const gain = ctx.createGain();

                noise.connect(filter);
                filter.connect(gain);
                gain.connect(ctx.destination);

                gain.gain.setValueAtTime(0, ctx.currentTime);
                gain.gain.linearRampToValueAtTime(30.0, ctx.currentTime + 0.01);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.10);

                noise.start(ctx.currentTime);
            }, delay * 1000);
        });
    } catch (e) {
        console.log("Audio not supported");
    }
};
