import React, { useState, useEffect } from 'react';
import {
  Server,
  Terminal,
  Cpu,
  HardDrive,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Play,
  Copy,
  Check,
  Usb,
  ShieldCheck,
  Activity,
} from 'lucide-react';

interface SystemStatus {
  status: string;
  backend: string;
  os: {
    platform: string;
    release: string;
    arch: string;
    kernel: string;
    uptime: number;
    freeMemMB: number;
    totalMemMB: number;
    cpuCount: number;
  };
  toolchain: {
    heimdall: { installed: boolean; path?: string; version?: string };
    adb: { installed: boolean; path?: string; version?: string };
    fastboot: { installed: boolean; path?: string; version?: string };
    lsusb: { installed: boolean; path?: string; version?: string };
    udevadm: { installed: boolean; path?: string; version?: string };
  };
  isRoot: boolean;
  timestamp: string;
}

export const BackendDaemonMonitor: React.FC = () => {
  const [system, setSystem] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // USB Bus scan
  const [usbScanning, setUsbScanning] = useState<boolean>(false);
  const [usbResult, setUsbResult] = useState<any | null>(null);

  // Terminal command execution
  const [activeCommand, setActiveCommand] = useState<string>('lsusb');
  const [executingCmd, setExecutingCmd] = useState<boolean>(false);
  const [cmdOutput, setCmdOutput] = useState<{ stdout: string; stderr: string; command: string } | null>(null);
  const [copiedCurl, setCopiedCurl] = useState<boolean>(false);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/system/status');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setSystem(data);
    } catch (err: any) {
      setError(err.message || 'Failed to connect to backend daemon');
    } finally {
      setLoading(false);
    }
  };

  const scanUsbBus = async () => {
    try {
      setUsbScanning(true);
      const res = await fetch('/api/usb/scan');
      const data = await res.json();
      setUsbResult(data);
    } catch (err: any) {
      setUsbResult({ error: err.message });
    } finally {
      setUsbScanning(false);
    }
  };

  const runTerminalCommand = async (cmd: string) => {
    try {
      setExecutingCmd(true);
      setActiveCommand(cmd);
      const res = await fetch('/api/terminal/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: cmd }),
      });
      const data = await res.json();
      setCmdOutput({
        command: cmd,
        stdout: data.stdout || '',
        stderr: data.stderr || (data.error ? data.error : ''),
      });
    } catch (err: any) {
      setCmdOutput({
        command: cmd,
        stdout: '',
        stderr: err.message,
      });
    } finally {
      setExecutingCmd(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    scanUsbBus();
  }, []);

  const curlCommand = `curl -sSL ${window.location.origin}/api/script/download | sudo bash`;

  const copyCurl = () => {
    navigator.clipboard.writeText(curlCommand);
    setCopiedCurl(true);
    setTimeout(() => setCopiedCurl(false), 2000);
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-cyan-950/60 border border-cyan-800/60 text-cyan-400">
            <Server className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-neutral-100">Linux Backend System Daemon</h2>
              <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-800/60">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                ACTIVE DAEMON
              </span>
            </div>
            <p className="text-xs text-neutral-400">
              Direct host-level hardware polling, lsusb endpoint inspection, and native flashing binaries
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            fetchStatus();
            scanUsbBus();
          }}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          <span>Poll Host</span>
        </button>
      </div>

      {/* Host Metrics & Toolchain Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Host Specs */}
        <div className="bg-neutral-950 border border-neutral-800/80 rounded-lg p-3.5 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-neutral-300">
            <Cpu className="w-4 h-4 text-cyan-400" />
            <span>Host Kernel & Resources</span>
          </div>
          {system ? (
            <div className="space-y-1 font-mono text-[11px] text-neutral-400">
              <div className="flex justify-between">
                <span className="text-neutral-500">Kernel:</span>
                <span className="text-neutral-200 truncate max-w-[170px]" title={system.os.kernel}>
                  {system.os.kernel}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Arch / CPUs:</span>
                <span className="text-neutral-200">
                  {system.os.arch} ({system.os.cpuCount} Cores)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Memory:</span>
                <span className="text-neutral-200">
                  {system.os.freeMemMB}MB free / {system.os.totalMemMB}MB
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Root Access:</span>
                <span className={system.isRoot ? 'text-emerald-400' : 'text-amber-400'}>
                  {system.isRoot ? 'YES (UID 0)' : 'NO (User space)'}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-xs text-neutral-500 py-2">Loading system telemetry...</div>
          )}
        </div>

        {/* Linux Flashing Toolchain Status */}
        <div className="bg-neutral-950 border border-neutral-800/80 rounded-lg p-3.5 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-neutral-300">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Host Flashing Toolchain</span>
          </div>
          {system ? (
            <div className="space-y-1.5 font-mono text-[11px]">
              {[
                { name: 'heimdall', data: system.toolchain.heimdall, desc: 'Loke Protocol Flasher' },
                { name: 'adb', data: system.toolchain.adb, desc: 'Android Debug Bridge' },
                { name: 'fastboot', data: system.toolchain.fastboot, desc: 'Bootloader Client' },
                { name: 'lsusb', data: system.toolchain.lsusb, desc: 'USB Bus Inspector' },
              ].map(tool => (
                <div key={tool.name} className="flex items-center justify-between">
                  <span className="text-neutral-400 uppercase font-semibold">{tool.name}</span>
                  <div className="flex items-center gap-1">
                    {tool.data.installed ? (
                      <span className="flex items-center gap-1 text-emerald-400 text-[10px] bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-900/60">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        Ready
                      </span>
                    ) : (
                      <span className="text-neutral-500 text-[10px] bg-neutral-900 px-1.5 py-0.5 rounded">
                        Available in script
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-neutral-500 py-2">Probing host binaries...</div>
          )}
        </div>

        {/* 1-Line Remote cURL Runner */}
        <div className="bg-neutral-950 border border-neutral-800/80 rounded-lg p-3.5 space-y-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-neutral-300">
              <Terminal className="w-4 h-4 text-amber-400" />
              <span>Direct 1-Command cURL Pipe</span>
            </div>
            <p className="text-[11px] text-neutral-400 mt-1">
              Stream and execute the backend engine directly in any Linux terminal without cloning:
            </p>
          </div>

          <div className="mt-2">
            <div className="bg-neutral-900 p-2 rounded border border-neutral-800 flex items-center justify-between gap-2">
              <code className="text-[10px] font-mono text-cyan-300 truncate">
                curl -sSL .../flash-samsung.sh | sudo bash
              </code>
              <button
                onClick={copyCurl}
                className="p-1.5 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white transition shrink-0"
                title="Copy curl command"
              >
                {copiedCurl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Real USB Bus Scan & Diagnostics */}
      <div className="bg-neutral-950 border border-neutral-800/80 rounded-lg p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-900 pb-2">
          <div className="flex items-center gap-2">
            <Usb className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-semibold text-neutral-200">Host USB Bus Hardware Watchdog</span>
            <span className="text-[10px] font-mono text-neutral-500">Target VID: 04E8 (Samsung)</span>
          </div>

          <button
            onClick={scanUsbBus}
            disabled={usbScanning}
            className="flex items-center gap-1 text-xs font-mono text-cyan-400 hover:text-cyan-300 transition"
          >
            <RefreshCw className={`w-3 h-3 ${usbScanning ? 'animate-spin' : ''}`} />
            <span>Re-scan USB Bus</span>
          </button>
        </div>

        {usbResult ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-neutral-400">Scanner Status:</span>
              {usbResult.samsungFound ? (
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Samsung Device Attached (VID 04E8 Match!)
                </span>
              ) : (
                <span className="text-amber-400 flex items-center gap-1 text-[11px]">
                  <Activity className="w-3.5 h-3.5 animate-pulse" /> Ready & Listening on Host USB Bus
                </span>
              )}
            </div>

            <div className="bg-neutral-900/90 border border-neutral-800 rounded p-2.5 font-mono text-xs text-neutral-300 max-h-28 overflow-y-auto whitespace-pre-wrap">
              {usbResult.rawOutput || 'No USB endpoints reported'}
            </div>
          </div>
        ) : (
          <div className="text-xs text-neutral-500">Scanning host USB controller...</div>
        )}
      </div>

      {/* Backend Interactive Diagnostic Console */}
      <div className="bg-neutral-950 border border-neutral-800/80 rounded-lg p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-900 pb-2">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-semibold text-neutral-200">Backend Linux Command Dispatcher</span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {[
              'lsusb',
              'uname -srm',
              'adb devices',
              'cat /etc/os-release',
              'uptime',
              'free -m',
            ].map(cmd => (
              <button
                key={cmd}
                onClick={() => runTerminalCommand(cmd)}
                disabled={executingCmd}
                className={`text-[10px] font-mono px-2 py-1 rounded transition border ${
                  activeCommand === cmd
                    ? 'bg-cyan-950 text-cyan-300 border-cyan-800'
                    : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-400 border-neutral-800'
                }`}
              >
                {cmd}
              </button>
            ))}
          </div>
        </div>

        {/* Console Box */}
        <div className="bg-black/90 border border-neutral-800 rounded-lg p-3 font-mono text-xs space-y-2">
          <div className="flex items-center justify-between text-neutral-500 text-[11px] border-b border-neutral-900 pb-1">
            <span>bash:~$ {activeCommand}</span>
            {executingCmd && <span className="text-cyan-400 animate-pulse">executing on host...</span>}
          </div>

          <div className="max-h-36 overflow-y-auto whitespace-pre-wrap text-emerald-400 text-[11px] leading-relaxed">
            {cmdOutput ? (
              <>
                {cmdOutput.stdout && <div>{cmdOutput.stdout}</div>}
                {cmdOutput.stderr && <div className="text-amber-400">{cmdOutput.stderr}</div>}
              </>
            ) : (
              <span className="text-neutral-500 italic">
                Click any Linux command above to run it live on the backend server.
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
