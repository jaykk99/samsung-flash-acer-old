export interface Device {
  id: string;
  modelName: string;
  modelNumber: string;
  soc: string;
  architecture: 'ARM' | 'ARM64';
  pitSize: number; // in KB
}

export interface Partition {
  name: string;
  flashFilename: string;
  size: string;
  description: string;
  color: string;
}

export type FlashOperation = 'FLASH_RECOVERY' | 'FLASH_CUSTOM_ROM' | 'FLASH_STOCK' | 'FACTORY_RESET';

export interface LogEntry {
  timestamp: Date;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'command';
}
