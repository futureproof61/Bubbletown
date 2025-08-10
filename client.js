// BubbleTown client – isometrische weergave + Socket.IO
(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const dpi = Math.max(1, Math.min(2, window.devicePixelRatio || 1));

  const world = { cols: 12, rows: 12, tileW: 64, tileH: 32, camX: 0, camY: 0,
                  floorA: '#29324f', floorB:'#232a45' };

  let me = null;
  let players = [];
  let furniture = [];

  function resize() {
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.floor(rect.width * dpi);
    canvas.height = Math.floor(rect.height * dpi);
    ctx.setTransform(dpi,0,0,dpi,0,0);
    softCenter();
  }

  function isoToScreen(x, y) {
    const sx = (x - y) * (world.tileW/2) + (canvas.width/dpi)/2 + world.camX;
    const sy = (x + y) * (world.tileH/2) + 80 + world.camY;
    return {x:sx, y:sy};
  }

  function drawTile(x,y,fill) {
    const p = isoToScreen(x,y);
    const w = world.tileW, h = world.tileH;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + w/2, p.y + h/2);
    ctx.lineTo(p.x, p.y + h);
    ctx.lineTo(p.x - w/2, p.y + h/2);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
  }

  function shade(hex, pct){
    const n = parseInt(hex.replace('#',''),16);
    let r=(n>>16)&255, g=(n>>8)&255, b=n&255;
    r=Math.min(255,Math.max(0,Math.round(r*(100+pct)/100)));
    g=Math.min(255,Math.max(0,Math.round(g*(100+pct)/100)));
    b=Math.min(255,Math.max(0,Math.round(b*(100+pct)/100)));
    return '#' + ((1<<24)+(r<<16)+(g<<8)+b).toString(16).slice(1);
  }

  function drawBlock(x,y,h,color) {
    const p = isoToScreen(x,y), w = world.tileW, th = world.tileH, H = h*th;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y - H);
    ctx.lineTo(p.x + w/2, p.y + th/2 - H);
    ctx.lineTo(p.x, p.y + th - H);
    ctx.lineTo(p.x - w/2, p.y + th/2 - H);
    ctx.closePath();
    ctx.fillStyle = color; ctx.fill();
    ctx.beginPath();
    ctx.moveTo(p.x + w/2, p.y + th/2 - H);
    ctx.lineTo(p.x + w/2, p.y + th/2);
    ctx.lineTo(p.x, p.y + th);
    ctx.lineTo(p.x, p.y + th - H);
    ctx.closePath();
    ctx.fillStyle = shade(color,-18); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(p.x - w/2, p.y + th/2 - H);
    ctx.lineTo(p.x - w/2, p.y + th/2);
    ctx.lineTo(p.x, p.y + th);
    ctx.lineTo(p.x, p.y + th - H);
    ctx.closePath();
    ctx.fillStyle = shade(color,-28); ctx.fill();
  }

  function softCenter(){
    const meP = players.find(p => p.id === me?.id);
    if (!meP) return;
    const p = isoToScreen(meP.x, meP.y);
    const cx = canvas.width/dpi/2, cy = canvas.height/dpi/2 + 40;
    world.camX += (cx - p.x) * 0.2;
    world.camY += (cy - p.y) * 0.2;
  }

  // Input
  const keys = {};
  window.addEventListener('keydown', e => { keys[e.key]=true; if(e.key==='Enter') chatInput.focus(); });
  window.addEventListener('keyup', e => { keys[e.key]=false; });
  canvas.addEventListener('click', tapToMove, {passive:true});
  canvas.addEventListener('touchend', (e)=>{ e.preventDefault(); const t = e.changedTouches[0]; tapToMove(t); }, {passive:false});

  function tapToMove(e){
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width/canvas.clientWidth) / dpi;
    const y = (e.clientY - rect.top) * (canvas.height/canvas.clientHeight) / dpi;
    const cx = canvas.width/dpi/2 + world.camX;
    const rx = x - cx;
    const ry = y - (80 + world.camY);
    const isoX = Math.round((ry/world.tileH + rx/(world.tileW/2)) / 2);
    const isoY = Math.round((ry/world.tileH - rx/(world.tileW/2)) / 2);
    if (isoX>=0 && isoX<world.cols && isoY>=0 && isoY<world.rows) {
      socket.emit('moveTo', {x:isoX, y:isoY});
    }
  }

  function draw(){
    ctx.clearRect(0,0,canvas.width/dpi, canvas.height/dpi);
    // vloer
    for (let y=0; y<world.rows; y++)
      for (let x=0; x<world.cols; x++)
        drawTile(x,y, (x+y)%2===0?world.floorA:world.floorB);

    // meubels
    const items = furniture.slice().sort((a,b)=> a.y===b.y ? a.x-b.x : a.y-b.y);
    items.forEach(it=> drawBlock(it.x,it.y,it.h,it.color));

    // spelers (gesorteerd op y)
    const ps = players.slice().sort((a,b)=> a.y===b.y ? a.x-b.x : a.y-b.y);
    ps.forEach(p => {
      const s = isoToScreen(p.x, p.y);
      // schaduw
      ctx.beginPath(); ctx.ellipse(s.x, s.y + world.tileH*0.6, world.tileW*0.18, world.tileH*0.18, 0, 0, Math.PI*2); ctx.fillStyle='rgba(0,0,0,.35)'; ctx.fill();
      // body
      ctx.beginPath(); ctx.arc(s.x, s.y + 4, 14, 0, Math.PI*2); ctx.fillStyle=p.color; ctx.fill();
      // head
      ctx.beginPath(); ctx.arc(s.x, s.y - 12, 12, 0, Math.PI*2); ctx.fillStyle='#ffe6c4'; ctx.fill();
      // name
      ctx.font = '12px system-ui, sans-serif';
      ctx.textAlign = 'center'; ctx.fillStyle = '#cfd6ff';
      ctx.fillText(p.name, s.x, s.y - 26);
    });
  }

  // Chat UI
  const bubble = document.getElementById('bubble');
  const chatInput = document.getElementById('chatInput');
  const sendBtn = document.getElementById('sendBtn');
  function showBubbleFor(id, text){
    const p = players.find(p => p.id===id) || players.find(p => p.id===me?.id);
    if (!p) return;
    const s = isoToScreen(p.x, p.y);
    const rect = canvas.getBoundingClientRect();
    const bx = rect.left + (s.x * (canvas.clientWidth / canvas.width * dpi));
    const by = rect.top + (s.y * (canvas.clientHeight / canvas.height * dpi)) - 38;
    bubble.textContent = text;
    bubble.style.left = bx + 'px'; bubble.style.top = by + 'px';
    bubble.style.display = 'block';
    clearTimeout(showBubbleFor._t); showBubbleFor._t = setTimeout(()=> bubble.style.display='none', 2600);
  }
  function sendChat(){
    const msg = (chatInput.value||'').trim(); if(!msg) return;
    socket.emit('chat', msg); chatInput.value=''; chatInput.blur();
  }
  sendBtn.addEventListener('click', sendChat);
  chatInput.addEventListener('keydown', e => { if(e.key==='Enter'){ sendChat(); } e.stopPropagation(); });

  // Socket.io
  const socket = io({ transports: ['websocket'] });
  socket.on('hello', (payload)=> {
    me = payload.you;
    furniture = payload.furniture || [];
    players = payload.players || [];
    resize();
  });
  socket.on('state', (snap)=> { players = snap.players || []; });
  socket.on('chat', ({id, text}) => showBubbleFor(id, text));
  socket.on('system', ({text}) => showBubbleFor(null, text));

  // Loop
  function loop(){ draw(); requestAnimationFrame(loop); }
  window.addEventListener('resize', resize);
  resize(); loop();
})();
