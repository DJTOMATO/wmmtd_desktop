<p align="center">
  <img src="icon.png" alt="Wangan Minimum Tune" width="120" height="120">
</p>

<h1 align="center">WMMTD Desktop</h1>

<p align="center">
  Cliente de escritorio <b>no oficial</b> para <a href="https://wmmtd.xyz/">Wangan Minimum Tune</a> (versión web de Wangan Midnight Maximum Tune).<br>
  <a href="README.md">English</a> · <b>Español</b>
</p>

<p align="center">
  <a href="https://github.com/DJTOMATO/wmmtd_desktop/releases"><b>Descargar Instalador (Releases)</b></a> ·
  <a href="https://wmmtd.xyz/">Sitio Web</a> ·
  <a href="https://github.com/DJTOMATO/wmmtd_desktop/issues">Reportar un Problema</a> ·
  <a href="https://ko-fi.com/lenabot"><b>Donar en Ko-fi</b></a>
</p>

> [!IMPORTANT]
> **Cliente no oficial:** Este proyecto es una iniciativa comunitaria independiente y **no está afiliado, respaldado, mantenido ni asociado** con los creadores u operadores de [wmmtd.xyz](https://wmmtd.xyz/) ni con Bandai Namco Entertainment.

---

## ¿Por qué usar un cliente de escritorio?

[Wangan Minimum Tune](https://wmmtd.xyz/) lleva las carreras callejeras arcade de *Wangan Midnight* a los navegadores modernos mediante recompilación dinámica a WebAssembly (`WebAssembly.Suspending` / JSPI), WebGL2 en `OffscreenCanvas`, caché de bloques en OPFS, carreras en red P2P por WebRTC y Force Feedback para volantes mediante WebHID. Jugar desde una pestaña común genera varias limitaciones molestas:

- **Throttling en segundo plano al hacer Alt+Tab:** Los navegadores limitan Web Workers, timers y conexiones P2P en pestañas minimizadas o inactivas, provocando tirones o desincronizaciones en carreras Online Versus.
- **GPU integrada en lugar de dedicada:** En muchas notebooks el navegador predetermina los gráficos integrados de bajo consumo en lugar de tu placa dedicada NVIDIA o AMD, reduciendo los FPS al usar escalado nativo 2x–4x.
- **Borrado de caché y conflictos de bloqueo OPFS:** El navegador puede vaciar los bloques cacheados o abrir pestañas duplicadas que impiden el acceso exclusivo a OPFS, obligando a volver a descargar los datos del juego.
- **Suspensión de pantalla al jugar con mando o volante:** Al conducir con joystick o volante sin tocar teclado ni mouse, el sistema operativo puede suspender la pantalla en plena carrera.

Este cliente de escritorio empaqueta `wmmtd.xyz` en un entorno Electron limpio y optimizado con aceleración forzada en placa dedicada, WebGL2 passthrough, almacenamiento local persistente de 3 GB+, cero throttling en segundo plano, soporte WebHID para volantes y Discord Rich Presence integrado.

## Descarga e instalación

Podés bajar el último instalador (`Wangan Minimum Tune-Setup-1.0.0-x64.exe` para Windows, `.dmg` para macOS o `.AppImage` / `.deb` para Linux) directamente desde la [**página de Releases**](https://github.com/DJTOMATO/wmmtd_desktop/releases).

## Qué trae configurado por dentro

- **Rendimiento gráfico y FPS mejorados (WebGL2):** Inicia con `force_high_performance_gpu`, `ignore-gpu-blocklist`, `use-cmd-decoder=passthrough`, `use-angle=d3d11` (Windows), `enable-gpu-rasterization`, `enable-zero-copy`, `enable-oop-rasterization`, `enable-native-gpu-memory-buffers` y `CanvasOopRasterization` para reducir el overhead de llamadas WebGL2 en `OffscreenCanvas` y mantener FPS estables incluso en 2x–4x.
- **Almacenamiento local persistente de 3 GB+:** Concede automáticamente permisos `persistent-storage` y `storage-access` para que Chromium nunca elimine la caché OPFS (~2 GB+ de `wmmt3dx-blocks`), la caché compilada de WebAssembly (~100 MB de `wmmt3dx-lift-v1`) ni tus tarjetas de piloto y fantasmas en IndexedDB, combinado con el máximo seguro de caché HTTP en disco (`--disk-cache-size=2147483647`, corrigiendo el overflow de 32 bits de Chromium).
- **Bloqueo de instancia única (Single-Instance):** Evita abrir dos ventanas por error y garantiza que el acceso exclusivo a OPFS nunca se bloquee.
- **WebAssembly JSPI completo y margen de memoria:** Activa `WebAssemblyJSPI`, SharedArrayBuffer (manteniendo el aislamiento cross-origin), caché de bytecode V8 anticipada y `--max-old-space-size=4096` para evitar pausas de recolector de basura o errores de falta de memoria.
- **Sin límite en segundo plano:** Desactiva por completo el throttling (`backgroundThrottling: false`) para que puedas hacer Alt+Tab sin perder conexión en salas Online Versus.
- **Soporte de Force Feedback para volantes (WebHID) y mandos:** Configura `setDevicePermissionHandler` y `select-hid-device` para `wmmtd.xyz` (volantes Logitech, Thrustmaster, Simagic) y asegura un cierre limpio con `pagehide` para detener los motores de FFB al salir.
- **Discord Rich Presence (RPC):** Muestra en tu perfil de Discord que estás jugando *Wangan Minimum Tune* (o en una sala Online Versus) con tiempo transcurrido y botones directos para jugar en `wmmtd.xyz` o descargar el cliente de escritorio.
- **Actualizaciones ligeras Over-the-Air (`wmmtdmod.js`):** Sincroniza mejoras de estado y almacenamiento automáticamente al iniciar (con respaldo local sin conexión).
- **Compatibilidad Linux / Wayland:** Usa X11/XWayland con Vulkan por defecto para evitar pantallas negras en sesiones Wayland (respetando igualmente `--ozone-platform=wayland` si se especifica).
- **Bloqueo de suspensión y memoria de ventana:** Evita que la pantalla se apague mientras jugás con mando o volante y recuerda el tamaño y posición de tu ventana.

## Requisitos del sistema / Especificaciones

| Componente | Mínimo | Recomendado (60 FPS + Escalado 2x–4x) |
| :--- | :--- | :--- |
| **Sistema Operativo** | Windows 10 (64 bits, 1909+) / macOS 12+ / Linux x64 | Windows 10 / 11 (64 bits), macOS Apple Silicon o Linux moderno |
| **Procesador (CPU)** | 4 núcleos x86_64 / ARM64 | 6+ núcleos modernos (Ryzen 5 / Core i5 / Apple M o superior) |
| **Placa de video (GPU)** | Compatible con DirectX 11 / Vulkan / Metal y WebGL2 | Placa dedicada NVIDIA (GTX 1060 / serie RTX) o AMD (RX 580 / RX 6000+) |
| **Memoria RAM** | 4 GB | 8 GB o más |
| **Almacenamiento** | ~300 MB para el cliente + 3 GB de caché persistente | SSD con 4 GB+ libres |
| **Conexión** | Banda ancha (descarga bloques bajo demanda) | Conexión estable de baja latencia para Online Versus P2P |

## Atajos y Controles

### Atajos del cliente

| Tecla | Acción |
| :--- | :--- |
| `F11` / `Alt + Enter` | Pantalla completa nativa de la ventana |
| `F5` / `Ctrl + R` | Recargar página |
| `Ctrl + Shift + I` | Abrir/cerrar herramientas de desarrollo (DevTools) |
| `Alt + F4` | Cerrar cliente de forma segura |

### Controles arcade por defecto (`wmmtd.xyz`)

| Tecla | Acción |
| :--- | :--- |
| `Flechas` / `WASD` | Dirección, acelerador y freno |
| `Enter` / `Espacio` / Acelerador | Confirmar opción en menú |
| `1`–`6` / `N` | Selección directa de marcha / Neutro |
| `E` / `Backspace` | Subir marcha |
| `Q` / `Shift Derecho` | Bajar marcha |
| `V` | Cambiar vista de cámara |
| `B` | Botón de interrupción / VS |
| `Esc` | Pausa / Menú |

*(Los mandos y volantes funcionan junto al teclado y pueden reasignarse dentro del juego.)*

## Compilar desde el código fuente

Necesitás tener instalado [Node.js](https://nodejs.org/) (recomendado v20 o superior) y npm.

```bash
git clone https://github.com/DJTOMATO/wmmtd_desktop.git
cd wmmtd_desktop
npm install
```

Para abrir el cliente en modo desarrollo:

```bash
npm start
```

Para compilar los instaladores de tu plataforma (se guardan en `dist/`):

```bash
# Windows x64 (Instalador NSIS + ZIP portable)
npm run build:win

# Windows ARM64 (Instalador NSIS + ZIP portable)
npm run build:win:arm64

# Linux (AppImage + .deb)
npm run build:linux

# macOS (.dmg + .zip)
npm run build:mac
```

## Apoyo y donaciones

Si el cliente te resulta útil y querés colaborar con el desarrollo y mantenimiento del proyecto, podés invitar un café. ¡Cualquier ayuda es más que bienvenida!

<p align="center">
  <a href="https://ko-fi.com/lenabot">
    <img src="https://img.shields.io/badge/Ko--fi-Apoyar%20en%20Ko--fi-F16061?style=for-the-badge&logo=ko-fi&logoColor=white" alt="Apoyar en Ko-fi">
  </a>
</p>

Podés donar directamente en [**ko-fi.com/lenabot**](https://ko-fi.com/lenabot). Mirá [SPONSORS.md](SPONSORS.md) para más información y formas de colaborar.

## Aviso legal

Este proyecto es un **cliente de escritorio no oficial** desarrollado por la comunidad para [wmmtd.xyz](https://wmmtd.xyz/). Es un proyecto independiente y **no está afiliado, mantenido, autorizado ni respaldado** por los creadores u operadores de [wmmtd.xyz](https://wmmtd.xyz/) ni por Bandai Namco Entertainment. *Wangan Midnight* y *Wangan Midnight Maximum Tune* son marcas registradas de sus respectivos propietarios. Este repositorio no aloja ni distribuye archivos protegidos por derechos de autor ni ROMs del juego original.
