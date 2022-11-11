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

const option = {server: server};
const wsServer = new WebSocket.Server(option);
// Define the websocket server 'connection' handler
wsServer.on('connection', (socket) => {
  console.log('A new client has joined the server');
  // Define the socket 'message' handler
  socket.on('message', (data) => {
    const messageObject = JSON.parse(data);
    const type = messageObject.type;
    const payload = messageObject.payload;
    console.log(messageObject.type);
      // 'NEW_USER' => handleNewUser(socket)
      // 'PASS_POTATO' => passThePotatoTo(newPotatoHolderIndex)
    switch (type) {
      case CLIENT.MESSAGE.NEW_USER:
        handleNewUser(socket);
        break;
      case CLIENT.MESSAGE.PASS_POTATO:
        passThePotatoTo(payload.newPotatoHolderIndex);
        break;
      default:
        console.log('Server received an unknown message type');
        break;
    };
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
      connectedClient.send(
        JSON.stringify(data)
      );
    }
  });
}

function handleNewUser(socket) {
  // Until there are 4 players in the game....
  if (nextPlayerIndex < 4) {
    // Send PLAYER_ASSIGNMENT to the socket with a clientPlayerIndex
    socket.send(
      JSON.stringify({
        type: SERVER.MESSAGE.PLAYER_ASSIGNMENT,
        payload: { 
          clientPlayerIndex: nextPlayerIndex 
        }})
      );
    // Then, increment the number of players in the game
    nextPlayerIndex++;

    // If they are the 4th player, start the game
    if (nextPlayerIndex === 4) {
      // Choose a random potato holder to start
      const randomFirstPotatoHolder = Math.floor(Math.random() * 4);
      passThePotatoTo(randomFirstPotatoHolder);
      // Start the timer
      startTimer();
    }
  } 

  // If 4 players are already in the game...
  else {
    // Send GAME_FULL to the socket
    socket.send(
      JSON.stringify({
      type: SERVER.MESSAGE.GAME_FULL,
      payload: null
      })
    );
  }
}


function passThePotatoTo(newPotatoHolderIndex) {
  // Broadcast a NEW_POTATO_HOLDER message with the newPotatoHolderIndex
  const messageObject = {
    type: SERVER.BROADCAST.NEW_POTATO_HOLDER,
    payload: { newPotatoHolderIndex: newPotatoHolderIndex }
  };
  broadcast(messageObject);
}

function startTimer() {
  // Set the clock to start at MAX_TIME (30)
  let clockValue = MAX_TIME;
  
  // Start the clock ticking
  const interval = setInterval(() => {
    if (clockValue > 0) {
      // TODO: broadcast 'COUNTDOWN' with the clockValue
      

      // decrement until the clockValue reaches 0
      clockValue--;
    }

    // At 0...
    else {
      clearInterval(interval); // stop the timer
      nextPlayerIndex = 0; // reset the players index
      
      // TODO: Broadcast 'GAME_OVER'
   
    }
  }, 1000);
}

// Start the server listening on localhost:8080
server.listen(PORT, () => {
  console.log(`Listening on: http://localhost:${server.address().port}`);
});
