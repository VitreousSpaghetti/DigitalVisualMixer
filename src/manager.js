/** MANEGGIA I DATI CON VITREOUSDATABASE 0.2.0 (npm ^0.2.0)
 *
 * Aggiornato da 0.1.0 (github:VitreousSpaghetti/VitreousDataBase) a 0.2.0 (npm).
 * Novità 0.2.0 usate:
 *  - entityManager.getEntity(name)     — legge la config di un'entità esistente
 *  - entityManager.addField(e, field)  — aggiunge campo a schema già esistente (migrazione live)
 *  - recordManager.update() e tutti i metodi accettano options opzionale (backwards compatible)
 */
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

// let (non const) per permettere la ri-assegnazione in reloadDb()
let db = await Database.create(DB_PATH, { eager: true });

const existingEntities = await db.entityManager.listEntities();

// Crea entità channel se assente.
// Schema include thumbnail (TODO-2.3) e sortOrder (TODO-2.5) fin dal primo avvio.
if (!existingEntities.includes(ENTITY_CHANNEL)) {
    await db.entityManager.createEntity(ENTITY_CHANNEL, {
        type: 'table',
        values: ['id', 'name', 'code', 'thumbnail', 'sortOrder'],
        id: ['id'],
        notnullable: [],
        unique: [],
        nested: []
    });
} else {
    // --- MIGRAZIONE SCHEMA (VitreousDataBase 0.2.0 addField API) ---
    // Se il DB esiste già senza thumbnail/sortOrder, li aggiunge allo schema
    // senza perdere i record esistenti. getEntity() e addField() sono nuove in 0.2.0.
    const existingChannelCfg = await db.entityManager.getEntity(ENTITY_CHANNEL);
    if (!existingChannelCfg.values.includes('thumbnail')) {
        await db.entityManager.addField(ENTITY_CHANNEL, 'thumbnail');
        console.log('manager: migrazione schema → aggiunto campo thumbnail');
    }
    if (!existingChannelCfg.values.includes('sortOrder')) {
        await db.entityManager.addField(ENTITY_CHANNEL, 'sortOrder');
        console.log('manager: migrazione schema → aggiunto campo sortOrder');
    }
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

// --- RELOAD DB (usato da POST /api/db/import) ---

/**
 * Sostituisce il db.json su disco con newData e ricrea l'istanza VitreousDataBase.
 * Necessario perché il modulo usa top-level await: il riferimento `db` deve essere
 * aggiornato in-process senza riavvio del server.
 * @param {object} newData - JSON parsato del nuovo db.json (deve avere entitiesConfiguration + entities)
 */
export var reloadDb = async function(newData) {
    // Scrive il nuovo contenuto su disco
    writeFileSync(DB_PATH, JSON.stringify(newData, null, 2), 'utf-8');
    // Ricrea l'istanza — sovrascrive il riferimento al modulo
    db = await Database.create(DB_PATH, { eager: true });
    console.log('manager: reloadDb completato — DB ricaricato dal nuovo file');
};

// --- CANALI ---

/**
 * Restituisce tutti i canali ordinati per sortOrder (se presente), poi per id.
 * sortOrder viene impostato da reorderChannels() dopo il drag&drop (TODO-2.5).
 */
export var getAll = async function () {
    var channels = await db.recordManager.findAll(ENTITY_CHANNEL);
    if (!channels || channels.length === 0) {
        await db.recordManager.insert(ENTITY_CHANNEL, { id: 0, name: '0', code: '' });
        await db.flush();
        channels = await db.recordManager.findAll(ENTITY_CHANNEL);
    }
    // Ordina per sortOrder se disponibile, fallback su id (TODO-2.5)
    return channels.sort(function(a, b) {
        var sa = (a.sortOrder !== undefined && a.sortOrder !== null) ? a.sortOrder : a.id;
        var sb = (b.sortOrder !== undefined && b.sortOrder !== null) ? b.sortOrder : b.id;
        return sa < sb ? -1 : sa > sb ? 1 : 0;
    });
};

/**
 * Salva o aggiorna un canale (upsert).
 * Aggiornamento parziale: include solo i campi definiti nel payload (code/name/thumbnail).
 */
export var saveChannel = async function (channelToSave) {
    var existing = await db.recordManager.findByIdSingle(ENTITY_CHANNEL, channelToSave.id);
    if (existing) {
        var updateFields = {};
        if (channelToSave.name !== undefined) updateFields.name = channelToSave.name;
        if (channelToSave.code !== undefined) updateFields.code = channelToSave.code;
        // TODO-2.3: persiste thumbnail se presente nel payload (null è valido per reset)
        if (channelToSave.thumbnail !== undefined) updateFields.thumbnail = channelToSave.thumbnail;
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

/**
 * Riordina i canali impostando il campo sortOrder in base all'array di ID ricevuto.
 * Chiamata dal socket event 'save_order' dopo il drag&drop nella UI (TODO-2.5).
 * Usa VitreousDataBase 0.2.0 recordManager.update() standard — nessuna API speciale richiesta.
 */
export var reorderChannels = async function (orderedIds) {
    for (var i = 0; i < orderedIds.length; i++) {
        try {
            await db.recordManager.update(ENTITY_CHANNEL, { id: orderedIds[i] }, { sortOrder: i });
        } catch (e) {
            // Ignora RecordNotFoundError su ID non presenti nel DB
        }
    }
    await db.flush();
    console.log('manager: reorderChannels → sortOrder aggiornato per', orderedIds.length, 'canali');
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
