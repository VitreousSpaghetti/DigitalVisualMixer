/** MAIN */ 
  
import express from 'express';
import fs from 'fs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
// DB_PATH da manager.js: export/import devono operare sullo stesso file del DB (anche con DATA_DIR)
import { DATA_DIR, DB_PATH, searchChannel, saveChannel, getAll, getTransition, setTransition, reorderChannels, reloadDb, createChannel, deleteChannel, getAllMacros, saveMacro, createMacro, deleteMacro, getPresets, createPreset, deletePreset, updatePreset }  from './manager.js'
import { createServer } from "http";
import { createServer as createHttpsServer } from "https";
import { Server } from "socket.io";
import { lanIPv4, loadOrCreateCert } from './cert.js';

//INIT ENV VAR
const app = express();

// Middleware JSON per endpoint REST (import DB: thumbnail base64 → limit 50mb)
// DEVE stare prima di tutte le route
app.use(express.json({ limit: '50mb' }));

// Tutti gli asset sono risolti dalla root dell'app (cartella sopra src/), non dalla CWD:
// così il server parte anche se lanciato da un'altra cartella o da un launcher esterno.
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const p = (rel) => path.join(ROOT, rel);
const http = createServer(app);
const io = new Server(http);
if(!process || !process.env || !process.env.TOKEN){
    dotenv.config();
}
var port = process.env.PORT || 8080;
var httpsPort = process.env.HTTPS_PORT || 8443;
// R-LAN4: la stessa app e la STESSA istanza io anche in HTTPS, così mixer (http) e live remota
// (https) ricevono gli stessi broadcast. Certificato illeggibile → solo HTTP (live remota senza mic/cam).
var https = null;
try {
    https = createHttpsServer(loadOrCreateCert(DATA_DIR), app);
    io.attach(https);
} catch (e) {
    console.warn('WARNING: HTTPS disabled (' + e.message + '). Remote live works over http, without microphone/webcam.');
}
// TODO-7.3: numero massimo di canali configurabile via env var MAX_CHANNELS
// Il numero effettivo di canali è determinato da db.json (getAll).
// Questo valore è documentativo — i canali sono aggiunti/rimossi direttamente da db.json o via API del server.
var maxChannels = parseInt(process.env.MAX_CHANNELS, 10) || 36;
var token = process.env.TOKEN || '';

//LOAD MODULE   
app.get("/src/resource/js/lib/codemirror.js", (request, response) => { 
    response.sendFile('index.js' , { root: p('node_modules/codemirror/dist/') }) 
});   
app.get("/dist/hydra-synth.js", (request, response) => { 
    response.sendFile('hydra-synth.js' , { root: p('node_modules/hydra-synth/dist/') }) 
});  
app.get("/dist/bootstrap.min.css", (request, response) => { 
    response.sendFile('bootstrap.min.css' , { root: p('node_modules/bootstrap/dist/css/') }) 
});  
app.get("/dist/bootstrap.min.css.map", (request, response) => {
    response.sendFile('bootstrap.min.css.map' , { root: p('node_modules/bootstrap/dist/css/') })
});
// UX_GUIDA RF-A5: icone Font Awesome servite in locale (il mixer si usa in live, anche senza rete).
// css/ e webfonts/ affiancati: all.min.css carica i font con url(../webfonts/...)
app.use('/dist/fontawesome/css', express.static(p('node_modules/@fortawesome/fontawesome-free/css')));
app.use('/dist/fontawesome/webfonts', express.static(p('node_modules/@fortawesome/fontawesome-free/webfonts')));
 

var filesJs = fs.readdirSync(p('src/resource/addon/'));
filesJs.forEach(file => {  
    console.log("/src/resource/addon/"+file);
    app.get("/src/resource/addon/"+file, (request, response) => { 
        response.sendFile(file , { root: p('src/resource/addon/') }) 
    });  
});

//LOAD HOMEPAGE ON MAIN LOCALHOST:8080 

app.get("/", (request, response) => { 
    response.sendFile('mixer.html' , { root: p('src/resource/html/') }) 
});  

//LOAD FAVICON
app.get("/favicon.ico", (request, response) => { 
    response.sendFile('favicon.ico' , { root: p('src/resource/') })
});  

//LOAD ALL HTML AND EXPOSE IT
var files = fs.readdirSync(p('src/resource/html/'));
files.forEach(file => { 
    var streetaddress= file.substr(0, file.indexOf('.')); 
    app.get("/"+streetaddress, (request, response) => { 
        response.sendFile(file , { root: p('src/resource/html/') }) 
    });  
});

//LOAD ALL CSS AND EXPOSE IT
var filesCss = fs.readdirSync(p('src/resource/css/'));
filesCss.forEach(file => {  
    console.log("/src/resource/css/"+file);
    app.get("/src/resource/css/"+file, (request, response) => { 
        response.sendFile(file , { root: p('src/resource/css/') }) 
    });  
});

//LOAD ALL IMG AND EXPOSE IT
var filesCss = fs.readdirSync(p('src/resource/img/'));
filesCss.forEach(file => {  
    console.log("/src/resource/img/"+file);
    app.get("/src/resource/img/"+file, (request, response) => { 
        response.sendFile(file , { root: p('src/resource/img/') }) 
    });  
});

//LOAD ALL JS AND EXPOSE IT
var filesJs = fs.readdirSync(p('src/resource/js/'));
filesJs.forEach(file => {  
    console.log("/src/resource/js/"+file);
    app.get("/src/resource/js/"+file, (request, response) => { 
        response.sendFile(file , { root: p('src/resource/js/') }) 
    });  
});

var filesJsMixer = fs.readdirSync(p('src/resource/js/mixer/'));
filesJsMixer.forEach(file => {  
    console.log("/src/resource/js/mixer/"+file);
    app.get("/src/resource/js/"+file, (request, response) => { 
        response.sendFile(file , { root: p('src/resource/js/mixer/') }) 
    });  
});

var filesJsRollupBundle = fs.readdirSync(p('rollupBundle/'));
filesJsRollupBundle.forEach(file => {  
    console.log("/rollupBundle/"+file);
    app.get("/src/resource/js/rollupBundle/"+file, (request, response) => { 
        response.sendFile(file , { root: p('rollupBundle/') }) 
    });  
});

// R-LAN1: URL della live per gli altri PC, letti da console e Guida del mixer.
// https solo se il server HTTPS è davvero in ascolto (cert ok e porta libera).
function liveUrls() {
    return lanIPv4().map(function(ip) {
        return https && https.listening ? 'https://' + ip + ':' + httpsPort + '/live?fit=cover'
                                        : 'http://' + ip + ':' + port + '/live?fit=cover';
    });
}
app.get('/api/lan', (req, res) => res.json({ live: liveUrls() }));

// --- REST API: export / import DB ---

/**
 * GET /api/db/export
 * Scarica db.json come file attachment.
 * Legge direttamente dal disco per garantire coerenza con l'ultimo flush.
 */
app.get('/api/db/export', (req, res) => {
    const raw = fs.readFileSync(DB_PATH, 'utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="db.json"');
    res.setHeader('Content-Type', 'application/json');
    res.send(raw);
});

/**
 * POST /api/db/import
 * Riceve un JSON, valida struttura minima, sostituisce db.json e ricarica l'istanza DB.
 * Body max 50mb (configurato in express.json middleware) per supportare thumbnail base64.
 */
app.post('/api/db/import', async (req, res) => {
    const newData = req.body;
    // Validazione struttura minima obbligatoria per VitreousDataBase
    if (!newData || !newData.entitiesConfiguration || !newData.entities) {
        return res.status(400).json({ error: 'Struttura db non valida: mancano entitiesConfiguration o entities' });
    }
    try {
        await reloadDb(newData);
        res.json({ ok: true });
    } catch (e) {
        console.error('app: import DB fallito', e);
        res.status(500).json({ error: 'Errore interno durante il reload del DB: ' + e.message });
    }
});

//START LISTENING FOR CHANNEL CHANGE
var channelLive =  0; //default
var channelShow =  0; //default
var toload = true; //default
// Ultimo valore noto di ogni variabile macro {key: value} (PERFORM edge case: /live aperta
// tardi o mixer ricaricato devono ripartire dai valori correnti, non dai default)
var macroState = {};

// handle incoming connections from clients
io.sockets.on('connection', async function(socket) {
    console.log("app: init connection");

    // Prima di qualsiasi canale: /live deve avere M popolato quando esegue il codice,
    // altrimenti {{key}} resterebbe placeholder. Le key mai mosse partono dal default del DB.
    (await getAllMacros()).forEach(function(m) {
        if (m.type !== 'variable') return;
        var p = {};
        try { p = JSON.parse(m.params || '{}'); } catch(e) {}
        var key = p.key || m.name;
        if (key && !(key in macroState)) macroState[key] = p.value !== undefined ? p.value : (p.min || 0);
    });
    socket.emit('sync_macros', macroState);

    //getChannel setted live — searchChannel ora restituisce null se il canale non esiste
    var currentChannel = await searchChannel(channelShow);
    // Stato iniziale solo al client che si connette: inviato a tutti, la connessione del mixer
    // ricaricava il canale sulla Live e le passava toload=false, facendo perdere il primo invio.
    if (currentChannel) socket.emit("get_channel", currentChannel);

    socket.emit("get_toload", toload);

    //set the channel in charge
    socket.on('set_channel', async function(variable) {
        var channelId = (typeof variable === 'object' && variable.id !== undefined)
            ? variable.id : variable;

        channelShow = channelId;

        // Legge canale e transizione globale dal DB (fonte di verità)
        var channelData = await searchChannel(channelShow);
        if (!channelData) return; // canale eliminato: ignora
        var transitionData = await getTransition();
        var transition = { type: transitionData.type, duration: transitionData.duration };
        console.log("app: set_channel to show " + channelId + " transition: " + transition.type);

        socket.broadcast.emit('set_channel', Object.assign({}, channelData, { transition }));
    });

    // Invia la transizione globale al client che si connette
    socket.emit('get_transition', await getTransition());

    // Salva la transizione globale quando il mixer la modifica
    socket.on('save_transition', async function(variable) {
        console.log("app: save_transition " + variable.type + " " + variable.duration + "ms");
        await setTransition(variable);
    });

    //return channel in live
    socket.on('get_in_load', function() {
        console.log("app: get_in_load "+channelShow);
        socket.emit('get_in_load', channelShow);
    });

    //set to load a content
    socket.on('set_toload', function(variable) {
        console.log("app: set_toload "+variable);
        channelLive = variable;
        toload = variable;
        socket.broadcast.emit('set_toload', variable);
    });

    //save to db the code of a channel changed
    socket.on('save_channel', async function(variable) {
        console.log("app: save_channel "+variable.id);
        await saveChannel(variable);
    });

    //return all the channels
    socket.on('get_all', async function() {
        console.log("app: get_all");
        var allChannel = await getAll();
        socket.emit('get_all', allChannel);
    });

    //return the code of a channel
    socket.on('get_code', async function(variable) {
        console.log("app: get_code "+variable);
        var ch = await searchChannel(variable);
        socket.emit('get_code', ch ? ch.code : '');
    });

    //return a single channel
    socket.on('find_channel', async function(variable) {
        console.log("app: find_channel "+variable);
        var channel = await searchChannel(variable);
        socket.emit('find_channel', channel);
    });

    // TODO-2.5: riceve array di ID ordinati dopo drag&drop e persiste il nuovo ordine
    // Usa reorderChannels() da manager.js che imposta il campo sortOrder (VitreousDataBase 0.2.0)
    socket.on('save_order', async function(orderedIds) {
        console.log("app: save_order ricevuto per", orderedIds.length, "canali");
        await reorderChannels(orderedIds);
    });

    // Crea un nuovo canale vuoto e notifica SOLO il client richiedente.
    // Non usa broadcast per evitare il side effect autosave toggle su tutti i client
    // (il percorso get_all chiama autosave() in mixerEmitter; questo percorso no).
    socket.on('create_channel', async function() {
        console.log("app: create_channel");
        var newId = await createChannel();
        var allChannels = await getAll();
        // Risposta solo al socket richiedente (non broadcast)
        socket.emit('channel_created', { id: newId, channels: allChannels });
    });

    // Elimina il canale specificato; guard per non consentire la cancellazione
    // dell'ultimo canale rimanente. Resetta channelShow/channelLive se necessario.
    socket.on('delete_channel', async function(channelId) {
        console.log("app: delete_channel id=" + channelId);
        var allChannels = await getAll();

        // Guard: rifiuta se è l'unico canale rimasto
        if (allChannels.length <= 1) {
            socket.emit('delete_channel_error', 'Cannot delete the only channel');
            return;
        }

        await deleteChannel(channelId);

        // Se il canale eliminato era quello mostrato/live sul server, resetta allo stato sicuro
        // trova il primo canale rimanente come fallback
        if (channelShow === channelId) {
            channelShow = allChannels.find(function(c) { return c.id !== channelId; }).id;
        }
        if (channelLive === channelId) {
            channelLive = channelShow;
        }

        var updatedChannels = await getAll();
        // Risposta solo al socket richiedente (non broadcast)
        socket.emit('channel_deleted', { deletedId: channelId, channels: updatedChannels });
    });

    // --- MACRO ---

    // Invia tutte le macro al client che si connette o richiede
    socket.on('get_macros', async function () {
        console.log("app: get_macros");
        socket.emit('get_macros', await getAllMacros());
    });

    // Salva/aggiorna una macro esistente (upsert)
    socket.on('save_macro', async function (macro) {
        console.log("app: save_macro id=" + macro.id);
        await saveMacro(macro);
        socket.emit('get_macros', await getAllMacros());
    });

    // Crea una nuova macro vuota; notifica solo il client richiedente
    socket.on('create_macro', async function (data) {
        console.log("app: create_macro");
        var newId = await createMacro(data);
        var allMacros = await getAllMacros();
        socket.emit('macro_created', { id: newId, macros: allMacros });
    });

    // Elimina una macro per id; notifica solo il client richiedente
    socket.on('delete_macro', async function (macroId) {
        console.log("app: delete_macro id=" + macroId);
        await deleteMacro(macroId);
        var allMacros = await getAllMacros();
        socket.emit('macro_deleted', { deletedId: macroId, macros: allMacros });
    });

    // Broadcast valori variabili macro a tutti i client (incluso live.html).
    // vars è parziale (solo le key cambiate nel frame): merge nello stato server.
    socket.on('sync_macros', function (vars) {
        Object.assign(macroState, vars);
        socket.broadcast.emit('sync_macros', vars);
    });

    // --- PRESET ---

    // Invia tutti i preset al client che si connette o richiede
    socket.on('get_presets', async function () {
        console.log("app: get_presets");
        socket.emit('get_presets', await getPresets());
    });

    // Crea un nuovo preset; notifica solo il client richiedente
    socket.on('create_preset', async function (data) {
        console.log("app: create_preset nome=" + data.name);
        var newId = await createPreset(data);
        var allPresets = await getPresets();
        socket.emit('preset_created', { id: newId, presets: allPresets });
    });

    // Elimina un preset per id; notifica solo il client richiedente
    socket.on('delete_preset', async function (presetId) {
        console.log("app: delete_preset id=" + presetId);
        await deletePreset(presetId);
        var allPresets = await getPresets();
        socket.emit('preset_deleted', { deletedId: presetId, presets: allPresets });
    });

    // Aggiorna un preset esistente (nome, channelId, macroVars, transition); notifica solo il richiedente
    socket.on('update_preset', async function (data) {
        console.log("app: update_preset id=" + data.id);
        await updatePreset(data.id, data);
        var allPresets = await getPresets();
        socket.emit('preset_updated', { updatedId: data.id, presets: allPresets });
    });

});  

//ASCOLTA LE PORTE: nessun host → tutte le interfacce, la live deve essere raggiungibile dalla LAN (R-LAN2)
function printUrls() {
    console.log('Mixer: http://localhost:' + port + '/');
    liveUrls().forEach(function(u) { console.log('Live (network): ' + u); });
}
http.listen(port, () => {
    if (!https) return printUrls();
    // Porta HTTPS occupata: avviso e si resta in HTTP (gli URL stampati diventano http)
    https.on('error', (e) => { console.warn('WARNING: HTTPS port ' + httpsPort + ' unavailable (' + e.code + '), running HTTP only.'); printUrls(); });
    https.listen(httpsPort, printUrls);
});


/*

                            ▒▒▒▒▓▓▒▒▒▒▓▓▒▒░░                          
                      ▓▓▒▒▒▒▒▒░░▓▓░░▒▒▒▒░░▓▓▓▓▒▒▓▓                    
                  ░░░░░░░░▒▒    ▒▒  ░░    ░░▒▒▒▒▒▒▓▓▒▒░░              
              ░░░░░░                    ░░▒▒░░░░░░░░▒▒▓▓▒▒░░          
            ░░░░░░                          ░░    ░░░░▒▒░░▓▓          
          ░░░░░░                  ░░▒▒░░            ░░▒▒▒▒▒▒▓▓        
        ░░░░░░░░                    ░░                ░░▒▒░░▒▒▒▒      
        ░░░░                                      ▒▒    ▒▒░░░░░░      
      ░░░░░░    ░░                                        ▒▒▒▒░░      
    ░░░░░░░░        ░░                                      ▒▒░░░░    
    ░░░░░░░░    ▒▒  ▒▒      ░░▒▒▓▓▓▓▓▓▒▒▒▒░░        ▒▒  ▒▒░░░░▓▓░░░░  
  ░░░░░░  ░░      ▓▓  ░░░░▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▓▓░░  ░░░░░░░░░░░░░░░░░░  
  ░░░░                ░░▓▓▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒░░▒▒▒▒░░  ▒▒░░        ░░░░░░
  ░░░░                ▒▒▒▒▒▒░░░░░░░░▒▒▒▒░░  ░░▒▒▒▒  ░░          ▒▒░░░░
  ░░            ░░  ▒▒▒▒▒▒▒▒░░░░░░██▒▒▒▒▒▒▒▒▒▒▒▒▒▒░░            ░░░░░░
░░▒▒            ░░  ▒▒▒▒▒▒▒▒░░░░████▒▒██▒▒▒▒▒▒▒▒▒▒▒▒              ░░░░
▒▒                  ▒▒▒▒▒▒▒▒░░▒▒████  ██▓▓▒▒▒▒▒▒▒▒▒▒          ░░  ░░░░
░░░░        ▒▒      ▒▒░░▒▒▒▒▒▒▓▓██████████▒▒▒▒▒▒▒▒▒▒            ░░░░░░
░░░░░░      ▒▒  ▒▒  ▒▒░░░░▒▒▒▒▓▓██████████░░▒▒▒▒▒▒▒▒  ░░        ░░▒▒░░
░░░░            ░░  ▒▒░░░░  ░░▒▒▓▓██████░░░░▒▒▒▒▓▓▒▒  ░░░░        ░░░░
░░▒▒            ░░  ░░▒▒▒▒░░░░░░▒▒▒▒▒▒░░░░░░░░▒▒▒▒░░            ░░░░░░
  ░░░░░░░░            ▒▒▒▒▒▒▒▒▒▒▒▒▒▒░░░░▒▒▒▒▒▒▒▒▒▒░░          ░░▒▒▒▒░░
  ▒▒░░░░              ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒          ░░░░░░░░░░
  ▒▒░░▒▒░░            ▒▒░░▒▒▓▓▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒            ░░▒▒░░░░  
    ░░▒▒▒▒░░░░        ░░    ▒▒▓▓▒▒▒▒▒▒▒▒▒▒░░              ░░  ░░░░░░  
    ░░▓▓▒▒▒▒░░          ▒▒                                ░░░░░░░░    
      ▒▒▓▓░░░░░░░░░░░░▒▒  ░░░░                            ░░░░░░      
        ░░░░░░▒▒▒▒▒▒  ▒▒                                ░░  ░░        
          ▒▒▒▒▒▒▒▒░░░░░░                              ▒▒░░░░░░        
            ░░▒▒▒▒▒▒▒▒░░▒▒▒▒▒▒            ░░░░░░    ░░░░░░░░          
                ▓▓░░▒▒░░░░░░▒▒░░  ░░  ░░░░░░▒▒░░░░░░░░░░░░            
                  ░░▒▒▒▒▒▒░░▓▓▒▒▒▒░░░░▒▒░░░░░░░░░░░░                  
                        ▒▒▓▓▓▓▒▒▓▓▒▒░░░░░░░░░░                        
*/