import React, { useState } from 'react';
import { Terminal as TerminalIcon, Copy, Check, Sparkles, CheckCircle2, ChevronRight, FileText } from 'lucide-react';

export function LinuxCommandHelper() {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const workflows = [
    {
      methodNum: 'FRESH',
      title: 'Total Clean Reinstall: Wipe EVERYTHING & Reinstall Like New',
      desc: 'Zeroes out old userdata, cache, and system partitions, clears corrupt superblocks, and writes clean OS firmware so the phone boots brand new',
      commands: [
        'sudo ./flash-samsung.sh --fresh',
      ],
      singleLine: 'lsusb | grep -qiE "04e8|samsung" && (adb reboot download 2>/dev/null || true) && sudo heimdall flash --USERDATA empty.ext4 --CACHE empty.ext4 --SYSTEM system.img --BOOT boot.img',
      badge: 'Fresh Out-of-Box',
    },
    {
      methodNum: 'ALL',
      title: '1-to-2 Command Universal Auto-Detector & Multi-Method Runner',
      desc: 'Detects "Samsung" on USB bus, cycles through Heimdall, ADB Sideload & Reset until 100% success',
      commands: [
        'chmod +x ./flash-samsung.sh',
        'sudo ./flash-samsung.sh',
      ],
      singleLine: 'lsusb | grep -qi "04e8\\|samsung" && (adb reboot download 2>/dev/null || true) && sudo heimdall detect && sudo heimdall print-pit',
      badge: '100% Multi-Method',
    },
    {
      methodNum: '1',
      title: 'Method 1: Direct Heimdall Loke Flash (1 Command)',
      desc: 'Direct partition write to BOOT, SYSTEM, and VENDOR. Reboots device to Download mode automatically',
      commands: [
        'adb reboot download 2>/dev/null; sudo heimdall flash --BOOT boot.img --SYSTEM system.img --VENDOR vendor.img',
      ],
      badge: 'Download Mode',
    },
    {
      methodNum: '2',
      title: 'Method 2: ADB Sideload Recovery OS Update (1 Command)',
      desc: 'Alternative method when USB drops or PIT table locks. Streams full LineageOS/ROM via Recovery',
      commands: [
        'adb reboot sideload 2>/dev/null; adb sideload lineage-os.zip',
      ],
      badge: 'Recovery Mode',
    },
    {
      methodNum: '3',
      title: 'Method 3: 1-Command Factory Reset & Wipe (Unbrick Bootloops)',
      desc: 'Erases corrupted userdata ext4 superblocks and flushes cache partitions clean',
      commands: [
        'adb reboot download 2>/dev/null; sudo heimdall flash --USERDATA empty.ext4 --CACHE empty.ext4',
      ],
      badge: 'Full Wipe',
    },
    {
      methodNum: '4',
      title: 'Method 4: Samsung Official Odin4 Dynamic-Partition Flasher',
      desc: 'Native Samsung Linux engine for modern multi-file firmware (AP, BL, CP, CSC)',
      commands: [
        'sudo ./odin4 -a AP.tar.md5 -b BL.tar.md5 -c CP.tar.md5 -s CSC.tar.md5',
      ],
      badge: 'Stock 4-File',
    },
  ];

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-800 pb-3">
        <div className="flex items-center gap-2">
          <TerminalIcon className="w-4 h-4 text-emerald-400" />
          <h3 className="text-xs font-semibold text-neutral-200 uppercase tracking-wider">
            Linux 1-to-2 Command Center
          </h3>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800/80 font-medium">
          Matches "Samsung" in Terminal (VID 04E8)
        </span>
      </div>

      {/* Visual Terminal Detection Preview: shows user what terminal prints */}
      <div className="bg-neutral-950 border border-neutral-800/90 rounded-md p-3 space-y-2">
        <div className="flex items-center justify-between text-[11px] text-neutral-400 font-mono">
          <span>Terminal Hardware Verification (Why it detects Samsung):</span>
          <span className="text-emerald-400 font-bold">$ lsusb | grep -i samsung</span>
        </div>
        <div className="bg-black/90 rounded p-2.5 font-mono text-[11px] text-neutral-300 space-y-1 border border-neutral-800">
          <div className="text-neutral-500">$ lsusb | grep -i samsung</div>
          <div className="text-emerald-400 font-semibold">
            Bus 001 Device 018: ID 04e8:685d Samsung Electronics Co., Ltd Mobile Phone [Loke/Download]
          </div>
          <div className="text-cyan-300 text-[10px]">
            ➔ Detected vendorId 04E8 (Samsung). System is ready for direct 1-command flashing!
          </div>
        </div>
      </div>

      {/* Command List */}
      <div className="space-y-3">
        {workflows.map((item, idx) => {
          const fullCmd = item.commands.join(' && ');
          return (
            <div
              key={idx}
              className="bg-neutral-950 border border-neutral-800/90 rounded-md p-3 space-y-2 hover:border-neutral-700 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-300">
                      {item.badge}
                    </span>
                    <h4 className="text-xs font-semibold text-neutral-200">{item.title}</h4>
                  </div>
                  <p className="text-[11px] text-neutral-400 mt-0.5">{item.desc}</p>
                </div>
                <button
                  onClick={() => handleCopy(fullCmd, idx)}
                  className="px-2 py-1 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-cyan-300 border border-neutral-700 rounded text-[11px] font-mono flex items-center gap-1.5 shrink-0 transition-colors"
                  title="Copy command"
                >
                  {copiedIndex === idx ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400 font-bold">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>

              {/* Code Snippet Box */}
              <div className="bg-neutral-900/90 rounded p-2 text-[11px] font-mono text-cyan-300 overflow-x-auto whitespace-pre select-all border border-neutral-800">
                {item.commands.map((c, cIdx) => (
                  <div key={cIdx} className="leading-relaxed">
                    <span className="text-neutral-500 select-none">$ </span>
                    <span>{c}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
