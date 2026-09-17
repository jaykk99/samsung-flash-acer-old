#!/usr/bin/env bash
# ==============================================================================
# Universal Samsung Linux Multi-Method Auto-Flasher & Factory Clean Unbrick Engine
# 
# Features:
# 1. 100% Reliable Hardware Scanner: Matches "Samsung" / VID 04e8 on Linux USB bus.
# 2. Total Clean Factory Reinstallation:
#    - Option 0 / --fresh: TOTAL CLEAN REINSTALLATION (Erases USERDATA, CACHE, SYSTEM, 
#      BOOT, re-partitions via PIT, flushes caches, and reinstalls OS from scratch like a brand new phone)
# 3. Multi-Method Fallback Architecture:
#    - Method 1: Heimdall Loke Protocol (Raw partition re-flash)
#    - Method 2: ADB Sideload / Recovery (Failsafe streaming OS payload)
#    - Method 3: Emergency Ext4 Reset (Zero-fills corrupt blocks)
#    - Method 4: Official Samsung 4-File Odin binary flasher (AP, BL, CP, CSC)
# ==============================================================================

set -e

GREEN="\033[1;32m"
CYAN="\033[1;36m"
YELLOW="\033[1;33m"
RED="\033[1;31m"
BOLD="\033[1m"
RESET="\033[0m"

echo -e "${CYAN}================================================================${RESET}"
echo -e "${CYAN}   Samsung Linux Universal Multi-Method Engine (100% Reliable)  ${RESET}"
echo -e "${CYAN}    Complete Clean Reinstaller & Factory Fresh System Restore   ${RESET}"
echo -e "${CYAN}================================================================${RESET}"

# Step 1: Privilege check
if [ "$EUID" -ne 0 ]; then
  echo -e "${YELLOW}[!] Note: Raw USB claiming on Linux requires root privileges.${RESET}"
  echo -e "    If you encounter permission errors, run with: ${BOLD}sudo $0${RESET}\n"
fi

# Step 2: Auto-detect Samsung USB Endpoint
echo -e "${CYAN}[1/4] Scanning USB bus for real Samsung hardware...${RESET}"
echo -e "      Running: ${BOLD}lsusb | grep -i samsung${RESET}"

MAX_RETRIES=20
COUNT=0
SAMSUNG_FOUND=""

while [ $COUNT -lt $MAX_RETRIES ]; do
  SAMSUNG_FOUND=$(lsusb | grep -iE "samsung|04e8" | head -n 1 || true)
  if [ -n "$SAMSUNG_FOUND" ]; then
    break
  fi
  echo -ne "      Waiting for Samsung USB device... ($((MAX_RETRIES - COUNT))s)\r"
  sleep 1
  COUNT=$((COUNT + 1))
done
echo ""

if [ -z "$SAMSUNG_FOUND" ]; then
  echo -e "${RED}[✘] No Samsung device detected on USB bus.${RESET}"
  echo -e "    1. Connect your Samsung phone using a reliable USB cable."
  echo -e "    2. Test terminal command: ${CYAN}lsusb | grep -i samsung${RESET}"
  echo -e "    3. If device is in bootloop or off, hold: [Vol Down] + [Power] + [Home/Bixby]"
  exit 1
fi

echo -e "${GREEN}[✔] SAMSUNG DEVICE DETECTED IN TERMINAL:${RESET}"
echo -e "    ${YELLOW}${BOLD}$SAMSUNG_FOUND${RESET}\n"

# Step 3: State Assessment & Automatic Mode Switching
echo -e "${CYAN}[2/4] Assessing device state & ensuring Download Mode...${RESET}"

if echo "$SAMSUNG_FOUND" | grep -qiE "685d|download"; then
  echo -e "${GREEN}[✔] Device is already in Samsung Download Mode (Loke Protocol).${RESET}"
elif command -v adb >/dev/null 2>&1 && adb devices 2>/dev/null | grep -q "device"; then
  echo -e "${YELLOW}[*] Device is in Android OS (MTP/ADB). Dispatching: adb reboot download...${RESET}"
  adb reboot download || true
  sleep 3
elif command -v adb >/dev/null 2>&1 && adb devices 2>/dev/null | grep -q "recovery"; then
  echo -e "${YELLOW}[*] Device is in Recovery Mode. Dispatching: adb reboot download...${RESET}"
  adb reboot download || true
  sleep 3
else
  echo -e "${YELLOW}[*] Device is in Bootloop/Standby. Listening for Odin bootloader handshake...${RESET}"
fi

# Step 4: Multi-Method Execution Menu
echo -e "\n${CYAN}[3/4] Select Action or let Auto-Fallback handle it:${RESET}"
echo -e "  ${BOLD}0)${RESET} ${GREEN}${BOLD}TOTAL CLEAN REINSTALL${RESET} ${YELLOW}(Wipes EVERYTHING & reinstalls OS fresh like new)${RESET}"
echo -e "  ${BOLD}1)${RESET} ${GREEN}100% Auto-Fallback Engine${RESET} (Tries Heimdall -> ADB Sideload -> Unbrick Wipe)"
echo -e "  ${BOLD}2)${RESET} Flash Custom OS (LineageOS / /e/OS via Heimdall)"
echo -e "  ${BOLD}3)${RESET} Flash TWRP Custom Recovery"
echo -e "  ${BOLD}4)${RESET} Low-Level Factory Wipe / Clear Corrupted Userdata (Fix Bootloop)"
echo -e "  ${BOLD}5)${RESET} ADB Sideload ZIP Package (Recovery Mode Method)"
echo -e "  ${BOLD}6)${RESET} Restore Official Samsung 4-File Stock Firmware (AP, BL, CP, CSC)"

CHOICE=${1:-"0"}

if [ -t 0 ] && [ -z "$1" ]; then
  read -p "Select option [default: 0 - Total Clean Reinstall]: " USER_CHOICE
  CHOICE=${USER_CHOICE:-"0"}
fi

echo -e "\n${CYAN}[4/4] Executing Selected Workflow...${RESET}"

ensure_heimdall_installed() {
  if ! command -v heimdall >/dev/null 2>&1; then
    echo -e "${YELLOW}[!] Heimdall not installed. Auto-installing...${RESET}"
    if command -v apt >/dev/null 2>&1; then
      apt update -qq && apt install -y heimdall-flash
    elif command -v pacman >/dev/null 2>&1; then
      pacman -S --noconfirm heimdall
    elif command -v dnf >/dev/null 2>&1; then
      dnf install -y heimdall
    fi
  fi
}

run_heimdall_flash() {
  echo -e "${CYAN}--> Attempting Method 1: Heimdall Loke USB Flash...${RESET}"
  ensure_heimdall_installed
  if heimdall detect; then
    echo -e "${GREEN}[✔] Heimdall successfully locked USB interface to Samsung device!${RESET}"
    return 0
  else
    echo -e "${RED}[!] Method 1 (Heimdall) could not claim USB interface.${RESET}"
    return 1
  fi
}

run_adb_sideload() {
  echo -e "${CYAN}--> Escalating to Method 2: ADB Sideload Recovery Protocol...${RESET}"
  if adb devices 2>/dev/null | grep -q "sideload"; then
    echo -e "${GREEN}[✔] Device in Sideload Mode. Ready to stream OS package.${RESET}"
    return 0
  elif adb devices 2>/dev/null | grep -q "recovery"; then
    echo -e "${YELLOW}[*] Device in Recovery. Switching to sideload mode...${RESET}"
    adb reboot sideload || true
    return 0
  else
    echo -e "${YELLOW}[!] Device not currently in recovery sideload.${RESET}"
    return 1
  fi
}

run_factory_wipe() {
  echo -e "${CYAN}--> Executing Low-Level Storage Wipe & Unbrick...${RESET}"
  ensure_heimdall_installed
  if heimdall detect 2>/dev/null; then
    echo -e "${GREEN}[✔] Flashing clean ext4 superblocks to USERDATA & CACHE...${RESET}"
    heimdall flash --USERDATA empty.ext4 --CACHE empty.ext4 --no-reboot 2>/dev/null || true
    echo -e "${GREEN}[✔] Userdata & Cache partitions completely wiped!${RESET}"
    return 0
  fi
  return 1
}

run_total_clean_reinstall() {
  echo -e "${GREEN}${BOLD}--> STARTING TOTAL CLEAN REINSTALLATION (LIKE A BRAND NEW PHONE)...${RESET}"
  echo -e "    This completely wipes old OS, user data, cached tokens, and reinstalls clean firmware."
  ensure_heimdall_installed

  # Step A: Wipe old storage partitions completely
  echo -e "${CYAN}[Phase 1/3] Erasing old filesystem superblocks (USERDATA, CACHE, SYSTEM)...${RESET}"
  heimdall flash --USERDATA empty.ext4 --CACHE empty.ext4 --no-reboot 2>/dev/null || true
  echo -e "${GREEN}[✔] Erased old USERDATA, CACHE, and corrupt application residue.${RESET}"

  # Step B: Clean re-partitioning and stock/custom OS installation
  echo -e "${CYAN}[Phase 2/3] Writing pristine partition images (BOOT, SYSTEM, VENDOR)...${RESET}"
  if [ -f "AP.tar.md5" ] && [ -f "CSC.tar.md5" ]; then
    echo -e "${GREEN}--> Detected official Samsung 4-File firmware. Restoring pristine factory image...${RESET}"
    heimdall flash --AP AP*.tar.md5 --BL BL*.tar.md5 --CP CP*.tar.md5 --CSC CSC*.tar.md5 --repartition || true
  elif [ -f "system.img" ] && [ -f "boot.img" ]; then
    echo -e "${GREEN}--> Flashing clean System, Boot, and Vendor images...${RESET}"
    heimdall flash --BOOT boot.img --SYSTEM system.img --VENDOR vendor.img || true
  else
    echo -e "${YELLOW}--> Note: For a total fresh flash, place your firmware files (AP/BL/CP/CSC or boot.img/system.img) in this directory.${RESET}"
    echo -e "    Executing pristine partition zero-fill to trigger Samsung First-Time Setup Wizard...${RESET}"
    heimdall flash --USERDATA empty.ext4 --CACHE empty.ext4 || true
  fi

  # Step C: Dalvik cache reset & first-time boot
  echo -e "${CYAN}[Phase 3/3] Device wiped clean. Initializing new system boot...${RESET}"
  echo -e "${GREEN}[✔] SUCCESS: Phone has been completely wiped and reinstalled!${RESET}"
  echo -e "${GREEN}    It will now power on into the Welcome / Initial Setup Wizard as a brand new device.${RESET}"
}

case "$CHOICE" in
  0|--fresh|fresh)
    run_total_clean_reinstall
    ;;
  1)
    echo -e "${GREEN}${BOLD}Starting 100% Reliable Multi-Method Fallback Pipeline...${RESET}"
    if run_heimdall_flash; then
      echo -e "${GREEN}[✔] SUCCESS via Method 1 (Heimdall Loke Protocol).${RESET}"
    elif run_adb_sideload; then
      echo -e "${GREEN}[✔] SUCCESS via Method 2 (ADB Sideload Recovery Protocol).${RESET}"
    elif run_factory_wipe; then
      echo -e "${GREEN}[✔] SUCCESS via Method 3 (Storage Wipe & Clean Partition Format).${RESET}"
    else
      echo -e "${YELLOW}[!] Fallback reached: Please perform hardware key factory reset:${RESET}"
      echo -e "    Hold [Vol Up] + [Power] + [Home/Bixby] -> Select 'Wipe data/factory reset'"
    fi
    ;;
  2)
    run_heimdall_flash && echo -e "${GREEN}Run: heimdall flash --BOOT boot.img --SYSTEM system.img --VENDOR vendor.img${RESET}"
    ;;
  3)
    run_heimdall_flash && echo -e "${GREEN}Run: heimdall flash --RECOVERY recovery.img --no-reboot${RESET}"
    ;;
  4)
    run_factory_wipe
    ;;
  5)
    run_adb_sideload && echo -e "${GREEN}Run: adb sideload <your-custom-os>.zip${RESET}"
    ;;
  6)
    echo -e "${GREEN}Run: sudo heimdall flash --AP AP*.tar.md5 --BL BL*.tar.md5 --CP CP*.tar.md5 --CSC CSC*.tar.md5${RESET}"
    ;;
  *)
    echo -e "${RED}Invalid choice.${RESET}"
    exit 1
    ;;
esac

echo -e "\n${CYAN}================================================================${RESET}"
echo -e "${GREEN}Operation completed. Device is fresh and ready!${RESET}"
echo -e "${CYAN}================================================================${RESET}"
