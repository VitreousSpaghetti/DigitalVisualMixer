/** MAIN */ 
  
import express from 'express';
import fs from 'fs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { searchChannel, saveChannel, getAll, getTransition, setTransition, reorderChannels }  from './manager.js'
import { createServer } from "http";
import { Server } from "socket.io";
import { nodeResolve } from '@rollup/plugin-node-resolve';

export default {
    input: 'src/index.js',
    output: {
      dir: 'output',
      format: 'cjs'
    },
    plugins: [nodeResolve()]
  };

//INIT ENV VAR
const app = express();  
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const http = createServer(app);
const io = new Server(http);
if(!process || !process.env || !process.env.TOKEN){
    dotenv.config();
}
var port = process.env.PORT || 8080;
// TODO-7.3: numero massimo di canali configurabile via env var MAX_CHANNELS
// Il numero effettivo di canali è determinato da db.json (getAll).
// Questo valore è documentativo — i canali sono aggiunti/rimossi direttamente da db.json o via API del server.
var maxChannels = parseInt(process.env.MAX_CHANNELS, 10) || 36;
var token = process.env.TOKEN || '';
app.use(express.static(__dirname + '/dist/'));

//LOAD MODULE   
app.get("/src/resource/js/lib/codemirror.js", (request, response) => { 
    response.sendFile('index.js' , { root: './node_modules/codemirror/dist/' }) 
});   
app.get("/dist/hydra-synth.js", (request, response) => { 
    response.sendFile('hydra-synth.js' , { root: './node_modules/hydra-synth/dist/' }) 
});  
app.get("/dist/bootstrap.min.css", (request, response) => { 
    response.sendFile('bootstrap.min.css' , { root: './node_modules/bootstrap/dist/css/' }) 
});  
app.get("/dist/bootstrap.min.css.map", (request, response) => { 
    response.sendFile('bootstrap.min.css.map' , { root: './node_modules/bootstrap/dist/css/' }) 
});  
 

var filesJs = fs.readdirSync('./src/resource/addon/');
filesJs.forEach(file => {  
    console.log("/src/resource/addon/"+file);
    app.get("/src/resource/addon/"+file, (request, response) => { 
        response.sendFile(file , { root: './src/resource/addon/' }) 
    });  
});

//LOAD ASSETS
app.use('/src/assets', express.static(__dirname + '/src/assets/')); 

//LOAD HOMEPAGE ON MAIN LOCALHOST:8080 

app.get("/", (request, response) => { 
    response.sendFile('mixer.html' , { root: './src/resource/html/' }) 
});  

//LOAD FAVICON
app.get("/favicon.ico", (request, response) => { 
    response.sendFile('favicon.ico' , { root: './src/resource/' })
});  

//LOAD ALL HTML AND EXPOSE IT
var files = fs.readdirSync('./src/resource/html/');
files.forEach(file => { 
    var streetaddress= file.substr(0, file.indexOf('.')); 
    app.get("/"+streetaddress, (request, response) => { 
        response.sendFile(file , { root: './src/resource/html/' }) 
    });  
});

//LOAD ALL CSS AND EXPOSE IT
var filesCss = fs.readdirSync('./src/resource/css/');
filesCss.forEach(file => {  
    console.log("/src/resource/css/"+file);
    app.get("/src/resource/css/"+file, (request, response) => { 
        response.sendFile(file , { root: './src/resource/css/' }) 
    });  
});

//LOAD ALL IMG AND EXPOSE IT
var filesCss = fs.readdirSync('./src/resource/img/');
filesCss.forEach(file => {  
    console.log("/src/resource/img/"+file);
    app.get("/src/resource/img/"+file, (request, response) => { 
        response.sendFile(file , { root: './src/resource/img/' }) 
    });  
});

//LOAD ALL JS AND EXPOSE IT
var filesJs = fs.readdirSync('./src/resource/js/');
filesJs.forEach(file => {  
    console.log("/src/resource/js/"+file);
    app.get("/src/resource/js/"+file, (request, response) => { 
        response.sendFile(file , { root: './src/resource/js/' }) 
    });  
});

var filesJsMixer = fs.readdirSync('./src/resource/js/mixer/');
filesJsMixer.forEach(file => {  
    console.log("/src/resource/js/mixer/"+file);
    app.get("/src/resource/js/"+file, (request, response) => { 
        response.sendFile(file , { root: './src/resource/js/mixer/' }) 
    });  
});

var filesJsRollupBundle = fs.readdirSync('./rollupBundle/');
filesJsRollupBundle.forEach(file => {  
    console.log("/rollupBundle/"+file);
    app.get("/src/resource/js/rollupBundle/"+file, (request, response) => { 
        response.sendFile(file , { root: './rollupBundle/' }) 
    });  
});

//START LISTENING FOR CHANNEL CHANGE
var channelLive =  0; //default
var channelShow =  0; //default
var toload = true; //default

// handle incoming connections from clients
io.sockets.on('connection', async function(socket) {
    console.log("app: init connection");

    //getChannel setted live (await necessario: searchChannel è ora async)
    io.sockets.emit("get_channel", await searchChannel(channelShow));

    io.sockets.emit("get_toload", toload);

    //set the channel in charge
    socket.on('set_channel', async function(variable) {
        var channelId = (typeof variable === 'object' && variable.id !== undefined)
            ? variable.id : variable;

        channelShow = channelId;

        // Legge canale e transizione globale dal DB (fonte di verità)
        var channelData = await searchChannel(channelShow);
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
        var code = (await searchChannel(variable)).code;
        socket.emit('get_code', code);
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

});  

//ASCOLTA LA PORTA localhost per dire che il progetto è attivo
http.listen(port, () => {
  console.log(`Socket.IO server running at http://localhost:${port}/`);
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