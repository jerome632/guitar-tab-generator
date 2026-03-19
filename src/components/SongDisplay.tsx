import React, { useState } from 'react';
import { Download, Printer, Loader2, Edit2, Check, X } from 'lucide-react';
import { SongData } from '../types';
import { ChordDiagram } from './ChordDiagram';
import domtoimage from 'dom-to-image-more';
import jsPDF from 'jspdf';

const isChord = (text: string) => {
  const chordRegex = /^([A-G][#b]?(m|M|maj|min|dim|aug|sus|add)?[0-9]*([#b][0-9]+)?(?:\/[A-G][#b]?)?|N\.C\.|\||\(.*\)|x|~|-)$/;
  return chordRegex.test(text);
};

const formatContent = (content: string) => {
  const lines = content.split('\n');
  return lines.map((line, i) => {
    // Check for bracketed chords first [Am]
    if (line.includes('[') && line.includes(']')) {
      const parts = line.split(/(\[[^\]]+\])/g);
      
      // Check if any bracketed part is actually a chord
      const hasChords = parts.some(part => {
        if (part.startsWith('[') && part.endsWith(']')) {
          return isChord(part.slice(1, -1).trim());
        }
        return false;
      });

      if (hasChords) {
        const pairs: { chord: string, lyric: string }[] = [];
        let currentChord = '';
        
        for (let p of parts) {
          if (p.startsWith('[') && p.endsWith(']')) {
            const innerText = p.slice(1, -1).trim();
            if (isChord(innerText)) {
              currentChord = innerText;
            } else {
              // If it's not a chord (e.g., [Verse 1]), treat it as lyric
              if (currentChord || p) {
                pairs.push({ chord: currentChord, lyric: p });
              }
              currentChord = '';
            }
          } else {
            if (currentChord || p) {
              pairs.push({ chord: currentChord, lyric: p });
            }
            currentChord = '';
          }
        }
        
        if (currentChord) {
          pairs.push({ chord: currentChord, lyric: '' });
        }

        return (
          <div key={i} className="flex flex-wrap items-end leading-tight mb-2">
            {pairs.map((pair, j) => (
              <div key={j} className="flex flex-col justify-end">
                <span className="text-blue-600 font-semibold whitespace-pre">{pair.chord || ' '}</span>
                <span className="whitespace-pre">{pair.lyric || (pair.chord ? ' ' : '')}</span>
              </div>
            ))}
          </div>
        );
      }
    }

    const tokens = line.trim().split(/\s+/);
    if (tokens.length > 0 && line.trim() !== '') {
      // Allow the first token to be something like "Intro:" or "Chorus:"
      let tokensToCheck = tokens;
      if (tokens[0].endsWith(':')) {
        tokensToCheck = tokens.slice(1);
      }

      // If there are no tokens left (e.g., line was just "Intro:"), it's not a chord line
      if (tokensToCheck.length > 0) {
        const isChordLine = tokensToCheck.every(token => isChord(token));
        
        if (isChordLine) {
          const parts = line.split(/(\s+)/);
          return (
            <div key={i} className="mb-0 font-mono text-[15px] leading-tight">
              {parts.map((part, j) => {
                if (part.trim() === '') return <span key={j} className="whitespace-pre">{part}</span>;
                if (part.endsWith(':')) return <span key={j} className="text-stone-700 font-bold">{part}</span>;
                return <span key={j} className="text-blue-600 font-semibold">{part}</span>;
              })}
            </div>
          );
        }
      }
    }

    return <div key={i} className="min-h-[1.5rem] font-mono text-[15px] leading-tight whitespace-pre-wrap">{line}</div>;
  });
};

export const SongDisplay: React.FC<{ data: SongData, onUpdate?: (data: SongData) => void }> = ({ data, onUpdate }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedSections, setEditedSections] = useState(data.sections);

  const handleSaveEdit = () => {
    if (onUpdate) {
      onUpdate({ ...data, sections: editedSections });
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditedSections(data.sections);
    setIsEditing(false);
  };

  const handleSectionChange = (index: number, newContent: string) => {
    const newSections = [...editedSections];
    newSections[index] = { ...newSections[index], content: newContent };
    setEditedSections(newSections);
  };

  const handleDownload = async () => {
    const element = document.getElementById('song-container');
    if (!element) return;

    try {
      setIsGenerating(true);
      
      // Temporarily adjust styles for better PDF rendering
      const originalStyle = element.style.cssText;
      element.style.padding = '40px';
      element.style.background = 'white';
      element.style.width = '800px';
      element.style.maxWidth = 'none';
      element.style.margin = '0';
      element.style.borderRadius = '0';
      element.style.border = 'none';
      element.style.boxShadow = 'none';
      
      // Fix for dom-to-image-more rendering Tailwind's default border-style: solid as black borders
      const styleEl = document.createElement('style');
      styleEl.innerHTML = `
        *, ::before, ::after { border-style: none !important; }
        .border { border-style: solid !important; }
        .border-b { border-bottom-style: solid !important; }
        .border-t { border-top-style: solid !important; }
        .border-l { border-left-style: solid !important; }
        .border-r { border-right-style: solid !important; }
        .border-2 { border-style: solid !important; }
      `;
      element.appendChild(styleEl);
      
      const scale = 2;
      
      const dataUrl = await domtoimage.toPng(element, {
        quality: 1,
        width: 800 * scale,
        height: element.offsetHeight * scale,
        style: {
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          width: `800px`,
          height: `${element.offsetHeight}px`
        }
      });
      
      element.removeChild(styleEl);
      element.style.cssText = originalStyle;

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const margin = 15; // 15mm standard print margin
      const printableWidth = pdfWidth - 2 * margin;
      const printableHeight = pdfHeight - 2 * margin;
      
      const imgProps = pdf.getImageProperties(dataUrl);
      const imgWidth = printableWidth;
      const imgHeight = (imgProps.height * printableWidth) / imgProps.width;

      let heightLeft = imgHeight;
      let position = 0;

      // First page
      pdf.addImage(dataUrl, 'PNG', margin, position + margin, imgWidth, imgHeight);
      heightLeft -= printableHeight;
      
      // Mask bottom margin
      pdf.setFillColor(255, 255, 255);
      pdf.rect(0, pdfHeight - margin, pdfWidth, margin, 'F');

      while (heightLeft > 0) {
        position -= printableHeight;
        pdf.addPage();
        pdf.addImage(dataUrl, 'PNG', margin, position + margin, imgWidth, imgHeight);
        
        // Mask top margin
        pdf.setFillColor(255, 255, 255);
        pdf.rect(0, 0, pdfWidth, margin, 'F');
        
        // Mask bottom margin
        pdf.rect(0, pdfHeight - margin, pdfWidth, margin, 'F');
        
        heightLeft -= printableHeight;
      }

      pdf.save(`${data.title} - ${data.artist}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      // Fallback to print if PDF generation fails
      window.print();
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div id="song-container" className="bg-white shadow-sm border border-stone-200 rounded-[2rem] p-8 sm:p-12 max-w-4xl w-full mx-auto font-sans text-stone-800 print:shadow-none print:border-none print:p-0 print:m-0">
      <div className="flex flex-col sm:flex-row justify-between items-start mb-10 border-b border-stone-100 pb-8 print:border-b-2 print:border-stone-800">
        <div>
          <h1 className="text-3xl sm:text-4xl font-semibold mb-4 text-stone-900">
            {data.title} <span className="text-stone-400 font-normal">par</span> {data.artist}
          </h1>
          <div className="flex flex-wrap gap-3 text-sm text-stone-500">
            <span className="bg-[#F9F8F6] px-4 py-1.5 rounded-full border border-stone-200 print:border-stone-300 print:bg-white">
              Difficulté: <span className="font-medium text-stone-700">{data.difficulty}</span>
            </span>
            <span className="bg-[#F9F8F6] px-4 py-1.5 rounded-full border border-stone-200 print:border-stone-300 print:bg-white">
              Accordage: <span className="font-medium text-stone-700">{data.tuning}</span>
            </span>
            <span className="bg-[#F9F8F6] px-4 py-1.5 rounded-full border border-stone-200 print:border-stone-300 print:bg-white">
              Capodastre: <span className="font-medium text-stone-700">{data.capo}</span>
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {isEditing ? (
            <>
              <button
                onClick={handleCancelEdit}
                className="mt-6 sm:mt-0 print:hidden flex items-center gap-2 px-5 py-2.5 bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-full transition-colors text-sm font-medium shadow-sm"
              >
                <X className="w-4 h-4" />
                <span>Annuler</span>
              </button>
              <button
                onClick={handleSaveEdit}
                className="mt-6 sm:mt-0 print:hidden flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full transition-colors text-sm font-medium shadow-sm"
              >
                <Check className="w-4 h-4" />
                <span>Enregistrer</span>
              </button>
            </>
          ) : (
            <>
              {onUpdate && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="mt-6 sm:mt-0 print:hidden flex items-center gap-2 px-5 py-2.5 bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-full transition-colors text-sm font-medium shadow-sm"
                  title="Modifier la partition"
                >
                  <Edit2 className="w-4 h-4" />
                  <span>Modifier</span>
                </button>
              )}
              <button
                onClick={handleDownload}
                disabled={isGenerating}
                className="mt-6 sm:mt-0 print:hidden flex items-center gap-2 px-5 py-2.5 bg-stone-800 hover:bg-stone-700 disabled:bg-stone-400 text-white rounded-full transition-colors text-sm font-medium shadow-sm"
                title="Télécharger en PDF"
              >
                {isGenerating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                <span>{isGenerating ? 'Génération...' : 'Télécharger PDF'}</span>
              </button>
            </>
          )}
        </div>
      </div>

      <div id="song-display-content" className="bg-white">
        <div className="mb-10 print:break-inside-avoid">
          <h2 className="text-xs font-semibold mb-5 uppercase tracking-widest text-stone-400 print:text-stone-600">Accords</h2>
          <div className="flex flex-wrap">
            {data.chords.map((chord, index) => (
              <ChordDiagram key={index} chord={chord} />
            ))}
          </div>
        </div>

        {data.strumming && (
          <div className="mb-10 print:break-inside-avoid">
            <h2 className="text-xs font-semibold mb-5 uppercase tracking-widest text-stone-400 print:text-stone-600">Schéma de Strumming</h2>
            <div className="flex items-center gap-4">
              <div className="font-mono text-base bg-[#F9F8F6] border border-stone-100 px-5 py-3 rounded-2xl text-stone-700 print:bg-white print:border-stone-300">
                {data.strumming.pattern}
              </div>
              <div className="text-sm text-stone-500">
                <span className="font-medium text-stone-700">{data.strumming.bpm}</span> bpm
              </div>
            </div>
          </div>
        )}

        <div className="space-y-8">
          {(isEditing ? editedSections : data.sections).map((section, index) => (
            <div key={index} className="mb-6 print:break-inside-avoid">
              <h3 className="font-medium text-stone-800 mb-3">{section.title}</h3>
              {isEditing ? (
                <textarea
                  value={section.content}
                  onChange={(e) => handleSectionChange(index, e.target.value)}
                  className="w-full h-64 font-mono text-sm whitespace-pre leading-relaxed overflow-x-auto bg-white border-2 border-stone-200 focus:border-stone-800 focus:ring-0 p-6 rounded-3xl text-stone-700 outline-none resize-y"
                  spellCheck={false}
                />
              ) : (
                <pre className="font-mono text-sm whitespace-pre-wrap leading-relaxed overflow-x-auto bg-[#F9F8F6] border border-stone-100 p-6 rounded-3xl text-stone-700 print:bg-transparent print:border-none print:p-0 print:overflow-visible">
                  {formatContent(section.content)}
                </pre>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
