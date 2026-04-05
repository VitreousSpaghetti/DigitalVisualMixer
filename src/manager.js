/** MANEGGIA I DATI CON VITREOUSDATABASE */
import { createRequire } from 'module';
import { existsSync, readFileSync, writeFileSync } from 'fs';

const require = createRequire(import.meta.url);
const { Database } = require('vitreousdatabase');

const DB_PATH = './src/resource/db.json';
const ENTITY_CHANNEL    = 'channel';
const ENTITY_TRANSITION = 'transition'; // entità globale: unico record id=0

// --- MIGRAZIONE FILE ---
// Legge il db.json grezzo PRIMA che Database.create() lo gestisca.
// Gestisce tre formati storici:
//   1. Vecchio {titol, channel:[]}
//   2. VitreousDataBase con transitionType/transitionDuration inline nei channel (da rimuovere)
//   3. Formato attuale corretto → nessuna migrazione
var savedChannels = [];
if (existsSync(DB_PATH)) {
    try {
        var raw = JSON.parse(readFileSync(DB_PATH, 'utf-8'));

        if (raw.channel && Array.isArray(raw.channel)) {
            // Caso 1: vecchio formato pre-VitreousDataBase
            savedChannels = raw.channel;
            writeFileSync(DB_PATH, JSON.stringify({ entitiesConfiguration: {}, entities: {} }));

        } else if (raw.entitiesConfiguration && raw.entities) {
            var channelCfg = raw.entitiesConfiguration[ENTITY_CHANNEL];
            if (channelCfg && channelCfg.values &&
                (channelCfg.values.includes('transitionType') || channelCfg.values.includes('transitionDuration'))) {
                // Caso 2: channel aveva transitionType/transitionDuration inline → pulisce schema e record
                var rawChannels = raw.entities[ENTITY_CHANNEL] || [];
                savedChannels = rawChannels.map(function(ch) {
                    return { id: ch.id, name: ch.name, code: ch.code };
                });
                writeFileSync(DB_PATH, JSON.stringify({ entitiesConfiguration: {}, entities: {} }));
            }
        }
    } catch (e) {}
}

const db = await Database.create(DB_PATH, { eager: true });

const existingEntities = await db.entityManager.listEntities();

// Crea entità channel se assente (senza campi transizione)
if (!existingEntities.includes(ENTITY_CHANNEL)) {
    await db.entityManager.createEntity(ENTITY_CHANNEL, {
        type: 'table',
        values: ['id', 'name', 'code'],
        id: ['id'],
        notnullable: [],
        unique: [],
        nested: []
    });
}

// Crea entità transition se assente (record globale unico id=0)
if (!existingEntities.includes(ENTITY_TRANSITION)) {
    await db.entityManager.createEntity(ENTITY_TRANSITION, {
        type: 'table',
        values: ['id', 'type', 'duration'],
        id: ['id'],
        notnullable: [],
        unique: [],
        nested: []
    });
    // Inserisce il record di default
    await db.recordManager.insert(ENTITY_TRANSITION, { id: 0, type: 'cut', duration: 0 });
    await db.flush();
}

// Reinserisce i canali salvati dalla migrazione
if (savedChannels.length > 0) {
    for (const ch of savedChannels) {
        try {
            await db.recordManager.insert(ENTITY_CHANNEL, {
                id:   ch.id,
                name: ch.name ?? String(ch.id),
                code: ch.code ?? ''
            });
        } catch (e) {}
    }
    await db.flush();
}

// --- CANALI ---

export var getAll = async function () {
    var channels = await db.recordManager.findAll(ENTITY_CHANNEL);
    if (!channels || channels.length === 0) {
        await db.recordManager.insert(ENTITY_CHANNEL, { id: 0, name: '0', code: '' });
        await db.flush();
        channels = await db.recordManager.findAll(ENTITY_CHANNEL);
    }
    return channels.sort((a, b) => a.id < b.id ? -1 : 0);
};

// Salva o aggiorna un canale (upsert).
// Aggiornamento parziale: include solo i campi definiti nel payload (code/name).
export var saveChannel = async function (channelToSave) {
    var existing = await db.recordManager.findByIdSingle(ENTITY_CHANNEL, channelToSave.id);
    if (existing) {
        var updateFields = {};
        if (channelToSave.name !== undefined) updateFields.name = channelToSave.name;
        if (channelToSave.code !== undefined) updateFields.code = channelToSave.code;
        await db.recordManager.update(ENTITY_CHANNEL, { id: channelToSave.id }, updateFields);
    } else {
        await db.recordManager.insert(ENTITY_CHANNEL, {
            id:   channelToSave.id,
            name: channelToSave.name ?? String(channelToSave.id),
            code: channelToSave.code ?? ''
        });
    }
    await db.flush();
};

export var searchChannel = async function (channelID) {
    var channel = await db.recordManager.findByIdSingle(ENTITY_CHANNEL, channelID);
    if (!channel) {
        channel = { id: channelID, name: String(channelID), code: '' };
        await db.recordManager.insert(ENTITY_CHANNEL, channel);
        await db.flush();
    }
    return channel;
};

// --- TRANSIZIONE GLOBALE ---

// Restituisce la config transizione globale (record id=0).
// Se il record non esiste (primo avvio) lo crea con default cut/0.
export var getTransition = async function () {
    var t = await db.recordManager.findByIdSingle(ENTITY_TRANSITION, 0);
    if (!t) {
        t = { id: 0, type: 'cut', duration: 0 };
        await db.recordManager.insert(ENTITY_TRANSITION, t);
        await db.flush();
    }
    return t;
};

// Aggiorna la config transizione globale.
export var setTransition = async function (transitionData) {
    var existing = await db.recordManager.findByIdSingle(ENTITY_TRANSITION, 0);
    var record = {
        type:     transitionData.type     ?? 'cut',
        duration: transitionData.duration ?? 0
    };
    if (existing) {
        await db.recordManager.update(ENTITY_TRANSITION, { id: 0 }, record);
    } else {
        await db.recordManager.insert(ENTITY_TRANSITION, { id: 0, ...record });
    }
    await db.flush();
};
