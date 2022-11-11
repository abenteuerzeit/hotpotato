///////////////////////////////////////////////
///////////// IMPORTS + VARIABLES /////////////
///////////////////////////////////////////////

const CONSTANTS = require('./utils/constants.js');
const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

// Constants
const { PORT, MAX_TIME, CLIENT, SERVER } = CONSTANTS;

// Application Variables;
let nextPlayerIndex = 0;

///////////////////////////////////////////////
///////////// HTTP SERVER LOGIC ///////////////
///////////////////////////////////////////////

// Create the HTTP server
const server = http.createServer((req, res) => {
  // get the file path from req.url, or '/public/index.html' if req.url is '/'
  const filePath = ( req.url === '/' ) ? '/public/index.html' : req.url;

  // determine the contentType by the file extension
  const extname = path.extname(filePath);
  let contentType = 'text/html';
  if (extname === '.js') contentType = 'text/javascript';
  else if (extname === '.css') contentType = 'text/css';

  // pipe the proper file to the res object
  res.writeHead(200, { 'Content-Type': contentType });
  fs.createReadStream(`${__dirname}/${filePath}`, 'utf8').pipe(res);
});

///////////////////////////////////////////////
////////////////// WS LOGIC ///////////////////
///////////////////////////////////////////////

// Create the WebSocket Server (ws) using the HTTP server
const wsServer = new WebSocket.Server({ server });

// Define the websocket server 'connection' handler
wsServer.on('connection', (socket) => {
  console.log('A new client has joined the server');

  // Define the socket 'message' handler
  socket.on('message', (data) => {
    console.log(data);
    const { type, payload } = JSON.parse(data);

    // 'NEW_USER' => handleNewUser(socket)
    // 'PASS_POTATO' => passThePotatoTo(newPotatoHolderIndex)
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

///////////////////////////////////////////////
////////////// HELPER FUNCTIONS ///////////////
///////////////////////////////////////////////

// Implement the broadcast pattern
function broadcast(data, socketToOmit) {
    // Loop through all the clients
  wsServer.clients.forEach((connectedClient) => {
    // If the client is not the socketToOmit and has an open ready state, send the data
    if (connectedClient.readyState === WebSocket.OPEN && connectedClient !== socketToOmit) {
      connectedClient.send(JSON.stringify(data));
    }
  });
}

function handleNewUser(socket) {
  // Until there are 4 players in the game....
  if (nextPlayerIndex < 4) {
    // Send PLAYER_ASSIGNMENT to the socket with a clientPlayerIndex
    const message = {
      type: SERVER.MESSAGE.PLAYER_ASSIGNMENT,
      payload: { clientPlayerIndex: nextPlayerIndex }
    }
    socket.send(JSON.stringify(message))
    
    // Then, increment the number of players in the game
    nextPlayerIndex++;
    
    // If they are the 4th player, start the game
    if (nextPlayerIndex === 4) {  
      // Choose a random potato holder to start
      const randomFirstPotatoHolder = Math.floor(Math.random() * 4);
      passThePotatoTo(randomFirstPotatoHolder);
      
      // Start the timer ticking
      startTimer();
    }
  } 
    // If 4 players are already in the game...
    else {
    // Send GAME_FULL to the socket
    const message = {
      type: SERVER.MESSAGE.GAME_FULL
    }
    socket.send(JSON.stringify(message))
  }

}

function passThePotatoTo(newPotatoHolderIndex) {
  // Broadcast a NEW_POTATO_HOLDER message with the newPotatoHolderIndex
  broadcast({
    type: SERVER.BROADCAST.NEW_POTATO_HOLDER,
    payload: { newPotatoHolderIndex }
  })
}

function startTimer() {
  // Set the clock to start at MAX_TIME (30)
  let clockValue = MAX_TIME;
  
  // Start the clock ticking
  const interval = setInterval(() => {
    if (clockValue > 0) {
      // broadcast 'COUNTDOWN' with the clockValue
      broadcast({
        type: SERVER.BROADCAST.COUNTDOWN,
        payload: { clockValue }
      });

      // decrement until the clockValue reaches 0
      clockValue--;
    }

    // At 0...
    else {
      clearInterval(interval); // stop the timer
      nextPlayerIndex = 0; // reset the players index
      
      // Broadcast 'GAME_OVER'
      broadcast({
        type: SERVER.BROADCAST.GAME_OVER,
      });
   
    }
  }, 1000);
}

// Start the server listening on localhost:8080
server.listen(PORT, () => {
  console.log(`Listening on: http://localhost:${server.address().port}`);
});
