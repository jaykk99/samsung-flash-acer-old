import React, { useEffect, useRef } from 'react';
import { LogEntry } from '../types';

interface TerminalProps {
  logs: LogEntry[];
}

export function Terminal({ logs }: TerminalProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="flex flex-col h-full bg-neutral-950 border border-neutral-800 rounded-md overflow-hidden font-mono text-sm shadow-inner">
      <div className="flex items-center justify-between px-4 py-2 bg-neutral-900 border-b border-neutral-800">
        <span className="text-neutral-400 font-semibold text-xs tracking-wider uppercase">Heimdall Output</span>
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/80"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80"></div>
        </div>
      </div>
      <div 
        ref={scrollRef}
        className="flex-1 p-4 overflow-y-auto space-y-1.5 scroll-smooth"
      >
        {logs.map((log, index) => {
          const time = log.timestamp.toLocaleTimeString(undefined, { 
            hour12: false, 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit',
            fractionalSecondDigits: 3
          });
          
          let colorClass = 'text-neutral-300';
          if (log.type === 'error') colorClass = 'text-red-400';
          if (log.type === 'success') colorClass = 'text-emerald-400';
          if (log.type === 'warning') colorClass = 'text-amber-400';
          if (log.type === 'command') colorClass = 'text-blue-400 font-semibold';
          if (log.type === 'info') colorClass = 'text-neutral-400';

          return (
            <div key={index} className="flex gap-3 whitespace-pre-wrap word-break">
              <span className="text-neutral-600 shrink-0">[{time}]</span>
              <span className={colorClass}>
                {log.type === 'command' ? `$ ${log.message}` : log.message}
              </span>
            </div>
          );
        })}
        {logs.length === 0 && (
          <div className="text-neutral-600 italic">Waiting for connection...</div>
        )}
      </div>
    </div>
  );
}
