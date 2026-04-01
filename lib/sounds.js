"use client";

import { useEffect, useRef } from 'react';

/**
 * Hook to play a synthetic notification sound using Web Audio API
 * Generates phone-like melodies mathematically.
 */
export function useNotificationSound() {
    const audioContextRef = useRef(null);

    useEffect(() => {
        const initAudio = () => {
            if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
            }
            if (audioContextRef.current.state === 'suspended') {
                audioContextRef.current.resume();
            }
        };

        window.addEventListener('click', initAudio);
        window.addEventListener('keydown', initAudio);

        return () => {
            window.removeEventListener('click', initAudio);
            window.removeEventListener('keydown', initAudio);
        };
    }, []);

    const getContext = () => {
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        }
        const ctx = audioContextRef.current;
        if (ctx.state === 'suspended') ctx.resume();
        return ctx;
    };

    const sounds = {
        // نغمة سامسونج (Arpeggio)
        samsung: (ctx, now) => {
            const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
            notes.forEach((freq, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, now + i * 0.1);
                gain.gain.setValueAtTime(0, now + i * 0.1);
                gain.gain.linearRampToValueAtTime(0.1, now + i * 0.1 + 0.05);
                gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.3);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now + i * 0.1);
                osc.stop(now + i * 0.1 + 0.3);
            });
        },
        // نغمة كريستال (Bright/Short)
        crystal: (ctx, now) => {
            const playTone = (freq, start, dur) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, now + start);
                gain.gain.setValueAtTime(0, now + start);
                gain.gain.linearRampToValueAtTime(0.15, now + start + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.001, now + start + dur);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now + start);
                osc.stop(now + start + dur);
            };
            playTone(1760, 0, 0.2); // A6
            playTone(2093, 0.08, 0.2); // C7
        },
        // نغمة ماريمبا (Soft/Wooden)
        marimba: (ctx, now) => {
            [440, 554.37, 659.25].forEach((freq, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, now + i * 0.12);
                gain.gain.setValueAtTime(0, now + i * 0.12);
                gain.gain.linearRampToValueAtTime(0.2, now + i * 0.12 + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.12 + 0.4);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now + i * 0.12);
                osc.stop(now + i * 0.12 + 0.4);
            });
        },
        // نغمة فقاعات (Bubbles)
        bubbles: (ctx, now) => {
            for (let i = 0; i < 5; i++) {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                const start = i * 0.08;
                osc.type = 'sine';
                osc.frequency.setValueAtTime(800 + Math.random() * 400, now + start);
                osc.frequency.exponentialRampToValueAtTime(2000, now + start + 0.1);
                gain.gain.setValueAtTime(0, now + start);
                gain.gain.linearRampToValueAtTime(0.1, now + start + 0.02);
                gain.gain.linearRampToValueAtTime(0, now + start + 0.1);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now + start);
                osc.stop(now + start + 0.1);
            }
        }
    };

    const playSound = (soundType = 'samsung') => {
        try {
            const ctx = getContext();
            const now = ctx.currentTime;
            const engine = sounds[soundType] || sounds.samsung;
            engine(ctx, now);
        } catch (err) {
            console.error("Audio Error:", err);
        }
    };

    return { playSound };
}
