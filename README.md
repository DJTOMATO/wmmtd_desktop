<p align="center">
  <img src="icon.png" alt="Wangan Minimum Tune" width="120" height="120">
</p>

<h1 align="center">WMMTD Desktop</h1>

<p align="center">
  <b>Unofficial</b> standalone desktop client for <a href="https://wmmtd.xyz/">Wangan Minimum Tune</a> (Wangan Midnight Maximum Tune web port).<br>
  <b>English</b> · <a href="README.es.md">Español</a>
</p>

<p align="center">
  <a href="https://github.com/DJTOMATO/wmmtd_desktop/releases"><b>Download Latest Installer (Releases)</b></a> ·
  <a href="https://wmmtd.xyz/">Website</a> ·
  <a href="https://github.com/DJTOMATO/wmmtd_desktop/issues">Report an Issue</a> ·
  <a href="https://ko-fi.com/lenabot"><b>Donate on Ko-fi</b></a>
</p>

> [!IMPORTANT]
> **Unofficial Client:** This project is an independent community project and is **not affiliated with, endorsed, maintained, or supported by** the creators or operators of [wmmtd.xyz](https://wmmtd.xyz/) or Bandai Namco Entertainment.

---

## Why a desktop client?

[Wangan Minimum Tune](https://wmmtd.xyz/) brings *Wangan Midnight* arcade street racing to modern browsers using dynamic WebAssembly lifting (`WebAssembly.Suspending` / JSPI), WebGL2 on `OffscreenCanvas`, OPFS block caching, WebRTC P2P linked cabinet racing, and WebHID steering wheel Force Feedback. Playing inside a standard browser tab introduces several pain points:

- **Alt-tabbing throttles background tabs:** Regular browsers throttle Web Workers, timers, and WebRTC P2P connections when minimized or occluded, causing dropped frames or desyncs during Online Versus races.
- **Integrated vs. discrete GPU:** Laptops frequently route browser tabs to low-power integrated graphics instead of your dedicated NVIDIA or AMD GPU, hurting 2x–4x native upscaling performance.
- **Storage eviction & OPFS lock conflicts:** Browsers can evict cached game blocks or open duplicate tabs that block exclusive OPFS sync access handles, forcing slow re-downloads.
- **Screen sleep on controller or wheel:** Racing with a gamepad or steering wheel without touching keyboard or mouse can trigger OS display sleep mid-race.

This desktop client wraps `wmmtd.xyz` in a clean, tuned Electron environment with dedicated GPU acceleration, passthrough WebGL2 rendering, 3 GB+ persistent local storage, zero background throttling, WebHID wheel FFB support, and Discord Rich Presence out of the box.

## Download & Install

Grab the latest installer (`Wangan Minimum Tune-Setup-1.0.0-x64.exe` for Windows, `.dmg` for macOS, or `.AppImage` / `.deb` for Linux) from the [**Releases page**](https://github.com/DJTOMATO/wmmtd_desktop/releases).

## What's configured under the hood

- **Enhanced Framerate & WebGL2 Graphics Performance:** Launches with `force_high_performance_gpu`, `ignore-gpu-blocklist`, `use-cmd-decoder=passthrough`, `use-angle=d3d11` (Windows), `enable-gpu-rasterization`, `enable-zero-copy`, `enable-oop-rasterization`, `enable-native-gpu-memory-buffers`, and `CanvasOopRasterization` to cut WebGL2 `OffscreenCanvas` draw-call overhead and maximize frame pacing at 1x–4x render scales.
- **3 GB+ Persistent Local Storage:** Auto-grants `persistent-storage` and `storage-access` for `wmmtd.xyz` so Chromium never evicts the ~2 GB+ OPFS block cache (`wmmt3dx-blocks`), ~100 MB compiled WASM lift cache (`wmmt3dx-lift-v1`), or IndexedDB driver cards and ghosts — paired with a maximum-safe 2 GiB HTTP disk cache (`--disk-cache-size=2147483647`, avoiding Chromium's 32-bit overflow bug) for fast repeat launches.
- **Single-Instance OPFS Lock Protection:** Enforces a single client instance so OPFS exclusive sync access handles are never blocked by accidentally opening a second window.
- **Full WebAssembly JSPI & Memory Headroom:** Enables `WebAssemblyJSPI`, SharedArrayBuffer (preserving cross-origin isolation), eager V8 bytecode caching, and `--max-old-space-size=4096` to eliminate GC stutters and out-of-memory faults when lifting the arcade binary.
- **No Background Throttling:** Completely disables renderer, timer, and occluded-window throttling (`backgroundThrottling: false`) so WebRTC P2P Online Versus linked lobbies stay rock-solid even when you Alt+Tab.
- **Steering Wheel Force Feedback (WebHID) & Gamepads:** Configures Electron's `setDevicePermissionHandler` and `select-hid-device` handlers for `wmmtd.xyz` so supported wheels (Logitech, Thrustmaster, Simagic) and gamepads work seamlessly, and shuts down cleanly via `pagehide` so wheel FFB motors release safely on exit.
- **Discord Rich Presence (RPC):** Displays that you are playing *Wangan Minimum Tune* (and when you're in an Online Versus lobby) with live elapsed time and direct buttons to play on `wmmtd.xyz` or download the desktop client.
- **Over-the-Air Enhancements (`wmmtdmod.js`):** Syncs lightweight status and storage improvements automatically on startup (with local offline fallback).
- **Linux / Wayland Compatibility:** Defaults safely to X11/XWayland with Vulkan enabled to prevent Wayland Ozone black screens (while still respecting explicit `--ozone-platform=wayland`).
- **Display Sleep Blocker & Window State Memory:** Keeps your screen awake during gamepad/wheel sessions and remembers your window size and monitor position across launches.

## System Requirements / Specs

| Component | Minimum | Recommended (60 FPS + 2x–4x Render Scale) |
| :--- | :--- | :--- |
| **OS** | Windows 10 (64-bit, 1909+) / macOS 12+ / Linux x64 | Windows 10 / 11 (64-bit), macOS Apple Silicon, or modern Linux |
| **CPU** | 4-core x86_64 / ARM64 processor | Modern 6+ core CPU (Ryzen 5 / Core i5 / Apple M-series or better) |
| **GPU** | DirectX 11 / Vulkan / Metal capable GPU with WebGL2 support | Dedicated NVIDIA (GTX 1060 / RTX series) or AMD (RX 580 / RX 6000+) |
| **RAM** | 4 GB | 8 GB+ |
| **Storage** | ~300 MB for the client + 3 GB persistent cache | SSD with 4 GB+ free space |
| **Network** | Broadband connection (streams arcade game blocks) | Stable low-latency broadband for Online Versus P2P lobbies |

## Shortcuts & Controls

### Client Shortcuts

| Key | Action |
| :--- | :--- |
| `F11` / `Alt + Enter` | Toggle native fullscreen |
| `F5` / `Ctrl + R` | Reload page |
| `Ctrl + Shift + I` | Toggle DevTools |
| `Alt + F4` | Close client cleanly |

### Default Arcade Controls (`wmmtd.xyz`)

| Key | Action |
| :--- | :--- |
| `Arrow Keys` / `WASD` | Steer, accelerate, and brake |
| `Enter` / `Space` / Gas Pedal | Confirm menu selection |
| `1`–`6` / `N` | Direct gear selection / Neutral |
| `E` / `Backspace` | Shift up |
| `Q` / `Right Shift` | Shift down |
| `V` | Change camera view |
| `B` | Interrupt / VS accept button |
| `Esc` | Pause / Menu |

*(Gamepads and steering wheels work alongside keyboard controls and can be rebound in-game.)*

## Building from Source

You need [Node.js](https://nodejs.org/) (v20+ recommended) and npm installed.

```bash
git clone https://github.com/DJTOMATO/wmmtd_desktop.git
cd wmmtd_desktop
npm install
```

To run the client in development mode:

```bash
npm start
```

To package for your platform (outputs to `dist/`):

```bash
# Windows x64 (NSIS Installer + Portable ZIP)
npm run build:win

# Windows ARM64 (NSIS Installer + Portable ZIP)
npm run build:win:arm64

# Linux (AppImage + .deb)
npm run build:linux

# macOS (.dmg + .zip)
npm run build:mac
```

## Support & Donations

If you find this client useful and want to support its ongoing development and maintenance, consider buying a coffee! Any support is greatly appreciated:

<p align="center">
  <a href="https://ko-fi.com/lenabot">
    <img src="https://img.shields.io/badge/Ko--fi-Support%20on%20Ko--fi-F16061?style=for-the-badge&logo=ko-fi&logoColor=white" alt="Support on Ko-fi">
  </a>
</p>

You can donate directly at [**ko-fi.com/lenabot**](https://ko-fi.com/lenabot). For more information, check out [SPONSORS.md](SPONSORS.md).

## Disclaimer

This is an **unofficial community desktop wrapper** for [wmmtd.xyz](https://wmmtd.xyz/). It is an independent project and is **not affiliated with, maintained, authorized, or endorsed by** the creators or operators of [wmmtd.xyz](https://wmmtd.xyz/) nor Bandai Namco Entertainment. *Wangan Midnight* and *Wangan Midnight Maximum Tune* are trademarks of their respective owners. No game files, ROMs, or copyrighted assets are hosted or distributed in this repository.
