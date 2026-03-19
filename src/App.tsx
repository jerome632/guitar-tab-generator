import React, { useState } from 'react';
import { Search, Music, Guitar, Settings2, Timer, Mic, PlaySquare, Loader2 } from 'lucide-react';
import { generateSongData } from './services/geminiService';
import { SongData } from './types';
import { SongDisplay } from './components/SongDisplay';
import { Metronome } from './components/Metronome';
import { Tuner } from './components/Tuner';
import { AudioPlayer } from './components/AudioPlayer';

export default function App() {
  const [song, setSong] = useState('');
  const [artist, setArtist] = useState('');
  const [loading, setLoading] = useState(false);
  const [songData, setSongData] = useState<SongData | null>(null);
  const [error, setError] = useState('');
  const [activeTool, setActiveTool] = useState<'metronome' | 'tuner' | 'audio' | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!song || !artist) return;

    setLoading(true);
    setError('');
    setSongData(null);

    try {
      const data = await generateSongData(song, artist);
      setSongData(data);
    } catch (err) {
      console.error(err);
      setError("Désolé, une erreur s'est produite lors de la génération des accords. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9F8F6] py-12 px-4 sm:px-6 lg:px-8 font-sans text-stone-800 print:bg-white print:py-0 print:px-0">
      <div className="max-w-4xl mx-auto print:max-w-none">
        <div className="text-center mb-12 print:hidden">
          <div className="flex justify-center mb-6">
            <div className="bg-[#FFF9F2] p-4 rounded-full border border-[#FFE8D6] shadow-sm">
              <Guitar className="h-10 w-10 text-[#F4A261]" strokeWidth={1.5} />
            </div>
          </div>
          <h1 className="text-4xl font-semibold text-stone-900 tracking-tight sm:text-5xl mb-4">
            Générateur de Partitions
          </h1>
          <p className="text-lg text-stone-500">
            Entrez une chanson et un artiste pour obtenir les accords, les tabs et les paroles.
          </p>
        </div>

        <div className="bg-white shadow-sm border border-stone-200 rounded-[2rem] p-2 mb-6 max-w-2xl mx-auto transition-all hover:shadow-md print:hidden">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row items-center">
            <div className="flex-1 w-full flex items-center px-4 py-2">
              <Music className="h-5 w-5 text-stone-400 mr-3 flex-shrink-0" />
              <input
                type="text"
                value={song}
                onChange={(e) => setSong(e.target.value)}
                className="w-full bg-transparent border-none focus:ring-0 text-stone-800 placeholder-stone-400 outline-none"
                placeholder="Titre (ex: Donna Donna)"
                required
              />
            </div>
            <div className="hidden sm:block w-px h-8 bg-stone-200 mx-2"></div>
            <div className="flex-1 w-full flex items-center px-4 py-2 border-t border-stone-100 sm:border-t-0">
              <input
                type="text"
                value={artist}
                onChange={(e) => setArtist(e.target.value)}
                className="w-full bg-transparent border-none focus:ring-0 text-stone-800 placeholder-stone-400 outline-none"
                placeholder="Artiste (ex: Joan Baez)"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading || !song || !artist}
              className="mt-2 sm:mt-0 w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 rounded-full text-white bg-stone-800 hover:bg-stone-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-stone-500 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200 ease-in-out"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="animate-spin h-5 w-5" />
                  <span className="text-sm">Génération de la partition...</span>
                </div>
              ) : (
                <Search className="h-5 w-5" />
              )}
            </button>
          </form>
        </div>

        <div className="flex justify-center gap-4 sm:gap-6 mb-10 print:hidden">
          <button 
            onClick={() => setActiveTool(activeTool === 'metronome' ? null : 'metronome')}
            className={`flex flex-col items-center justify-center p-4 w-24 h-24 sm:w-28 sm:h-28 rounded-3xl border transition-all duration-200 ${
              activeTool === 'metronome' 
                ? 'bg-stone-800 text-white border-stone-800 shadow-md scale-105' 
                : 'bg-white text-stone-500 border-stone-200 hover:border-stone-300 hover:bg-stone-50 hover:text-stone-700'
            }`}
          >
            <Timer className="w-8 h-8 sm:w-10 sm:h-10 mb-2 sm:mb-3" strokeWidth={1.5} />
            <span className="text-xs sm:text-sm font-medium">Métronome</span>
          </button>

          <button 
            onClick={() => setActiveTool(activeTool === 'tuner' ? null : 'tuner')}
            className={`flex flex-col items-center justify-center p-4 w-24 h-24 sm:w-28 sm:h-28 rounded-3xl border transition-all duration-200 ${
              activeTool === 'tuner' 
                ? 'bg-stone-800 text-white border-stone-800 shadow-md scale-105' 
                : 'bg-white text-stone-500 border-stone-200 hover:border-stone-300 hover:bg-stone-50 hover:text-stone-700'
            }`}
          >
            <Mic className="w-8 h-8 sm:w-10 sm:h-10 mb-2 sm:mb-3" strokeWidth={1.5} />
            <span className="text-xs sm:text-sm font-medium">Accordeur</span>
          </button>

          <button 
            onClick={() => setActiveTool(activeTool === 'audio' ? null : 'audio')}
            className={`flex flex-col items-center justify-center p-4 w-24 h-24 sm:w-28 sm:h-28 rounded-3xl border transition-all duration-200 ${
              activeTool === 'audio' 
                ? 'bg-stone-800 text-white border-stone-800 shadow-md scale-105' 
                : 'bg-white text-stone-500 border-stone-200 hover:border-stone-300 hover:bg-stone-50 hover:text-stone-700'
            }`}
          >
            <PlaySquare className="w-8 h-8 sm:w-10 sm:h-10 mb-2 sm:mb-3" strokeWidth={1.5} />
            <span className="text-xs sm:text-sm font-medium">Lecteur</span>
          </button>
        </div>

        {activeTool === 'metronome' && (
          <div className="max-w-md mx-auto mb-10 animate-in fade-in slide-in-from-top-4 duration-500 print:hidden">
            <Metronome />
          </div>
        )}

        {activeTool === 'tuner' && (
          <div className="max-w-md mx-auto mb-10 animate-in fade-in slide-in-from-top-4 duration-500 print:hidden">
            <Tuner />
          </div>
        )}

        {activeTool === 'audio' && (
          <div className="mb-10 animate-in fade-in slide-in-from-top-4 duration-500 print:hidden">
            <AudioPlayer />
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-100 p-4 mb-8 rounded-2xl max-w-2xl mx-auto print:hidden">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {songData && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <SongDisplay data={songData} onUpdate={setSongData} />
          </div>
        )}
      </div>
    </div>
  );
}
