// Realm of Embers - multiplayer game server
// Serves the game page and runs shared co-op realms and the PvP arena.
const http = require("http");
const fs = require("fs");
const path = require("path");
const { WebSocketServer } = require("ws");
// Game data shared with the client (generated from index.html)
const CLASSES={
 warrior:{name:"Warrior",icon:"🛡️",color:"#c9a26b",free:true,desc:"A steel-clad berserker who wades into hordes and spins through them.",hp:225,mp:60,dmg:16,def:13,speed:158,crit:.08,leech:.06,
  atk:{type:"melee",range:78,arc:1.6,rate:.5},
  skills:[{id:"whirl",name:"Whirlwind",ic:"🌀",mp:16,cd:5,desc:"Spin for 1.4s, hitting everything around you"},
          {id:"leap",name:"Leap Slam",ic:"💥",mp:12,cd:6,desc:"Leap to the nearest enemy and stun the area"},
          {id:"cry",name:"War Cry",ic:"📯",mp:12,cd:12,desc:"+60% damage for 7s"}]},
 rogue:{name:"Rogue",icon:"🗡️",color:"#6bc98a",free:true,desc:"Fast and deadly. Fills the air with blades and vanishes in shadow.",hp:145,mp:80,dmg:12,def:6,speed:180,crit:.22,
  atk:{type:"ranged",rate:.36,speed:560,proj:"dagger"},
  skills:[{id:"fan",name:"Fan of Knives",ic:"✴️",mp:14,cd:3.5,desc:"Throw 14 knives in every direction"},
          {id:"dash",name:"Shadow Dash",ic:"💨",mp:8,cd:3,desc:"Dash forward, untouchable for a moment"},
          {id:"cloud",name:"Poison Cloud",ic:"☁️",mp:16,cd:7,desc:"Toxic cloud that melts enemies for 5s"}]},
 mage:{name:"Arcane Mage",icon:"🔮",color:"#7aa8ff",free:false,hash:"29tgn5m65uu",desc:"Rains fire and ice on everything in sight. Fragile, but explosive.",hp:120,mp:140,dmg:16,def:4,speed:165,crit:.1,
  atk:{type:"ranged",rate:.45,speed:600,proj:"spark"},
  skills:[{id:"fireball",name:"Fireball",ic:"🔥",mp:9,cd:1,desc:"Explosive fireball"},
          {id:"nova",name:"Frost Nova",ic:"❄️",mp:18,cd:6,desc:"Blast of ice that freezes nearby enemies"},
          {id:"meteor",name:"Meteor",ic:"☄️",mp:30,cd:9,desc:"Call down a meteor for massive damage"}]},
 necro:{name:"Necromancer",icon:"💀",color:"#9b7bd8",free:false,hash:"14hrce7bjf",desc:"Raises an army of skeletons and drains the life of the living.",hp:170,mp:120,dmg:14,def:8,speed:162,crit:.08,
  atk:{type:"ranged",rate:.45,speed:540,proj:"bone",pierce:1},
  skills:[{id:"raise",name:"Raise Skeleton",ic:"🦴",mp:20,cd:3,desc:"Summon a skeleton warrior (up to 5)"},
          {id:"drain",name:"Life Drain",ic:"🩸",mp:10,cd:1.4,desc:"Bolt that heals you for half its damage"},
          {id:"spear",name:"Bone Spear",ic:"🗡",mp:14,cd:2,desc:"Huge piercing spear of bone"}]},
 paladin:{name:"Paladin",icon:"⚜️",color:"#f0d878",free:false,hash:"118wffv5ep8",desc:"A holy knight with spinning hammers, healing light and a divine shield.",hp:215,mp:90,dmg:15,def:14,speed:158,crit:.08,leech:.05,
  atk:{type:"melee",range:76,arc:1.5,rate:.5},
  skills:[{id:"hammer",name:"Blessed Hammer",ic:"🔨",mp:12,cd:2.5,desc:"Hammers spiral around you for 3s"},
          {id:"light",name:"Holy Light",ic:"✨",mp:18,cd:8,desc:"Heal 35% HP and burn nearby enemies"},
          {id:"shield",name:"Divine Shield",ic:"🛡",mp:22,cd:16,desc:"Immune to damage for 3s"}]},
};
const REALMS=[
 {id:"woods",name:"Whispering Woods",icon:"🌲",lvl:1,ground:["#1c2a1a","#223321"],decor:["🌲","🌳","🍄","🪨"],story:"Wolves and goblins swarm the twisted forest.",
  foes:[{n:"Dire Wolf",i:"🐺",hp:34,dmg:7,spd:130,xp:9},{n:"Goblin",i:"👺",hp:40,dmg:8,spd:105,xp:10},{n:"Goblin Archer",i:"🏹",hp:28,dmg:6,spd:90,xp:11,ranged:true}],
  boss:{n:"Thornheart the Treant",i:"🌳",hp:900,dmg:16,spd:70,xp:300}},
 {id:"marsh",name:"Bone Marsh",icon:"🦴",lvl:4,ground:["#1e2421","#262c25"],decor:["🦴","🪦","🌿","💀"],story:"The dead crawl from the bog.",
  foes:[{n:"Skeleton",i:"💀",hp:70,dmg:12,spd:100,xp:18},{n:"Ghoul",i:"🧟",hp:95,dmg:14,spd:85,xp:20},{n:"Bog Witch",i:"🧙",hp:60,dmg:11,spd:85,xp:22,ranged:true}],
  boss:{n:"Morvath the Lich",i:"☠️",hp:1900,dmg:26,spd:75,xp:700}},
 {id:"peaks",name:"Ember Peaks",icon:"🌋",lvl:7,ground:["#2a1712","#331d15"],decor:["🔥","🪨","🌋","♨️"],story:"Fire demons pour from the burning mountain.",
  foes:[{n:"Fire Imp",i:"😈",hp:120,dmg:18,spd:125,xp:30},{n:"Magma Golem",i:"🗿",hp:210,dmg:22,spd:70,xp:36},{n:"Flame Caster",i:"👹",hp:110,dmg:17,spd:85,xp:34,ranged:true}],
  boss:{n:"Ignarax the Cinder Wyrm",i:"🐉",hp:3600,dmg:38,spd:85,xp:1400}},
 {id:"spire",name:"Frozen Spire",icon:"🏔️",lvl:10,ground:["#1a2330","#202b3a"],decor:["❄️","🧊","🏔️","🌨️"],story:"Frost giants and wraiths guard the black ice tower.",
  foes:[{n:"Ice Wraith",i:"👻",hp:190,dmg:26,spd:120,xp:46},{n:"Frost Giant",i:"🧊",hp:330,dmg:32,spd:72,xp:55},{n:"Yeti",i:"🦍",hp:250,dmg:29,spd:105,xp:50}],
  boss:{n:"Queen Sylvara",i:"👸",hp:6000,dmg:50,spd:90,xp:2400}},
 {id:"citadel",name:"Shadow Citadel",icon:"🏰",lvl:13,ground:["#16121c","#1d1726"],decor:["🕯️","⛓️","🦇","🗝️"],story:"The Ember King's fortress. End this.",
  foes:[{n:"Shadow Knight",i:"🦹",hp:300,dmg:36,spd:105,xp:70},{n:"Void Eye",i:"👁️",hp:260,dmg:33,spd:90,xp:72,ranged:true},{n:"Death Knight",i:"⚔️",hp:380,dmg:40,spd:95,xp:80}],
  boss:{n:"The Ember King",i:"👑",hp:10000,dmg:64,spd:95,xp:5000,final:true}},
];
const KILLS_FOR_BOSS=100;
const EHP_T=[2.2,2.1,1.85,1.6,1.4],EDMG_T=[1.7,1.55,1.35,1.15,1.0],BHP_T=[1.6,1.5,1.35,1.2,1.1];
const RARITY=[{n:"Common",m:1,c:"#dddddd"},{n:"Magic",m:1.35,c:"#6fa8ff"},{n:"Rare",m:1.75,c:"#ffe066"},{n:"Legendary",m:2.4,c:"#e8a040"}];
const PREFIX=["Cruel","Blazing","Savage","Holy","Grim","Vicious","Ancient","Storm","Shadow","Frozen"];
const SUFFIX=["of the Bear","of Slaughter","of the Phoenix","of Ruin","of the Titan","of Embers","of the Void","of Kings"];
const WEAP={warrior:["Sword","Axe","Greatsword"],rogue:["Dagger","Kris","Blade"],mage:["Staff","Wand","Orb"],necro:["Wand","Scythe","Bone Staff"],paladin:["Mace","Hammer","Flail"]};
const ARMOR=["Mail","Plate","Robe","Hauberk","Cuirass"];
const D={CLASSES,REALMS,KILLS_FOR_BOSS,EHP_T,EDMG_T,BHP_T,RARITY,PREFIX,SUFFIX,WEAP,ARMOR};


const PORT = process.env.PORT || 8080;
const TICK = 1 / 30, SNAP_EVERY = 3; // 30 updates/s, 10 snapshots/s
const COOP_MAX = 6, ARENA_MAX = 10;
const W = 2600, H = 2600, AW = 1500, AH = 1500;
const PVP_SCALE = 0.4;

const rnd = (a, b) => a + Math.random() * (b - a), clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const r1 = (v) => Math.round(v), r2 = (v) => Math.round(v * 100) / 100;

// ---------------- static files ----------------
const PUB = fs.existsSync(path.join(__dirname, "public")) ? path.join(__dirname, "public") : __dirname;
const ALLOWED = new Set(["/index.html", "/sw.js", "/manifest.webmanifest", "/icon-192.png", "/icon-512.png", "/icon-maskable-512.png", "/apple-touch-icon.png"]);
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".png": "image/png", ".webmanifest": "application/manifest+json", ".json": "application/json", ".txt": "text/plain" };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent((req.url || "/").split("?")[0]);
  if (p === "/health") { res.writeHead(200, { "content-type": "text/plain" }); return res.end("ok " + stats()); }
  if (p === "/") p = "/index.html";
  if (!ALLOWED.has(p)) { res.writeHead(404); return res.end("not found"); }
  const f = path.normalize(path.join(PUB, p));
  if (!f.startsWith(PUB)) { res.writeHead(403); return res.end(); }
  fs.readFile(f, (err, buf) => {
    if (err) { res.writeHead(404); return res.end("not found"); }
    res.writeHead(200, { "content-type": TYPES[path.extname(f)] || "application/octet-stream", "cache-control": p.endsWith(".html") || p.endsWith("sw.js") ? "no-cache" : "public, max-age=3600" });
    res.end(buf);
  });
});

// ---------------- rooms ----------------
const rooms = new Map(); let nextRoom = 1, nextId = 1;
function stats() { let n = 0; for (const r of rooms.values()) n += r.players.size; return `${rooms.size} rooms, ${n} players`; }

function makeRoom(mode, ri) {
  const id = "r" + nextRoom++;
  const room = { id, mode, ri, players: new Map(), enemies: [], proj: [], eproj: [], zones: [], minions: [], drops: [], events: [], t: 0, tick: 0,
    kills: 0, boss: null, bossSpawned: false, resetT: 0, spawnT: 0, nextE: 1, nextD: 1, w: mode === "arena" ? AW : W, h: mode === "arena" ? AH : H };
  rooms.set(id, room); return room;
}
function findRoom(mode, ri) {
  for (const r of rooms.values()) if (r.mode === mode && (mode === "arena" || r.ri === ri) && r.players.size < (mode === "arena" ? ARENA_MAX : COOP_MAX)) return r;
  return makeRoom(mode, ri);
}
function alive(room) { return [...room.players.values()].filter((p) => !p.dead); }
function ev(room, e) { if (room.events.length < 120) room.events.push(e); }
function send(p, m) { if (p.ws.readyState === 1) p.ws.send(JSON.stringify(m)); }
function broadcast(room, m) { const s = JSON.stringify(m); for (const p of room.players.values()) if (p.ws.readyState === 1) p.ws.send(s); }

function cleanStats(st, cls) {
  const c = CLASSES[cls];
  const n = (v, lo, hi, d) => (typeof v === "number" && isFinite(v) ? clamp(v, lo, hi) : d);
  return { maxHp: n(st && st.maxHp, 50, 20000, c.hp), maxMp: n(st && st.maxMp, 20, 5000, c.mp), dmg: n(st && st.dmg, 1, 3000, c.dmg), def: n(st && st.def, 0, 2000, c.def),
    crit: n(st && st.crit, 0, 0.75, c.crit), leech: n(st && st.leech, 0, 0.3, 0), speed: c.speed };
}
function spawnPoint(room) { if (room.mode === "arena") return { x: rnd(150, room.w - 150), y: rnd(150, room.h - 150) }; return { x: room.w / 2 + rnd(-80, 80), y: room.h / 2 + rnd(-80, 80) }; }

function addPlayer(ws, msg) {
  const cls = CLASSES[msg.cls] ? msg.cls : "warrior";
  const mode = msg.mode === "arena" ? "arena" : "coop";
  const ri = clamp(Math.floor(+msg.ri || 0), 0, REALMS.length - 1);
  const room = findRoom(mode, ri);
  const st = cleanStats(msg.st, cls);
  const sp = spawnPoint(room);
  const name = String(msg.name || "Hero").replace(/[^\w \-]/g, "").trim().slice(0, 14) || "Hero";
  const p = { id: nextId++, ws, room, name, cls, lvl: clamp(Math.floor(+msg.lvl || 1), 1, 200), st, x: sp.x, y: sp.y, r: 18, hp: st.maxHp, mp: st.maxMp, face: 0,
    input: { mx: 0, my: 0, atk: false }, atkT: 0, swingT: 0, castT: 0, cds: {}, buffs: {}, inv: 1.5, whirl: 0, whirlTick: 0, dash: 0, dvx: 0, dvy: 0, potT: 0,
    dead: false, respawnT: 0, moving: false, kills: 0, deaths: 0, lastHitBy: null, msgs: 0, msgT: 0 };
  room.players.set(p.id, p);
  send(p, { t: "welcome", id: p.id, room: room.id, mode, ri, w: room.w, h: room.h });
  broadcast(room, { t: "msg", text: `${p.name} joined` });
  return p;
}
function removePlayer(p) {
  const room = p.room; if (!room) return;
  room.players.delete(p.id);
  room.minions = room.minions.filter((m) => m.owner !== p.id);
  room.drops = room.drops.filter((d) => d.owner !== p.id);
  if (room.players.size === 0) rooms.delete(room.id); else broadcast(room, { t: "msg", text: `${p.name} left` });
  p.room = null;
}

// ---------------- items ----------------
function makeItem(cls, ri, boss) {
  const x = Math.random(); const rar = boss ? (x < 0.35 ? 3 : 2) : x < 0.02 ? 3 : x < 0.1 ? 2 : x < 0.35 ? 1 : 0; const R = RARITY[rar];
  const ilvl = REALMS[ri].lvl + Math.floor(rnd(0, 3)); const isW = Math.random() < 0.5;
  const it = { rar, slot: isW ? "weapon" : "armor" };
  const base = isW ? WEAP[cls][Math.floor(Math.random() * 3)] : ARMOR[Math.floor(Math.random() * ARMOR.length)];
  let name = base; if (rar >= 1) name = PREFIX[Math.floor(Math.random() * PREFIX.length)] + " " + name; if (rar >= 2) name += " " + SUFFIX[Math.floor(Math.random() * SUFFIX.length)];
  it.name = name;
  if (isW) { it.dmg = Math.round((3 + ilvl * 1.5) * R.m * rnd(0.85, 1.15)); if (rar >= 1 && Math.random() < 0.6) it.crit = +(0.03 * rar).toFixed(2); if (rar >= 2) it.leech = +(0.02 * rar).toFixed(2); if (rar >= 1 && Math.random() < 0.5) it.mp = 8 * rar; }
  else { it.def = Math.round((2 + ilvl * 1.1) * R.m * rnd(0.85, 1.15)); it.hp = Math.round((10 + ilvl * 7) * R.m * rnd(0.85, 1.15)); }
  it.power = isW ? it.dmg * (1 + (it.crit || 0) * 2 + (it.leech || 0) * 3) : it.def * 3 + it.hp * 0.4;
  it.value = Math.round(it.power * (1 + rar) * 1.2);
  return it;
}

// ---------------- enemies ----------------
const KEYMAP = { "Dire Wolf": "wolf", Goblin: "goblin", "Goblin Archer": "archer", Skeleton: "skeleton", Ghoul: "ghoul", "Bog Witch": "witch", "Fire Imp": "imp", "Magma Golem": "golem", "Flame Caster": "caster", "Ice Wraith": "wraith", "Frost Giant": "giant", Yeti: "yeti", "Shadow Knight": "sknight", "Void Eye": "eye", "Death Knight": "dknight",
  "Thornheart the Treant": "treant", "Morvath the Lich": "lich", "Ignarax the Cinder Wyrm": "dragon", "Queen Sylvara": "queen", "The Ember King": "king" };
function spawnEnemy(room, boss) {
  const ps = alive(room); if (!ps.length) return;
  const near = ps[Math.floor(Math.random() * ps.length)];
  const r = REALMS[room.ri], n = room.players.size;
  const avgLvl = ps.reduce((s, p) => s + p.lvl, 0) / ps.length;
  const lvBonus = 1 + Math.max(0, avgLvl - r.lvl) * 0.05;
  const a = Math.random() * Math.PI * 2, d = boss ? 380 : rnd(480, 700);
  const x = clamp(near.x + Math.cos(a) * d, 40, room.w - 40), y = clamp(near.y + Math.sin(a) * d, 40, room.h - 40);
  const b = boss ? r.boss : r.foes[Math.floor(Math.random() * r.foes.length)];
  const elite = !boss && Math.random() < 0.06;
  const party = boss ? 1 + 0.7 * (n - 1) : 1 + 0.25 * (n - 1);
  const hp = b.hp * lvBonus * (elite ? 3 : 1) * (boss ? BHP_T[room.ri] : EHP_T[room.ri]) * party;
  const e = { id: room.nextE++, x, y, r: boss ? 46 : elite ? 24 : 17, n: (elite ? "Elite " : "") + b.n, k: KEYMAP[b.n] || "goblin", hp, maxHp: hp, dmg: b.dmg * lvBonus * (elite ? 1.4 : 1) * EDMG_T[room.ri], spd: b.spd, xp: b.xp * (elite ? 3 : 1),
    ranged: !!b.ranged, boss: !!boss, elite, final: !!b.final, atkT: rnd(0, 1), frozen: 0, stun: 0, poison: 0, hitT: 0, lungeT: 0, mvT: 0, phaseT: 0, summonT: 0 };
  room.enemies.push(e); if (boss) room.boss = e;
}

// ---------------- combat ----------------
function targetsFor(room, p) { // what player p can hit
  if (room.mode === "arena") return [...room.players.values()].filter((q) => q !== p && !q.dead);
  return room.enemies.filter((e) => e.hp > 0);
}
function nearestTarget(room, p, range) { let best = null, bd = range || 1e9; for (const t of targetsFor(room, p)) { const d = dist(t, p); if (d < bd) { bd = d; best = t; } } return best; }
function aim(room, p, range) { const t = nearestTarget(room, p, range || 650); if (t) p.face = Math.atan2(t.y - p.y, t.x - p.x); return p.face; }
function rollDmg(p, mult) { let d = p.st.dmg * mult * rnd(0.9, 1.1); if (p.buffs.cry > 0) d *= 1.6; const crit = Math.random() < p.st.crit; if (crit) d *= 1.9; return { d, crit }; }
function healP(p, n) { const b = p.hp; p.hp = Math.min(p.st.maxHp, p.hp + n); return p.hp - b; }

function hit(room, p, t, mult, opt = {}) { // p hits target t (enemy or player)
  if (!t || (t.hp !== undefined && t.hp <= 0) || t.dead) return 0;
  if (t.ws) return hitPlayer(room, p, t, mult, opt);
  const { d: raw, crit } = rollDmg(p, mult); const d = Math.round(raw);
  t.hp -= d; t.hitT = 0.12; t.lastHit = p.id;
  ev(room, ["h", r1(t.x), r1(t.y - t.r), d, crit ? 1 : 0, t.k, opt.minion ? 1 : 0]);
  if (p.st.leech && !opt.minion) healP(p, d * p.st.leech);
  if (opt.heal) healP(p, d * opt.heal);
  if (opt.stun) t.stun = Math.max(t.stun, t.boss ? opt.stun * 0.3 : opt.stun);
  if (opt.freeze) t.frozen = Math.max(t.frozen, t.boss ? opt.freeze * 0.3 : opt.freeze);
  if (opt.kb && !t.boss) { const a = Math.atan2(t.y - p.y, t.x - p.x); t.x += Math.cos(a) * opt.kb; t.y += Math.sin(a) * opt.kb; }
  if (t.hp <= 0) killEnemy(room, t);
  return d;
}
function hitPlayer(room, p, v, mult, opt) {
  if (v.inv > 0 || v.buffs.shield > 0 || v.dead) return 0;
  const { d: raw, crit } = rollDmg(p, mult);
  const d = Math.max(1, Math.round(raw * PVP_SCALE - v.st.def * 0.55));
  v.hp -= d; v.lastHitBy = p.id;
  ev(room, ["hp", r1(v.x), r1(v.y - 26), d, crit ? 1 : 0, v.id]);
  if (p.st.leech && !opt.minion) healP(p, d * p.st.leech);
  if (opt.heal) healP(p, d * opt.heal);
  if (opt.stun) v.stunT = Math.max(v.stunT || 0, opt.stun * 0.3);
  if (v.hp <= 0) killPlayer(room, v, p);
  return d;
}
function hurtByEnemy(room, v, n) {
  if (v.inv > 0 || v.buffs.shield > 0 || v.dead) return;
  const d = Math.max(1, Math.round(n * rnd(0.9, 1.1) - v.st.def * 0.55)); v.hp -= d;
  ev(room, ["hp", r1(v.x), r1(v.y - 26), d, 0, v.id]);
  if (v.hp <= 0) killPlayer(room, v, null);
}
function killPlayer(room, v, killer) {
  v.hp = 0; v.dead = true; v.respawnT = room.mode === "arena" ? 3 : 6; v.deaths++; v.whirl = 0;
  room.minions = room.minions.filter((m) => m.owner !== v.id);
  ev(room, ["pd", r1(v.x), r1(v.y), v.id]);
  send(v, { t: "died", by: killer ? killer.name : null, respawn: v.respawnT });
  if (killer && room.mode === "arena") { killer.kills++; broadcast(room, { t: "kf", a: killer.name, b: v.name }); send(killer, { t: "gold", n: 25 + v.lvl * 5 }); }
  else if (room.mode === "arena") broadcast(room, { t: "kf", a: null, b: v.name });
}
function aoe(room, p, x, y, rad, mult, opt) { for (const t of targetsFor(room, p)) if (Math.hypot(t.x - x, t.y - y) < rad + (t.r || 18)) hit(room, p, t, mult, opt); }

function killEnemy(room, e) {
  room.kills++;
  ev(room, ["k", r1(e.x), r1(e.y), e.k, e.boss ? 1 : 0, e.id]);
  const t = room.ri;
  for (const p of room.players.values()) {
    if (p.dead || dist(p, e) > 1400) continue;
    send(p, { t: "xp", n: Math.round(e.xp) });
    const own = (o) => room.drops.push(Object.assign({ id: room.nextD++, owner: p.id, x: e.x + rnd(-16, 16), y: e.y + rnd(-16, 16), life: 90 }, o));
    if (Math.random() < 0.55 || e.boss) own({ type: "gold", v: Math.round((4 + t * 7) * rnd(0.6, 1.4) * (e.elite ? 3 : 1) * (e.boss ? 25 : 1)) });
    if (Math.random() < (e.elite ? 0.5 : 0.07)) own({ type: Math.random() < 0.6 ? "hp" : "mp" });
    if (Math.random() < (e.boss ? 1 : e.elite ? 0.6 : 0.09)) own({ type: "item", it: makeItem(p.cls, t, e.boss) });
    if (e.boss) for (let i = 0; i < 2; i++) own({ type: "item", it: makeItem(p.cls, t, true) });
  }
  if (e.boss) { room.boss = null; room.resetT = 10; broadcast(room, { t: "clear", ri: room.ri, final: !!e.final }); }
}

// ---------------- player actions ----------------
function shoot(room, p, ang, o) { room.proj.push(Object.assign({ x: p.x, y: p.y, vx: Math.cos(ang) * o.speed, vy: Math.sin(ang) * o.speed, life: o.life || 1.3, r: o.r || 6, mult: o.mult || 1, pierce: o.pierce || 0, hit: new Set(), owner: p.id }, o)); }
function basicAttack(room, p) {
  const A = CLASSES[p.cls].atk; if (p.atkT > 0 || p.whirl > 0) return;
  p.atkT = A.rate; const ang = aim(room, p);
  if (A.type === "melee") {
    p.swingT = 0.26;
    for (const t of targetsFor(room, p)) { const d = dist(t, p), tr = t.r || 18; if (d > A.range + tr) continue; const da = Math.abs(((Math.atan2(t.y - p.y, t.x - p.x) - ang) + Math.PI * 3) % (Math.PI * 2) - Math.PI); if (da < A.arc / 2 || d < tr + p.r + 6) hit(room, p, t, 1, { kb: 8 }); }
    ev(room, ["sl", r1(p.x), r1(p.y - 6), r2(ang), A.range, r2(A.arc + 0.4), p.cls === "paladin" ? 1 : 0]);
  } else { p.castT = 0.15; shoot(room, p, ang, { speed: A.speed, kind: A.proj, pierce: A.pierce || 0, mult: 1, r: 7 }); }
}
function useSkill(room, p, i) {
  const sk = CLASSES[p.cls].skills[i]; if (!sk || (p.cds[sk.id] || 0) > 0 || p.mp < sk.mp || p.dead) return;
  p.mp -= sk.mp; p.cds[sk.id] = sk.cd; const ang = aim(room, p); const X = r1(p.x), Y = r1(p.y);
  switch (sk.id) {
    case "whirl": p.whirl = 1.4; p.whirlTick = 0; break;
    case "leap": { ev(room, ["sm", X, Y]); const t = nearestTarget(room, p, 420); if (t) { p.x = t.x - Math.cos(ang) * ((t.r || 18) + 20); p.y = t.y - Math.sin(ang) * ((t.r || 18) + 20); } ev(room, ["leap", r1(p.x), r1(p.y)]); aoe(room, p, p.x, p.y, 130, 2.0, { stun: 1.5, kb: 30 }); p.swingT = 0.3; break; }
    case "cry": p.buffs.cry = 7; ev(room, ["cry", X, Y]); break;
    case "fan": ev(room, [
