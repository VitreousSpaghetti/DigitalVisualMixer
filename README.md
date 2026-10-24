# Digital Visual Mixer — Vitreous

Live mixer for [Hydra](https://hydra.ojack.xyz/) visuals. Write and preview Hydra code in the
**mixer** window, then send it to the **live** window on the projector — on the same PC or on
another PC in the network.

Author: [Emiliano Brazzoli @vitreous_spaghetti](https://www.instagram.com/vitreous_spaghetti/)

---

## Download

| System | File |
|--------|------|
| Windows 10/11 64-bit | **[DigitalVisualMixer.exe](https://github.com/VitreousSpaghetti/DigitalVisualMixer/releases/latest/download/DigitalVisualMixer.exe)** |
| macOS, Apple Silicon (M1, M2, …) | **[DigitalVisualMixer-macos-arm64.zip](https://github.com/VitreousSpaghetti/DigitalVisualMixer/releases/latest/download/DigitalVisualMixer-macos-arm64.zip)** |
| macOS, Intel | **[DigitalVisualMixer-macos-x64.zip](https://github.com/VitreousSpaghetti/DigitalVisualMixer/releases/latest/download/DigitalVisualMixer-macos-x64.zip)** |
| Linux x64 (64-bit PC) | **[DigitalVisualMixer-linux-x64.tar.gz](https://github.com/VitreousSpaghetti/DigitalVisualMixer/releases/latest/download/DigitalVisualMixer-linux-x64.tar.gz)** |
| Linux arm64 (Raspberry Pi OS 64-bit, ARM boards) | **[DigitalVisualMixer-linux-arm64.tar.gz](https://github.com/VitreousSpaghetti/DigitalVisualMixer/releases/latest/download/DigitalVisualMixer-linux-arm64.tar.gz)** |

[All releases](https://github.com/VitreousSpaghetti/DigitalVisualMixer/releases)

Requirements: a modern browser (Chrome or Edge recommended, needed for MIDI), a GPU with WebGL.
Nothing to install: start the app, a console shows the URLs and the browser opens on the mixer.
Closing the console stops the app.

**Move data** to another PC or version: *Export DB* from the menu, then *Import DB* on the other side.

### Windows

- Double-click `DigitalVisualMixer.exe`.
- **SmartScreen**: the exe is not signed → *More info → Run anyway* (once).
- **Firewall**: allow `DigitalVisualMixer.exe` on **private networks**, otherwise a live window on
  another PC cannot connect.
- Your data (channels, mappings, presets) lives in the `data\` folder next to the exe.
- **Update** = replace only the `.exe`; `data\` stays.

### macOS

Requires macOS 11 (Big Sur) or later and **Google Chrome** for MIDI (Safari has no MIDI support).

Which file? Apple menu → *About This Mac*: **Chip** "Apple M…" → `macos-arm64`;
**Processor** "Intel…" → `macos-x64`. (The Intel file also runs on Apple Silicon, slower; the
Apple Silicon file does not run on Intel Macs.)

First run:

1. Extract the zip and double-click `DigitalVisualMixer`: a Terminal window opens with the URLs.
2. The app is not signed by Apple, so macOS blocks it the first time. Open
   *System Settings → Privacy & Security*, scroll down and click **Open Anyway** next to
   "DigitalVisualMixer", then confirm. (macOS 14 and earlier: right-click the file → *Open* → *Open*.)
3. When asked, **allow incoming connections**, otherwise a live window on another PC cannot connect.
4. Microphone and camera permissions are asked by the browser when a visual uses them.

- Chrome opens on the mixer; without Chrome the default browser opens and the Terminal shows a
  reminder that MIDI needs Chrome or Edge.
- Your data lives in `~/Library/Application Support/DigitalVisualMixer` (Finder: *Go → Go to
  Folder…*), so it survives updates and moving the app.
- **Update** = replace only the `DigitalVisualMixer` file.

### Linux

Requires a 64-bit glibc distribution (Ubuntu, Debian, Fedora, Mint, Raspberry Pi OS 64-bit, …;
not Alpine/musl, not 32-bit Raspberry Pi OS) and **Chrome or Chromium** for MIDI (Firefox has no
MIDI support). Which file? `uname -m`: `x86_64` → `linux-x64`, `aarch64` → `linux-arm64`.

```bash
mkdir -p ~/DigitalVisualMixer && cd ~/DigitalVisualMixer
tar -xzf ~/Downloads/DigitalVisualMixer-linux-x64.tar.gz
./DigitalVisualMixer
```

- The default browser opens on the mixer (`xdg-open`) and the terminal shows the URLs, plus a
  reminder that MIDI needs Chrome or Chromium. Without a desktop, open the URL by hand.
- Start it from a terminal and stop it with `Ctrl+C`: launched by double-click from a file manager
  it may run with no window to close.
- "Permission denied" (extracted with a graphical tool or copied to a FAT/NTFS drive):
  `chmod +x DigitalVisualMixer`.
- Your data lives in the `data/` folder next to the binary, so keep it in a folder you own (not
  `/opt` or `/usr/local/bin`), or start it with `DATA_DIR=/path/to/folder ./DigitalVisualMixer`.
- **Update** = replace only the `DigitalVisualMixer` file; `data/` stays.

## Quick start

1. Write Hydra code in the editor, e.g. `osc(10, 0.1).out()`.
2. **Preview** (`Ctrl+Enter`): runs only in the local preview, the audience sees nothing.
3. **Save** (`Ctrl+↑`) stores the code in the channel.
4. Open the **Live** window (`/live`) on the projector and **Send to live** (`Ctrl+↓`).
5. Press `F1` for the built-in Guide.

## Features

- Channels with thumbnails, search and drag & drop reordering.
- Transitions between channels on the live output.
- Macro variables: `{{key}}` in the code becomes a live value, changed without re-running the code.
- **Mappings**: drive variables, channels and presets from MIDI, gamepad or keyboard, with modes
  *absolute*, *increment*, *gate*, *impulse* and *toggle*.
- Presets: a channel with its variable values and transition, recalled in one click.
- **Perform** view (`F2`): big preview, variables as bars, channel and preset pads.
- Right-click menu in the editor: cut/copy/paste, insert Hydra functions and macro variables.
- Command palette (`Ctrl+K`) to search any action.
- Built-in Guide (`F1`).

## Live on another PC

At startup the console prints the network URL of the live window, for example:

```
Live (network): https://192.168.1.20:8443/live?fit=cover
```

Open it from the other PC (same network). The certificate is self-signed: the browser warns once,
accept it to continue. HTTPS is what lets the live window use the **microphone** and **webcam**
(audio-reactive visuals, camera sources). The URL is also shown in the Guide.
If the other PC cannot connect, check that the firewall allows the app on private networks.

## Keyboard shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Enter` | Preview the code locally (not live) |
| `Ctrl+↑` | Save the channel being edited |
| `Ctrl+↓` | Send the channel being edited to live (without saving) |
| `Ctrl+←` | Send the previous channel to live |
| `Ctrl+→` | Send the next channel to live |
| `F2` | Switch between Edit and Perform view |
| `F1` | Open the Guide |
| `Ctrl+K` | Command palette: search any action |
| `Shift+F10` | Editor context menu at the cursor (also right-click or Menu key) |

## Development

Requires Node.js (22+ to build the exe).

```bash
git clone https://github.com/VitreousSpaghetti/DigitalVisualMixer.git
cd DigitalVisualMixer
npm install
npm run build   # CodeMirror bundle (Rollup)
npm start       # http://localhost:8080/
```

Build the Windows exe: `npm run package:win` → `packaging/dist/DigitalVisualMixer.exe`.
The macOS binaries are built on a Mac, the Linux ones with `npm run build:linux --prefix packaging`
(or by the release workflow).
Details in [packaging/README.md](packaging/README.md).

### Configuration

Environment variables (also from a `.env` file in the project root, except `DATA_DIR`):

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8080` | HTTP port (mixer and local live). Standalone binaries: also `port=` in `conf.properties` in the data folder |
| `HTTPS_PORT` | `8443` | HTTPS port (live on another PC). Standalone binaries: also `https.port=` in `conf.properties` |
| `DATA_DIR` | `src/resource` (exe / Linux: `data` next to the binary; macOS app: `~/Library/Application Support/DigitalVisualMixer`) | Folder of `db.json` and the HTTPS certificate |
| `MAX_CHANNELS` | `36` | Informational only: the channels are the ones in the DB |
| `NO_BROWSER` | unset | Standalone binaries only: `1` = do not open the browser at startup |

### Routes

| URL | Description |
|-----|-------------|
| `http://localhost:8080/` | Mixer |
| `http://localhost:8080/live` | Live output (fullscreen) |
| `http://localhost:8080/live?fit=cover` | Live output without black bars |
| `https://<IP>:8443/live?fit=cover` | Live output from another PC |
| `http://localhost:8080/about` | About |
| `GET /api/lan` | Network URLs of the live window |
| `GET /api/db/export` | Download `db.json` |
| `POST /api/db/import` | Replace the DB with a `db.json` |

### Architecture

```
Browser: Mixer (http :8080/)        Browser: Live (http :8080/live
  editor, channels, mappings                  or https :8443/live from another PC)
        |                                        |
        └──────────── Socket.IO ─────────────────┘
                          |
        Node.js + Express — src/app.js
        HTTP and HTTPS servers, one shared Socket.IO instance
                          |
        src/manager.js → <DATA_DIR>/db.json, https-cert.json
```

Main folders:

```
src/                 server (app.js, manager.js, cert.js)
src/resource/html/   mixer, live, about pages
src/resource/css/    styles
src/resource/js/     browser code (mixer/ = mixer modules)
packaging/           Windows, macOS and Linux builds
.github/workflows/   release build
test/                checks and demo data
```

### Release

1. Tag the version, e.g. `git tag v1.1.0 && git push origin v1.1.0`.
2. Create (publish) a GitHub release from the tag.
3. Publishing starts the [release workflow](.github/workflows/release.yml): it builds
   `DigitalVisualMixer.exe`, `DigitalVisualMixer-macos-arm64.zip`,
   `DigitalVisualMixer-macos-x64.zip`, `DigitalVisualMixer-linux-x64.tar.gz` and
   `DigitalVisualMixer-linux-arm64.tar.gz` from a clean checkout, starts each one to check that it
   answers over HTTP, and attaches them to the release (a failed check = nothing attached).
   The download links above (`releases/latest/download/...`) rely on these exact file names.
   Re-running it on the same release replaces the files.

The workflow can also be started by hand (*Actions → Release binaries → Run workflow*): the
binaries are then kept as workflow artifacts instead of being attached to a release.

## Hydra resources

- [Documentation](https://hydra.ojack.xyz/docs/#/)
- [API reference](https://hydra.ojack.xyz/api/)

![@vitreous_spaghetti](src/resource/img/alpha.png?raw=true)
