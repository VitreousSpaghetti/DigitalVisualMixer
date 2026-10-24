// Self-check del confronto versioni (UPDATE_CHECK RF2, E1, E2): node --test src/
import test from 'node:test';
import assert from 'node:assert';
import { parseVersion, isNewer } from './updateCheck.js';

test('semver numerico, prefisso v opzionale', () => {
    assert.deepStrictEqual(parseVersion('v1.10.0'), [1, 10, 0]);
    assert.deepStrictEqual(parseVersion('1.1.0'), [1, 1, 0]);
    assert.strictEqual(parseVersion('v1.1'), null);
    assert.strictEqual(parseVersion('latest'), null);
    assert.ok(isNewer([1, 10, 0], [1, 9, 0]));      // non confronto di stringhe
    assert.ok(!isNewer([1, 1, 0], [1, 1, 0]));      // uguale → aggiornata
    assert.ok(!isNewer([1, 0, 0], [1, 1, 0]));      // E1: build più recente della release
});
