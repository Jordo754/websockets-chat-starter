const http = require('http');
const fs = require('fs');
const socketio = require('socket.io');

const port = process.env.PORT || process.env.NODE_PORT || 3000;

const index = fs.readFileSync(`${__dirname}/../client/client.html`);

const onRequest = (request, response) => {
  response.writeHead(200, { 'Content-Type': 'text/html' });
  response.write(index);
  response.end();
};

const app = http.createServer(onRequest).listen(port);

console.log(`Listening on 127.0.0.1: ${port}`);

// pass in the http server into socketio and grab the websocket server as io
const io = socketio(app);

// object to hold all of our connected users
const users = {};

const onJoined = (sock) => {
  const socket = sock;

  socket.on('join', (data) => {
    // check if user is already in room
    if (users[data.name]) {
      const joinMsg = {
        name: 'server',
        msg: `Name '${data.name}' is already in use. Please select a new name.`,
      };

      socket.name = data.name;
      socket.emit('msg', joinMsg);
    } 
    else {
      // message back to new user
      const joinMsg = {
        name: 'server',
        msg: `There are ${Object.keys(users).length} users online`,
      };

      socket.name = data.name;
      socket.emit('msg', joinMsg);

      socket.join('room1');

      // announcement to everyone in room
      const response = {
        name: 'server',
        msg: `${data.name} has joined the room.`,
      };
      socket.broadcast.to('room1').emit('msg', response);

      console.log(`${data.name} joined`);
      // success message back to new user
      socket.emit('msg', { name: 'server', msg: 'You joined the room' });
      users[data.name] = socket;
    }
  });
};

const onMsg = (sock) => {
  const socket = sock;

  socket.on('msgToServer', (data) => {
    io.sockets.in('room1').emit('msg', { name: socket.name, msg: data.msg });
  });
};

const onDisconnect = (sock) => {
  const socket = sock;
  
  socket.on('disconnect', (data) => {
    // message back to new user
    const leaveMsg = {
      name: 'server',
      msg: `There are ${Object.keys(users).length} users online`,
    };

    socket.name = data.name;
    socket.emit('msg', joinMsg);

    socket.join('room1');

    // announcement to everyone in room
    const response = {
      name: 'server',
      msg: `${data.name} has joined the room.`,
    };
    socket.broadcast.to('room1').emit('msg', response);

    console.log(`${data.name} joined`);
    // success message back to new user
    socket.emit('msg', { name: 'server', msg: 'You joined the room' });
    users[data.name] = socket;
  });
};

io.sockets.on('connection', (socket) => {
  console.log('started');

  onJoined(socket);
  onMsg(socket);
  onDisconnect(socket);
});

console.log('Websocket server started');