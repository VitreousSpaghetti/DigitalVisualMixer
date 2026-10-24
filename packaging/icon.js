/** ICONA DEI BINARI — passo dopo pkg, lanciato dagli script build* con `node icon.js win|mac|linux`
 *
 * Sorgente unica: src/resource/img/alpha.png. pkg non imposta icone e i binari Mach-O / ELF non ne
 * contengono, quindi ogni piattaforma ha il suo modo:
 *  - win:   .ico generato (icon-win.ps1, System.Drawing) e scritto nelle risorse dell'exe con resedit
 *  - mac:   bundle DigitalVisualMixer.app con icon.icns (sips + iconutil, solo su un Mac)
 *  - linux: icon.png + install-desktop.sh accanto al binario (voce di menu con l'icona)
 */
import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const PNG = path.resolve('../src/resource/img/alpha.png');
const run = (cmd, args) => execFileSync(cmd, args, { stdio: 'inherit' });
const target = process.argv[2];

if (target === 'win') {
    const ico = 'dist/icon.ico';
    run('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', 'icon-win.ps1', PNG, path.resolve(ico)]);
    // resedit (JS, in memoria) e non rcedit: rcedit passa dall'API UpdateResource di Windows, che con
    // il blob SEA da ~30 MB tra le risorse non finisce più. Si sostituisce solo il gruppo icone di
    // node (14/1/1033): il blob NODE_SEA_BLOB viene riscritto com'è
    const ResEdit = await import('resedit');
    const file = 'dist/DigitalVisualMixer.exe';
    const exe = ResEdit.NtExecutable.from(fs.readFileSync(file), { ignoreCert: true });
    const res = ResEdit.NtExecutableResource.from(exe);
    const icons = ResEdit.Data.IconFile.from(fs.readFileSync(ico)).icons.map(i => i.data);
    ResEdit.Resource.IconGroupEntry.replaceIconsForResource(res.entries, 1, 1033, icons);
    res.outputResource(exe);
    fs.writeFileSync(file, Buffer.from(exe.generate()));
    fs.rmSync(ico);

} else if (target === 'mac') {
    const app = 'dist/DigitalVisualMixer.app', c = app + '/Contents';
    fs.rmSync(app, { recursive: true, force: true });
    fs.mkdirSync(c + '/MacOS', { recursive: true });
    fs.mkdirSync(c + '/Resources');
    fs.renameSync('dist/DigitalVisualMixer', c + '/MacOS/DigitalVisualMixer');

    // .iconset con le dimensioni che iconutil si aspetta (1x e @2x)
    const set = 'dist/icon.iconset';
    fs.mkdirSync(set);
    for (const s of [16, 32, 128, 256, 512]) {
        run('sips', ['-z', String(s), String(s), PNG, '--out', set + '/icon_' + s + 'x' + s + '.png']);
        run('sips', ['-z', String(s * 2), String(s * 2), PNG, '--out', set + '/icon_' + s + 'x' + s + '@2x.png']);
    }
    run('iconutil', ['-c', 'icns', set, '-o', c + '/Resources/icon.icns']);
    fs.rmSync(set, { recursive: true });

    // Un .app lanciato dal Finder non ha console: l'eseguibile del bundle apre il binario vero in
    // Terminal, così URL, errori di porta e chiusura (Ctrl+C / chiudere la finestra) restano come prima
    fs.writeFileSync(c + '/MacOS/launch', '#!/bin/sh\nexec open -a Terminal "$(dirname "$0")/DigitalVisualMixer"\n', { mode: 0o755 });

    const version = JSON.parse(fs.readFileSync('../package.json', 'utf8')).version;
    fs.writeFileSync(c + '/Info.plist', `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
    <key>CFBundleName</key><string>DigitalVisualMixer</string>
    <key>CFBundleDisplayName</key><string>Digital Visual Mixer</string>
    <key>CFBundleIdentifier</key><string>com.vitreousspaghetti.digitalvisualmixer</string>
    <key>CFBundleExecutable</key><string>launch</string>
    <key>CFBundleIconFile</key><string>icon</string>
    <key>CFBundlePackageType</key><string>APPL</string>
    <key>CFBundleShortVersionString</key><string>${version}</string>
    <key>CFBundleVersion</key><string>${version}</string>
    <key>LSMinimumSystemVersion</key><string>11.0</string>
</dict></plist>
`);
    // Firma ad-hoc del bundle (il binario dentro è già firmato da build:mac): senza, Apple Silicon
    // rifiuta l'app. La firma dello script sta negli xattr → lo zip va fatto con ditto (release.yml)
    run('codesign', ['--force', '--sign', '-', app]);
    run('codesign', ['--verify', '--deep', '--strict', app]);

} else if (target === 'linux') {
    fs.copyFileSync(PNG, 'dist/icon.png');
    // Il .desktop vuole percorsi assoluti (Exec, Icon): lo scrive lo script dove l'utente ha estratto
    // il tar. Terminal=true: la console con URL e Ctrl+C resta come lanciando il binario a mano
    fs.writeFileSync('dist/install-desktop.sh', `#!/bin/sh
# Adds Digital Visual Mixer to your applications menu, with its icon (current user only).
# Run it again after moving this folder.
dir=$(cd "$(dirname "$0")" && pwd)
apps="\${XDG_DATA_HOME:-$HOME/.local/share}/applications"
mkdir -p "$apps"
cat > "$apps/digitalvisualmixer.desktop" <<EOF
[Desktop Entry]
Type=Application
Name=Digital Visual Mixer
Comment=Live visuals mixer for Hydra
Exec="$dir/DigitalVisualMixer"
Path=$dir
Icon=$dir/icon.png
Terminal=true
Categories=AudioVideo;Video;
EOF
chmod +x "$apps/digitalvisualmixer.desktop"
echo "Added to the applications menu: $apps/digitalvisualmixer.desktop"
`, { mode: 0o755 });

} else {
    console.error('Usage: node icon.js win|mac|linux');
    process.exit(1);
}
