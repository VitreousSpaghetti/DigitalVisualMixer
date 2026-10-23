/** CERTIFICATO SELF-SIGNED PER HTTPS IN LAN (task 2026-10-23-https-live-lan, R-LAN4)
 *
 * Il browser concede microfono/webcam solo in contesto sicuro: la /live aperta da un altro PC
 * su http://<IP> non avrebbe a.fft né initCam(). Node non genera X.509 da solo e OpenSSL non è
 * garantito (exe): node-forge è JS puro, senza dipendenze.
 */
import { existsSync, readFileSync, writeFileSync } from 'fs';
import os from 'os';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const forge = require('node-forge');

/** IPv4 non interni di tutte le schede (Wi-Fi + Ethernet…). family numerico su Node 18.0-18.3. */
export function lanIPv4() {
    return Object.values(os.networkInterfaces()).flat()
        .filter((n) => n && !n.internal && (n.family === 'IPv4' || n.family === 4))
        .map((n) => n.address);
}

function generate(ips) {
    const keys = forge.pki.rsa.generateKeyPair(2048); // usa crypto nativo di Node se disponibile
    const cert = forge.pki.createCertificate();
    cert.publicKey = keys.publicKey;
    cert.serialNumber = '01' + forge.util.bytesToHex(forge.random.getBytesSync(8));
    cert.validity.notBefore = new Date();
    cert.validity.notAfter = new Date();
    cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 5);
    const attrs = [{ name: 'commonName', value: 'Digital Visual Mixer' }];
    cert.setSubject(attrs);
    cert.setIssuer(attrs);
    cert.setExtensions([
        { name: 'basicConstraints', cA: false },
        { name: 'keyUsage', digitalSignature: true, keyEncipherment: true },
        { name: 'extKeyUsage', serverAuth: true },
        // type 2 = DNS, 7 = IP: Chrome ignora il CN, valgono solo i SAN
        { name: 'subjectAltName', altNames: [{ type: 2, value: 'localhost' }, { type: 7, ip: '127.0.0.1' }]
            .concat(ips.map((ip) => ({ type: 7, ip }))) }
    ]);
    cert.sign(keys.privateKey, forge.md.sha256.create());
    return { key: forge.pki.privateKeyToPem(keys.privateKey), cert: forge.pki.certificateToPem(cert) };
}

/**
 * Legge <dir>/https-cert.json o lo crea. Rigenera se manca un IP LAN corrente (cambio rete/DHCP)
 * o se è scaduto. Un file presente ma illeggibile lancia: app.js parte allora solo in HTTP,
 * invece di sovrascrivere un file che l'utente potrebbe aver messo lì apposta.
 * @returns {{key: string, cert: string}}
 */
export function loadOrCreateCert(dir, ips = lanIPv4()) {
    const file = path.join(dir, 'https-cert.json');
    if (existsSync(file)) {
        const saved = JSON.parse(readFileSync(file, 'utf-8'));
        const c = forge.pki.certificateFromPem(saved.cert);
        forge.pki.privateKeyFromPem(saved.key);
        const san = c.getExtension('subjectAltName').altNames.map((n) => n.ip).filter(Boolean);
        if (ips.every((ip) => san.includes(ip)) && c.validity.notAfter > new Date()) return saved;
        console.log('https: LAN IP changed or certificate expired, generating a new one');
    }
    const fresh = generate(ips);
    writeFileSync(file, JSON.stringify(fresh));
    return fresh;
}
