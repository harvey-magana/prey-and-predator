'use strict';

// Original 8x8 rules and chase algorithm are deliberately retained.
const canvas = document.getElementById('gameBoard');
const ctx = canvas.getContext('2d');
const GRID = 8;
const TILE = canvas.width / GRID;
const TOTAL_ROUNDS = 5;
const MOVE_DURATION = 320;
const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)');
const statusEl = document.getElementById('status');
const roundEl = document.getElementById('round');
const preyScoreEl = document.getElementById('preyScore');
const predatorScoreEl = document.getElementById('predatorScore');
const soundBtn = document.getElementById('soundBtn');

let round = 1, preyWins = 0, predatorWins = 0, gameFinished = false;
let prey, predator, hole, animation = null, roundTimer = null, locked = false;
let rafId = 0, audioContext = null, soundEnabled = false, generation = 0;

const randPos = () => ({x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID)});
const same = (a, b) => a.x === b.x && a.y === b.y;
const distance = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
const mix = (a, b, t) => a + (b - a) * t;
const ease = t => 1 - Math.pow(1 - t, 3);
const drawText = (msg) => { statusEl.textContent = msg; };
const updateHUD = () => { roundEl.textContent = `${round} / ${TOTAL_ROUNDS}`; preyScoreEl.textContent = preyWins; predatorScoreEl.textContent = predatorWins; };

function setupRound() {
  // As in the original, all three positions are distinct and fox/mole spawn >=4 Manhattan units apart.
  do { prey = randPos(); predator = randPos(); hole = randPos(); }
  while (same(prey, predator) || same(prey, hole) || same(predator, hole) || distance(prey, predator) < 4);
  locked = false;
  animation = null;
  updateHUD();
  draw();
}

function drawGrid() {
  ctx.fillStyle = '#8a8176'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (let y = 0; y < GRID; y++) for (let x = 0; x < GRID; x++) {
    const px = x * TILE, py = y * TILE;
    ctx.fillStyle = (x + y) % 2 ? '#c0b7a7' : '#ded5c4';
    ctx.fillRect(px + 3, py + 3, TILE - 6, TILE - 6);
    ctx.fillStyle = '#ffffff25'; ctx.fillRect(px + 5, py + 5, TILE - 10, 3);
    ctx.fillStyle = '#413c3619'; ctx.fillRect(px + 5, py + TILE - 9, TILE - 10, 4);
  }
}
function drawHole() {
  const px = hole.x * TILE + TILE/2, py = hole.y * TILE + TILE/2;
  ctx.save();ctx.shadowColor = '#000';ctx.shadowBlur = 12;
  ctx.fillStyle = '#0a0d12';ctx.fillRect(px-27,py-27,54,54);
  ctx.shadowBlur = 0;ctx.strokeStyle = '#3c403d';ctx.lineWidth = 3;ctx.strokeRect(px-27,py-27,54,54);
  ctx.restore();
}
function roundRect(x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r);}
function drawPiece(p, role, rocking = 0) {
  const centerX = (p.x + .5) * TILE, centerY = (p.y + .5) * TILE;
  const isFox = role === 'fox';
  ctx.save();ctx.translate(centerX,centerY);
  ctx.shadowColor = '#18130d88';ctx.shadowBlur = 8;ctx.shadowOffsetY = 4;
  const bg = ctx.createLinearGradient(-29,-29,30,31);
  bg.addColorStop(0, isFox ? '#f05752' : '#a9784c');
  bg.addColorStop(1, isFox ? '#8a202c' : '#59402e');
  ctx.fillStyle = bg;roundRect(-31,-31,62,62,9);ctx.fill();
  ctx.shadowColor = 'transparent';ctx.shadowBlur = 0;ctx.shadowOffsetY = 0;
  ctx.strokeStyle = '#fff7';ctx.lineWidth = 1.2;ctx.stroke();
  // Multi-layer glass lens with specular glint and a moving shimmer.
  ctx.beginPath();ctx.arc(0,0,26,0,Math.PI*2);
  const glass = ctx.createRadialGradient(-10,-14,2,0,0,31);
  glass.addColorStop(0,'#ffffffd9');glass.addColorStop(.35,'#d7f1f0ae');
  glass.addColorStop(.74,'#7fa4b8a6');glass.addColorStop(1,'#25475bdf');
  ctx.fillStyle=glass;ctx.fill();ctx.lineWidth=2;ctx.strokeStyle='#f7ffffdd';ctx.stroke();
  ctx.save();ctx.beginPath();ctx.arc(0,0,24,0,Math.PI*2);ctx.clip();
  ctx.translate(0,0);ctx.rotate(rocking);
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='36px "Apple Color Emoji","Segoe UI Emoji",sans-serif';
  if (isFox) {
    ctx.fillText('🦊',0,2);
  } else {
    // Original vector mole face: rounded snout, tiny eyes, pink nose and forepaws.
    ctx.fillStyle='#71574b';ctx.beginPath();ctx.ellipse(0,2,18,16,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#8a6e5e';ctx.beginPath();ctx.arc(-14,-6,7,0,Math.PI*2);ctx.arc(14,-6,7,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#d7b4a1';ctx.beginPath();ctx.ellipse(0,8,12,10,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#241e1c';ctx.beginPath();ctx.arc(-7,-2,2.5,0,Math.PI*2);ctx.arc(7,-2,2.5,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#e49ba4';ctx.beginPath();ctx.ellipse(0,6,5,3.5,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#aa8371';ctx.beginPath();ctx.ellipse(-17,15,7,4,-.4,0,Math.PI*2);ctx.ellipse(17,15,7,4,.4,0,Math.PI*2);ctx.fill();
  }
  ctx.restore();
  ctx.beginPath();ctx.ellipse(-9,-13,11,5,-Math.PI/4,0,Math.PI*2);ctx.fillStyle='#ffffffa0';ctx.fill();
  ctx.beginPath();ctx.arc(0,0,21,Math.PI*.15,Math.PI*.75);ctx.strokeStyle='#ffffff4c';ctx.lineWidth=2;ctx.stroke();
  ctx.restore();
}
function drawFrame(preyPos = prey, foxPos = predator, preyRock = 0, foxRock = 0) {
  ctx.clearRect(0,0,canvas.width,canvas.height);
  drawGrid();drawHole();drawPiece(foxPos,'fox',foxRock);drawPiece(preyPos,'prey',preyRock);
}
function draw(){drawFrame();}

function positionAt(from,to,t) {return {x:mix(from.x,to.x,t),y:mix(from.y,to.y,t)};}
function animateMove(oldPrey,newPrey,oldFox,newFox,onEnd) {
  if (REDUCED_MOTION.matches) {draw();onEnd();return;}
  const token = generation;
  const start = performance.now();
  function frame(now) {
    if (generation !== token) return;
    const progress = Math.min(1,(now-start)/MOVE_DURATION), v = ease(progress);
    const preyRock = Math.sign(newPrey.x-oldPrey.x) * Math.sin(progress*Math.PI*2) * .13;
    const foxRock = Math.sign(newFox.x-oldFox.x) * Math.sin(progress*Math.PI*2) * .13;
    drawFrame(positionAt(oldPrey,newPrey,v),positionAt(oldFox,newFox,v),preyRock,foxRock);
    if (progress < 1) rafId=requestAnimationFrame(frame);
    else {rafId=0;draw();onEnd();}
  }
  rafId=requestAnimationFrame(frame);
}

function movePredator() {
  const dx=prey.x-predator.x,dy=prey.y-predator.y;
  if (Math.abs(dx)>=Math.abs(dy)) predator.x+=Math.sign(dx)*Math.min(2,Math.abs(dx));
  else predator.y+=Math.sign(dy)*Math.min(2,Math.abs(dy));
  predator.x=Math.max(0,Math.min(GRID-1,predator.x));
  predator.y=Math.max(0,Math.min(GRID-1,predator.y));
}
function movePrey(x,y) {
  if (locked || gameFinished || !Number.isInteger(x) || !Number.isInteger(y) || x<0 || y<0 || x>=GRID || y>=GRID) return;
  const dx=Math.abs(x-prey.x),dy=Math.abs(y-prey.y);
  if (dx>1 || dy>1 || (dx===0 && dy===0)) return;
  locked=true;
  const oldPrey={...prey},oldFox={...predator};
  prey={x,y};
  const escaped=same(prey,hole);
  if (!escaped) movePredator();
  const caught=!escaped && same(prey,predator);
  playScrape();
  animateMove(oldPrey,prey,oldFox,predator,() => {
    if (escaped) finishRound('prey');
    else if (caught) finishRound('predator');
    else locked=false;
  });
}
function finishRound(winner) {
  if (winner==='prey') {preyWins++;drawText('The mole escaped into the hole!');}
  else {predatorWins++;drawText('The fox caught the mole!');}
  updateHUD();
  if (round>=TOTAL_ROUNDS) {
    gameFinished=true;
    drawText(preyWins>predatorWins?'🏆 THE MOLE WINS THE MATCH!':'🏆 THE FOX WINS THE MATCH!');
    return;
  }
  round++;
  roundTimer=setTimeout(()=>{roundTimer=null;drawText('Find the black hole. Stay clear of the fox.');setupRound();},1150);
}
function restartMatch() {
  generation++;
  if(rafId)cancelAnimationFrame(rafId);
  if(roundTimer!==null){clearTimeout(roundTimer);roundTimer=null;}
  round=1;preyWins=0;predatorWins=0;gameFinished=false;locked=false;
  drawText('New match. Click a neighboring tile to move.');
  setupRound();
}

// Brown-noise grain scrape with a short rasp; generated locally, no copyrighted audio assets.
// Sound starts only after the user has explicitly enabled audio, in accordance with browser policies.
function playScrape() {
  if(!soundEnabled) return;
  try {
    if(!audioContext)audioContext=new (window.AudioContext||window.webkitAudioContext)();
    if(audioContext.state==='suspended')audioContext.resume().catch(()=>{});
    const duration=.24,length=Math.ceil(audioContext.sampleRate*duration);
    const buffer=audioContext.createBuffer(1,length,audioContext.sampleRate);
    const data=buffer.getChannelData(0);let brown=0;
    for(let i=0;i<length;i++){
      const white=Math.random()*2-1;
      brown=(brown+.035*white)/1.035;
      const envelope=Math.pow(1-i/length,1.7)*Math.min(1,i/400);
      data[i]=Math.max(-1,Math.min(1,brown*9*envelope));
    }
    const source=audioContext.createBufferSource(),filter=audioContext.createBiquadFilter(),gain=audioContext.createGain();
    source.buffer=buffer;filter.type='bandpass';filter.frequency.value=370;filter.Q.value=.65;
    gain.gain.value=.43;
    source.connect(filter);filter.connect(gain);gain.connect(audioContext.destination);
    source.start();
  }catch(err){console.warn('Sound unavailable:',err);}
}
soundBtn.addEventListener('click',async()=>{
  soundEnabled=!soundEnabled;
  soundBtn.textContent=soundEnabled?'🔊 Sound on':'🔇 Sound off';
  soundBtn.setAttribute('aria-pressed',String(soundEnabled));
  if(soundEnabled){try {if(!audioContext) audioContext=new (window.AudioContext||window.webkitAudioContext)();await audioContext.resume();}catch(err){console.warn('Audio unlock failed:',err);}}
});
document.getElementById('restartBtn').addEventListener('click',restartMatch);
canvas.addEventListener('click',event=>{
  const rect=canvas.getBoundingClientRect();
  const x=Math.floor((event.clientX-rect.left)/rect.width*GRID);
  const y=Math.floor((event.clientY-rect.top)/rect.height*GRID);
  movePrey(x,y);
});
setupRound();
