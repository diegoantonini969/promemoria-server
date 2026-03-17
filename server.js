const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

// Memoria temporanea dei promemoria (cifrati, il server non li conosce)
// roomCode -> array di promemoria cifrati
const rooms = {};

io.on('connection', (socket) => {
  console.log('Nuovo dispositivo connesso:', socket.id);

  // Entra nella stanza con il codice segreto
  socket.on('join_room', (roomCode) => {
    socket.join(roomCode);
    console.log(`Dispositivo ${socket.id} entrato nella stanza: ${roomCode}`);

    // Invia i promemoria esistenti al nuovo dispositivo
    if (rooms[roomCode]) {
      socket.emit('sync_notes', rooms[roomCode]);
    }
  });

  // Riceve un aggiornamento dei promemoria e lo ridistribuisce
  socket.on('update_notes', ({ roomCode, notes }) => {
    rooms[roomCode] = notes; // Salva i dati cifrati
    // Manda a tutti gli altri nella stanza
    socket.to(roomCode).emit('sync_notes', notes);
    console.log(`Promemoria aggiornati nella stanza: ${roomCode}`);
  });

  socket.on('disconnect', () => {
    console.log('Dispositivo disconnesso:', socket.id);
  });
});

// Health check
app.get('/', (req, res) => res.send('Server Promemoria attivo ✓'));

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server in ascolto sulla porta ${PORT}`);
});
