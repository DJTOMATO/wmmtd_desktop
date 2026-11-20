/**
 * Wangan Minimum Tune Desktop Dynamic Mod Engine (wmmtdmod.js)
 * ------------------------------------------------------------------
 * Loaded dynamically on startup from GitHub (with local fallback).
 * Ensures persistent 3 GB+ local storage (OPFS + Cache Storage + IndexedDB),
 * keeps Discord Rich Presence cleanly updated with links to wmmtd.xyz and the
 * desktop client releases, and allows over-the-air QoL improvements without
 * requiring client re-compilations.
 */

(() => {
  if (window.__wmmtdmod && typeof window.__wmmtdmod.stop === 'function') {
    try {
      window.__wmmtdmod.stop();
    } catch (_) {}
  }

  const MOD_VERSION = '1.0.0';
  const SITE_URL = 'https://wmmtd.xyz/';
  const RELEASES_URL = 'https://github.com/DJTOMATO/wmmtd_desktop/releases';
  const ICON_URL = 'https://wmmtd.xyz/icon.png';

  window.__wmmtdmodLoaded = true;
  window.__wmmtdmodVersion = MOD_VERSION;

  console.log(`%c[WMMTD Desktop Mod Engine v${MOD_VERSION}] Initializing...`, 'color: #ff5722; font-weight: bold;');

  // Ensure persistent storage is granted so OPFS game blocks, WASM lift cache,
  // and IndexedDB driver cards/ghosts are never evicted under storage pressure.
  if (navigator.storage && typeof navigator.storage.persist === 'function') {
    navigator.storage.persist().then((granted) => {
      if (navigator.storage.estimate) {
        navigator.storage.estimate().then(({ usage = 0, quota = 0 }) => {
          const usedMB = Math.round(usage / 1048576);
          const quotaGB = (quota / (1024 ** 3)).toFixed(1);
          console.log(
            `%c[WMMTD Desktop] Persistent storage: ${granted ? 'GRANTED' : 'standard'} (${usedMB} MB used / ${quotaGB} GB quota)`,
            'color: #ff8a65;'
          );
        }).catch(() => {});
      }
    }).catch(() => {});
  }

  const clientLaunchTime = Date.now();
  let lastActivityKey = '';

  function computeDiscordActivity() {
    let details = 'Playing Wangan Minimum Tune';
    let state = 'Arcade Street Racing';

    const path = window.location.pathname || '/';
    const params = new URLSearchParams(window.location.search);

    if (path.startsWith('/lobby/') || params.has('lobby')) {
      details = 'Online Versus Lobby';
      state = 'Linked Arcade Racing';
    } else if (path.includes('input')) {
      details = 'Configuring Controls';
      state = 'Wheel & Gamepad Setup';
    }

    return {
      details,
      state,
      startTimestamp: clientLaunchTime,
      largeImageKey: ICON_URL,
      largeImageText: 'Wangan Minimum Tune',
      instance: false,
      buttons: [
        { label: 'Play on wmmtd.xyz', url: SITE_URL },
        { label: 'Download Desktop Client', url: RELEASES_URL }
      ]
    };
  }

  function update() {
    try {
      const activity = computeDiscordActivity();
      const activityKey = `${activity.details}|${activity.state}`;
      if (activityKey !== lastActivityKey) {
        lastActivityKey = activityKey;
        if (window.electronAPI && typeof window.electronAPI.updateDiscordActivity === 'function') {
          window.electronAPI.updateDiscordActivity(activity);
        }
      }
    } catch (err) {
      console.warn('[wmmtdmod] Update loop error:', err);
    }
  }

  // Keep Discord RPC synchronized on route changes and periodically
  const intervalId = setInterval(update, 10000);
  update();

  window.__wmmtdmod = {
    version: MOD_VERSION,
    forceUpdate: () => {
      lastActivityKey = '';
      update();
    },
    stop: () => clearInterval(intervalId)
  };

  console.log(`%c[WMMTD Desktop Mod Engine v${MOD_VERSION}] Running.`, 'color: #ff5722;');
})();
