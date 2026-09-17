import React, { useEffect, useRef, useState } from 'react';
import { LogEntry } from '../types';
import { Trash2, Copy, Check } from 'lucide-react';

interface TerminalProps {
  logs: LogEntry[];
  onClearLogs?: () => void;
}

export function Terminal({ logs, onClearLogs }: TerminalProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const handleCopy = () => {
    const text = logs.map(l => `[${l.timestamp.toISOString()}] ${l.type.toUpperCase()}: ${l.message}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-neutral-950 border border-neutral-800 rounded-md overflow-hidden font-mono text-sm shadow-inner">
      <div className="flex items-center justify-between px-4 py-2 bg-neutral-900 border-b border-neutral-800">
        <div className="flex items-center gap-2">
          <span className="text-neutral-400 font-semibold text-xs tracking-wider uppercase">Heimdall / ADB Log Stream</span>
          <span className="text-[10px] text-neutral-500 font-normal">({logs.length} events)</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleCopy}
            className="text-neutral-400 hover:text-neutral-200 text-xs flex items-center gap-1 transition-colors"
            title="Copy logs to clipboard"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="text-[11px] hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
          </button>
          {onClearLogs && (
            <button
              onClick={onClearLogs}
              className="text-neutral-400 hover:text-neutral-200 text-xs flex items-center gap-1 transition-colors"
              title="Clear terminal logs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="text-[11px] hidden sm:inline">Clear</span>
            </button>
          )}
          <div className="flex gap-1.5 pl-1 border-l border-neutral-700">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/80"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80"></div>
          </div>
        </div>
      </div>
      <div 
        ref={scrollRef}
        className="flex-1 p-4 overflow-y-auto space-y-1.5 scroll-smooth select-text"
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
            <div key={index} className="flex gap-2.5 whitespace-pre-wrap word-break leading-relaxed text-xs">
              <span className="text-neutral-600 shrink-0 select-none">[{time}]</span>
              <span className={colorClass}>
                {log.type === 'command' ? `$ ${log.message}` : log.message}
              </span>
            </div>
          );
        })}
        {logs.length === 0 && (
          <div className="text-neutral-600 italic text-xs">No active log entries. Ready for device connection...</div>
        )}
      </div>
    </div>
  );
}
