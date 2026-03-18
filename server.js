const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Memoria cifrata per stanza
const rooms = {};

// Health check
app.get('/', (req, res) => res.send('Server Things To Do attivo ✓'));

// Leggi le note di una stanza
app.get('/notes/:roomCode', (req, res) => {
  const { roomCode } = req.params;
  if (rooms[roomCode]) {
    res.json({ notes: rooms[roomCode] });
  } else {
    res.json({ notes: null });
  }
});

// Salva/aggiorna le note di una stanza
app.post('/notes/:roomCode', (req, res) => {
  const { roomCode } = req.params;
  const { notes } = req.body;
  if (!notes) return res.status(400).json({ error: 'Nessuna nota' });
  rooms[roomCode] = notes;
  console.log(`Note aggiornate nella stanza: ${roomCode}`);
  res.json({ ok: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server in ascolto sulla porta ${PORT}`);
});
