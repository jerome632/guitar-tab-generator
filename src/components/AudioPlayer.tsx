import React, { useState, useEffect, useRef } from 'react';
import { Music, Upload, AlertCircle, FastForward, Hash, Info } from 'lucide-react';
import * as Tone from 'tone';

export const AudioPlayer = () => {
  const [activeTab, setActiveTab] = useState<'spotify' | 'local'>('spotify');
  const [spotifyUrl, setSpotifyUrl] = useState('');
  const [spotifyId, setSpotifyId] = useState('');

  const [audioUrl, setAudioUrl] = useState('');
  const [fileName, setFileName] = useState('');
  const [speed, setSpeed] = useState(1);
  const [pitch, setPitch] = useState(0);
  const [audioKey, setAudioKey] = useState(0);

  const audioRef = useRef<HTMLAudioElement>(null);
  const pitchShiftRef = useRef<Tone.PitchShift | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const isInitializedRef = useRef(false);

  // Parse Spotify URL
  useEffect(() => {
    if (spotifyUrl) {
      const match = spotifyUrl.match(/track\/([a-zA-Z0-9]+)/);
      if (match && match[1]) {
        setSpotifyId(match[1]);
      } else {
        setSpotifyId('');
      }
    } else {
      setSpotifyId('');
    }
  }, [spotifyUrl]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const url = URL.createObjectURL(file);
    setAudioUrl(url);
    
    // Reset states
    setSpeed(1);
    setPitch(0);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  const initWebAudio = async () => {
    if (isInitializedRef.current || !audioRef.current) return;
    isInitializedRef.current = true; // Set early to prevent race conditions

    try {
      await Tone.start();
      const ctx = Tone.getContext().rawContext as AudioContext;

      if (!pitchShiftRef.current) {
        let retries = 5;
        let lastError = null;
        while (retries > 0) {
          try {
            pitchShiftRef.current = new Tone.PitchShift(pitch).toDestination();
            break;
          } catch (e) {
            lastError = e;
            console.warn(`PitchShift creation failed, retrying... (${retries} left)`, e);
            await new Promise(resolve => setTimeout(resolve, 200));
            retries--;
          }
        }
        if (!pitchShiftRef.current) {
          throw lastError || new Error("Failed to create PitchShift after retries");
        }
      }
      
      let sourceNode = (audioRef.current as any)._sourceNode as MediaElementAudioSourceNode | undefined;
      if (!sourceNode) {
        try {
          sourceNode = ctx.createMediaElementSource(audioRef.current);
        } catch (e: any) {
          if (e.name === 'InvalidStateError' || e.message?.includes('already connected')) {
            console.warn("Audio element bound to old context. Recreating...");
            setAudioKey(k => k + 1);
            isInitializedRef.current = false;
            return;
          }
          throw e;
        }
        (audioRef.current as any)._sourceNode = sourceNode;
      }
      sourceNodeRef.current = sourceNode;
      
      sourceNode.disconnect();
      
      // Connect native source node to Tone.js node
      try {
        // @ts-ignore
        if (typeof Tone.connect === 'function') {
          Tone.connect(sourceNode, pitchShiftRef.current);
        } else {
          // Robust manual fallback to reach the native AudioNode inside Tone.js objects
          let target: any = pitchShiftRef.current;
          let maxDepth = 5;
          while (target && !(target instanceof AudioNode) && maxDepth > 0) {
            if (target.input && target.input !== target) {
              target = target.input;
            } else if (target._gainNode) {
              target = target._gainNode;
            } else {
              break;
            }
            maxDepth--;
          }
          sourceNode.connect(target as AudioNode);
        }
      } catch (connectErr) {
        console.warn("Standard connection failed, trying fallback...", connectErr);
        let target: any = pitchShiftRef.current;
        if (target.input) target = target.input;
        sourceNode.connect(target.input || target);
      }
    } catch (err) {
      console.error("Web Audio Init Error:", err);
      isInitializedRef.current = false;
      
      // Fallback: connect directly to destination so audio still plays
      if (audioRef.current) {
        try {
          const ctx = Tone.getContext().rawContext as AudioContext;
          let sourceNode = (audioRef.current as any)._sourceNode as MediaElementAudioSourceNode | undefined;
          if (!sourceNode) {
            sourceNode = ctx.createMediaElementSource(audioRef.current);
            (audioRef.current as any)._sourceNode = sourceNode;
          }
          sourceNode.disconnect();
          sourceNode.connect(ctx.destination);
        } catch (fallbackErr) {
          console.error("Fallback audio routing failed:", fallbackErr);
        }
      }
    }
  };

  const handlePlay = async () => {
    await initWebAudio();
  };

  // Sync Speed
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
      // Preserve pitch natively so we can shift it independently with Tone.js
      (audioRef.current as any).preservesPitch = true;
    }
  }, [speed]);

  // Sync Pitch
  useEffect(() => {
    if (pitchShiftRef.current) {
      pitchShiftRef.current.pitch = pitch;
    }
  }, [pitch]);

  return (
    <div className="bg-white shadow-sm border border-stone-200 rounded-[2rem] p-6 sm:p-8 max-w-4xl w-full mx-auto mb-10 print:hidden">
      <div className="flex items-center gap-2 mb-6 text-stone-800">
        <Music className="w-6 h-6" />
        <h2 className="text-xl font-semibold">Lecteur Audio</h2>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 bg-[#F9F8F6] p-1.5 rounded-2xl border border-stone-200">
        <button
          onClick={() => setActiveTab('spotify')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-medium transition-colors ${
            activeTab === 'spotify'
              ? 'bg-white shadow-sm text-stone-800 border border-stone-200'
              : 'text-stone-500 hover:text-stone-700'
          }`}
        >
          Spotify
        </button>
        <button
          onClick={() => setActiveTab('local')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-medium transition-colors ${
            activeTab === 'local'
              ? 'bg-white shadow-sm text-stone-800 border border-stone-200'
              : 'text-stone-500 hover:text-stone-700'
          }`}
        >
          Fichier Local (Vitesse & Tonalité)
        </button>
      </div>

      {activeTab === 'spotify' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">
              Lien de la chanson Spotify
            </label>
            <input
              type="text"
              value={spotifyUrl}
              onChange={(e) => setSpotifyUrl(e.target.value)}
              placeholder="Ex: https://open.spotify.com/track/3n3Ppam7vgaVa1iaRUc9Lp"
              className="w-full px-4 py-3 bg-[#F9F8F6] border border-stone-200 rounded-xl focus:ring-2 focus:ring-stone-500 focus:border-transparent outline-none transition-all text-stone-800"
            />
          </div>

          {spotifyId && (
            <div className="rounded-2xl overflow-hidden border border-stone-200 shadow-sm">
              <iframe
                src={`https://open.spotify.com/embed/track/${spotifyId}`}
                width="100%"
                height="152"
                frameBorder="0"
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                loading="lazy"
              ></iframe>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3 text-blue-800">
            <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p className="text-sm leading-relaxed">
              <strong>Note technique :</strong> Il est impossible de modifier la vitesse ou la tonalité d'une musique provenant directement de Spotify à cause des protections de droits d'auteur (DRM) qui bloquent l'accès au flux audio. Pour utiliser ces fonctionnalités, utilisez l'onglet <strong>Fichier Local</strong> avec un fichier MP3.
            </p>
          </div>
        </div>
      )}

      {activeTab === 'local' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {!audioUrl ? (
            <div className="border-2 border-dashed border-stone-200 rounded-2xl p-8 text-center hover:bg-[#F9F8F6] transition-colors">
              <input
                type="file"
                accept="audio/*"
                onChange={handleFileChange}
                className="hidden"
                id="audio-upload"
              />
              <label
                htmlFor="audio-upload"
                className="cursor-pointer flex flex-col items-center gap-3"
              >
                <div className="bg-stone-100 p-4 rounded-full text-stone-500">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-stone-800 font-medium">Cliquez pour importer un fichier audio</p>
                  <p className="text-stone-500 text-sm mt-1">MP3, WAV, M4A supportés</p>
                </div>
              </label>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between bg-[#F9F8F6] p-4 rounded-xl border border-stone-200">
                <span className="font-medium text-stone-800 truncate pr-4">{fileName}</span>
                <button
                  onClick={() => {
                    setAudioUrl('');
                    setFileName('');
                    if (audioRef.current) audioRef.current.pause();
                  }}
                  className="text-sm text-stone-500 hover:text-stone-800 font-medium"
                >
                  Changer de fichier
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-4">
                {/* Speed Control */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-stone-700 font-medium">
                      <FastForward className="w-4 h-4" />
                      Vitesse
                    </div>
                    <span className="text-stone-500 text-sm font-mono bg-stone-100 px-2 py-1 rounded-md">
                      {speed.toFixed(2)}x
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="1.5"
                    step="0.05"
                    value={speed}
                    onChange={(e) => setSpeed(parseFloat(e.target.value))}
                    className="w-full accent-stone-800"
                  />
                  <div className="flex justify-between text-xs text-stone-400">
                    <span>0.5x</span>
                    <span>1.0x</span>
                    <span>1.5x</span>
                  </div>
                </div>

                {/* Pitch Control */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-stone-700 font-medium">
                      <Hash className="w-4 h-4" />
                      Tonalité
                    </div>
                    <span className="text-stone-500 text-sm font-mono bg-stone-100 px-2 py-1 rounded-md">
                      {pitch > 0 ? '+' : ''}{pitch.toFixed(1)} demi-tons
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-12"
                    max="12"
                    step="0.1"
                    value={pitch}
                    onChange={(e) => setPitch(parseFloat(e.target.value))}
                    className="w-full accent-stone-800"
                  />
                  <div className="flex justify-between text-xs text-stone-400">
                    <span>-12</span>
                    <span>0</span>
                    <span>+12</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex gap-3 text-amber-800 mt-4">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <p className="text-sm leading-relaxed">
                  La modification de la tonalité peut introduire de légers artefacts sonores. C'est un comportement normal des algorithmes de traitement audio en temps réel.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Always render audio element to prevent re-creating MediaElementSourceNode */}
      <audio
        key={audioKey}
        ref={audioRef}
        src={audioUrl || undefined}
        controls
        onPlay={handlePlay}
        className={`w-full h-12 rounded-xl mt-6 ${activeTab === 'local' && audioUrl ? 'block' : 'hidden'}`}
      />
    </div>
  );
};