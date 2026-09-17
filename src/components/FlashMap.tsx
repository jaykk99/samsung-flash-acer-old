import React from 'react';
import { Partition } from '../types';
import { DEFAULT_PARTITIONS } from '../devices';
import { Database, Smartphone, FileArchive } from 'lucide-react';

export function FlashMap() {
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-md p-4 flex flex-col h-full">
      <div className="flex items-center gap-2 mb-4">
        <Database className="w-4 h-4 text-neutral-400" />
        <h3 className="text-neutral-200 font-medium text-sm">Target PIT Layout (Partition Information Table)</h3>
      </div>
      
      <div className="flex flex-col gap-1 rounded-sm overflow-hidden border border-neutral-800 flex-1">
        {DEFAULT_PARTITIONS.map((part, idx) => (
          <div 
            key={idx} 
            className={`${part.color} p-2 flex items-center justify-between text-xs transition-colors hover:brightness-110 cursor-help group relative`}
            title={part.description}
          >
            <div className="flex items-center gap-2 font-mono">
              <span className="text-white/90 font-bold">{part.name}</span>
              <span className="text-white/50 text-[10px] hidden sm:inline-block">{part.flashFilename}</span>
            </div>
            <span className="text-white/70 font-mono">{part.size}</span>
            
            {/* Tooltip */}
            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-2 py-1 bg-neutral-950 text-neutral-300 border border-neutral-700 rounded text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-lg">
              {part.description}
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-neutral-500">
        <div className="flex items-center gap-1">
          <Smartphone className="w-3 h-3" /> Mode: Odin / Download
        </div>
        <div className="flex items-center gap-1">
          <FileArchive className="w-3 h-3" /> PIT: Embedded / Downloaded
        </div>
      </div>
    </div>
  );
}
