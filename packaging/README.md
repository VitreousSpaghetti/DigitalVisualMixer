# Standalone builds (Windows exe, macOS binary)

Folder dedicated to the standalone binaries. The server is `../src` as is: this folder only holds the launcher
and the packager config.

## Build

Prerequisites (build machine only): Node 22+, `npm install` already run in the root
and `npm run build` (rollup) if `rollupBundle/` is not up to date.

```
npm run package:win          # from the root, same as:
cd packaging && npm install && npm run build
```

Output: `packaging/dist/DigitalVisualMixer.exe` (~100 MB, contains Node 22).
The first build downloads the Node binary into `%USERPROFILE%\.pkg-cache`.

### macOS

Only on a Mac (ad-hoc signing needs `codesign`; an unsigned binary does not start on Apple Silicon):

```
cd packaging && npm install && npm run build:mac
```

Output: `packaging/dist/DigitalVisualMixer` for the architecture of the Mac running the build
(`arm64` on Apple Silicon, `x64` on Intel). pkg already signs ad-hoc; the script re-signs with
`codesign --force --sign -` and verifies, so the step is explicit. No Apple Developer certificate,
no notarization: users unblock it once in *Privacy & Security → Open Anyway*.
Same `pkg.assets` list and same `../src` as Windows.

### Release workflow

`../.github/workflows/release.yml` runs when a GitHub release is published (or by hand):

- one job per target, each on a native runner: `windows-latest` (exe), `macos-15` (arm64),
  `macos-15-intel` (x64);
- `npm ci` + `npm run build` (rollup) from a clean checkout, then `npm ci` and the build here
  (needs both `package-lock.json` files committed);
- macOS: `zip` of the binary (keeps the execute bit) as `DigitalVisualMixer-macos-<arch>.zip`;
- smoke test: starts the exe / the binary extracted from the zip with `NO_BROWSER=1` and fails
  the job if `http://localhost:8080/` does not answer within 60 s;
- `gh release upload --clobber`: attaches the files with fixed names, replacing existing ones.
  No secrets: only the workflow's own token (`contents: write`).

## How it works

- `launcher.js` (entry point): sets `DATA_DIR` (Windows: `data\` next to the exe; macOS:
  `~/Library/Application Support/DigitalVisualMixer`, because a quarantined download may run from
  a read-only temporary copy), checks that the port is free, imports `../src/app.js`, opens the
  browser on `http://localhost:8080/` (macOS: Chrome if installed, for MIDI; otherwise the
  default browser plus a console notice).
- `@yao-pkg/pkg` in **SEA** mode (`"sea": true`): needed because `src/manager.js` uses
  top-level await together with `export`, which pkg's standard mode (and a CJS esbuild bundle)
  cannot transform. For the same reason esbuild is not used.
- `pkg.assets` lists the files read with `fs`/`sendFile` (html/css/js/img, `rollupBundle/`,
  files served from `node_modules`, Socket.IO client, `../package.json` for `"type": "module"`).
  The development `src/resource/db.json` and `https-cert.json` are **not** included.
  A new asset served by `app.js` outside these folders → add it here.
- The `Cannot find module ...` warnings during the build concern browser JS
  (hydra-synth, CodeMirror addons) analysed as if it were Node code: harmless.

## Using the exe (macOS: see the main README)

- Double-click: a console opens with the URLs (mixer + network live) and the browser on the mixer.
  Closing the console stops the server.
- Data in `data\` next to the exe (`db.json`, `https-cert.json`): default empty DB on first run.
  To bring channels/mappings over: Export DB from `npm start`, Import DB in the exe.
  Updating the exe = replace only the `.exe` file, `data\` stays.
- Environment variables: `PORT` (8080), `HTTPS_PORT` (8443), `DATA_DIR`, `NO_BROWSER=1`.
- Port in use (e.g. `npm start` already running): message in the console, the exe does not start.
- **SmartScreen**: the exe is not signed → "Windows protected your PC": *More info →
  Run anyway* (once).
- **Firewall**: on first run allow `DigitalVisualMixer.exe` on **private networks**,
  otherwise the live window from another PC cannot connect.
