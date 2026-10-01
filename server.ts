import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import os from 'os';
import crypto from 'crypto';
import { exec, spawn, ChildProcess } from 'child_process';
import { promisify } from 'util';
import { createServer as createViteServer } from 'vite';

const execAsync = promisify(exec);
const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(cors());
app.use(express.json());

// Helper: check if a binary exists in PATH
async function checkBinary(binaryName: string): Promise<{ installed: boolean; path?: string; version?: string }> {
  try {
    const { stdout: whichOut } = await execAsync(`which ${binaryName}`);
    const binPath = whichOut.trim();
    let version: string | undefined;
    try {
      const { stdout: verOut } = await execAsync(`${binaryName} --version || ${binaryName} version`, { timeout: 2000 });
      version = verOut.split('\n')[0].trim();
    } catch {
      version = 'Available';
    }
    return { installed: true, path: binPath, version };
  } catch {
    return { installed: false };
  }
}

// ==========================================
// 1. SYSTEM DIAGNOSTICS & TOOLCHAIN STATUS
// ==========================================
app.get('/api/system/status', async (req, res) => {
  try {
    const [heimdall, adb, fastboot, lsusb, udevadm] = await Promise.all([
      checkBinary('heimdall'),
      checkBinary('adb'),
      checkBinary('fastboot'),
      checkBinary('lsusb'),
      checkBinary('udevadm'),
    ]);

    let kernelInfo = 'Linux';
    try {
      const { stdout } = await execAsync('uname -srm');
      kernelInfo = stdout.trim();
    } catch {
      kernelInfo = `${os.type()} ${os.release()} ${os.arch()}`;
    }

    const systemData = {
      status: 'ONLINE',
      backend: 'Node.js Express Linux Daemon v2.4',
      os: {
        platform: os.platform(),
        release: os.release(),
        arch: os.arch(),
        kernel: kernelInfo,
        uptime: Math.floor(os.uptime()),
        freeMemMB: Math.round(os.freemem() / 1024 / 1024),
        totalMemMB: Math.round(os.totalmem() / 1024 / 1024),
        cpuCount: os.cpus().length,
      },
      toolchain: {
        heimdall,
        adb,
        fastboot,
        lsusb,
        udevadm,
      },
      isRoot: typeof process.getuid === 'function' ? process.getuid() === 0 : false,
      timestamp: new Date().toISOString(),
    };

    res.json(systemData);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'System status check failed' });
  }
});

// ==========================================
// 2. REAL USB BUS & HARDWARE SCANNER
// ==========================================
app.get('/api/usb/scan', async (req, res) => {
  try {
    let lsusbOutput = '';
    let hasLsusb = false;
    try {
      const { stdout } = await execAsync('lsusb', { timeout: 3000 });
      lsusbOutput = stdout;
      hasLsusb = true;
    } catch {
      // Fallback check sysfs
      if (fs.existsSync('/sys/bus/usb/devices')) {
        const devs = fs.readdirSync('/sys/bus/usb/devices');
        lsusbOutput = devs.map(d => `USB Device node: /sys/bus/usb/devices/${d}`).join('\n');
      } else {
        lsusbOutput = 'Simulated /sys/bus/usb/devices (Containerized runtime)';
      }
    }

    const lines = lsusbOutput.split('\n').filter(Boolean);
    const samsungDevices = lines.filter(line => /samsung|04e8/i.test(line));

    res.json({
      success: true,
      hasLsusb,
      totalDevices: lines.length,
      rawOutput: lsusbOutput.trim(),
      samsungFound: samsungDevices.length > 0,
      samsungEntries: samsungDevices,
      vendorIdMatch: '04e8 (Samsung Electronics Co., Ltd)',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// 3. ADB RECOVERY & DEVICE QUERY
// ==========================================
app.get('/api/adb/devices', async (req, res) => {
  try {
    const { stdout } = await execAsync('adb devices -l', { timeout: 4000 });
    const lines = stdout.split('\n').slice(1).map(l => l.trim()).filter(Boolean);
    res.json({
      success: true,
      rawOutput: stdout.trim(),
      devices: lines,
    });
  } catch (error: any) {
    res.json({
      success: false,
      rawOutput: 'ADB daemon not running or no USB devices attached',
      devices: [],
      error: error.message,
    });
  }
});

// ==========================================
// 3b. FLASH PRE-FLIGHT CHECKS (REAL HARDWARE PROBES)
// ==========================================
export interface PreflightCheck {
  id: string;
  label: string;
  status: 'pass' | 'fail' | 'warn' | 'info';
  detail: string;
}

async function scanSamsungUsb(): Promise<{ found: boolean; entries: string[]; raw: string }> {
  try {
    const { stdout } = await execAsync('lsusb', { timeout: 3000 });
    const lines = stdout.split('\n').filter(Boolean);
    const samsung = lines.filter((l) => /samsung|04e8/i.test(l));
    return { found: samsung.length > 0, entries: samsung, raw: stdout.trim() };
  } catch {
    return { found: false, entries: [], raw: '' };
  }
}

function isRootUser(): boolean {
  return typeof process.getuid === 'function' ? process.getuid() === 0 : false;
}

export async function runPreflight(method: string): Promise<{ checks: PreflightCheck[]; canFlash: boolean }> {
  const checks: PreflightCheck[] = [];

  const isLinux = os.platform() === 'linux';
  checks.push({
    id: 'os',
    label: 'Linux host OS',
    status: isLinux ? 'pass' : 'fail',
    detail: isLinux
      ? `${os.type()} ${os.release()} (${os.arch()})`
      : `Flashing requires a Linux host — this daemon runs on ${os.platform()}.`,
  });

  const [heimdall, adb, fastboot, lsusb] = await Promise.all([
    checkBinary('heimdall'),
    checkBinary('adb'),
    checkBinary('fastboot'),
    checkBinary('lsusb'),
  ]);

  checks.push({
    id: 'heimdall',
    label: 'Heimdall flasher installed',
    status: heimdall.installed ? 'pass' : 'fail',
    detail: heimdall.installed
      ? `${heimdall.path} — ${heimdall.version || 'version unknown'}`
      : 'Not found. Install with: sudo apt install heimdall-flash',
  });
  checks.push({
    id: 'adb',
    label: 'ADB installed',
    status: adb.installed ? 'pass' : 'warn',
    detail: adb.installed
      ? `${adb.path} — ${adb.version || 'version unknown'}`
      : 'Not found. Install with: sudo apt install adb (needed for state transitions & sideload).',
  });
  checks.push({
    id: 'fastboot',
    label: 'Fastboot installed',
    status: fastboot.installed ? 'pass' : 'info',
    detail: fastboot.installed ? `${fastboot.path}` : 'Optional — not used by the Samsung pipeline.',
  });
  checks.push({
    id: 'lsusb',
    label: 'USB tooling (lsusb)',
    status: lsusb.installed ? 'pass' : 'warn',
    detail: lsusb.installed ? `${lsusb.path}` : 'lsusb missing — USB detection falls back to sysfs.',
  });

  const root = isRootUser();
  const udevRule = fs.existsSync('/etc/udev/rules.d/51-samsung.rules');
  checks.push({
    id: 'privileges',
    label: 'USB write privileges',
    status: root ? 'pass' : udevRule ? 'pass' : 'warn',
    detail: root
      ? 'Running as root — can claim USB interfaces directly.'
      : udevRule
      ? 'Udev rule 51-samsung.rules present — flashing without sudo should work.'
      : 'Not root and no udev rule — flash commands will try `sudo -n` (non-interactive).',
  });

  const usb = await scanSamsungUsb();
  checks.push({
    id: 'usb',
    label: 'Samsung device on USB (VID 04e8)',
    status: usb.found ? 'pass' : 'fail',
    detail: usb.found
      ? usb.entries.join(' | ')
      : 'No Samsung device detected. Put the phone in Download Mode (Vol Down + Home + Power), connect USB, and rescan.',
  });

  let adbDetail = 'ADB daemon not reachable.';
  let adbDevicesFound = false;
  if (adb.installed) {
    try {
      const { stdout } = await execAsync('adb devices', { timeout: 4000 });
      const lines = stdout.split('\n').slice(1).map((l) => l.trim()).filter(Boolean);
      adbDevicesFound = lines.length > 0;
      adbDetail = adbDevicesFound ? lines.join(' | ') : 'ADB up, no devices attached.';
    } catch {
      adbDetail = 'ADB daemon not reachable.';
    }
  }
  checks.push({
    id: 'adb-devices',
    label: 'ADB-visible devices',
    status: adbDevicesFound ? 'pass' : 'info',
    detail: adbDetail,
  });

  const needsHeimdall = method !== 'METHOD_ADB_SIDELOAD';
  const toolOk = needsHeimdall ? heimdall.installed : adb.installed;
  const canFlash =
    isLinux && usb.found && toolOk && (root || udevRule || !needsHeimdall);

  return { checks, canFlash };
}

app.get('/api/flash/preflight', async (req, res) => {
  try {
    const method = typeof req.query.method === 'string' ? req.query.method : 'METHOD_HEIMDALL';
    const result = await runPreflight(method);
    res.json({ success: true, timestamp: new Date().toISOString(), ...result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Pre-flight check failed' });
  }
});

// ==========================================
// 3c. FIRMWARE IMAGE VALIDATION (SIZE + SHA-256 + TYPE SNIFF)
// ==========================================
function sniffImageType(head: Buffer, filename: string): string {
  if (head.length >= 4 && head[0] === 0x50 && head[1] === 0x4b && head[2] === 0x03 && head[3] === 0x04)
    return 'ZIP archive';
  if (head.length >= 262 && head.toString('ascii', 257, 262) === 'ustar') return 'TAR archive';
  if (head.length >= 4 && head.readUInt32LE(0) === 0xed26ff3a) return 'Android sparse image';
  if (head.length >= 0x43a && head.readUInt16LE(0x438) === 0xef53) return 'ext4 filesystem image';
  if (/\.tar\.md5$/i.test(filename)) return 'Odin TAR.MD5 package';
  if (/\.img$/i.test(filename)) return 'Raw partition image';
  if (/\.bin$/i.test(filename)) return 'Raw binary image';
  return 'Unknown binary';
}

export async function validateFirmwareFile(filePath: string, expectedSha256?: string) {
  if (!filePath || typeof filePath !== 'string' || filePath.length > 1024) {
    throw new Error('A valid firmware file path is required.');
  }
  const resolved = path.isAbsolute(filePath)
    ? path.normalize(filePath)
    : path.resolve(process.cwd(), filePath);
  let stat: fs.Stats;
  try {
    stat = await fs.promises.stat(resolved);
  } catch {
    throw new Error(`File not found on host: ${resolved}`);
  }
  if (!stat.isFile()) throw new Error(`Not a regular file: ${resolved}`);
  if (stat.size === 0) throw new Error(`File is empty: ${resolved}`);

  const hash = crypto.createHash('sha256');
  await new Promise<void>((resolve, reject) => {
    const stream = fs.createReadStream(resolved);
    stream.on('data', (d) => hash.update(d));
    stream.on('end', () => resolve());
    stream.on('error', reject);
  });
  const sha256 = hash.digest('hex');

  const fd = await fs.promises.open(resolved, 'r');
  const head = Buffer.alloc(600);
  await fd.read(head, 0, 600, 0);
  await fd.close();

  const checksumMatch =
    typeof expectedSha256 === 'string' && expectedSha256.trim().length > 0
      ? sha256 === expectedSha256.trim().toLowerCase()
      : null;

  return {
    path: resolved,
    sizeBytes: stat.size,
    sha256,
    type: sniffImageType(head, resolved),
    checksumMatch,
  };
}

app.post('/api/firmware/validate', async (req, res) => {
  try {
    const { path: filePath, expectedSha256 } = req.body || {};
    const result = await validateFirmwareFile(filePath, expectedSha256);
    res.json({ success: true, ...result });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message || 'Firmware validation failed' });
  }
});

// ==========================================
// 4. LINUX TERMINAL COMMAND EXECUTOR (DIAGNOSTICS)
// ==========================================
app.post('/api/terminal/run', async (req, res) => {
  const { command } = req.body;
  if (!command || typeof command !== 'string') {
    return res.status(400).json({ error: 'Command string is required' });
  }
  if (command.length > 200) {
    return res.status(400).json({ error: 'Command too long (max 200 chars).' });
  }

  // Whitelist safe diagnostic, inspect, and device state-transition commands.
  // State transitions (adb reboot ...) only affect an attached device; they
  // never write firmware and are safe to expose.
  const allowedPrefixes = [
    'lsusb',
    'uname',
    'heimdall version',
    'heimdall detect',
    'adb version',
    'adb devices',
    'adb reboot download',
    'adb reboot sideload',
    'adb reboot recovery',
    'adb reboot bootloader',
    'fastboot devices',
    'cat /etc/os-release',
    'uptime',
    'free -m',
    'df -h',
  ];

  const trimmed = command.trim();
  const isAllowed = allowedPrefixes.some(prefix => trimmed === prefix || trimmed.startsWith(prefix + ' '));

  if (!isAllowed) {
    return res.status(403).json({
      error: 'Security Policy: Only diagnostic inspection commands are allowed via HTTP REST.',
      allowedPrefixes,
    });
  }

  try {
    const { stdout, stderr } = await execAsync(trimmed, { timeout: 8000 });
    res.json({
      success: true,
      command: trimmed,
      stdout: stdout.trim(),
      stderr: stderr.trim(),
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    res.json({
      success: false,
      command: trimmed,
      stdout: err.stdout ? err.stdout.trim() : '',
      stderr: err.stderr ? err.stderr.trim() : (err.message || 'Execution error'),
    });
  }
});

// ==========================================
// 5. BACKEND FLASH ENGINE (REAL — SSE STREAM)
// ==========================================
// Honest engine: runs REAL pre-flight checks and REAL host commands.
// It NEVER simulates success. Without a Samsung device on USB, with a
// missing toolchain, with unvalidated firmware, or without explicit
// confirmation for destructive operations, it aborts with a clear
// reason instead of faking a flash.

const DESTRUCTIVE_OPERATIONS = new Set(['TOTAL_CLEAN_REINSTALL', 'FACTORY_RESET', 'FLASH_STOCK']);
const VALID_OPERATIONS = new Set([
  'TOTAL_CLEAN_REINSTALL',
  'FLASH_CUSTOM_ROM',
  'FLASH_RECOVERY',
  'FLASH_STOCK',
  'FACTORY_RESET',
]);
const VALID_METHODS = new Set([
  'AUTO_MULTI_METHOD',
  'METHOD_HEIMDALL',
  'METHOD_ADB_SIDELOAD',
  'METHOD_ODIN4',
  'METHOD_HARDWARE_RECOVERY',
]);

interface FlashStep {
  title: string;
  argv: string[];
  progress: number;
}

function buildFlashPlan(
  operation: string,
  firmware: Map<string, string>,
  root: boolean,
): FlashStep[] {
  const sudo = (argv: string[]): string[] => (root ? argv : ['sudo', '-n', ...argv]);
  const img = (role: string): string => {
    const p = firmware.get(role);
    if (!p) throw new Error(`Missing validated firmware image for partition ${role}.`);
    return p;
  };

  const steps: FlashStep[] = [
    {
      title: 'Detecting Samsung device (heimdall detect)',
      argv: sudo(['heimdall', 'detect']),
      progress: 10,
    },
    {
      title: 'Downloading PIT (partition information table)',
      argv: sudo(['heimdall', 'print-pit', '--verbose']),
      progress: 20,
    },
  ];

  switch (operation) {
    case 'TOTAL_CLEAN_REINSTALL':
      steps.push(
        {
          title: 'Phase 1/3: Wiping USERDATA + CACHE',
          argv: sudo(['heimdall', 'flash', '--USERDATA', img('USERDATA'), '--CACHE', img('CACHE'), '--no-reboot']),
          progress: 50,
        },
        {
          title: 'Phase 2/3: Flashing BOOT + SYSTEM + VENDOR',
          argv: sudo(['heimdall', 'flash', '--BOOT', img('BOOT'), '--SYSTEM', img('SYSTEM'), '--VENDOR', img('VENDOR'), '--no-reboot']),
          progress: 85,
        },
      );
      break;
    case 'FLASH_CUSTOM_ROM':
      steps.push({
        title: 'Flashing BOOT + SYSTEM + VENDOR',
        argv: sudo(['heimdall', 'flash', '--BOOT', img('BOOT'), '--SYSTEM', img('SYSTEM'), '--VENDOR', img('VENDOR'), '--no-reboot']),
        progress: 80,
      });
      break;
    case 'FLASH_RECOVERY':
      steps.push({
        title: 'Flashing RECOVERY image',
        argv: sudo(['heimdall', 'flash', '--RECOVERY', img('RECOVERY'), '--no-reboot']),
        progress: 80,
      });
      break;
    case 'FLASH_STOCK':
      steps.push({
        title: 'Flashing stock AP + BL + CP + CSC',
        argv: sudo(['heimdall', 'flash', '--AP', img('AP'), '--BL', img('BL'), '--CP', img('CP'), '--CSC', img('CSC'), '--no-reboot']),
        progress: 80,
      });
      break;
    case 'FACTORY_RESET':
      steps.push({
        title: 'Wiping USERDATA + CACHE',
        argv: sudo(['heimdall', 'flash', '--USERDATA', img('USERDATA'), '--CACHE', img('CACHE'), '--no-reboot']),
        progress: 80,
      });
      break;
    default:
      throw new Error(`Unsupported operation: ${operation}`);
  }

  return steps;
}

function runHostCommand(
  argv: string[],
  onLine: (line: string, isErr: boolean) => void,
  timeoutMs = 600000,
): { promise: Promise<number>; child: ChildProcess } {
  let child!: ChildProcess;
  const promise = new Promise<number>((resolve) => {
    let settled = false;
    const done = (code: number) => {
      if (!settled) {
        settled = true;
        resolve(code);
      }
    };
    try {
      child = spawn(argv[0], argv.slice(1), { timeout: timeoutMs });
    } catch (err: any) {
      onLine(`Failed to start process: ${err.message}`, true);
      done(127);
      return;
    }
    child.stdout?.on('data', (d) => {
      String(d)
        .split('\n')
        .filter(Boolean)
        .forEach((l) => onLine(l, false));
    });
    child.stderr?.on('data', (d) => {
      String(d)
        .split('\n')
        .filter(Boolean)
        .forEach((l) => onLine(l, true));
    });
    child.on('error', (err) => {
      onLine(`Process error: ${err.message}`, true);
      done(127);
    });
    child.on('close', (code) => done(code ?? 1));
  });
  return { promise, child };
}

app.post('/api/flash/stream', async (req, res) => {
  const body = req.body || {};
  const operation = String(body.operation || 'FLASH_CUSTOM_ROM');
  const method = String(body.method || 'METHOD_HEIMDALL');
  const deviceModel = String(body.deviceModel || 'unknown');
  const acknowledgeDestructive = body.acknowledgeDestructive === true;
  const firmwareFiles: Array<{ role?: string; path?: string }> = Array.isArray(body.firmwareFiles)
    ? body.firmwareFiles
    : [];

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const running: ChildProcess[] = [];
  let clientGone = false;
  // NOTE: in Express 5, req 'close' fires when the request body is consumed —
  // useless for SSE. res 'close' with !writableEnded means the client went away.
  res.on('close', () => {
    if (!res.writableEnded) {
      clientGone = true;
      for (const child of running) {
        try {
          child.kill('SIGTERM');
        } catch {
          /* already exited */
        }
      }
    }
  });

  const sendEvent = (type: string, data: unknown) => {
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify({ type, data, timestamp: new Date().toISOString() })}\n\n`);
    }
  };
  const abort = (code: string, message: string, extra: Record<string, unknown> = {}) => {
    sendEvent('aborted', { code, message, ...extra });
    res.end();
  };

  if (!VALID_OPERATIONS.has(operation)) {
    abort('INVALID_OPERATION', `Unknown operation: ${operation}.`);
    return;
  }
  if (!VALID_METHODS.has(method)) {
    abort('INVALID_METHOD', `Unknown method: ${method}.`);
    return;
  }

  sendEvent('log', {
    level: 'info',
    message: `[FLASH ENGINE] Request: ${operation} via ${method} for ${deviceModel}.`,
  });

  // Safety gate: destructive operations require explicit user acknowledgement.
  if (DESTRUCTIVE_OPERATIONS.has(operation) && !acknowledgeDestructive) {
    abort(
      'NEEDS_CONFIRMATION',
      'This operation ERASES device data. Re-submit with acknowledgeDestructive: true after explicit user confirmation in the UI.',
    );
    return;
  }

  // Real pre-flight — never proceed on failing checks.
  let preflight: { checks: PreflightCheck[]; canFlash: boolean };
  try {
    preflight = await runPreflight(method);
  } catch (err: any) {
    abort('PREFLIGHT_ERROR', `Pre-flight probe crashed: ${err.message}`);
    return;
  }
  sendEvent('preflight', preflight);
  if (!preflight.canFlash) {
    const failed = preflight.checks
      .filter((c) => c.status === 'fail')
      .map((c) => c.label)
      .join('; ');
    abort('PREFLIGHT_FAILED', `Pre-flight checks failed (${failed}). Resolve them and retry.`, {
      checks: preflight.checks,
    });
    return;
  }

  // Validate every firmware image server-side before touching the device.
  const firmware = new Map<string, string>();
  sendEvent('log', { level: 'info', message: '[FLASH ENGINE] Validating firmware images on host...' });
  for (const f of firmwareFiles) {
    const role = String(f.role || '').toUpperCase();
    if (!role || !f.path) {
      abort('FIRMWARE_INVALID', 'Each firmware entry needs a role and a host path.');
      return;
    }
    try {
      const v = await validateFirmwareFile(String(f.path));
      firmware.set(role, v.path);
      sendEvent('log', {
        level: 'success',
        message: `[OK] ${role}: ${v.type}, ${(v.sizeBytes / 1048576).toFixed(1)} MB, sha256 ${v.sha256.slice(0, 16)}…`,
      });
    } catch (err: any) {
      abort('FIRMWARE_INVALID', `Firmware validation failed for ${role}: ${err.message}`);
      return;
    }
  }

  let plan: FlashStep[];
  try {
    plan = buildFlashPlan(operation, firmware, isRootUser());
  } catch (err: any) {
    abort('PLAN_ERROR', err.message);
    return;
  }

  sendEvent('log', {
    level: 'warning',
    message: `[FLASH ENGINE] Starting REAL flash pipeline — ${plan.length} host commands. Do NOT unplug the device.`,
  });

  for (const step of plan) {
    if (clientGone || res.writableEnded) return;
    sendEvent('step', { title: step.title, progress: step.progress, command: step.argv.join(' ') });
    sendEvent('log', { level: 'command', message: step.argv.join(' ') });

    const { promise, child } = runHostCommand(step.argv, (line, isErr) =>
      sendEvent('log', { level: isErr ? 'warning' : 'info', message: line }),
    );
    running.push(child);
    const code = await promise;
    const idx = running.indexOf(child);
    if (idx >= 0) running.splice(idx, 1);

    if (clientGone || res.writableEnded) return; // client disconnected — children already killed
    if (code !== 0) {
      abort(
        'COMMAND_FAILED',
        `Command failed with exit code ${code}: ${step.title}. The device was NOT fully flashed — check the log, then retry.`,
        { failedStep: step.title, exitCode: code },
      );
      return;
    }
    sendEvent('progress', { progress: step.progress });
    sendEvent('log', { level: 'success', message: `[OK] ${step.title}` });
  }

  sendEvent('done', {
    success: true,
    message: `${operation} completed successfully. The device should now reboot — complete setup on the phone itself.`,
    progress: 100,
  });
  res.end();
});

// ==========================================
// 6. SCRIPT DOWNLOAD FOR DIRECT CURL EXECUTION
// ==========================================
app.get(['/api/script/download', '/flash-samsung.sh'], (req, res) => {
  const scriptPath = path.join(process.cwd(), 'flash-samsung.sh');
  if (fs.existsSync(scriptPath)) {
    res.setHeader('Content-Type', 'text/x-shellscript');
    res.setHeader('Content-Disposition', 'attachment; filename="flash-samsung.sh"');
    return res.sendFile(scriptPath);
  }
  res.status(404).send('Script file flash-samsung.sh not found');
});

// ==========================================
// 7. VITE MIDDLEWARE / PRODUCTION STATIC SERVE
// ==========================================
async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Universal Samsung Flasher backend listening on http://0.0.0.0:${PORT}`);
  });
}

start().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
