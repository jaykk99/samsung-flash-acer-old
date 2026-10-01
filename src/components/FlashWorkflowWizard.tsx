import React, { useState } from 'react';
import {
  Usb,
  ClipboardCheck,
  FileArchive,
  ShieldAlert,
  Zap,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  RefreshCw,
  ChevronRight,
  ChevronLeft,
  RotateCcw,
  Info,
} from 'lucide-react';
import { Device, FlashOperation, FlashMethod, LogEntry } from '../types';

interface WizardProps {
  device: Device;
  operation: FlashOperation;
  method: FlashMethod;
  isFlashing: boolean;
  setIsFlashing: (v: boolean) => void;
  onLog: (message: string, type?: LogEntry['type']) => void;
}

interface FirmwareRole {
  role: string;
  label: string;
  required: boolean;
}

const OPERATION_CONFIG: Record<
  FlashOperation,
  { roles: FirmwareRole[]; destructive: boolean; confirmWord: string; title: string; blurb: string }
> = {
  TOTAL_CLEAN_REINSTALL: {
    title: 'Total Clean Reinstall',
    blurb: 'Wipes USERDATA, CACHE, SYSTEM and BOOT, then flashes clean OS images. The phone boots like new.',
    destructive: true,
    confirmWord: 'ERASE',
    roles: [
      { role: 'BOOT', label: 'boot.img — kernel + ramdisk', required: true },
      { role: 'SYSTEM', label: 'system.img — OS image', required: true },
      { role: 'VENDOR', label: 'vendor.img — HAL + blobs', required: true },
      { role: 'USERDATA', label: 'empty ext4 image for USERDATA wipe', required: true },
      { role: 'CACHE', label: 'empty ext4 image for CACHE wipe', required: true },
    ],
  },
  FLASH_CUSTOM_ROM: {
    title: 'Flash Custom OS',
    blurb: 'Flashes custom BOOT, SYSTEM and VENDOR images over the existing install.',
    destructive: false,
    confirmWord: 'FLASH',
    roles: [
      { role: 'BOOT', label: 'boot.img — kernel + ramdisk', required: true },
      { role: 'SYSTEM', label: 'system.img — OS image', required: true },
      { role: 'VENDOR', label: 'vendor.img — HAL + blobs', required: true },
    ],
  },
  FLASH_RECOVERY: {
    title: 'Flash Custom Recovery',
    blurb: 'Flashes a custom recovery (e.g. TWRP) to the RECOVERY partition.',
    destructive: false,
    confirmWord: 'FLASH',
    roles: [{ role: 'RECOVERY', label: 'recovery.img — TWRP / custom recovery', required: true }],
  },
  FLASH_STOCK: {
    title: 'Restore Stock Firmware',
    blurb: 'Full stock restore via AP/BL/CP/CSC. Replaces everything including bootloader and modem.',
    destructive: true,
    confirmWord: 'ERASE',
    roles: [
      { role: 'AP', label: 'AP tar.md5 — system + kernel', required: true },
      { role: 'BL', label: 'BL tar.md5 — bootloader', required: true },
      { role: 'CP', label: 'CP tar.md5 — modem/baseband', required: true },
      { role: 'CSC', label: 'CSC tar.md5 — carrier config', required: true },
    ],
  },
  FACTORY_RESET: {
    title: 'Factory Reset / Unbrick Wipe',
    blurb: 'Wipes USERDATA and CACHE partitions to break bootloops and clear corruption.',
    destructive: true,
    confirmWord: 'ERASE',
    roles: [
      { role: 'USERDATA', label: 'empty ext4 image for USERDATA wipe', required: true },
      { role: 'CACHE', label: 'empty ext4 image for CACHE wipe', required: true },
    ],
  },
};

interface CheckResult {
  id: string;
  label: string;
  status: 'pass' | 'fail' | 'warn' | 'info';
  detail: string;
}

interface ValidationResult {
  ok: boolean;
  path?: string;
  sizeBytes?: number;
  sha256?: string;
  type?: string;
  checksumMatch?: boolean | null;
  error?: string;
}

interface SseStep {
  title: string;
  command?: string;
  progress: number;
  status: 'running' | 'done' | 'failed';
}

const STEPS = ['Detect', 'Pre-flight', 'Firmware', 'Safety', 'Flash', 'Result'] as const;

export function FlashWorkflowWizard({ device, operation, method, isFlashing, setIsFlashing, onLog }: WizardProps) {
  const config = OPERATION_CONFIG[operation];
  const [step, setStep] = useState(0);

  // Step 1 — detection
  const [scanning, setScanning] = useState(false);
  const [usbResult, setUsbResult] = useState<{ samsungFound: boolean; samsungEntries: string[]; totalDevices: number } | null>(null);
  const [adbResult, setAdbResult] = useState<{ devices: string[]; success: boolean } | null>(null);

  // Step 2 — preflight
  const [checking, setChecking] = useState(false);
  const [preflight, setPreflight] = useState<{ checks: CheckResult[]; canFlash: boolean } | null>(null);

  // Step 3 — firmware
  const [firmwarePaths, setFirmwarePaths] = useState<Record<string, string>>({});
  const [firmwareSha, setFirmwareSha] = useState<Record<string, string>>({});
  const [validations, setValidations] = useState<Record<string, ValidationResult | null>>({});
  const [validating, setValidating] = useState<Record<string, boolean>>({});

  // Step 4 — safety
  const [confirmText, setConfirmText] = useState('');
  const [ackChecked, setAckChecked] = useState(false);

  // Step 5 — flash
  const [sseSteps, setSseSteps] = useState<SseStep[]>([]);
  const [flashProgress, setFlashProgress] = useState(0);
  const [flashOutcome, setFlashOutcome] = useState<{ ok: boolean; message: string } | null>(null);

  const deviceDetected = !!usbResult?.samsungFound || (adbResult?.success && adbResult.devices.length > 0);
  const allRequiredValidated = config.roles
    .filter((r) => r.required)
    .every((r) => validations[r.role]?.ok);
  const safetyConfirmed =
    confirmText.trim().toUpperCase() === config.confirmWord && ackChecked;

  // ---- Step 1: real USB/ADB detection ----
  const runDetection = async () => {
    setScanning(true);
    onLog('Scanning USB bus + ADB for Samsung hardware…', 'command');
    try {
      const [usbRes, adbRes] = await Promise.all([
        fetch('/api/usb/scan').then((r) => r.json()),
        fetch('/api/adb/devices').then((r) => r.json()),
      ]);
      setUsbResult(usbRes);
      setAdbResult(adbRes);
      if (usbRes.samsungFound) {
        onLog(`Samsung hardware found: ${usbRes.samsungEntries.join(' | ')}`, 'success');
      } else {
        onLog(
          `No Samsung device on USB (${usbRes.totalDevices ?? 0} USB devices seen). Put the phone in Download Mode and rescan.`,
          'warning',
        );
      }
      if (adbRes.devices?.length) onLog(`ADB devices: ${adbRes.devices.join(' | ')}`, 'info');
    } catch (e: any) {
      onLog(`Detection failed: ${e.message}`, 'error');
    }
    setScanning(false);
  };

  // ---- Step 2: real pre-flight ----
  const runPreflight = async () => {
    setChecking(true);
    onLog('Running pre-flight checks…', 'command');
    try {
      const res = await fetch(`/api/flash/preflight?method=${encodeURIComponent(method)}`);
      const data = await res.json();
      setPreflight(data);
      const fails = data.checks.filter((c: CheckResult) => c.status === 'fail');
      if (data.canFlash) onLog('Pre-flight passed — ready to continue.', 'success');
      else onLog(`Pre-flight blocked: ${fails.map((c: CheckResult) => c.label).join('; ')}`, 'error');
    } catch (e: any) {
      onLog(`Pre-flight failed: ${e.message}`, 'error');
    }
    setChecking(false);
  };

  // ---- Step 3: firmware validation ----
  const validateRole = async (role: string) => {
    const filePath = (firmwarePaths[role] || '').trim();
    if (!filePath) return;
    setValidating((p) => ({ ...p, [role]: true }));
    try {
      const res = await fetch('/api/firmware/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: filePath, expectedSha256: firmwareSha[role] || undefined }),
      });
      const data = await res.json();
      if (data.success) {
        const v: ValidationResult = {
          ok: true,
          path: data.path,
          sizeBytes: data.sizeBytes,
          sha256: data.sha256,
          type: data.type,
          checksumMatch: data.checksumMatch,
        };
        setValidations((p) => ({ ...p, [role]: v }));
        onLog(`[OK] ${role}: ${data.type}, ${(data.sizeBytes / 1048576).toFixed(1)} MB`, 'success');
        if (data.checksumMatch === false) onLog(`[WARN] ${role}: checksum does NOT match the expected value!`, 'error');
      } else {
        setValidations((p) => ({ ...p, [role]: { ok: false, error: data.error } }));
        onLog(`[FAIL] ${role}: ${data.error}`, 'error');
      }
    } catch (e: any) {
      setValidations((p) => ({ ...p, [role]: { ok: false, error: e.message } }));
      onLog(`[FAIL] ${role}: ${e.message}`, 'error');
    }
    setValidating((p) => ({ ...p, [role]: false }));
  };

  // ---- Step 5: real SSE flash ----
  const startFlash = async () => {
    if (isFlashing) return;
    setIsFlashing(true);
    setSseSteps([]);
    setFlashProgress(0);
    setFlashOutcome(null);
    onLog(`Starting REAL flash: ${operation} on ${device.modelName} (${device.modelNumber})`, 'warning');

    const firmwareFiles = config.roles
      .filter((r) => validations[r.role]?.ok)
      .map((r) => ({ role: r.role, path: validations[r.role]!.path! }));

    try {
      const res = await fetch('/api/flash/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation,
          method,
          deviceModel: `${device.modelName} (${device.modelNumber})`,
          acknowledgeDestructive: config.destructive ? safetyConfirmed : true,
          firmwareFiles,
        }),
      });
      if (!res.body) throw new Error('No response stream from backend.');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let finished = false;

      const handleEvent = (type: string, data: any) => {
        switch (type) {
          case 'log':
            onLog(data.message, data.level === 'command' ? 'command' : data.level);
            break;
          case 'preflight': {
            const failed = (data.checks as CheckResult[]).filter((c) => c.status === 'fail');
            onLog(
              failed.length ? `Pre-flight (server): ${failed.map((c) => c.label).join('; ')}` : 'Pre-flight (server): passed',
              failed.length ? 'error' : 'success',
            );
            break;
          }
          case 'step':
            setSseSteps((prev) => {
              const marked = prev.map((s) => ({ ...s, status: 'done' as const }));
              return [...marked, { title: data.title, command: data.command, progress: data.progress ?? 0, status: 'running' as const }];
            });
            setFlashProgress(data.progress ?? 0);
            break;
          case 'progress':
            setFlashProgress(data.progress ?? 0);
            break;
          case 'aborted':
            setSseSteps((prev) => prev.map((s) => (s.status === 'running' ? { ...s, status: 'failed' as const } : s)));
            onLog(`ABORTED [${data.code}]: ${data.message}`, 'error');
            setFlashOutcome({ ok: false, message: `[${data.code}] ${data.message}` });
            finished = true;
            break;
          case 'done':
            setSseSteps((prev) => prev.map((s) => ({ ...s, status: 'done' as const })));
            setFlashProgress(100);
            onLog(data.message, 'success');
            setFlashOutcome({ ok: true, message: data.message });
            finished = true;
            break;
          default:
            break;
        }
      };

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() || '';
        for (const part of parts) {
          for (const line of part.split('\n')) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data:')) continue;
            try {
              const evt = JSON.parse(trimmed.slice(5));
              handleEvent(evt.type, evt.data);
            } catch {
              /* ignore malformed chunk */
            }
          }
        }
        if (finished) {
          try {
            await reader.cancel();
          } catch {
            /* noop */
          }
          break;
        }
      }
    } catch (e: any) {
      onLog(`Flash stream error: ${e.message}`, 'error');
      setFlashOutcome({ ok: false, message: e.message });
    }
    setIsFlashing(false);
    setStep(5);
  };

  const resetWizard = () => {
    setStep(0);
    setUsbResult(null);
    setAdbResult(null);
    setPreflight(null);
    setConfirmText('');
    setAckChecked(false);
    setSseSteps([]);
    setFlashProgress(0);
    setFlashOutcome(null);
  };

  const statusIcon = (status: CheckResult['status']) =>
    status === 'pass' ? (
      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
    ) : status === 'fail' ? (
      <XCircle className="w-4 h-4 text-red-400 shrink-0" />
    ) : status === 'warn' ? (
      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
    ) : (
      <Info className="w-4 h-4 text-neutral-500 shrink-0" />
    );

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-neutral-800 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-neutral-100 flex items-center gap-2">
            <Zap className="w-4 h-4 text-blue-400" />
            Flash Workflow — {config.title}
          </h3>
          <p className="text-xs text-neutral-500 mt-0.5">{config.blurb}</p>
        </div>
        {config.destructive && (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-950/60 border border-red-700/70 text-red-300 text-[11px] font-semibold">
            <ShieldAlert className="w-3.5 h-3.5" /> DESTRUCTIVE — wipes device data
          </span>
        )}
      </div>

      {/* Stepper */}
      <div className="px-5 py-3 border-b border-neutral-800 overflow-x-auto">
        <div className="flex items-center gap-1 min-w-max">
          {STEPS.map((label, i) => (
            <React.Fragment key={label}>
              <button
                onClick={() => !isFlashing && setStep(i)}
                disabled={isFlashing}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition ${
                  i === step
                    ? 'bg-blue-600/20 text-blue-300 border border-blue-500/50'
                    : i < step
                    ? 'text-emerald-400'
                    : 'text-neutral-500 hover:text-neutral-300'
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border ${
                    i === step
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : i < step
                      ? 'bg-emerald-900 border-emerald-600 text-emerald-300'
                      : 'border-neutral-700 text-neutral-500'
                  }`}
                >
                  {i < step ? '✓' : i + 1}
                </span>
                {label}
              </button>
              {i < STEPS.length - 1 && <ChevronRight className="w-3.5 h-3.5 text-neutral-700 shrink-0" />}
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="p-5 space-y-4 min-h-[280px]">
        {/* STEP 1 — DETECT */}
        {step === 0 && (
          <div className="space-y-3">
            <p className="text-xs text-neutral-400">
              Real hardware detection — scans the host USB bus and ADB daemon. Nothing is simulated: if no Samsung
              device is found, the workflow stops here.
            </p>
            <button
              onClick={runDetection}
              disabled={scanning}
              className="flex items-center gap-2 px-4 py-2.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium disabled:opacity-50 transition"
            >
              {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Usb className="w-4 h-4" />}
              {scanning ? 'Scanning…' : 'Scan for Samsung hardware'}
            </button>

            {usbResult && (
              <div className="space-y-2">
                {usbResult.samsungFound ? (
                  <div className="bg-emerald-950/40 border border-emerald-700/60 rounded-md p-3 space-y-1">
                    <div className="flex items-center gap-2 text-emerald-300 text-sm font-semibold">
                      <CheckCircle2 className="w-4 h-4" /> Samsung device detected
                    </div>
                    {usbResult.samsungEntries.map((e, i) => (
                      <div key={i} className="text-xs font-mono text-neutral-300 break-all">
                        {e}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-amber-950/30 border border-amber-700/50 rounded-md p-3 space-y-2">
                    <div className="flex items-center gap-2 text-amber-300 text-sm font-semibold">
                      <AlertTriangle className="w-4 h-4" /> No Samsung device found
                    </div>
                    <p className="text-xs text-neutral-400">
                      {usbResult.totalDevices} USB device(s) on the bus, none with VID 04e8. To continue:
                    </p>
                    <ol className="text-xs text-neutral-400 list-decimal list-inside space-y-1">
                      <li>Power the {device.modelName} fully off.</li>
                      <li>Enter Download Mode: <span className="text-neutral-200 font-mono">{device.downloadCombo}</span></li>
                      <li>Connect it via USB, then rescan.</li>
                    </ol>
                    {adbResult && adbResult.devices.length > 0 && (
                      <p className="text-xs text-cyan-300">
                        ADB sees {adbResult.devices.length} device(s) — you can also reboot one into download mode from
                        the state inspector.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end pt-1">
              <button
                onClick={() => setStep(1)}
                disabled={!deviceDetected}
                className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-sm text-neutral-200 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                Continue to pre-flight <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            {!deviceDetected && usbResult && (
              <p className="text-[11px] text-neutral-500 text-right">Detect a Samsung device to unlock the next step.</p>
            )}
          </div>
        )}

        {/* STEP 2 — PRE-FLIGHT */}
        {step === 1 && (
          <div className="space-y-3">
            <p className="text-xs text-neutral-400">
              Live probes of the host: OS, toolchain, USB privileges and the device itself. Flashing is blocked until
              every failing check is resolved.
            </p>
            <button
              onClick={runPreflight}
              disabled={checking}
              className="flex items-center gap-2 px-4 py-2.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium disabled:opacity-50 transition"
            >
              {checking ? <Loader2 className="w-4 h-4 animate-spin" /> : <ClipboardCheck className="w-4 h-4" />}
              {checking ? 'Probing…' : preflight ? 'Re-run checks' : 'Run pre-flight checks'}
            </button>

            {preflight && (
              <div className="space-y-1.5">
                {preflight.checks.map((c) => (
                  <div key={c.id} className="flex items-start gap-2.5 bg-neutral-950 border border-neutral-800 rounded-md p-2.5">
                    {statusIcon(c.status)}
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-neutral-200">{c.label}</div>
                      <div className="text-[11px] text-neutral-500 break-words font-mono">{c.detail}</div>
                    </div>
                  </div>
                ))}
                <div
                  className={`rounded-md p-3 text-xs font-medium border ${
                    preflight.canFlash
                      ? 'bg-emerald-950/40 border-emerald-700/60 text-emerald-300'
                      : 'bg-red-950/40 border-red-700/60 text-red-300'
                  }`}
                >
                  {preflight.canFlash
                    ? 'All critical checks passed — the host can flash this device.'
                    : 'Pre-flight failed — resolve the failing checks above before continuing.'}
                </div>
              </div>
            )}

            <div className="flex justify-between pt-1">
              <button
                onClick={() => setStep(0)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-md text-sm text-neutral-400 hover:text-neutral-200 transition"
              >
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
              <button
                onClick={() => setStep(2)}
                disabled={!preflight?.canFlash}
                className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-sm text-neutral-200 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                Continue to firmware <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3 — FIRMWARE */}
        {step === 2 && (
          <div className="space-y-3">
            <p className="text-xs text-neutral-400">
              Point to the firmware images <span className="text-neutral-200">on the host machine</span> (absolute
              paths, e.g. <span className="font-mono">/home/jay/firmware/boot.img</span>). Each file is validated
              server-side: existence, size, type sniff and SHA-256. Optionally paste an expected checksum to verify
              against.
            </p>
            <div className="space-y-2.5">
              {config.roles.map((r) => {
                const v = validations[r.role];
                return (
                  <div key={r.role} className="bg-neutral-950 border border-neutral-800 rounded-md p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs font-semibold text-neutral-200 font-mono">{r.role}</div>
                      <div className="flex items-center gap-2">
                        {r.required && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400 font-mono">required</span>
                        )}
                        {v?.ok && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                        {v && !v.ok && <XCircle className="w-4 h-4 text-red-400" />}
                      </div>
                    </div>
                    <div className="text-[11px] text-neutral-500">{r.label}</div>
                    <input
                      value={firmwarePaths[r.role] || ''}
                      onChange={(e) => {
                        setFirmwarePaths((p) => ({ ...p, [r.role]: e.target.value }));
                        setValidations((p) => ({ ...p, [r.role]: null }));
                      }}
                      placeholder="/absolute/path/to/image"
                      spellCheck={false}
                      className="w-full bg-neutral-900 border border-neutral-700 rounded-md px-2.5 py-2 text-xs font-mono text-neutral-200 outline-none focus:border-blue-500"
                    />
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        value={firmwareSha[r.role] || ''}
                        onChange={(e) => setFirmwareSha((p) => ({ ...p, [r.role]: e.target.value }))}
                        placeholder="Expected SHA-256 (optional)"
                        spellCheck={false}
                        className="flex-1 bg-neutral-900 border border-neutral-700 rounded-md px-2.5 py-2 text-xs font-mono text-neutral-200 outline-none focus:border-blue-500"
                      />
                      <button
                        onClick={() => validateRole(r.role)}
                        disabled={!firmwarePaths[r.role]?.trim() || validating[r.role]}
                        className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-md bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-xs text-neutral-200 disabled:opacity-40 transition shrink-0"
                      >
                        {validating[r.role] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileArchive className="w-3.5 h-3.5" />}
                        Validate
                      </button>
                    </div>
                    {v?.ok && (
                      <div className="text-[11px] font-mono text-neutral-400 space-y-0.5 break-all">
                        <div><span className="text-neutral-600">type:</span> {v.type}</div>
                        <div><span className="text-neutral-600">size:</span> {((v.sizeBytes || 0) / 1048576).toFixed(2)} MB</div>
                        <div><span className="text-neutral-600">sha256:</span> {v.sha256}</div>
                        {v.checksumMatch === true && <div className="text-emerald-400">checksum matches expected value ✓</div>}
                        {v.checksumMatch === false && <div className="text-red-400 font-semibold">CHECKSUM MISMATCH — do not flash this file</div>}
                      </div>
                    )}
                    {v && !v.ok && <div className="text-[11px] text-red-400">{v.error}</div>}
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between pt-1">
              <button
                onClick={() => setStep(1)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-md text-sm text-neutral-400 hover:text-neutral-200 transition"
              >
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={!allRequiredValidated}
                className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-sm text-neutral-200 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                Continue to safety review <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            {!allRequiredValidated && (
              <p className="text-[11px] text-neutral-500 text-right">Validate every required image to continue.</p>
            )}
          </div>
        )}

        {/* STEP 4 — SAFETY */}
        {step === 3 && (
          <div className="space-y-4">
            {config.destructive && (
              <div className="bg-red-950/50 border border-red-600/70 rounded-md p-4 space-y-2">
                <div className="flex items-center gap-2 text-red-300 font-bold text-sm">
                  <ShieldAlert className="w-5 h-5" /> WARNING — this will erase the device
                </div>
                <ul className="text-xs text-red-200/80 list-disc list-inside space-y-1">
                  <li>All user data, accounts, photos and apps on the phone will be permanently destroyed.</li>
                  <li>Do NOT unplug the USB cable or power off the host mid-flash — interruption can brick the device.</li>
                  <li>Make sure the phone battery is charged (or keep it on the charger).</li>
                  <li>Double-check the firmware images above match {device.modelName} ({device.modelNumber}).</li>
                </ul>
              </div>
            )}
            {!config.destructive && (
              <div className="bg-amber-950/30 border border-amber-700/50 rounded-md p-4 space-y-1">
                <div className="flex items-center gap-2 text-amber-300 font-semibold text-sm">
                  <AlertTriangle className="w-4 h-4" /> Flashing modifies device firmware
                </div>
                <p className="text-xs text-neutral-400">
                  Do not unplug the device mid-flash. Verify the images below target {device.modelName} ({device.modelNumber}).
                </p>
              </div>
            )}

            <div className="bg-neutral-950 border border-neutral-800 rounded-md p-3 space-y-1.5 text-xs">
              <div className="text-neutral-500 uppercase tracking-wider text-[10px] font-semibold">Flash plan summary</div>
              <div className="flex justify-between gap-2"><span className="text-neutral-500">Device</span><span className="text-neutral-200 text-right">{device.modelName} ({device.modelNumber})</span></div>
              <div className="flex justify-between gap-2"><span className="text-neutral-500">Operation</span><span className="text-neutral-200 text-right">{config.title}</span></div>
              <div className="flex justify-between gap-2"><span className="text-neutral-500">Method</span><span className="text-neutral-200 text-right font-mono">{method}</span></div>
              {config.roles.filter((r) => validations[r.role]?.ok).map((r) => (
                <div key={r.role} className="flex justify-between gap-2">
                  <span className="text-neutral-500 font-mono">{r.role}</span>
                  <span className="text-neutral-400 font-mono text-right break-all">
                    {(validations[r.role]!.sizeBytes! / 1048576).toFixed(1)} MB · {validations[r.role]!.sha256!.slice(0, 12)}…
                  </span>
                </div>
              ))}
            </div>

            <div className="space-y-2.5">
              <label className="flex items-start gap-2.5 text-xs text-neutral-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={ackChecked}
                  onChange={(e) => setAckChecked(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-blue-600"
                />
                <span>
                  {config.destructive
                    ? 'I understand this operation permanently erases all data on the device and I have verified the firmware matches my phone model.'
                    : 'I understand flashing modifies device firmware and I have verified the images match my phone model.'}
                </span>
              </label>
              <div>
                <label className="text-xs text-neutral-400 block mb-1">
                  Type <span className="font-mono font-bold text-neutral-100">{config.confirmWord}</span> to confirm:
                </label>
                <input
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder={config.confirmWord}
                  spellCheck={false}
                  autoComplete="off"
                  className="w-full sm:w-64 bg-neutral-950 border border-neutral-700 rounded-md px-3 py-2 text-sm font-mono text-neutral-100 outline-none focus:border-red-500 uppercase"
                />
              </div>
            </div>

            <div className="flex justify-between pt-1">
              <button
                onClick={() => setStep(2)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-md text-sm text-neutral-400 hover:text-neutral-200 transition"
              >
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
              <button
                onClick={() => setStep(4)}
                disabled={!safetyConfirmed}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed ${
                  config.destructive
                    ? 'bg-red-600 hover:bg-red-500 text-white'
                    : 'bg-blue-600 hover:bg-blue-500 text-white'
                }`}
              >
                Arm flash <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 5 — FLASH */}
        {step === 4 && (
          <div className="space-y-4">
            {!flashOutcome && sseSteps.length === 0 && (
              <div className="text-center py-6 space-y-3">
                <p className="text-xs text-neutral-400 max-w-md mx-auto">
                  Everything is armed. Pressing start runs the <span className="text-neutral-200">real</span> host
                  commands against the detected device — progress below reflects actual command output.
                </p>
                <button
                  onClick={startFlash}
                  disabled={isFlashing}
                  className={`inline-flex items-center gap-2 px-8 py-4 rounded-lg font-bold text-base transition disabled:opacity-50 ${
                    config.destructive
                      ? 'bg-red-600 hover:bg-red-500 text-white shadow-[0_0_20px_rgba(220,38,38,0.4)]'
                      : 'bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)]'
                  }`}
                >
                  {isFlashing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
                  {isFlashing ? 'Flashing…' : `Start ${config.title}`}
                </button>
              </div>
            )}

            {(sseSteps.length > 0 || isFlashing) && (
              <div className="space-y-3">
                <div className="flex justify-between text-xs font-mono text-neutral-400">
                  <span className="truncate max-w-[70%]">
                    {sseSteps.length ? sseSteps[sseSteps.length - 1].title : 'Starting…'}
                  </span>
                  <span className="font-bold text-neutral-200">{flashProgress}%</span>
                </div>
                <div className="w-full h-3 bg-neutral-950 rounded-full overflow-hidden border border-neutral-800">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${flashOutcome?.ok ? 'bg-emerald-500' : config.destructive ? 'bg-red-500' : 'bg-blue-500'}`}
                    style={{ width: `${flashProgress}%` }}
                  />
                </div>
                <div className="space-y-1.5">
                  {sseSteps.map((s, i) => (
                    <div key={i} className="flex items-start gap-2.5 bg-neutral-950 border border-neutral-800 rounded-md p-2.5">
                      {s.status === 'running' ? (
                        <Loader2 className="w-4 h-4 text-blue-400 animate-spin shrink-0 mt-0.5" />
                      ) : s.status === 'done' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                      )}
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-neutral-200">{s.title}</div>
                        {s.command && <div className="text-[11px] font-mono text-neutral-500 break-all">$ {s.command}</div>}
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-neutral-500">Full command output streams into the log terminal below.</p>
              </div>
            )}

            {flashOutcome && (
              <div className="flex justify-end">
                <button
                  onClick={() => setStep(5)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-sm text-neutral-200 transition"
                >
                  View result <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* STEP 6 — RESULT */}
        {step === 5 && (
          <div className="space-y-4">
            {flashOutcome ? (
              <div
                className={`rounded-md p-4 border space-y-2 ${
                  flashOutcome.ok
                    ? 'bg-emerald-950/40 border-emerald-700/60'
                    : 'bg-red-950/40 border-red-700/60'
                }`}
              >
                <div className={`flex items-center gap-2 font-bold text-sm ${flashOutcome.ok ? 'text-emerald-300' : 'text-red-300'}`}>
                  {flashOutcome.ok ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                  {flashOutcome.ok ? 'Flash completed' : 'Flash did not complete'}
                </div>
                <p className="text-xs text-neutral-300 font-mono break-words">{flashOutcome.message}</p>
                {flashOutcome.ok ? (
                  <p className="text-xs text-neutral-400">
                    The device should reboot on its own — finish setup on the phone. If it doesn't boot, re-enter
                    Download Mode and check the log above for the last successful step.
                  </p>
                ) : (
                  <p className="text-xs text-neutral-400">
                    Nothing after the last green step was written. Read the log terminal for the failing command, fix
                    the cause (cable, drivers, wrong image), then run the workflow again.
                  </p>
                )}
              </div>
            ) : (
              <p className="text-xs text-neutral-500">No flash run yet in this session.</p>
            )}
            <div className="flex justify-between">
              <button
                onClick={resetWizard}
                className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-sm text-neutral-200 transition"
              >
                <RotateCcw className="w-4 h-4" /> Start over
              </button>
              <button
                onClick={() => runDetection().then(() => setStep(0))}
                disabled={isFlashing}
                className="flex items-center gap-1.5 px-4 py-2 rounded-md text-sm text-neutral-400 hover:text-neutral-200 transition disabled:opacity-40"
              >
                <RefreshCw className="w-4 h-4" /> Rescan hardware
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
