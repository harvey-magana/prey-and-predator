
const canvas = document.getElementById('gameBoard');
const ctx = canvas.getContext('2d');

const GRID = 8;
const TILE = canvas.width / GRID;
const TOTAL_ROUNDS = 5;

let preyWins=0, predatorWins=0, round=1, gameFinished=false;
let prey, predator, hole;

function randPos(){
  return {
    x: Math.floor(Math.random()*GRID),
    y: Math.floor(Math.random()*GRID)
  };
}

function same(a,b){
  return a.x===b.x && a.y===b.y;
}

function setupRound(){
  prey = randPos();
  predator = randPos();
  hole = randPos();

  while(
    same(prey,predator) ||
    same(prey,hole) ||
    same(predator,hole) ||
    distance(prey,predator) < 4
  ){
    prey = randPos();
    predator = randPos();
    hole = randPos();
  }

  updateHUD();
  draw();
}

function distance(a,b){
 return Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
}

function drawGrid(){
  for(let y=0;y<GRID;y++){
    for(let x=0;x<GRID;x++){

      ctx.fillStyle=((x+y)%2===0)
      ? '#d6d6d6'
      : '#c7c7c7';

      ctx.fillRect(x*TILE,y*TILE,TILE,TILE);

      ctx.strokeStyle='#999';
      ctx.lineWidth=5;
      ctx.strokeRect(x*TILE,y*TILE,TILE,TILE);
    }
  }
}

function drawHole(){
  ctx.fillStyle='black';
  ctx.fillRect(
    hole.x*TILE+18,
    hole.y*TILE+18,
    TILE-36,
    TILE-36
  );
}

function drawPiece(piece,color,emoji){
  ctx.fillStyle=color;
  ctx.fillRect(
    piece.x*TILE+12,
    piece.y*TILE+12,
    TILE-24,
    TILE-24
  );

  ctx.beginPath();
  ctx.fillStyle='white';
  ctx.arc(
    piece.x*TILE+TILE/2,
    piece.y*TILE+TILE/2,
    TILE/4,
    0,
    Math.PI*2
  );
  ctx.fill();

  ctx.font='44px serif';
  ctx.textAlign='center';
  ctx.textBaseline='middle';
  ctx.fillText(
    emoji,
    piece.x*TILE+TILE/2,
    piece.y*TILE+TILE/2+2
  );
}

function draw(){
  ctx.clearRect(0,0,canvas.width,canvas.height);

  drawGrid();
  drawHole();

  drawPiece(predator,'#d92525','🦊');
  drawPiece(prey,'#7a4a24','🦫');
}

canvas.addEventListener('click',e=>{
  if(gameFinished) return;

  const rect = canvas.getBoundingClientRect();
  const x = Math.floor((e.clientX-rect.left)/TILE);
  const y = Math.floor((e.clientY-rect.top)/TILE);

  movePrey(x,y);
});

function movePrey(x,y){

  const dx=Math.abs(x-prey.x);
  const dy=Math.abs(y-prey.y);

  if(dx<=1 && dy<=1 && !(dx===0 && dy===0)){

    prey={x,y};

    if(same(prey,hole)){
      finishRound('prey');
      return;
    }

    movePredator();

    if(same(prey,predator)){
      finishRound('predator');
      return;
    }

    draw();
  }
}

function movePredator(){

  const dx = prey.x-predator.x;
  const dy = prey.y-predator.y;

  // smarter pathing: choose dominant axis
  if(Math.abs(dx)>=Math.abs(dy)){
    predator.x += Math.sign(dx)*Math.min(2,Math.abs(dx));
  } else {
    predator.y += Math.sign(dy)*Math.min(2,Math.abs(dy));
  }

  predator.x=Math.max(0,Math.min(GRID-1,predator.x));
  predator.y=Math.max(0,Math.min(GRID-1,predator.y));
}

function finishRound(winner){

  if(winner==='prey'){
    preyWins++;
    status('Prey escaped into the hole!');
  }else{
    predatorWins++;
    status('Predator caught the prey!');
  }

  if(round>=TOTAL_ROUNDS){

    gameFinished=true;

    let champion='Match tied!';
    if(preyWins>predatorWins){
      champion='PREY WINS THE GAME!';
    }else if(predatorWins>preyWins){
      champion='PREDATOR WINS THE GAME!';
    }

    status(champion);
    updateHUD();
    return;
  }

  round++;
  updateHUD();

  setTimeout(()=>{
    document.getElementById('status').textContent='';
    setupRound();
  },1200);
}

function updateHUD(){
 document.getElementById('round').textContent=
 `Round ${round}/${TOTAL_ROUNDS}`;

 document.getElementById('score').textContent=
 `Prey ${preyWins} - Predator ${predatorWins}`;
}

function status(msg){
 document.getElementById('status').textContent=msg;
}

document.getElementById('restartBtn')
.addEventListener('click',()=>{
 preyWins=0;
 predatorWins=0;
 round=1;
 gameFinished=false;
 status('');
 setupRound();
});

setupRound();
