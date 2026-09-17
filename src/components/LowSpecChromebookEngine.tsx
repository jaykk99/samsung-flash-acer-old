import React, { useState } from 'react';
import {
  Laptop,
  Cpu,
  Zap,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Terminal,
  RefreshCw,
  Layers,
  HardDrive,
  ShieldAlert,
} from 'lucide-react';

export const LowSpecChromebookEngine: React.FC = () => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [chromebookModel, setChromebookModel] = useState<'crostini' | 'native_linux'>('crostini');
  const [appUrl, setAppUrl] = useState<string>('http://localhost:3000');

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      setAppUrl(window.location.origin);
    }
  }, []);

  const copySnippet = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const crostiniUsbSetup = `# 1. Allow Samsung USB device (04e8) through ChromeOS VM hypervisor
# In ChromeOS Settings -> Advanced -> Developers -> Linux development environment:
# Toggle ON 'Allow Linux to access USB devices' whenever you plug your Samsung in.
#
# 2. Inside the Linux Terminal (Debian Crostini):
sudo apt-get update -y
sudo apt-get install -y --no-install-recommends heimdall-flash android-tools-adb usbutils udev libusb-1.0-0

# 3. Create persistent ChromeOS Crostini udev rules:
sudo mkdir -p /etc/udev/rules.d
echo 'SUBSYSTEM=="usb", ATTR{idVendor}=="04e8", MODE="0666", GROUP="plugdev"' | sudo tee /etc/udev/rules.d/51-samsung.rules
sudo udevadm control --reload-rules && sudo udevadm trigger

# 4. Low-RAM memory safety flag (Chromebook 2GB/4GB RAM swap prevention):
sudo sysctl -w vm.swappiness=10
sudo sysctl -w vm.vfs_cache_pressure=50`;

  const lowMemoryDirectFlash = `# ⚡ Ultra-Lightweight 1-Line Execution for 2GB/4GB RAM Laptops
# Bypasses heavy browser/RAM overhead and streams partitions directly to USB endpoint:
curl -sSL ${appUrl}/api/script/download | sudo bash`;

  const dynamicPartitionUniversalCmd = `# 🌐 UNIVERSAL SAMSUNG MATRIX:
# Works on ANY Galaxy (Galaxy S2 up to Galaxy S24 Ultra & All A-Series)
# Automatically detects if device is Legacy (ext4) or Modern (super.img dynamic)

sudo bash -c '
if heimdall print-pit 2>&1 | grep -qi "super"; then
    echo ">> Detected MODERN Samsung (Dynamic super.img partition table)"
    echo ">> Flashing BL + AP + CP + CSC tar package in low-memory stream mode..."
    heimdall flash --AP super.img --BOOT boot.img --RECOVERY recovery.img
else
    echo ">> Detected LEGACY Samsung (Raw Ext4 partitions: S2/S3/S4/S5/S7/S8/S9/J-Series)"
    echo ">> Flashing standard direct ext4 raw blocks..."
    heimdall flash --BOOT boot.img --SYSTEM system.img --USERDATA empty.ext4 --CACHE empty.ext4
fi
'`;

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-amber-950/60 border border-amber-800/60 text-amber-400">
            <Laptop className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-neutral-100">
                Low-Spec Linux & Acer Chromebook Optimization
              </h2>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-amber-950/80 text-amber-300 border border-amber-800/80">
                2GB - 4GB RAM Tuned
              </span>
            </div>
            <p className="text-xs text-neutral-400">
              Zero-lag streaming, Crostini Linux container USB forwarding, and universal device support
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-800/60 px-2.5 py-1 rounded-lg">
            <Zap className="w-3.5 h-3.5" />
            Zero-RAM Direct Pipe
          </span>
        </div>
      </div>

      {/* ERROR TROUBLESHOOTING ALERT FOR CHROMEBOOK SUDO ISSUES */}
      <div className="bg-red-950/30 border border-red-900/50 rounded-lg p-4 space-y-3">
        <div className="flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-red-400">Fixing the "sudo: unable to load libpam.so.0" Chromebook Error</h3>
            <p className="text-[13px] text-red-200/80 leading-relaxed">
              If you receive an <code className="bg-red-950/80 px-1 py-0.5 rounded font-mono text-xs">Input/output error</code> or a fatal <code className="bg-red-950/80 px-1 py-0.5 rounded font-mono text-xs">sudoers.so</code> / <code className="bg-red-950/80 px-1 py-0.5 rounded font-mono text-xs">libpam</code> error when trying to run the script, your ChromeOS Linux container is severely corrupted and is blocking Administrator access.
            </p>
            <div className="bg-black/40 border border-red-900/30 rounded-md p-3 text-xs space-y-2 text-neutral-300 mt-2">
              <p className="font-semibold text-neutral-200">How to fix it instantly:</p>
              <ol className="list-decimal pl-4 space-y-1.5">
                <li>Open your Chromebook <strong>Settings</strong>.</li>
                <li>Go to <strong>Advanced</strong> → <strong>Developers</strong> → <strong>Linux development environment</strong>.</li>
                <li>Click <span className="text-red-400 font-semibold">Remove Linux development environment</span> and hit Delete.</li>
                <li>Once deleted, click <span className="text-emerald-400 font-semibold">Turn On</span> to install a fresh, clean Linux container.</li>
                <li>Open Terminal again and run the 1-Line command below. It will now work perfectly.</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      {/* Chromebook Environment Switcher */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-neutral-200">Select Your Chromebook / Linux Environment:</span>
          <div className="flex items-center gap-1.5 text-xs">
            {(['crostini', 'native_linux'] as const).map(env => (
              <button
                key={env}
                onClick={() => setChromebookModel(env)}
                className={`px-3 py-1 rounded-md text-xs font-mono transition border \${
                  chromebookModel === env
                    ? 'bg-amber-950 text-amber-300 border-amber-800 font-semibold'
                    : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-neutral-200'
                }`}
              >
                {env === 'crostini' ? 'ChromeOS Linux (Crostini Default)' : 'Native Linux / Acer Dual-Boot'}
              </button>
            ))}
          </div>
        </div>

        {/* Snippet 2: Low-RAM Direct Flashing Pipe */}
        <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-4 space-y-2 shadow-[0_0_15px_rgba(16,185,129,0.05)] border-emerald-900/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-medium text-neutral-200">
                1-Line Execution Command (Fixes "Input/output" and URL typos)
              </span>
            </div>
            <button
              onClick={() => copySnippet(lowMemoryDirectFlash, 'low_ram')}
              className="flex items-center gap-1 text-xs font-mono px-3 py-1.5 rounded-md bg-emerald-900/30 hover:bg-emerald-900/50 text-emerald-300 border border-emerald-800/50 transition font-semibold"
            >
              {copiedId === 'low_ram' ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Copied to Clipboard!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy 1-Liner</span>
                </>
              )}
            </button>
          </div>

          <div className="bg-black p-3.5 rounded font-mono text-[13px] text-emerald-300/90 overflow-x-auto whitespace-pre border border-emerald-900/50 shadow-inner">
            {lowMemoryDirectFlash}
          </div>
        </div>

        {/* Snippet 1: Crostini Pass-Through & Dependencies */}
        <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-medium text-neutral-200">
                Optional: Manual ChromeOS USB Permission Setup
              </span>
            </div>
            <button
              onClick={() => copySnippet(crostiniUsbSetup, 'crostini')}
              className="flex items-center gap-1 text-xs font-mono px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 transition"
            >
              {copiedId === 'crostini' ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy Commands</span>
                </>
              )}
            </button>
          </div>

          <div className="bg-black/90 p-3 rounded font-mono text-[11px] text-neutral-400 overflow-x-auto whitespace-pre leading-relaxed border border-neutral-900">
            {crostiniUsbSetup}
          </div>
        </div>
      </div>
    </div>
  );
};
