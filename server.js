const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
 
const app = express();
app.use(cors());
app.use(express.json());
 
// ─── Percorsi file persistenti ────────────────────────────────────────────────
const DATA_DIR    = path.join(__dirname, 'data');
const ROOMS_FILE  = path.join(DATA_DIR, 'rooms.json');
const TOKENS_FILE = path.join(DATA_DIR, 'tokens.json');
 
// Crea cartella data se non esiste
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
 
// Carica dati da file (o inizializza vuoti)
let rooms      = fs.existsSync(ROOMS_FILE)  ? JSON.parse(fs.readFileSync(ROOMS_FILE))  : {};
let pushTokens = fs.existsSync(TOKENS_FILE) ? JSON.parse(fs.readFileSync(TOKENS_FILE)) : {};
 
// Salva su file
const saveRooms  = () => fs.writeFileSync(ROOMS_FILE,  JSON.stringify(rooms));
const saveTokens = () => fs.writeFileSync(TOKENS_FILE, JSON.stringify(pushTokens));
 
// ─── Invia notifica push tramite Expo ─────────────────────────────────────────
async function sendPushNotification(token, title, body) {
  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
      },
      body: JSON.stringify({ to: token, sound: 'default', title, body, data: {} }),
    });
  } catch (err) {
    console.log('Errore invio push:', err.message);
  }
}
 
// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/', (req, res) => res.send('Server Things To Do attivo ✓'));
 
// ─── Registra token push ──────────────────────────────────────────────────────
app.post('/register-token/:roomCode', (req, res) => {
  const { roomCode } = req.params;
  const { token, deviceId } = req.body;
  if (!token || !deviceId) return res.status(400).json({ error: 'Token o deviceId mancante' });
 
  if (!pushTokens[roomCode]) pushTokens[roomCode] = [];
 
  const existing = pushTokens[roomCode].findIndex(t => t.deviceId === deviceId);
  if (existing >= 0) {
    pushTokens[roomCode][existing].token = token;
  } else {
    pushTokens[roomCode].push({ token, deviceId });
  }
 
  saveTokens(); // Salva su file
  console.log(`Token registrato nella stanza ${roomCode} — dispositivo ${deviceId}`);
  res.json({ ok: true });
});
 
// ─── Leggi note ───────────────────────────────────────────────────────────────
app.get('/notes/:roomCode', (req, res) => {
  const { roomCode } = req.params;
  res.json({ notes: rooms[roomCode] || null });
});
 
// ─── Salva note + invia notifiche push ────────────────────────────────────────
app.post('/notes/:roomCode', async (req, res) => {
  const { roomCode } = req.params;
  const { notes, deviceId, action, listTitle } = req.body;
  if (!notes) return res.status(400).json({ error: 'Nessuna nota' });
 
  rooms[roomCode] = notes;
  saveRooms(); // Salva su file
  console.log(`Note aggiornate nella stanza: ${roomCode} — action: ${action || 'n/a'}`);
 
  // Manda notifica solo per nuova lista o modifica
  if (action === 'new' || action === 'update') {
    if (pushTokens[roomCode] && pushTokens[roomCode].length > 0) {
      const others = pushTokens[roomCode].filter(t => t.deviceId !== deviceId);
      const title  = action === 'new' ? '📋 Nuova lista!' : '✏️ Lista aggiornata';
      const body   = listTitle ? `"${listTitle}"` : 'La lista condivisa è stata modificata';
      for (const { token } of others) {
        await sendPushNotification(token, title, body);
      }
    }
  }
 
  res.json({ ok: true });
});
 
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server in ascolto sulla porta ${PORT}`);
});
