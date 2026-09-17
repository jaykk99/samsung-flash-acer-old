import React, { useState } from 'react';
import { Terminal } from './components/Terminal';
import { FlashMap } from './components/FlashMap';
import { SAMSUNG_DEVICES } from './devices';
import { Device, FlashOperation, LogEntry } from './types';
import { Settings2, Smartphone, Download, RefreshCw, Usb, Cpu, ShieldAlert, AlertTriangle, Play } from 'lucide-react';

export default function App() {
  const [selectedDevice, setSelectedDevice] = useState<Device>(SAMSUNG_DEVICES[2]); // Default Galaxy S7
  const [operation, setOperation] = useState<FlashOperation>('FLASH_RECOVERY');
  const [isConnected, setIsConnected] = useState(false);
  const [isFlashing, setIsFlashing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<LogEntry[]>([
    { timestamp: new Date(), type: 'info', message: 'Heimdall Web initialized. v1.4.2' },
    { timestamp: new Date(), type: 'info', message: 'Please reboot your Samsung device into Download Mode (Vol Down + Home/Bixby + Power) and connect via USB.' }
  ]);

  const addLog = (message: string, type: LogEntry['type'] = 'info') => {
    setLogs(prev => [...prev, { timestamp: new Date(), message, type }]);
  };

  const handleConnect = async () => {
    if (isConnected) {
      setIsConnected(false);
      addLog('Disconnected from target device.', 'warning');
      return;
    }

    try {
      // Simulate Web Serial API request for immersion
      if ('serial' in navigator) {
        addLog('Requesting WebUSB interface...', 'info');
      }
      
      setIsConnected(true);
      addLog('Connected to Samsung USB Interface.', 'success');
      addLog('heimdall detect', 'command');
      setTimeout(() => {
        addLog(`Device detected`, 'info');
      }, 600);
    } catch (err) {
      addLog('Failed to claim USB interface. Falling back to simulated mode.', 'error');
      setIsConnected(true);
    }
  };

  const executeFlash = () => {
    if (!isConnected) {
      addLog('Cannot flash: Device not connected.', 'error');
      return;
    }
    if (isFlashing) return;

    setIsFlashing(true);
    setProgress(0);

    let steps: { msg: string, cmd?: boolean, type: LogEntry['type'], time: number, p: number }[] = [];

    if (operation === 'FLASH_RECOVERY') {
      steps = [
        { msg: 'heimdall flash --RECOVERY twrp.img --no-reboot', cmd: true, type: 'command', time: 100, p: 0 },
        { msg: 'Initialising connection...', type: 'info', time: 500, p: 5 },
        { msg: 'Detecting device...', type: 'info', time: 1000, p: 10 },
        { msg: 'Claiming interface...', type: 'info', time: 1500, p: 15 },
        { msg: 'Setting up interface...', type: 'info', time: 2000, p: 20 },
        { msg: 'Initialising protocol...', type: 'info', time: 2500, p: 25 },
        { msg: "Downloading device's PIT file...", type: 'info', time: 3000, p: 30 },
        { msg: 'PIT file download successful.', type: 'success', time: 3500, p: 35 },
        { msg: 'Uploading RECOVERY...', type: 'info', time: 4000, p: 40 },
        { msg: 'Uploading... 32%', type: 'info', time: 4500, p: 60 },
        { msg: 'Uploading... 78%', type: 'info', time: 5000, p: 85 },
        { msg: 'Uploading... 100%', type: 'info', time: 5500, p: 100 },
        { msg: 'RECOVERY upload successful.', type: 'success', time: 6000, p: 100 },
        { msg: 'Ending session...', type: 'info', time: 6500, p: 100 },
      ];
    } else if (operation === 'FLASH_CUSTOM_ROM') {
      steps = [
        { msg: 'heimdall flash --SYSTEM lineageos.img --BOOT boot.img', cmd: true, type: 'command', time: 100, p: 0 },
        { msg: 'Initialising connection and protocol...', type: 'info', time: 800, p: 10 },
        { msg: "Downloading device's PIT file...", type: 'info', time: 1200, p: 15 },
        { msg: 'PIT file download successful.', type: 'success', time: 1500, p: 20 },
        { msg: 'Uploading BOOT...', type: 'info', time: 1800, p: 25 },
        { msg: 'BOOT upload successful.', type: 'success', time: 2500, p: 35 },
        { msg: 'Uploading SYSTEM...', type: 'info', time: 3000, p: 40 },
        { msg: 'Uploading... 24%', type: 'info', time: 4500, p: 55 },
        { msg: 'Uploading... 56%', type: 'info', time: 6000, p: 70 },
        { msg: 'Uploading... 89%', type: 'info', time: 7500, p: 85 },
        { msg: 'Uploading... 100%', type: 'info', time: 8500, p: 95 },
        { msg: 'SYSTEM upload successful.', type: 'success', time: 9000, p: 100 },
        { msg: 'Rebooting device...', type: 'info', time: 9500, p: 100 },
      ];
    } else if (operation === 'FLASH_STOCK') {
      steps = [
        { msg: 'heimdall flash --AP AP.tar.md5 --BL BL.tar.md5 --CP CP.tar.md5 --CSC CSC.tar.md5', cmd: true, type: 'command', time: 100, p: 0 },
        { msg: 'Extracting firmware archives...', type: 'info', time: 1500, p: 10 },
        { msg: 'Initialising protocol...', type: 'info', time: 2000, p: 15 },
        { msg: 'Uploading Bootloader...', type: 'info', time: 2500, p: 25 },
        { msg: 'Uploading Modem/Baseband...', type: 'info', time: 4000, p: 40 },
        { msg: 'Uploading System (This may take a while)...', type: 'info', time: 5000, p: 50 },
        { msg: 'Uploading... 45%', type: 'info', time: 7000, p: 75 },
        { msg: 'Uploading... 100%', type: 'info', time: 9000, p: 95 },
        { msg: 'Stock Firmware upload successful.', type: 'success', time: 9500, p: 100 },
        { msg: 'Rebooting device...', type: 'info', time: 10000, p: 100 },
      ];
    } else if (operation === 'FACTORY_RESET') {
      steps = [
        { msg: 'heimdall flash --USERDATA empty.ext4 --CACHE empty.ext4', cmd: true, type: 'command', time: 100, p: 0 },
        { msg: 'Initialising protocol...', type: 'info', time: 800, p: 20 },
        { msg: 'Wiping USERDATA partition...', type: 'info', time: 1500, p: 50 },
        { msg: 'Wiping CACHE partition...', type: 'info', time: 3000, p: 80 },
        { msg: 'Partitions wiped successfully.', type: 'success', time: 4000, p: 100 },
      ];
    }

    steps.forEach(step => {
      setTimeout(() => {
        addLog(step.msg, step.type);
        setProgress(step.p);
        if (step.p === 100) {
          setTimeout(() => setIsFlashing(false), 500);
        }
      }, step.time);
    });
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-300 font-sans selection:bg-blue-900 selection:text-blue-50">
      
      {/* Header */}
      <header className="border-b border-neutral-800 bg-neutral-900/50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
              <Smartphone className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h1 className="font-semibold text-neutral-100 tracking-tight">Heimdall Web</h1>
              <div className="text-[10px] text-neutral-500 font-mono uppercase tracking-widest">Samsung Firmware Utility</div>
            </div>
          </div>

          <button 
            onClick={handleConnect}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              isConnected 
                ? 'bg-neutral-800 text-neutral-300 border border-neutral-700 hover:bg-neutral-700' 
                : 'bg-blue-600 text-white hover:bg-blue-500 shadow-[0_0_15px_rgba(37,99,235,0.4)]'
            }`}
          >
            <Usb className="w-4 h-4" />
            {isConnected ? 'Disconnect' : 'Connect Device'}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Configuration */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Target Selection */}
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-2">
              <Cpu className="w-4 h-4" /> Target Hardware
            </h2>
            <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs text-neutral-500">Device Model</label>
                <select 
                  value={selectedDevice.id}
                  onChange={(e) => setSelectedDevice(SAMSUNG_DEVICES.find(d => d.id === e.target.value)!)}
                  disabled={isFlashing}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded p-2 text-sm text-neutral-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none disabled:opacity-50"
                >
                  {SAMSUNG_DEVICES.map(device => (
                    <option key={device.id} value={device.id}>
                      {device.modelName} ({device.modelNumber})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-neutral-800">
                <div>
                  <div className="text-[10px] text-neutral-500 uppercase">Architecture</div>
                  <div className="text-sm text-neutral-300 font-mono">{selectedDevice.architecture}</div>
                </div>
                <div>
                  <div className="text-[10px] text-neutral-500 uppercase">SoC</div>
                  <div className="text-sm text-neutral-300 font-mono">{selectedDevice.soc}</div>
                </div>
              </div>
            </div>
          </section>

          {/* Operation Selection */}
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-2">
              <Settings2 className="w-4 h-4" /> Operation
            </h2>
            <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-2 space-y-1">
              {[
                { id: 'FLASH_RECOVERY', label: 'Flash Custom Recovery', icon: Download, desc: 'Install TWRP or similar recovery image' },
                { id: 'FLASH_CUSTOM_ROM', label: 'Flash Custom OS', icon: RefreshCw, desc: 'Install LineageOS, /e/OS, or custom ROMs' },
                { id: 'FLASH_STOCK', label: 'Restore Stock Firmware', icon: AlertTriangle, desc: 'Flash official AP, BL, CP, CSC tarballs' },
                { id: 'FACTORY_RESET', label: 'Factory Reset', icon: ShieldAlert, desc: 'Wipe Userdata & Cache partitions' },
              ].map(op => {
                const Icon = op.icon;
                const isSelected = operation === op.id;
                return (
                  <button
                    key={op.id}
                    onClick={() => setOperation(op.id as FlashOperation)}
                    disabled={isFlashing}
                    className={`w-full flex items-start gap-3 p-3 rounded-md text-left transition-colors ${
                      isSelected 
                        ? 'bg-neutral-800/80 border-l-2 border-blue-500' 
                        : 'hover:bg-neutral-800/50 border-l-2 border-transparent'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${isSelected ? 'text-blue-400' : 'text-neutral-500'}`} />
                    <div>
                      <div className={`text-sm font-medium ${isSelected ? 'text-neutral-200' : 'text-neutral-400'}`}>
                        {op.label}
                      </div>
                      <div className="text-xs text-neutral-600">{op.desc}</div>
                    </div>
                  </button>
                )
              })}
            </div>
          </section>
        </div>

        {/* Right Column: Execution & Logs */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-[200px]">
            {/* Flash Map visualization */}
            <FlashMap />

            {/* Execution Status */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6 flex flex-col justify-center items-center text-center relative overflow-hidden">
              {operation === 'FLASH_STOCK' && (
                <div className="absolute top-0 inset-x-0 h-1 bg-amber-500"></div>
              )}
              
              <div className="w-full max-w-xs space-y-6 z-10">
                <button
                  onClick={executeFlash}
                  disabled={!isConnected || isFlashing}
                  className={`w-full py-4 rounded-lg font-bold text-lg flex items-center justify-center gap-2 transition-all ${
                    !isConnected
                      ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                      : isFlashing
                        ? 'bg-neutral-800 text-neutral-300'
                        : operation === 'FLASH_STOCK'
                          ? 'bg-red-900/40 text-red-400 hover:bg-red-900/60 border border-red-900/50 shadow-[0_0_20px_rgba(153,27,27,0.3)]'
                          : 'bg-neutral-800 text-neutral-200 hover:bg-neutral-700 hover:text-white border border-neutral-700'
                  }`}
                >
                  {isFlashing ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <Play className="w-5 h-5" />
                  )}
                  {isFlashing ? 'Processing...' : 'Start Procedure'}
                </button>

                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-mono text-neutral-500">
                    <span>Progress</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="w-full h-2 bg-neutral-950 rounded-full overflow-hidden border border-neutral-800">
                    <div 
                      className={`h-full transition-all duration-300 ease-out ${
                        progress === 100 ? 'bg-emerald-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Terminal */}
          <div className="flex-1 min-h-[300px]">
            <Terminal logs={logs} />
          </div>

        </div>
      </main>

    </div>
  );
}
