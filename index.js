const http = require('http');
const https = require('https');
const fs = require('fs');
var WebSocketServer = require('ws').Server;

const express = require('express');
const serveIndex = require('serve-index')
const app = express();
const bodyParser = require('body-parser');
var jsonParser = bodyParser.json({limit: '50mb' })
app.use(jsonParser);
// app.use(bodyParser.text({ type: "*/*", limit: '50mb', extended: true }))

const sensors = {};
let counter = 0;
    let lastTime = 0;


app.all('/sensors', function(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    sensors['counter'] = ++counter
    res.send(sensors);
});
let phoneSensors = {};
app.all('/phone', function(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    phoneSensors = req.query || req.body;
    console.log(req.body)
    //console.log(req.param)
    //console.log(JSON.stringify(req.body));
    const thisTime = phoneSensors.locationHeadingTimestamp_since1970;
    //console.log(thisTime,lastTime)
    if (thisTime < lastTime) {
        lastTime = thisTime;
        console.log('out of sync')
        return
    }
    lastTime = thisTime;
    for (key in phoneSensors) {
        //if (key == 'locationTrueHeading' || key == 'thisTime' || key == 'batteryState') {
        sensors[key] = phoneSensors[key]; // copies each property to the objCopy object
        //}
        // console.log(sensors);
    }
    sensors['thisTime'] = phoneSensors[thisTime]; // copies each property to the objCopy object
    res.send(JSON.stringify(sensors));
});

app.use('', express.static('public', { 'index': false }), serveIndex('public', { 'icons': true }))

let server = http.createServer(app);

const serverPort = 1514;
server.listen(serverPort);
console.log('listening on port', serverPort)

var wss = new WebSocketServer({ server: server });

wss.on('connection', function(ws) {
    var id = setInterval(function() {
    	sensors['counter'] = ++counter
        ws.send(JSON.stringify(sensors), function() { /* ignore errors */ });
    }, 500);
   // console.log('connection to client',id);
    ws.on('close', function() {
        //console.log('closing client',id);
        clearInterval(id);
    });
});

function shutdown() {
    process.exit(0)
}

//For control-c
process.on('SIGINT', shutdown);