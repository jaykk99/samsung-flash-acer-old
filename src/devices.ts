import { Device, Partition } from './types';

export const SAMSUNG_DEVICES: Device[] = [
  { id: 'i9300', modelName: 'Galaxy S III', modelNumber: 'GT-I9300', soc: 'Exynos 4412', architecture: 'ARM', pitSize: 4 },
  { id: 'klte', modelName: 'Galaxy S5', modelNumber: 'SM-G900F', soc: 'Snapdragon 801', architecture: 'ARM', pitSize: 4 },
  { id: 'herolte', modelName: 'Galaxy S7', modelNumber: 'SM-G930F', soc: 'Exynos 8890', architecture: 'ARM64', pitSize: 4 },
  { id: 'dreamlte', modelName: 'Galaxy S8', modelNumber: 'SM-G950F', soc: 'Exynos 8895', architecture: 'ARM64', pitSize: 4 },
  { id: 'beyond1lte', modelName: 'Galaxy S10', modelNumber: 'SM-G973F', soc: 'Exynos 9820', architecture: 'ARM64', pitSize: 4 },
  { id: 'a52sxq', modelName: 'Galaxy A52s 5G', modelNumber: 'SM-A528B', soc: 'Snapdragon 778G', architecture: 'ARM64', pitSize: 8 },
];

export const DEFAULT_PARTITIONS: Partition[] = [
  { name: 'BOOT', flashFilename: 'boot.img', size: '32 MB', description: 'Kernel and RAMDisk', color: 'bg-emerald-800' },
  { name: 'RECOVERY', flashFilename: 'recovery.img', size: '48 MB', description: 'TWRP / Stock Recovery', color: 'bg-amber-800' },
  { name: 'SYSTEM', flashFilename: 'system.img', size: '3.5 GB', description: 'Android OS (ROM)', color: 'bg-blue-800' },
  { name: 'VENDOR', flashFilename: 'vendor.img', size: '512 MB', description: 'Hardware Drivers', color: 'bg-indigo-800' },
  { name: 'USERDATA', flashFilename: 'userdata.img', size: 'Varies', description: 'User Apps & Files', color: 'bg-zinc-700' },
  { name: 'CACHE', flashFilename: 'cache.img', size: '256 MB', description: 'System Cache', color: 'bg-slate-700' },
  { name: 'RADIO', flashFilename: 'modem.bin', size: '64 MB', description: 'Baseband/Modem', color: 'bg-purple-800' },
];
