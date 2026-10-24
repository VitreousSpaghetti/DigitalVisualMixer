// Self-check di conf.properties (CONF_PORTS RF2, RF4, E2, E6): node --test packaging/
import test from 'node:test';
import assert from 'node:assert';
import { portsFromConf, CONF_DEFAULT } from './conf.js';

test('porte da conf.properties', () => {
    const w = [];
    const warn = (m) => w.push(m);
    assert.deepStrictEqual(portsFromConf(CONF_DEFAULT, warn), { port: 8080, httpsPort: 8443 });
    assert.deepStrictEqual(portsFromConf('', warn), { port: 8080, httpsPort: 8443 });               // E2 vuoto
    assert.deepStrictEqual(portsFromConf('foo\nport = 9090\n', warn), { port: 9090, httpsPort: 8443 }); // E6, riga estranea
    assert.strictEqual(w.length, 0);
    assert.deepStrictEqual(portsFromConf('port=abc\nhttps.port=70000', warn), { port: 8080, httpsPort: 8443 });
    assert.strictEqual(w.length, 2);
    assert.deepStrictEqual(portsFromConf('port=9090\nhttps.port=9090', warn), { port: 9090, httpsPort: 8443 });
    assert.deepStrictEqual(portsFromConf('port=8443\nhttps.port=8443', warn), { port: 8080, httpsPort: 8443 });
});
