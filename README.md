# BubbleTown (MVP – Multiplayer)
Een **legale** Habbo-achtige starter (geen Habbo-IP): isometrische kamer, lopen & chatten met meerdere spelers.  
Werkt op desktop én mobiel (Safari/Chrome).

## Snel starten (lokaal)
1. Installeer Node.js 18+ via https://nodejs.org/
2. Pak deze zip uit, open een terminal in de map en voer uit:
   ```bash
   npm install
   npm start
   ```
3. Open http://localhost:3000 in je browser.
4. Open hetzelfde adres op je telefoon (zelfde Wi‑Fi) om mee te doen:
   - Vind je IP (bijv. 192.168.1.12) en ga naar `http://192.168.1.12:3000` op mobiel.

## Online (Glitch of Replit – mobielvriendelijk)
- **Glitch**: New Project → Import from GitHub → importeer je repo met deze bestanden.  
- **Replit**: Create Repl (Node.js) → upload alle bestanden → Run → open de link.

## Wat zit erin
- **server.js** – Express + Socket.IO, simpele room met tick (15 Hz) en anti-spam op chat.
- **public/** – Canvas renderer (isometrische ruit-tegels), klik/tik lopen, naamlabels, speech bubble.
- **package.json** – scripts en dependencies.

## Roadmap om uit te breiden
- Accounts + database (PostgreSQL), kamerbeheer, meubels plaatsen/oppakken.
- Moderatie (mute/kick), chatfilter, anti-cheat.
- Schalen met meerdere instances + Redis pub/sub, sticky sessions.

⚠️ Gebruik je eigen graphics/naam; geen Habbo‑assets of merknaam.
