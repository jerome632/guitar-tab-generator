import React, { useState, useEffect, useRef } from 'react';
import { Play, Square, Plus, Minus, Volume2 } from 'lucide-react';

export const Metronome = () => {
  const [bpm, setBpm] = useState(120);
  const [beatsPerMeasure, setBeatsPerMeasure] = useState(4);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const nextNoteTimeRef = useRef(0);
  const currentBeatRef = useRef(0);
  const timerIDRef = useRef<number | null>(null);

  const scheduleNote = (time: number, isFirstBeat: boolean) => {
    if (!audioContextRef.current) return;
    const osc = audioContextRef.current.createOscillator();
    const gainNode = audioContextRef.current.createGain();

    osc.connect(gainNode);
    gainNode.connect(audioContextRef.current.destination);

    // Higher pitch for the first beat
    osc.frequency.value = isFirstBeat ? 1200 : 800;
    
    gainNode.gain.setValueAtTime(1, time);
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.1);

    osc.start(time);
    osc.stop(time + 0.1);
  };

  const scheduler = () => {
    if (!audioContextRef.current) return;
    // Schedule notes up to 0.1 seconds ahead
    while (nextNoteTimeRef.current < audioContextRef.current.currentTime + 0.1) {
      const isFirstBeat = currentBeatRef.current === 0;
      scheduleNote(nextNoteTimeRef.current, isFirstBeat);
      
      // Advance next note time and beat
      nextNoteTimeRef.current += 60.0 / bpm;
      currentBeatRef.current = (currentBeatRef.current + 1) % beatsPerMeasure;
    }
    timerIDRef.current = window.setTimeout(scheduler, 25.0);
  };

  useEffect(() => {
    if (isPlaying) {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }
      nextNoteTimeRef.current = audioContextRef.current.currentTime + 0.05;
      currentBeatRef.current = 0; // Reset to first beat when starting
      scheduler();
    } else {
      if (timerIDRef.current !== null) {
        window.clearTimeout(timerIDRef.current);
        timerIDRef.current = null;
      }
    }
    return () => {
      if (timerIDRef.current !== null) {
        window.clearTimeout(timerIDRef.current);
      }
    };
  }, [isPlaying, bpm, beatsPerMeasure]);

  return (
    <div className="bg-white shadow-sm border border-stone-200 rounded-3xl p-6 flex flex-col items-center h-full">
      <div className="flex items-center gap-2 mb-4 text-stone-400">
        <Volume2 className="w-4 h-4" />
        <span className="text-xs font-semibold uppercase tracking-widest">Métronome</span>
      </div>
      
      <div className="text-4xl font-semibold text-stone-800 mb-2 font-mono flex-1 flex items-center">
        {bpm} <span className="text-lg text-stone-400 font-sans ml-1">BPM</span>
      </div>

      <div className="flex items-center gap-4 mb-6 w-full justify-center">
        <button 
          onClick={() => setBpm(Math.max(40, bpm - 5))}
          className="p-2 rounded-full bg-[#F9F8F6] hover:bg-stone-100 text-stone-600 transition-colors"
        >
          <Minus className="w-5 h-5" />
        </button>
        
        <input 
          type="range" 
          min="40" 
          max="240" 
          value={bpm} 
          onChange={(e) => setBpm(Number(e.target.value))}
          className="w-32 accent-stone-600"
        />

        <button 
          onClick={() => setBpm(Math.min(240, bpm + 5))}
          className="p-2 rounded-full bg-[#F9F8F6] hover:bg-stone-100 text-stone-600 transition-colors"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <span className="text-sm text-stone-500 font-medium">Mesure :</span>
        <div className="flex bg-[#F9F8F6] rounded-xl p-1 border border-stone-200">
          {[2, 3, 4, 5, 6].map(beats => (
            <button
              key={beats}
              onClick={() => setBeatsPerMeasure(beats)}
              className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                beatsPerMeasure === beats 
                  ? 'bg-white shadow-sm text-stone-800 border border-stone-200' 
                  : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              {beats}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={() => setIsPlaying(!isPlaying)}
        className={`flex items-center justify-center gap-2 w-full py-3 rounded-full font-medium transition-colors ${
          isPlaying 
            ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200' 
            : 'bg-stone-800 text-white hover:bg-stone-700'
        }`}
      >
        {isPlaying ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" fill="currentColor" />}
        {isPlaying ? 'Stop' : 'Start'}
      </button>
    </div>
  );
};
