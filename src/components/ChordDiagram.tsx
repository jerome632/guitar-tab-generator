import React from 'react';
import { Chord } from '../types';

export const ChordDiagram: React.FC<{ chord: Chord }> = ({ chord }) => {
  const { name, frets, fingers } = chord;
  
  // Parse frets
  const fretArray = frets.split('').map(f => (f.toLowerCase() === 'x' ? -1 : parseInt(f, 10)));
  
  // Find min and max fret
  const playedFrets = fretArray.filter(f => f > 0);
  const minFret = playedFrets.length > 0 ? Math.min(...playedFrets) : 1;
  const maxFret = playedFrets.length > 0 ? Math.max(...playedFrets) : 4;
  
  let startingFret = 1;
  if (maxFret > 4) {
    startingFret = minFret;
  }

  const numStrings = 6;
  const numFrets = 4;
  const width = 80;
  const height = 100;
  const paddingX = 15;
  const paddingY = 20;
  
  const stringSpacing = (width - 2 * paddingX) / (numStrings - 1);
  const fretSpacing = (height - 2 * paddingY) / numFrets;

  return (
    <div className="flex flex-col items-center mr-8 mb-6">
      <div className="font-semibold text-stone-800 text-lg mb-2">{name}</div>
      <svg width={width} height={height}>
        {/* Nut or top line */}
        <line 
          x1={paddingX} 
          y1={paddingY} 
          x2={width - paddingX} 
          y2={paddingY} 
          stroke="#44403c" 
          strokeWidth={startingFret === 1 ? 4 : 1} 
        />
        
        {/* Strings */}
        {Array.from({ length: numStrings }).map((_, i) => (
          <line
            key={`string-${i}`}
            x1={paddingX + i * stringSpacing}
            y1={paddingY}
            x2={paddingX + i * stringSpacing}
            y2={height - paddingY}
            stroke="#44403c"
            strokeWidth={1}
          />
        ))}

        {/* Frets */}
        {Array.from({ length: numFrets + 1 }).map((_, i) => (
          <line
            key={`fret-${i}`}
            x1={paddingX}
            y1={paddingY + i * fretSpacing}
            x2={width - paddingX}
            y2={paddingY + i * fretSpacing}
            stroke="#44403c"
            strokeWidth={1}
          />
        ))}

        {/* Starting fret number if > 1 */}
        {startingFret > 1 && (
          <text x={2} y={paddingY + fretSpacing / 2 + 4} fontSize="10" fill="#44403c" className="font-medium">
            {startingFret}
          </text>
        )}

        {/* Dots and X/O */}
        {fretArray.map((fret, i) => {
          const x = paddingX + i * stringSpacing;
          if (fret === -1) {
            // Draw X
            return (
              <text key={`x-${i}`} x={x - 3} y={paddingY - 6} fontSize="10" fill="#44403c" className="font-medium">
                x
              </text>
            );
          } else if (fret === 0) {
            // Draw O
            return (
              <circle key={`o-${i}`} cx={x} cy={paddingY - 8} r={2.5} fill="none" stroke="#44403c" strokeWidth={1.5} />
            );
          } else {
            // Draw Dot
            const relativeFret = fret - startingFret + 1;
            if (relativeFret > 0 && relativeFret <= numFrets) {
              const y = paddingY + (relativeFret - 0.5) * fretSpacing;
              return (
                <circle key={`dot-${i}`} cx={x} cy={y} r={4.5} fill="#44403c" />
              );
            }
          }
          return null;
        })}
      </svg>
      {/* Fingers */}
      {fingers && (
        <div className="flex w-[50px] justify-between mt-2 text-xs text-stone-500 font-mono">
          {fingers.split('').map((f, i) => (
            <span key={i} className="w-[8px] text-center">{f.trim() || '\u00A0'}</span>
          ))}
        </div>
      )}
    </div>
  );
};
