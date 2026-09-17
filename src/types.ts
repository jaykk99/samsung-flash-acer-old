export type DeviceState = 'ON' | 'OFF' | 'BOOTLOOP' | 'RECOVERY' | 'DOWNLOAD' | 'EDL';

export interface Device {
  id: string;
  modelName: string;
  modelNumber: string;
  soc: string;
  architecture: 'ARM' | 'ARM64';
  pitSize: number; // in KB
  usbType: 'Micro-USB' | 'USB-C';
  downloadCombo: string;
  jigSupported: boolean;
  hasBixby: boolean;
  hasHomeButton: boolean;
  usbVid?: string;
  usbPid?: string;
}

export interface DetectedUsbInfo {
  vendorId: number;
  productId: number;
  productName?: string;
  manufacturerName?: string;
  serialNumber?: string;
  mode: 'ODIN_DOWNLOAD' | 'MTP_ADB' | 'RECOVERY' | 'UNKNOWN';
}

export interface Partition {
  name: string;
  flashFilename: string;
  size: string;
  description: string;
  color: string;
}

export type FlashOperation = 
  | 'TOTAL_CLEAN_REINSTALL' 
  | 'FLASH_CUSTOM_ROM' 
  | 'FLASH_RECOVERY' 
  | 'FLASH_STOCK' 
  | 'FACTORY_RESET';

export type FlashMethod = 
  | 'AUTO_MULTI_METHOD' 
  | 'METHOD_HEIMDALL' 
  | 'METHOD_ADB_SIDELOAD' 
  | 'METHOD_ODIN4' 
  | 'METHOD_HARDWARE_RECOVERY';

export type MethodExecutionState = 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED_FALLBACK';

export interface MethodStep {
  id: FlashMethod;
  name: string;
  protocol: string;
  description: string;
  linuxCommand: string;
  reliability: string;
  status: MethodExecutionState;
}

export interface LogEntry {
  timestamp: Date;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'command';
}
