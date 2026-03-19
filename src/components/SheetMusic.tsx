import React, { useEffect, useRef } from 'react';
import abcjs from 'abcjs';
import 'abcjs/abcjs-audio.css';

export const SheetMusic: React.FC<{ abc: string }> = ({ abc }) => {
  const divRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (divRef.current && abc) {
      abcjs.renderAbc(divRef.current, abc, { 
        responsive: 'resize',
        add_classes: true,
      });
    }
  }, [abc]);

  return (
    <div className="w-full overflow-x-auto bg-white p-4 rounded-md border border-gray-200 shadow-sm">
      <div ref={divRef} className="min-w-[600px]" />
    </div>
  );
};
