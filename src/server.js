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
const userColors = ['red', 'blue', 'green', 'orange', 'purple'];
let count = 0;

const onJoined = (sock) => {
  const socket = sock;

  socket.on('join', (data) => {
    // check if user is already in room
    if (users[data.name]) {
      const joinMsg = {
        name: 'Server',
        msg: `Name '${data.name}' is already in use. Please select a new name.`,
      };

      socket.emit('nameError', joinMsg);
    } else if (data.name === 'unknown') {
      const joinMsg = {
        name: 'Server',
        msg: 'Please enter a name.',
      };

      socket.emit('nameError', joinMsg);
    } else {
      // message back to new user
      const joinMsg = {
        name: 'Server',
        msg: `There are ${Object.keys(users).length} users online`,
      };

      socket.name = data.name;
      socket.color = userColors[count];
      count++;
      if (count > userColors.size) {
        count = 0;
      }
      socket.emit('msg', joinMsg);

      socket.join('room1');

      // announcement to everyone in room
      const response = {
        name: 'Server',
        msg: `/join ${data.name} has joined the room.`,
        color: socket.color,
      };
      socket.broadcast.to('room1').emit('msg', response);

      console.log(`${data.name} joined`);
      // success message back to new user
      socket.emit('msg', { name: 'Server', msg: 'You joined the room' });
      users[data.name] = socket;
    }
  });
};

const onMsg = (sock) => {
  const socket = sock;
  socket.on('msgToServer', (data) => {
    if (data.msg[0] === '/') {
      const commandString = data.msg.split(' ')[0];
      const messageString = data.msg.substring(data.msg.indexOf(' ') + 1);

      switch (commandString) {
        case '/me': {
          io.sockets.in('room1').emit('msg', { name: socket.name, msg: data.msg, color: socket.color });
          break;
        }
        case '/w': {
          const user = messageString.split(' ')[0];
          const pm = messageString.substring(messageString.indexOf(' ') + 1);
          if (users[user]) {
            // send back to user
            socket.emit('msg', { name: socket.name, msg: `${commandString} To ${user} ${pm}`, color: socket.color, recipColor: users[user].color });

            // send to recipient
            users[user].emit('msg', { name: socket.name, msg: `${commandString} From ${socket.name} ${pm}`, color: users[user].color, senderColor: socket.color });
          }
          break;
        }
        case '/join': {
          break;
        }
        default: {
          if (socket.name) {
            socket.emit('msg', { name: socket.name, msg: data.msg, color: socket.color });
          }
          break;
        }
      }
    } else {
      io.sockets.in('room1').emit('msg', { name: socket.name, msg: data.msg, color: socket.color });
    }
  });
};

const onDisconnect = (sock) => {
  const socket = sock;

  socket.on('disconnect', () => {
    // announcement to everyone in room
    if (socket.name) {
      const response = {
        name: 'Server',
        msg: `/leave ${socket.name} has left the room.`,
        color: socket.color,
      };
      socket.broadcast.to('room1').emit('msg', response);

      console.log(`${socket.name} left`);
      // success message back to new user
      socket.emit('msg', { name: 'Server', msg: 'You left the room' });
      delete users[socket.name];
    }
  });
};

io.sockets.on('connection', (socket) => {
  console.log('started');

  onJoined(socket);
  onMsg(socket);
  onDisconnect(socket);
});

console.log('Websocket server started');
