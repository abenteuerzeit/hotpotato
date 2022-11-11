const CONSTANTS = require('./utils/constants.js');
const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

const { PORT, MAX_TIME, CLIENT, SERVER } = CONSTANTS;

let nextPlayerIndex = 0;

const server = http.createServer((req, res) => {
  const filePath = ( req.url === '/' ) ? '/public/index.html' : req.url;
  const extname = path.extname(filePath);
  let contentType = 'text/html';
  if (extname === '.js') contentType = 'text/javascript';
  else if (extname === '.css') contentType = 'text/css';
  res.writeHead(200, { 'Content-Type': contentType });
  fs.createReadStream(`${__dirname}/${filePath}`, 'utf8').pipe(res);
});

const wsServer = new WebSocket.Server({ server });

wsServer.on('connection', (socket) => {
  console.log('A new client has joined the server');
  socket.on('message', (data) => {
    const { type, payload } = JSON.parse(data);
    switch(type) {
      case CLIENT.MESSAGE.NEW_USER:
        handleNewUser(socket);
        break;
      case CLIENT.MESSAGE.PASS_POTATO:
        passThePotatoTo(payload.newPotatoHolderIndex);
        break;
      default:
        break;
    }
  });
});

function broadcast(data, socketToOmit) {
  wsServer.clients.forEach((connectedClient) => {
    if (connectedClient.readyState === WebSocket.OPEN && connectedClient !== socketToOmit) {
      connectedClient.send(JSON.stringify(data));
    }
  });
}

function handleNewUser(socket) {
  if (nextPlayerIndex < 4) {
    const message = {
      type: SERVER.MESSAGE.PLAYER_ASSIGNMENT,
      payload: { clientPlayerIndex: nextPlayerIndex }
    }

    socket.send(JSON.stringify(message))
    nextPlayerIndex++;
    
    if (nextPlayerIndex === 4) {  
      const randomFirstPotatoHolder = Math.floor(Math.random() * 4);
      passThePotatoTo(randomFirstPotatoHolder);
      
      startTimer();
    }
  } else {
    const message = {
      type: SERVER.MESSAGE.GAME_FULL
    }
    socket.send(JSON.stringify(message))
  }

}

function passThePotatoTo(newPotatoHolderIndex) {
  broadcast({
    type: SERVER.BROADCAST.NEW_POTATO_HOLDER,
    payload: { newPotatoHolderIndex }
  })
}

function startTimer() {
  let clockValue = MAX_TIME;
  const interval = setInterval(() => {
    if (clockValue > 0) {
      broadcast({
        type: SERVER.BROADCAST.COUNTDOWN,
        payload: { clockValue }
      });
      clockValue--;
    } else {
      clearInterval(interval);
      nextPlayerIndex = 0;
      broadcast({
        type: SERVER.BROADCAST.GAME_OVER,
      });
    }
  }, 1000);
}

server.listen(PORT, () => {
  console.log(`Listening on: http://localhost:${server.address().port}`);
});
