/** MANEGGIA I DATI DA SALVARE */
import { existsSync, writeFileSync, writeFile, readFileSync } from 'fs';
var path = './src/resource/db.json';
var pathWrite = './src/resource/db.json';

var load = function (pathToload) {
    // Se il file non esiste, lo crea con la struttura DB vuota di default
    if (!existsSync(pathToload)) {
        var emptyDb = { titol: 'DB channel', channel: [] };
        writeFileSync(pathToload, JSON.stringify(emptyDb));
    }
    var rawdata = readFileSync(pathToload);
    var jsonFile = JSON.parse(rawdata);
    return jsonFile;
}

var checkDb = function () {
    try {
        if (existsSync(pathWrite)) {
            var rawdata = readFileSync(pathWrite);
            JSON.parse(rawdata);
            return true;
        }
    } catch (err) {
    }
    return false;
}

var sessionDb = function () {
    if (checkDb()) {
        var db = load(path);
        return db;
    } else {
        var db = { titol: 'DB channel', channel: [] }; 
        flush(db);
    }
}

var flush = function (sampleObject) {
    var newDb= JSON.stringify(sampleObject);
    writeFileSync(pathWrite, newDb);
}

var getAll = function() { 
    var db = sessionDb(); 
    if (!db.channel || !db.channel[0]) {
        saveChannel({id:0, name:0, code: '' });
    }
    var channels = db.channel ;
    channels = channels.sort((a, b) => {
        var result =a.id<b.id;
        return result? -1 :0;
      });
    return channels ;
}

var saveChannel = function (channelToSave) {
    var found = false;
    var db = sessionDb();
    for (let index = 0; index < db.channel.length; index++) {
        var channel = db.channel[index];
        if (channel.id === channelToSave.id) {
            db.channel[index] = channelToSave;
            found = true;
        }

    }
    if (!found) {
        db.channel.push(channelToSave);
    }
    flush(db);
}

var searchChannel = function (channelID) {
    var found = false;
    var db = sessionDb();
    var channelToFind = {
        id: channelID,
        code: ''
    };
    db.channel.forEach(channel => {
        if (channel.id === channelToFind.id) {
            channelToFind = channel;
            found = true;
        }
    });
    if (!found) {
        saveChannel(channelToFind);
    }
    return channelToFind;
}

export { searchChannel, saveChannel, getAll } 