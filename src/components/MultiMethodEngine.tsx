import React from 'react';
import { FlashMethod, MethodStep, FlashOperation } from '../types';
import {
  ShieldCheck,
  Zap,
  RefreshCw,
  Cpu,
  Terminal as TerminalIcon,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Layers,
  HelpCircle,
} from 'lucide-react';

interface MultiMethodEngineProps {
  selectedMethod: FlashMethod;
  onSelectMethod: (method: FlashMethod) => void;
  operation: FlashOperation;
  isFlashing: boolean;
  activeMethodIndex: number;
  methodSteps: MethodStep[];
}

export function MultiMethodEngine({
  selectedMethod,
  onSelectMethod,
  operation,
  isFlashing,
  activeMethodIndex,
  methodSteps,
}: MultiMethodEngineProps) {
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-800 pb-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
          <div>
            <h3 className="text-xs font-semibold text-neutral-200 uppercase tracking-wider">
              Multi-Method 100% Guarantee Engine
            </h3>
            <p className="text-[11px] text-neutral-400">
              Goes through fallback protocols until your device is successfully reset or running the new OS
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950/80 text-emerald-400 border border-emerald-700/60 font-semibold flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> Auto-Failover Active
          </span>
        </div>
      </div>

      {/* Mode Selector Tabs: Auto-Fallback vs Specific Method */}
      <div className="space-y-2">
        <div className="text-[11px] text-neutral-400 font-medium flex items-center justify-between">
          <span>Execution Strategy:</span>
          <span className="text-[10px] text-neutral-500 font-mono">
            {selectedMethod === 'AUTO_MULTI_METHOD' ? 'All 4 Methods Chained' : 'Single Protocol Selected'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {/* Guaranteed Auto-Fallback Card */}
          <button
            onClick={() => onSelectMethod('AUTO_MULTI_METHOD')}
            disabled={isFlashing}
            className={`p-3 rounded-lg border text-left transition-all ${
              selectedMethod === 'AUTO_MULTI_METHOD'
                ? 'bg-emerald-950/40 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/50'
                : 'bg-neutral-950/80 border-neutral-800 hover:border-neutral-700'
            } disabled:opacity-50`}
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                <Zap className="w-3.5 h-3.5" />
                <span>100% Reliable Auto-Fallback</span>
              </div>
              <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 bg-emerald-900/60 text-emerald-300 rounded">
                Recommended
              </span>
            </div>
            <p className="text-[11px] text-neutral-300 leading-snug">
              Attempts Heimdall Loke mode first. If USB drops or PIT fails, auto-switches to ADB Sideload & Recovery format.
            </p>
          </button>

          {/* Direct Custom Selection Card */}
          <div className="flex flex-col gap-1">
            {(['METHOD_HEIMDALL', 'METHOD_ADB_SIDELOAD', 'METHOD_ODIN4', 'METHOD_HARDWARE_RECOVERY'] as FlashMethod[]).map(
              (mId) => {
                const isCurrent = selectedMethod === mId;
                let label = 'Method 1: Heimdall Loke';
                let short = 'Direct USB download protocol';
                if (mId === 'METHOD_ADB_SIDELOAD') {
                  label = 'Method 2: ADB Sideload';
                  short = 'Recovery-based streaming update';
                } else if (mId === 'METHOD_ODIN4') {
                  label = 'Method 3: Samsung Odin4 Linux';
                  short = 'Official dynamic-partition flasher';
                } else if (mId === 'METHOD_HARDWARE_RECOVERY') {
                  label = 'Method 4: Emergency Reset';
                  short = 'Low-level ext4 wipe & unbrick';
                }

                return (
                  <button
                    key={mId}
                    onClick={() => onSelectMethod(mId)}
                    disabled={isFlashing}
                    className={`px-2.5 py-1.5 rounded border text-left text-xs transition-all flex items-center justify-between ${
                      isCurrent
                        ? 'bg-blue-950/60 text-blue-300 border-blue-500 font-medium'
                        : 'bg-neutral-950 text-neutral-400 border-neutral-800/80 hover:bg-neutral-800'
                    } disabled:opacity-50`}
                  >
                    <span className="truncate">{label}</span>
                    <span className="text-[10px] text-neutral-500 font-mono hidden md:inline">{short}</span>
                  </button>
                );
              }
            )}
          </div>
        </div>
      </div>

      {/* Live Pipeline Visualization: Method 1 -> Method 2 -> Method 3 -> Method 4 */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between text-[11px] text-neutral-400 font-mono">
          <span>Active Recovery Pipeline Chain:</span>
          <span>
            Stage {Math.min(activeMethodIndex + 1, methodSteps.length)} of {methodSteps.length}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          {methodSteps.map((step, idx) => {
            const isSelected = selectedMethod === step.id;
            const isRunning = isFlashing && activeMethodIndex === idx;
            const isCompleted = isFlashing && activeMethodIndex > idx;
            const isFallback = step.status === 'FAILED_FALLBACK';

            let borderClass = 'border-neutral-800 bg-neutral-950';
            let badgeClass = 'text-neutral-500 bg-neutral-900';
            let statusText = 'Ready';

            if (isCompleted || step.status === 'SUCCESS') {
              borderClass = 'border-emerald-600/70 bg-emerald-950/20';
              badgeClass = 'text-emerald-400 bg-emerald-950 border border-emerald-700/60';
              statusText = 'Completed';
            } else if (isRunning) {
              borderClass = 'border-cyan-500 bg-cyan-950/30 animate-pulse';
              badgeClass = 'text-cyan-300 bg-cyan-950 border border-cyan-700/80';
              statusText = 'In Progress';
            } else if (isFallback) {
              borderClass = 'border-amber-600/60 bg-amber-950/20';
              badgeClass = 'text-amber-400 bg-amber-950 border border-amber-700/60';
              statusText = 'Fell Back ➔';
            }

            return (
              <div
                key={step.id}
                className={`p-2.5 rounded-md border text-xs flex flex-col justify-between space-y-2 transition-all ${borderClass}`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-[10px] text-neutral-500 uppercase">
                      Method {idx + 1}
                    </span>
                    <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${badgeClass}`}>
                      {statusText}
                    </span>
                  </div>
                  <div className="font-semibold text-neutral-200 text-[11px] truncate">
                    {step.name}
                  </div>
                  <div className="text-[10px] text-neutral-400 line-clamp-2 mt-0.5">
                    {step.description}
                  </div>
                </div>

                <div className="pt-1 border-t border-neutral-800/80 font-mono text-[9px] text-cyan-400 truncate">
                  $ {step.linuxCommand.split(';')[0]}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
