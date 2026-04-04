/** MANEGGIA I DATI CON VITREOUSDATABASE */
import { createRequire } from 'module';
import { existsSync, readFileSync, writeFileSync } from 'fs';

// Import del modulo CJS VitreousDataBase da contesto ESM tramite createRequire
const require = createRequire(import.meta.url);
const { Database } = require('vitreousdatabase');

const DB_PATH = './src/resource/db.json';
const ENTITY = 'channel';

// --- MIGRAZIONE: legge il vecchio formato {titol, channel:[]} in memoria
// prima che Database.create() sovrascriva il file con la nuova struttura ---
var oldChannels = [];
if (existsSync(DB_PATH)) {
    try {
        var raw = JSON.parse(readFileSync(DB_PATH, 'utf-8'));
        // Il vecchio formato ha { titol, channel: [] }
        // Il nuovo formato VitreousDataBase ha { entitiesConfiguration, entities }
        if (raw.channel && Array.isArray(raw.channel)) {
            oldChannels = raw.channel;
            // Sovrascrive il file con la struttura VitreousDataBase vuota PRIMA di Database.create()
            // (se il file ha il vecchio formato, _read() di VitreousDataBase troverebbe entitiesConfiguration=undefined)
            writeFileSync(DB_PATH, JSON.stringify({ entitiesConfiguration: {}, entities: {} }));
        }
    } catch (e) {}
}

// Init database con top-level await (funziona in ESM Node 14.8+)
// eager: true → cache in memoria, flush() scrive su disco esplicitamente
const db = await Database.create(DB_PATH, { eager: true });

// Crea l'entità 'channel' se non esiste ancora nello schema.
// NON usare getEntity() che lancia EntityNotFoundError: un'eccezione in _enqueue
// rompe la catena di Promise del mutex e tutte le operazioni successive vengono saltate.
// listEntities() restituisce un array senza mai lanciare.
const existingEntities = await db.entityManager.listEntities();
if (!existingEntities.includes(ENTITY)) {
    await db.entityManager.createEntity(ENTITY, {
        type: 'table',
        values: ['id', 'name', 'code'],
        id: ['id'],          // id è automaticamente notnullable + unique
        notnullable: [],
        unique: [],
        nested: []
    });
}

// Reinserisce i canali migrati dal vecchio formato nel nuovo schema
if (oldChannels.length > 0) {
    for (const ch of oldChannels) {
        try {
            await db.recordManager.insert(ENTITY, {
                id: ch.id,
                name: ch.name ?? String(ch.id),
                code: ch.code ?? ''
            });
        } catch (e) {
            // Ignora errori di duplicato (migrazione già avvenuta in run precedenti)
        }
    }
    await db.flush();
}

// Restituisce tutti i canali ordinati per id
export var getAll = async function () {
    var channels = await db.recordManager.findAll(ENTITY);
    if (!channels || channels.length === 0) {
        // Crea canale 0 di default se il DB è vuoto
        await db.recordManager.insert(ENTITY, { id: 0, name: '0', code: '' });
        await db.flush();
        channels = await db.recordManager.findAll(ENTITY);
    }
    return channels.sort((a, b) => a.id < b.id ? -1 : 0);
};

// Salva o aggiorna un canale (upsert: update se esiste, insert se nuovo)
export var saveChannel = async function (channelToSave) {
    var existing = await db.recordManager.findByIdSingle(ENTITY, channelToSave.id);
    if (existing) {
        await db.recordManager.update(ENTITY, { id: channelToSave.id }, {
            name: channelToSave.name,
            code: channelToSave.code
        });
    } else {
        await db.recordManager.insert(ENTITY, {
            id: channelToSave.id,
            name: channelToSave.name ?? String(channelToSave.id),
            code: channelToSave.code ?? ''
        });
    }
    await db.flush();
};

// Cerca un canale per ID; se non esiste lo crea vuoto e lo restituisce
export var searchChannel = async function (channelID) {
    var channel = await db.recordManager.findByIdSingle(ENTITY, channelID);
    if (!channel) {
        channel = { id: channelID, name: String(channelID), code: '' };
        await db.recordManager.insert(ENTITY, channel);
        await db.flush();
    }
    return channel;
};
