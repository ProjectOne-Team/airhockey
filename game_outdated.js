/**
 * PRO JS AIRHOCKEY - ULTIMATE EDITION (FULL RELEASE)
 * Inklusive: Sub-Stepping, Ghost-Trail, Schatten & Tor-Explosionen
 */

const canvas = document.getElementById("hockeyCanvas");
const ctx = canvas.getContext("2d");

// --- AUDIO SYSTEM ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
let audioBuffer = null, sourceNode = null;
let musicStarted = false, gameStarted = false;

const musicPath = 'assets/music/theme.mp3'; 
fetch(musicPath)
    .then(response => response.arrayBuffer())
    .then(data => audioCtx.decodeAudioData(data))
    .then(buffer => { audioBuffer = buffer; })
    .catch(e => console.error("Audio-Ladefehler:", e));

function playBackgroundMusic() {
    if (!audioBuffer || musicStarted) return;
    sourceNode = audioCtx.createBufferSource();
    sourceNode.buffer = audioBuffer;
    sourceNode.loop = true;
    sourceNode.connect(audioCtx.destination);
    sourceNode.start();
    musicStarted = true;
}

// --- SPIEL-OBJEKTE & PHYSIK ---
let playerScore = 0, computerScore = 0;
const winningScore = 7;
let isGameOver = false, winner = "";
const goalWidth = 160;
const maxSpeed = 20; 
let timeScale = 1.0;
const slowMoZone = 120;
const SUB_STEPS = 10; 

let puck = { x: 200, y: 300, dx: 0, dy: 0, radius: 12 };
let player = { x: 200, y: 550, radius: 25, color: "#0077ff" };
let computer = { x: 200, y: 50, radius: 25, color: "#ff3300" };

let lastPlayerX = 200, lastPlayerY = 550;
let puckTrail = [];
const maxTrailLength = 12;
let goalParticles = [];

let stuckTimer = 0; // Zähler für den Stillstand
const STUCK_THRESHOLD = 1; // Geschwindigkeit, unter der der Puck als "liegend" gilt
const STUCK_MAX_TIME = 120; // Frames (ca. 2 Sekunden bei 60 FPS), bis neu angestoßen wird

// --- PARTIKEL KLASSE ---
class GoalParticle {
    constructor(x, y, color) {
        this.x = x; this.y = y;
        this.color = color;
        this.radius = Math.random() * 3 + 2;
        this.dx = (Math.random() - 0.5) * 8;
        this.dy = (Math.random() - 0.5) * 8;
        this.alpha = 1;
    }
    update() {
        this.x += this.dx; this.y += this.dy;
        this.alpha -= 0.02;
    }
    draw() {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    }
}

// --- CORE FUNKTIONEN ---
function selectOpponent(level) {
    currentOpponent = OPPONENTS[level];
    computer.color = currentOpponent.color;
    document.querySelectorAll('.opponent-list button').forEach(btn => btn.classList.remove('active'));
    document.getElementById('btn-' + level).classList.add('active');
}

function startGame() {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    playBackgroundMusic();
    document.getElementById('startMenu').style.display = 'none';
    gameStarted = true;
    resetPuck();
}

function createGoalExplosion(y, color) {
    for (let i = 0; i < 40; i++) {
        let x = (canvas.width - goalWidth) / 2 + Math.random() * goalWidth;
        goalParticles.push(new GoalParticle(x, y, color));
    }
}

function playSound(freq, duration, vol = 0.1) {
    if (audioCtx.state === 'suspended') return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq * timeScale, audioCtx.currentTime);
    gain.gain.setValueAtTime(vol, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(); osc.stop(audioCtx.currentTime + duration);
}

// --- KOLLISION & PHYSIK-HELPER ---
function checkCollision(paddle, isPlayer = false) {
    let dx = puck.x - paddle.x;
    let dy = puck.y - paddle.y;
    let distance = Math.sqrt(dx * dx + dy * dy);
    let minDistance = puck.radius + paddle.radius;

    if (distance < minDistance) {
        let overlap = minDistance - distance;
        let nx = dx / distance, ny = dy / distance;
        puck.x += nx * (overlap + 1);
        puck.y += ny * (overlap + 1);

        playSound(600, 0.1);
        let paddleVx = isPlayer ? (player.x - lastPlayerX) : 0;
        let paddleVy = isPlayer ? (player.y - lastPlayerY) : 0;
        let angle = Math.atan2(dy, dx);
        
        let currentSpeed = Math.sqrt(puck.dx**2 + puck.dy**2);
        let impactSpeed = Math.sqrt(paddleVx**2 + paddleVy**2);
        let newSpeed = Math.min(5 + (currentSpeed * 0.1) + (impactSpeed * 0.8), maxSpeed);
        
        puck.dx = Math.cos(angle) * newSpeed + (paddleVx * 0.5);
        puck.dy = Math.sin(angle) * newSpeed + (paddleVy * 0.5);
    }
}

function resetPuck() {
    puck.x = 200; puck.y = 300;
    puck.dx = 0; puck.dy = 0;
    puckTrail = [];
    setTimeout(() => {
        puck.dx = (Math.random() > 0.5 ? 5 : -5);
        puck.dy = (Math.random() > 0.5 ? 5 : -5);
    }, 600);
}

function autoNudgePuck() {
    // Kurzer visueller Effekt (optional: Partikel oder Flash)
    playSound(400, 0.1, 0.05);
    
    // Richtungsentscheidung: Zur Mitte hin
    let dirX = (puck.x < canvas.width / 2) ? 3 : -3;
    let dirY = (puck.y < canvas.height / 2) ? 3 : -3;

    puck.dx = dirX;
    puck.dy = dirY;
}

// --- UPDATE LOOP ---
function update() {
    if (isGameOver || !gameStarted) return;

    // Slow-Mo Zone
    const inGoalZone = (puck.y < slowMoZone || puck.y > canvas.height - slowMoZone) &&
                       (puck.x > canvas.width/2 - 80 && puck.x < canvas.width/2 + 80);
    timeScale += ((inGoalZone ? 0.3 : 1.0) - timeScale) * 0.1;

    if (sourceNode) {
        sourceNode.detune.setTargetAtTime((timeScale - 1.0) * 1200, audioCtx.currentTime, 0.1);
    }

    // Sub-Stepping Physik
    for (let i = 0; i < SUB_STEPS; i++) {
        let stepTS = timeScale / SUB_STEPS;
        puck.x += puck.dx * stepTS;
        puck.y += puck.dy * stepTS;
        puck.dx *= Math.pow(1 - 0.015 * timeScale, 1 / SUB_STEPS);
        puck.dy *= Math.pow(1 - 0.015 * timeScale, 1 / SUB_STEPS);

        checkCollision(player, true);
        checkCollision(computer, false);

        if (puck.x < puck.radius || puck.x > canvas.width - puck.radius) {
            puck.dx *= -1;
            puck.x = (puck.x < puck.radius) ? puck.radius : canvas.width - puck.radius;
            if(i === 0) playSound(300, 0.05);
        }
    }

    // --- ANTI-STUCK LOGIK ---
    let currentSpeed = Math.sqrt(puck.dx**2 + puck.dy**2);

    if (currentSpeed < STUCK_THRESHOLD) {
        stuckTimer++;
    } else {
        stuckTimer = 0; // Timer zurücksetzen, wenn er sich bewegt
    }

    if (stuckTimer > STUCK_MAX_TIME) {
        autoNudgePuck(); // Den Puck anstoßen
        stuckTimer = 0;
    }

    // Tore & Partikel
    puckTrail.unshift({ x: puck.x, y: puck.y });
    if (puckTrail.length > maxTrailLength) puckTrail.pop();
    
    goalParticles.forEach((p, i) => { p.update(); if (p.alpha <= 0) goalParticles.splice(i, 1); });

    const goalX = (puck.x > (canvas.width - goalWidth)/2 && puck.x < (canvas.width + goalWidth)/2);
    if (puck.y < 0) {
        if(goalX) { playerScore++; createGoalExplosion(0, player.color); resetPuck(); } 
        else { puck.dy *= -1; puck.y = puck.radius; }
    }
    if (puck.y > canvas.height) {
        if(goalX) { computerScore++; createGoalExplosion(canvas.height, computer.color); resetPuck(); } 
        else { puck.dy *= -1; puck.y = canvas.height - puck.radius; }
    }

    if (playerScore >= winningScore || computerScore >= winningScore) {
        isGameOver = true;
        winner = playerScore >= winningScore ? "SPIELER" : currentOpponent.name;
    }

    // KI Steuerung
    let targetX, targetY;
    if (puck.y < canvas.height * 0.45 && currentOpponent.strategy === "aggressive") {
        let dirX = puck.x - canvas.width/2, dirY = puck.y - canvas.height;
        let dist = Math.sqrt(dirX**2 + dirY**2);
        targetX = puck.x + (dirX/dist) * 35;
        targetY = puck.y + (dirY/dist) * 35;
    } else {
        targetX = canvas.width/2 + (puck.x - canvas.width/2) * (1 - currentOpponent.errorRate);
        targetY = 60;
    }
    computer.x += (targetX - computer.x) * currentOpponent.aiSpeed * timeScale;
    computer.y += (targetY - computer.y) * currentOpponent.aiSpeed * timeScale;
    computer.y = Math.max(25, Math.min(280, computer.y));

    lastPlayerX = player.x; lastPlayerY = player.y;
}

// --- RENDERING ---
function draw() {
    ctx.fillStyle = "#fcfcfc"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Feld-Deko
    ctx.strokeStyle = "rgba(0,0,0,0.05)"; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(0, 300); ctx.lineTo(400, 300); ctx.stroke();
    ctx.beginPath(); ctx.arc(200, 300, 60, 0, Math.PI*2); ctx.stroke();

    // Tore
    ctx.fillStyle = "#333";
    ctx.fillRect((canvas.width-goalWidth)/2, 0, goalWidth, 5);
    ctx.fillRect((canvas.width-goalWidth)/2, canvas.height-5, goalWidth, 5);

    // Score Text
    ctx.font = "bold 80px sans-serif"; ctx.fillStyle = "rgba(0,0,0,0.03)"; ctx.textAlign = "center";
    ctx.fillText(computerScore, 200, 240); ctx.fillText(playerScore, 200, 410);

    // Partikel & Trail
    goalParticles.forEach(p => p.draw());
    puckTrail.forEach((pos, index) => {
        let op = (1 - (index / maxTrailLength)) * 0.2;
        ctx.fillStyle = `rgba(0,0,0,${op})`;
        ctx.beginPath(); ctx.arc(pos.x, pos.y, (1-(index/maxTrailLength))*puck.radius, 0, Math.PI*2); ctx.fill();
    });

    // Paddles mit Schatten
    [player, computer].forEach(p => {
        ctx.save();
        ctx.shadowBlur = 15; ctx.shadowColor = "rgba(0,0,0,0.3)";
        ctx.shadowOffsetX = 5; ctx.shadowOffsetY = 5;
        ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI*2); ctx.fill();
        ctx.restore();
    });

    // Puck
    ctx.fillStyle = "#222"; ctx.beginPath(); ctx.arc(puck.x, puck.y, puck.radius, 0, Math.PI*2); ctx.fill();

    if (timeScale < 0.9) {
        ctx.fillStyle = `rgba(0, 100, 255, ${(1-timeScale)*0.15})`;
        ctx.fillRect(0,0,canvas.width, canvas.height);
    }

    update();

    if (isGameOver) {
        ctx.fillStyle = "rgba(0,0,0,0.85)"; ctx.fillRect(0,0,canvas.width,canvas.height);
        ctx.fillStyle = "white"; ctx.font = "bold 30px sans-serif";
        ctx.fillText("SIEG: " + winner, 200, 300);
    }
    requestAnimationFrame(draw);
}

// Maussteuerung
canvas.addEventListener("mousemove", (e) => {
    if(!gameStarted || isGameOver) return;
    let rect = canvas.getBoundingClientRect();
    let tx = e.clientX - rect.left, ty = e.clientY - rect.top;
    player.x += (tx - player.x) * 0.85;
    player.y += (ty - player.y) * 0.85;
    player.y = Math.max(325, Math.min(575, player.y));
    player.x = Math.max(25, Math.min(375, player.x));
});

// --- TOUCH STEUERUNG ---
canvas.addEventListener("touchmove", (e) => {
    if(!gameStarted || isGameOver) return;
    e.preventDefault(); // Verhindert das Scrollen der Seite beim Spielen
    
    let rect = canvas.getBoundingClientRect();
    let touch = e.touches[0];
    let tx = touch.clientX - rect.left;
    let ty = touch.clientY - rect.top;

    player.x += (tx - player.x) * 0.85;
    player.y += (ty - player.y) * 0.85;
    
    player.y = Math.max(325, Math.min(575, player.y));
    player.x = Math.max(25, Math.min(375, player.x));
}, { passive: false });

draw();