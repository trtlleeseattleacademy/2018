const {EventEmitter} = require('events')
var WebSocket = require('ws');
const http          = require('http')
const fs             = require('fs')
const path           = require('path')
const express        = require('express')
const PORT           = process.env.PORT || 1501
const app            = express()
const emitter        = new EventEmitter()
const server = http.createServer(app);
const wss            = new WebSocket.Server({ server })
const cwd            = process.cwd()
const FPS            = 30
const timer          = 1000 / FPS
const imageQuality   = 0.50
let framesReceived   = 0
let connectedClients = []
let DATA             = null
const CLIENT = `<html><body><script>let image = new Image(); document.body.appendChild(image); const WS_URL = location.origin.replace(/^http/, 'ws'), ws = new WebSocket(WS_URL); ws.onmessage = message => image.src = URL.createObjectURL(message.data)</script></body></html>`
const STREAM = `<html><body><script>
(async () => {
        const   WS_URL  = location.origin.replace(/^http/, 'ws'), video = document.createElement('video'); video.setAttribute('autoplay',1)
                video.srcObject = await navigator.mediaDevices.getUserMedia({video: true})
                document.body.appendChild(video)
        let     canvas  = document.createElement('canvas');
        const getFrame  = (ws) => { 
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                canvas.getContext('2d').drawImage(video, 0, 0);
                canvas.toBlob(blob => ws.send(blob),'image/jpeg', ${imageQuality}) 
        }
        const ws = new WebSocket(WS_URL);
        ws.onopen = () => setInterval(() => getFrame(ws), ${timer})
})()
</script></body></html>`

wss.on('connection', (ws, req) => {
    connectedClients.push(ws);
    ws.on('message', data => {
        connectedClients.forEach((ws, i) => {
            if (ws.readyState === ws.OPEN) {
                ws.send(data)
                DATA = data
                emitter.emit('frame')
//                framesReceived++; fs.appendFileSync(`${cwd}/dvr/dvr.${framesReceived}.jpeg`,data)
            } else { connectedClients.splice(i, 1) }
        })
    })
})

app.get('/',         (req, res) => res.send(`Plese visit: <br /><a href="/streamer">/streamer</a><br /><a href="/client">/client</a><br /><a href="/mjpeg">/mjpeg</a>`))
app.get('/streamer', (req, res) => res.send(STREAM))
app.get('/client',   (req, res) => res.send(CLIENT))
app.get('/mjpeg',    (req, res) => {
    res.writeHead(200, {
        'Cache-Control' : 'no-store, no-cache, must-revalidate, pre-check=0, post-check=0, max-age=0',
        'Pragma'        : 'no-cache',
        'Connection'    : 'close',
        'Content-Type'  : 'multipart/x-mixed-replace; boundary=--myboundary'}
    );
    const writeFrame = () => { res.write(`--myboundary\nContent-Type: image/jpeg\nContent-length: ${DATA.length}\n\n`); res.write(DATA) }
    writeFrame()
    emitter.addListener('frame', writeFrame)
    res.addListener('close', () => { emitter.removeListener('frame', writeFrame) })
})
server.listen(PORT, () => console.log(`HTTP server listening at http://localhost:${PORT}`))
