import { GoogleGenAI, Type } from '@google/genai';
import { SongData } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

function parseChordPro(content: string): string {
  const lines = content.split('\n');
  const result: string[] = [];

  for (const line of lines) {
    if (!line.includes('[')) {
      result.push(line);
      continue;
    }

    let chordLine = '';
    let lyricLine = '';
    
    let i = 0;
    while (i < line.length) {
      if (line[i] === '[') {
        const endIdx = line.indexOf(']', i);
        if (endIdx !== -1) {
          const chord = line.substring(i + 1, endIdx);
          
          while (chordLine.length < lyricLine.length) {
            chordLine += ' ';
          }
          
          while (lyricLine.length < chordLine.length) {
            lyricLine += ' ';
          }
          
          if (chordLine.length > 0 && chordLine[chordLine.length - 1] !== ' ' && chordLine.length >= lyricLine.length) {
            chordLine += ' ';
            lyricLine += ' ';
          }
          
          chordLine += chord;
          i = endIdx + 1;
        } else {
          lyricLine += line[i];
          i++;
        }
      } else {
        lyricLine += line[i];
        i++;
      }
    }

    if (chordLine.trim().length > 0) {
      result.push(chordLine.trimEnd());
    }
    if (lyricLine.trim().length > 0 || chordLine.trim().length === 0) {
      result.push(lyricLine.trimEnd());
    }
  }

  return result.join('\n');
}

export async function generateSongData(song: string, artist: string, instrument: 'guitar' | 'piano'): Promise<SongData> {
  const schema = {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING },
      artist: { type: Type.STRING },
      instrument: { type: Type.STRING, description: "'guitar' or 'piano'" },
      difficulty: { type: Type.STRING },
      tuning: { type: Type.STRING, description: "Guitar only. e.g. E A D G B E" },
      capo: { type: Type.STRING, description: "Guitar only. e.g. 2nd fret" },
      abcNotation: { type: Type.STRING, description: "Piano only. A complete and valid ABC notation string representing the sheet music for the song. Include headers like X:1, T:Title, M:4/4, L:1/8, K:Key, and the notes. Use V:1 clef=treble and V:2 clef=bass if possible." },
      chords: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            frets: { type: Type.STRING, description: "Guitar only. 6 characters representing the 6 strings from low E to high e. Use 'x' for muted, '0' for open, and numbers for frets. e.g. 'x02210' for Am." },
            fingers: { type: Type.STRING, description: "Optional. 6 characters representing the fingers used for each string. 1=index, 2=middle, 3=ring, 4=pinky, T=thumb. Use space for open/muted strings. e.g. '  231 '" }
          },
          required: ["name", "frets"]
        }
      },
      strumming: {
        type: Type.OBJECT,
        properties: {
          pattern: { type: Type.STRING, description: "e.g. D D U U D U" },
          bpm: { type: Type.NUMBER }
        }
      },
      sections: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            type: { type: Type.STRING, description: "'tab' or 'lyrics'" },
            title: { type: Type.STRING, description: "e.g. [Intro] or [Verse 1]" },
            content: { type: Type.STRING, description: "The actual tab or lyrics with chords. Place chords on the line directly ABOVE the lyrics. Preserve EXACT spacing so chords align perfectly with the correct syllables." }
          },
          required: ["type", "title", "content"]
        }
      }
    },
    required: ["title", "artist", "instrument", "difficulty", "sections"]
  };

  const prompt = instrument === 'piano' 
    ? `Search the web for the most accurate and highly-rated chords and lyrics for the song "${song}" by "${artist}". 
    You MUST base your response on professional chord charts (like Ultimate Guitar).
    
    You MUST provide the 'abcNotation' field with valid ABC notation for the piano arrangement. 
    Also include the lyrics and chords in the 'sections' array.
    
    CRITICAL INSTRUCTIONS FOR LYRICS AND CHORDS:
    1. You MUST output the lyrics and chords in ChordPro format (e.g., "On a [Am]wagon [E]bound for [Am]market").
    2. DO NOT output chords on a separate line above the lyrics. Embed them directly in the lyrics using brackets [].
    3. For instrumental sections (like Intro), just list the chords in brackets: "[Am] [C] [G]".
    
    Ensure the response is accurate and formatted nicely.`
    : `Search the web for the most accurate and highly-rated guitar chords and lyrics for the song "${song}" by "${artist}". 
    You MUST base your response on professional chord charts (like Ultimate Guitar).
    
    Include the intro tab if applicable, and the lyrics and chords in the 'sections' array.
    
    CRITICAL INSTRUCTIONS FOR LYRICS AND CHORDS:
    1. You MUST output the lyrics and chords in ChordPro format (e.g., "On a [Am]wagon [E]bound for [Am]market").
    2. DO NOT output chords on a separate line above the lyrics. Embed them directly in the lyrics using brackets [].
    3. For instrumental sections (like Intro), just list the chords in brackets: "[Am] [C] [G]".
    
    Ensure the response is accurate and formatted nicely.
    For the 'frets' field in chords, always provide exactly 6 characters (e.g., 'x32010' for C major).`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.1-pro-preview',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: schema,
      temperature: 0.1,
      tools: [{ googleSearch: {} }]
    }
  });

  if (!response.text) {
    throw new Error("Failed to generate song data");
  }

  const data = JSON.parse(response.text) as SongData;
  
  // Parse ChordPro format into aligned text
  data.sections = data.sections.map(section => ({
    ...section,
    content: parseChordPro(section.content)
  }));

  return data;
}
