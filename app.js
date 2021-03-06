// ******************************************************************************* //
// app.js is the server code to be deployed on a server
// Use local.js to run localhost.
// ******************************************************************************* //

'use strict'

var express = require('express');
var app = express();
var server = require('http').createServer(app).listen(8080);
var io = require('socket.io').listen(server);
var path = require('path');
var fs = require('fs');
var connections = [];

// Place your turn config in a file on your server.
var credentials = fs.readFileSync('/etc/audiopeerturn/credentials.json', 'utf8');

// The default namespace is by default '/', but this variable is to use with numClientsInRoom
var defaultNamespace = '/';

console.log('Server running at port ' + '8080');

app.get('/', function(req, res) {
  res.sendFile(__dirname + '/index.html');
});

app.use('/js', express.static(path.join(__dirname, '/js')));
app.use('/styles', express.static(path.join(__dirname, '/styles')));
app.use('/media', express.static(path.join(__dirname, '/media')));

io.sockets.on('connection', function(socket) {
  connections.push(socket);
  console.log('Connected: %s sockets connected', connections.length);

  socket.emit('credentials', JSON.parse(credentials));

  // Convenience function to log server messages on the client (client listens to it on socket.on('log'))
  function log() {
    var array = ['Message from server: '];
    array.push.apply(array, arguments);
    socket.emit('log', array);
  }

  socket.on('message', function(message, room) {
    log('Client said: ', message);
    socket.broadcast.to(room).emit('message', message);
  });

  socket.on('disconnect', function(data) {
    connections.splice(connections.indexOf(socket), 1);
    console.log('Disconnected: %s sockets connected', connections.length);
  });

  socket.on('create or join', function(room) {
    // Total number of clients in the socket
    log('Received request to create or join room ' + room);
    var numClients = numClientsInRoom(defaultNamespace, room);
    console.log(numClients);

    if(numClients === 0) {
      socket.join(room);
      console.log(io.nsps[defaultNamespace].adapter.rooms[room].length);
      log('Client ID ' + socket.id + ' created room ' + room);
      socket.emit('created', room, socket.id);

    } else if(numClients === 1) {
      log('Client ID ' + socket.id + ' joined room ' + room);
      socket.join(room);
      socket.emit('joined', room, socket.id);
      console.log(io.nsps[defaultNamespace].adapter.rooms[room].length);
      io.sockets.in(room).emit('ready');

    } else {
      // Max two clients for now
      socket.emit('full', room);
    }

  });
});

/* Function to find out how many clients there are in a room
   Used to minimize each room to contain x clients */
function numClientsInRoom(namespace, room) {
  if(io.nsps[namespace].adapter.rooms[room] === undefined){
    console.log('Make room');
    return 0;
  }
  else{
    console.log('Join room: ', room);
    return io.nsps[namespace].adapter.rooms[room].length;
  }
}
