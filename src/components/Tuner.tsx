import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Activity, CheckSquare } from 'lucide-react';

const noteStrings = ["Do", "Do#", "Ré", "Ré#", "Mi", "Fa", "Fa#", "Sol", "Sol#", "La", "La#", "Si"];
const noteStringsEnglish = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

function noteFromPitch(frequency: number) {
  const noteNum = 12 * (Math.log(frequency / 440) / Math.log(2));
  return Math.round(noteNum) + 69;
}

function frequencyFromNoteNumber(note: number) {
  return 440 * Math.pow(2, (note - 69) / 12);
}

function centsOffFromPitch(frequency: number, note: number) {
  return Math.floor(1200 * Math.log(frequency / frequencyFromNoteNumber(note)) / Math.log(2));
}

// Simple auto-correlation algorithm for pitch detection
function autoCorrelate(buf: Float32Array, sampleRate: number) {
  let SIZE = buf.length;
  let rms = 0;

  for (let i = 0; i < SIZE; i++) {
    const val = buf[i];
    rms += val * val;
  }
  rms = Math.sqrt(rms / SIZE);
  if (rms < 0.01) return -1; // Not enough signal

  let r1 = 0, r2 = SIZE - 1, thres = 0.2;
  for (let i = 0; i < SIZE / 2; i++)
    if (Math.abs(buf[i]) < thres) { r1 = i; break; }
  for (let i = 1; i < SIZE / 2; i++)
    if (Math.abs(buf[SIZE - i]) < thres) { r2 = SIZE - i; break; }

  buf = buf.slice(r1, r2);
  SIZE = buf.length;

  const c = new Array(SIZE).fill(0);
  for (let i = 0; i < SIZE; i++)
    for (let j = 0; j < SIZE - i; j++)
      c[i] = c[i] + buf[j] * buf[j + i];

  let d = 0; while (c[d] > c[d + 1]) d++;
  let maxval = -1, maxpos = -1;
  for (let i = d; i < SIZE; i++) {
    if (c[i] > maxval) {
      maxval = c[i];
      maxpos = i;
    }
  }
  let T0 = maxpos;

  let x1 = c[T0 - 1], x2 = c[T0], x3 = c[T0 + 1];
  let a = (x1 + x3 - 2 * x2) / 2;
  let b = (x3 - x1) / 2;
  if (a) T0 = T0 - b / (2 * a);

  return sampleRate / T0;
}

export const Tuner = () => {
  const [isListening, setIsListening] = useState(false);
  const [pitch, setPitch] = useState<number | null>(null);
  const [note, setNote] = useState<string>('--');
  const [noteEn, setNoteEn] = useState<string>('');
  const [cents, setCents] = useState<number>(0);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafIdRef = useRef<number | null>(null);
  
  // Refs for smoothing the needle movement
  const smoothedCentsRef = useRef<number>(0);
  const lastValidPitchRef = useRef<number | null>(null);

  const startTuner = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioCtx;
      
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      analyserRef.current = analyser;
      
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);
      
      setIsListening(true);
      updatePitch();
    } catch (err) {
      console.error('Error accessing microphone:', err);
      alert('Impossible d\'accéder au microphone. Veuillez vérifier vos permissions.');
    }
  };

  const stopTuner = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
    }
    setIsListening(false);
    setPitch(null);
    setNote('--');
    setNoteEn('');
    setCents(0);
    smoothedCentsRef.current = 0;
    lastValidPitchRef.current = null;
  };

  const updatePitch = () => {
    if (!analyserRef.current || !audioContextRef.current) return;
    
    const buffer = new Float32Array(analyserRef.current.fftSize);
    analyserRef.current.getFloatTimeDomainData(buffer);
    
    const ac = autoCorrelate(buffer, audioContextRef.current.sampleRate);
    
    if (ac !== -1) {
      const pitchValue = ac;
      setPitch(pitchValue);
      const noteNum = noteFromPitch(pitchValue);
      setNote(noteStrings[noteNum % 12]);
      setNoteEn(noteStringsEnglish[noteNum % 12]);
      
      const targetCents = centsOffFromPitch(pitchValue, noteNum);
      
      // Smooth the needle movement
      if (lastValidPitchRef.current === null) {
        smoothedCentsRef.current = targetCents; // Snap to first valid reading
      } else {
        // Lerp (Linear Interpolation) for smooth progressive movement
        smoothedCentsRef.current = smoothedCentsRef.current + (targetCents - smoothedCentsRef.current) * 0.08;
      }
      
      lastValidPitchRef.current = pitchValue;
      setCents(smoothedCentsRef.current);
    } else {
      // Keep the needle where it is if signal drops briefly
      lastValidPitchRef.current = null;
    }
    
    rafIdRef.current = requestAnimationFrame(updatePitch);
  };

  useEffect(() => {
    return () => {
      stopTuner();
    };
  }, []);

  const displayCents = Math.round(cents);
  
  let isTuned = false;
  if (pitch) {
    const noteNum = noteFromPitch(pitch);
    const targetFreq = frequencyFromNoteNumber(noteNum);
    isTuned = Math.abs(pitch - targetFreq) <= 0.2;
  }
  
  // Calculate needle rotation angle (-50 to +50 cents maps to -60 to +60 degrees for a wider scale)
  const needleAngle = Math.max(-60, Math.min(60, (cents / 50) * 60));

  return (
    <div className="bg-white shadow-sm border border-stone-200 rounded-3xl p-6 flex flex-col items-center h-full">
      <div className="flex items-center gap-2 mb-2 text-stone-400">
        <Activity className="w-4 h-4" />
        <span className="text-xs font-semibold uppercase tracking-widest">Accordeur</span>
      </div>

      <div className="relative w-full flex-1 flex flex-col items-center justify-center">
        
        {/* Curved Meter Container */}
        <div className="relative w-full max-w-[280px] aspect-[2/1] mb-2">
          <svg viewBox="0 0 200 110" className="w-full h-full overflow-visible">
            <g transform="translate(100, 100)">
              {/* Background Arc (-60 to +60 degrees) */}
              <path 
                d="M -69.28 -40 A 80 80 0 0 1 69.28 -40" 
                fill="none" 
                stroke="#e7e5e4" 
                strokeWidth="3" 
                strokeLinecap="round" 
              />
              
              {/* Green Arc for +/- 10 cents (approx +/- 12 degrees) */}
              <path 
                d="M -16.63 -78.25 A 80 80 0 0 1 16.63 -78.25" 
                fill="none" 
                stroke="#10b981" 
                strokeWidth="4" 
                strokeLinecap="round" 
              />

              {/* Tick marks */}
              {Array.from({ length: 21 }).map((_, i) => {
                const centsValue = -50 + (i * 5);
                const angle = (centsValue / 50) * 60; // -60 to +60
                const isCenter = centsValue === 0;
                const isMajor = centsValue % 10 === 0;
                const innerRadius = isMajor ? 68 : 74;
                const outerRadius = 80;
                
                return (
                  <line 
                    key={i}
                    x1={0} y1={-innerRadius} x2={0} y2={-outerRadius}
                    transform={`rotate(${angle})`}
                    stroke={isCenter ? "#10b981" : (Math.abs(centsValue) <= 10 ? "#34d399" : "#a8a29e")}
                    strokeWidth={isMajor ? "2" : "1"} 
                    strokeLinecap="round"
                  />
                );
              })}

              {/* Needle */}
              <line 
                x1="0" y1="0" x2="0" y2="-85"
                transform={`rotate(${needleAngle})`}
                stroke={isListening && pitch ? (isTuned ? "#10b981" : "#ef4444") : "#d6d3d1"}
                strokeWidth="3"
                strokeLinecap="round"
                style={{ transition: 'stroke 0.3s ease' }}
              />
              
              {/* Needle Pivot */}
              <circle cx="0" cy="0" r="5" fill="#292524" />
            </g>
          </svg>
        </div>

        {/* Cents Display */}
        <div className="flex justify-between w-full max-w-[240px] px-4 text-xs text-stone-400 font-medium mb-4">
          <span>-50</span>
          <span className={`px-2 py-0.5 rounded-md border transition-colors duration-300 ${isListening && pitch ? (isTuned ? 'border-emerald-200 text-emerald-600 bg-emerald-50' : 'border-stone-200 text-stone-600 bg-[#F9F8F6]') : 'border-transparent'}`}>
            {isListening && pitch ? `${displayCents > 0 ? '+' : ''}${displayCents}¢` : '0¢'}
          </span>
          <span>+50</span>
        </div>

        {/* Note Display */}
        <div className="flex flex-col items-center relative w-full">
          <div className="relative flex items-center justify-center">
            <div className={`text-7xl font-semibold leading-none transition-colors duration-300 ${isListening ? (isTuned ? 'text-emerald-500' : 'text-stone-800') : 'text-stone-300'}`}>
              {note}
            </div>
            {isListening && pitch && isTuned && (
              <div className="absolute left-full ml-3 flex items-center justify-center animate-in zoom-in duration-200">
                <CheckSquare className="w-8 h-8 text-emerald-500" strokeWidth={3} />
              </div>
            )}
          </div>
          <div className={`text-sm mt-3 font-medium ${isListening ? 'text-stone-500' : 'text-stone-300'}`}>
            {noteEn && `(${noteEn})`} {pitch ? `${pitch.toFixed(1)} Hz` : ''}
          </div>
        </div>
      </div>

      <button
        onClick={isListening ? stopTuner : startTuner}
        className={`mt-4 flex items-center justify-center gap-2 w-full py-3 rounded-full font-medium transition-colors ${
          isListening 
            ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200' 
            : 'bg-stone-800 text-white hover:bg-stone-700'
        }`}
      >
        {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        {isListening ? 'Arrêter' : 'Activer le micro'}
      </button>
    </div>
  );
};
