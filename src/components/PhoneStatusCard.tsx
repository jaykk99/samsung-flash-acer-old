import React from 'react';
import { Device, DeviceState } from '../types';
import { Power, RefreshCw, Zap, ShieldAlert, CheckCircle2, AlertOctagon, Terminal as TerminalIcon, Usb } from 'lucide-react';

interface PhoneStatusCardProps {
  device: Device;
  currentState: DeviceState;
  onStateChange: (state: DeviceState) => void;
  isFlashing: boolean;
  onTriggerJig: () => void;
  onAdbRebootDownload: () => void;
  onInterruptBootloop: () => void;
}

export function PhoneStatusCard({
  device,
  currentState,
  onStateChange,
  isFlashing,
  onTriggerJig,
  onAdbRebootDownload,
  onInterruptBootloop,
}: PhoneStatusCardProps) {
  const getStateBadge = () => {
    switch (currentState) {
      case 'ON':
        return {
          label: 'Powered ON (Android OS)',
          sub: 'ADB / USB Debugging active',
          color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
          dot: 'bg-emerald-400',
        };
      case 'OFF':
        return {
          label: 'Powered OFF (Shutdown)',
          sub: 'Black screen / Battery cold standby',
          color: 'bg-neutral-800 text-neutral-400 border-neutral-700',
          dot: 'bg-neutral-500',
        };
      case 'BOOTLOOP':
        return {
          label: 'Bootloop / Rebooting',
          sub: 'Stuck cycling on boot logo',
          color: 'bg-amber-500/10 text-amber-400 border-amber-500/30 animate-pulse',
          dot: 'bg-amber-400',
        };
      case 'RECOVERY':
        return {
          label: 'Recovery Mode',
          sub: 'TWRP / Android Recovery 3e',
          color: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
          dot: 'bg-purple-400',
        };
      case 'DOWNLOAD':
        return {
          label: 'Download Mode (Odin/Loke)',
          sub: 'Ready for Heimdall flashing',
          color: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30',
          dot: 'bg-cyan-400',
        };
      case 'EDL':
        return {
          label: 'Qualcomm EDL 9008',
          sub: 'Emergency unbrick loader',
          color: 'bg-red-500/10 text-red-400 border-red-500/30',
          dot: 'bg-red-400',
        };
    }
  };

  const badge = getStateBadge();

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 space-y-4">
      {/* Header & State Indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${badge.dot}`} />
          <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
            Detected Device State
          </span>
        </div>
        <span className={`text-[11px] font-mono px-2 py-0.5 rounded border ${badge.color}`}>
          {badge.label}
        </span>
      </div>

      {/* Interactive State Selector / Override */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] text-neutral-500">
          <span>Device Current Condition (Click to toggle/simulate):</span>
        </div>
        <div className="grid grid-cols-5 gap-1 text-[11px] font-mono">
          {(['ON', 'OFF', 'BOOTLOOP', 'RECOVERY', 'DOWNLOAD'] as DeviceState[]).map((st) => {
            const active = currentState === st;
            let btnStyle = 'bg-neutral-950 text-neutral-400 hover:bg-neutral-800 border-neutral-800';
            if (active) {
              if (st === 'ON') btnStyle = 'bg-emerald-950/80 text-emerald-300 border-emerald-600 font-bold';
              else if (st === 'OFF') btnStyle = 'bg-neutral-800 text-neutral-200 border-neutral-500 font-bold';
              else if (st === 'BOOTLOOP') btnStyle = 'bg-amber-950/80 text-amber-300 border-amber-600 font-bold';
              else if (st === 'RECOVERY') btnStyle = 'bg-purple-950/80 text-purple-300 border-purple-600 font-bold';
              else if (st === 'DOWNLOAD') btnStyle = 'bg-cyan-950/80 text-cyan-300 border-cyan-500 font-bold';
            }
            return (
              <button
                key={st}
                disabled={isFlashing}
                onClick={() => onStateChange(st)}
                className={`py-1.5 px-1 rounded border text-center transition-all truncate ${btnStyle} disabled:opacity-50`}
                title={`Simulate device in ${st} state`}
              >
                {st === 'BOOTLOOP' ? 'REBOOT' : st}
              </button>
            );
          })}
        </div>
      </div>

      {/* Screen Graphic & Physical Button Diagram */}
      <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-3 flex flex-col md:flex-row items-center gap-4">
        {/* Visual Phone Frame */}
        <div className="w-28 h-48 bg-neutral-900 border-2 border-neutral-700 rounded-2xl p-1.5 flex flex-col justify-between shrink-0 shadow-xl relative overflow-hidden">
          {/* Top Speaker & Camera */}
          <div className="flex justify-center items-center gap-1.5 pt-0.5">
            <div className="w-6 h-1 bg-neutral-800 rounded-full" />
            <div className="w-1.5 h-1.5 bg-neutral-800 rounded-full" />
          </div>

          {/* Screen Content */}
          <div className="flex-1 my-1.5 rounded-lg overflow-hidden flex flex-col items-center justify-center p-1 text-center font-mono text-[9px] relative bg-black">
            {currentState === 'ON' && (
              <div className="text-emerald-400 space-y-1">
                <div className="text-[14px] font-bold">12:30</div>
                <div className="text-[8px] text-neutral-400">Android OS</div>
                <div className="px-1 py-0.5 bg-emerald-950/60 rounded border border-emerald-800/80 text-[8px]">
                  USB Debugging
                </div>
              </div>
            )}

            {currentState === 'OFF' && (
              <div className="text-neutral-600 space-y-1">
                <Power className="w-5 h-5 mx-auto text-neutral-700" />
                <div className="text-[8px] tracking-tight">POWERED OFF</div>
                <div className="text-[7px] text-neutral-600">Standby / Black</div>
              </div>
            )}

            {currentState === 'BOOTLOOP' && (
              <div className="text-amber-400 space-y-1 animate-pulse">
                <RefreshCw className="w-4 h-4 mx-auto animate-spin" />
                <div className="text-[8px] font-bold">SAMSUNG</div>
                <div className="text-[7px] text-red-400 font-semibold">REBOOT LOOP</div>
              </div>
            )}

            {currentState === 'RECOVERY' && (
              <div className="text-purple-300 space-y-0.5">
                <div className="text-[9px] font-bold text-amber-400">TeamWin</div>
                <div className="text-[7px] text-purple-400">TWRP Recovery</div>
                <div className="text-[6px] text-neutral-400">Install | Wipe</div>
              </div>
            )}

            {currentState === 'DOWNLOAD' && (
              <div className="bg-teal-900/90 inset-0 absolute flex flex-col items-center justify-center p-1 text-cyan-200">
                <div className="w-3 h-3 mb-0.5 border-b-2 border-r-2 border-cyan-300 rotate-45 transform" />
                <div className="text-[8px] font-bold tracking-tight">Downloading...</div>
                <div className="text-[6px] text-teal-300">Do not turn off target</div>
              </div>
            )}

            {currentState === 'EDL' && (
              <div className="text-red-400 space-y-1">
                <AlertOctagon className="w-4 h-4 mx-auto text-red-500" />
                <div className="text-[8px] font-bold">EDL 9008</div>
              </div>
            )}
          </div>

          {/* Bottom Physical Button / Chin */}
          <div className="flex justify-center pb-0.5">
            {device.hasHomeButton ? (
              <div className="w-6 h-2 rounded-full border border-neutral-700 bg-neutral-800" />
            ) : (
              <div className="w-8 h-0.5 bg-neutral-800 rounded-full" />
            )}
          </div>

          {/* Button Highlights on Phone Frame */}
          {/* Vol Down */}
          <div className="absolute -left-1 top-12 w-1 h-5 bg-cyan-400 rounded-r shadow-[0_0_8px_rgba(6,182,212,0.8)]" title="Volume Down" />
          {/* Vol Up */}
          <div className="absolute -left-1 top-6 w-1 h-4 bg-neutral-600 rounded-r" title="Volume Up" />
          {/* Power */}
          <div className="absolute -right-1 top-8 w-1 h-5 bg-neutral-600 rounded-l" title="Power" />
          {/* Bixby if present */}
          {device.hasBixby && (
            <div className="absolute -left-1 top-19 w-1 h-4 bg-cyan-400 rounded-r shadow-[0_0_8px_rgba(6,182,212,0.8)]" title="Bixby Button" />
          )}
        </div>

        {/* State Information & Transition Helpers */}
        <div className="flex-1 space-y-2.5 text-xs">
          <div className="space-y-1">
            <div className="text-neutral-300 font-semibold flex items-center gap-1.5">
              <span>Hardware State Behavior:</span>
            </div>
            <div className="text-neutral-400 text-[11px] leading-relaxed">
              {currentState === 'ON' && (
                <span>
                  Device is in Android OS. Heimdall will auto-dispatch <code className="text-emerald-400">adb reboot download</code> to enter Odin mode seamlessly before flashing.
                </span>
              )}
              {currentState === 'OFF' && (
                <span>
                  Device is completely off. You can use the <span className="text-cyan-400 font-semibold">Virtual 301kΩ USB Jig</span> to wake it directly into Download Mode, or use the hardware button combo below.
                </span>
              )}
              {currentState === 'BOOTLOOP' && (
                <span>
                  Device is rebooting repeatedly. The auto-sniffer will trap the USB handshake during the bootloader warm-up phase to halt the loop and lock into Download Mode.
                </span>
              )}
              {currentState === 'RECOVERY' && (
                <span>
                  Device is in recovery mode. ADB/Recovery shell can switch directly to download mode without user intervention.
                </span>
              )}
              {currentState === 'DOWNLOAD' && (
                <span className="text-cyan-300 font-medium">
                  Device is in Samsung Download Mode (Loke protocol). Ready to flash custom firmware or reset immediately!
                </span>
              )}
            </div>
          </div>

          {/* Model-specific Download Mode Key Guide */}
          <div className="p-2 bg-neutral-900 rounded border border-neutral-800 text-[11px] text-neutral-300 flex items-start gap-2">
            <Usb className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <span className="text-neutral-400 font-mono text-[10px] uppercase block">Hardware Download Trigger for {device.modelName}:</span>
              <span className="font-mono text-cyan-300">{device.downloadCombo}</span>
            </div>
          </div>

          {/* Direct One-Click State Actions */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {currentState === 'ON' && (
              <button
                onClick={onAdbRebootDownload}
                disabled={isFlashing}
                className="px-2.5 py-1 bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 border border-emerald-700/60 rounded text-[11px] flex items-center gap-1.5 font-medium transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                Auto-Reboot to Download Mode
              </button>
            )}

            {(currentState === 'OFF' || currentState === 'BOOTLOOP') && (
              <button
                onClick={onTriggerJig}
                disabled={isFlashing}
                className="px-2.5 py-1 bg-cyan-950/60 hover:bg-cyan-900 text-cyan-300 border border-cyan-700/60 rounded text-[11px] flex items-center gap-1.5 font-medium transition-colors"
                title="Simulate hardware 301k ohm resistor on USB ID pin to wake device into Download Mode"
              >
                <Zap className="w-3 h-3 text-cyan-400" />
                Trigger 301kΩ USB Jig (Force On)
              </button>
            )}

            {currentState === 'BOOTLOOP' && (
              <button
                onClick={onInterruptBootloop}
                disabled={isFlashing}
                className="px-2.5 py-1 bg-amber-950/60 hover:bg-amber-900 text-amber-300 border border-amber-700/60 rounded text-[11px] flex items-center gap-1.5 font-medium transition-colors"
              >
                <AlertOctagon className="w-3 h-3 text-amber-400" />
                Catch & Halt Bootloop
              </button>
            )}

            {currentState !== 'DOWNLOAD' && (
              <button
                onClick={() => onStateChange('DOWNLOAD')}
                disabled={isFlashing}
                className="px-2 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 rounded text-[11px] flex items-center gap-1 font-mono transition-colors"
              >
                <CheckCircle2 className="w-3 h-3 text-cyan-400" />
                Force State: Download
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
