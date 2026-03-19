export interface Chord {
  name: string;
  frets: string; // e.g., 'x02210'
  fingers?: string; // e.g., ' 123 '
}

export interface Strumming {
  pattern: string; // e.g., "D D U U D U"
  bpm: number;
}

export interface Section {
  type: 'tab' | 'lyrics' | 'sheet_music';
  title: string;
  content: string;
}

export interface SongData {
  title: string;
  artist: string;
  instrument: 'guitar' | 'piano';
  difficulty: string;
  tuning?: string;
  capo?: string;
  chords?: Chord[];
  strumming?: Strumming;
  abcNotation?: string;
  sections: Section[];
}
