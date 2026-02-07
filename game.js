import { loadGameData, updateAI } from './opponents.js';
import { GoalParticle, drawGhostTrail } from './effects.js';
import { AudioManager } from './audio.js';

// --- CONFIG & STATE ---
const canvas = document.getElementById("hockeyCanvas");
const ctx = canvas.getContext("2d");
const audio = new AudioManager();

let gameStarted = false;
let isGameOver = false;
let winner = "";
let playerScore = 0;
let computerScore = 0;
let timeScale = 1.0;
let stuckTimer = 0;

// Physik-Standardwerte (werden durch JSON überschrieben)
let physics = { friction: 0.015, maxSpeed: 20, puckScale: 1.0, gravity: 0 };

// Spiel-Objekte
let puck = { x: 200, y: 300, dx: 0, dy: 0, radius: 12 };
let player = { x: 200, y: 550, radius: 25, color: "#0077ff" };
let computer = { x: 200, y: 50, radius: 25, color: "#ff3300" };

let lastPlayerX = 200, lastPlayerY = 550;
let puckTrail = [];
let goalParticles = [];
let currentOpponent = null;

const SUB_STEPS = 10; // Präzision der Kollision
const goalWidth = 160;

// --- INITIALISIERUNG & DYNAMISCHES MENÜ ---
async function init() {
    const data = await loadGameData();
    await audio.init('assets/music/theme.mp3');

    const opponentContainer = document.getElementById('opponentList');
    const modeContainer = document.getElementById('modeList');

    // Gegner-Buttons generieren
    data.opponents.forEach(opp => {
        const btn = document.createElement('button');
        btn.id = `btn-${opp.id}`;
        btn.textContent = opp.name;
        btn.style.borderLeft = `5px solid ${opp.color}`;
        btn.onclick = () => window.selectOpponent(opp.id, data);
        opponentContainer.appendChild(btn);
    });

    // Modi-Buttons generieren
    Object.keys(data.modes).forEach(modeKey => {
        const btn = document.createElement('button');
        btn.id = `mode-${modeKey}`;
        btn.textContent = modeKey.replace('_', ' ');
        btn.onclick = () => window.selectMode(modeKey, data);
        modeContainer.appendChild(btn);
    });

    // Globale Funktionen für die Buttons
    window.selectOpponent = (levelId, d) => {
        currentOpponent = d.opponents.find(o => o.id === levelId);
        computer.color = currentOpponent.color;
        updateUI('.opponent-list button', `btn-${levelId}`);
    };

    window.selectMode = (modeId, d) => {
        const config = d.modes[modeId];
        physics = { ...config };
        canvas.style.backgroundColor = config.bg;
        puck.radius = 12 * config.puckScale;
        updateUI('.mode-list button', `mode-${modeId}`);
    };

    window.startGame = () => {
        if (!currentOpponent) window.selectOpponent(data.opponents[1].id, data);
        audio.playMusic();
        document.getElementById('startMenu').style.display = 'none';
        gameStarted = true;
        resetPuck();
    };

    // Standard-Auswahl
    window.selectMode('CLASSIC', data);
    window.selectOpponent(data.opponents[1].id, data);
}

function updateUI(selector, activeId) {
    document.querySelectorAll(selector).forEach(b => b.classList.remove('active'));
    document.getElementById(activeId)?.classList.add('active');
}

// --- SPIEL-LOGIK ---
function resetPuck() {
    puck.x = 200; puck.y = 300; puck.dx = 0; puck.dy = 0;
    puckTrail = [];
    setTimeout(() => {
        puck.dx = (Math.random() > 0.5 ? 5 : -5);
        puck.dy = 5;
    }, 600);
}

function handleInput(clientX, clientY) {
    if (!gameStarted || isGameOver) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const tx = (clientX - rect.left) * scaleX;
    const ty = (clientY - rect.top) * scaleY;

    player.x += (tx - player.x) * 0.85;
    player.y += (ty - player.y) * 0.85;
    
    player.y = Math.max(325, Math.min(575, player.y));
    player.x = Math.max(25, Math.min(375, player.x));
}

function checkCollision(paddle, isPlayer = false) {
    let dx = puck.x - paddle.x;
    let dy = puck.y - paddle.y;
    let distance = Math.sqrt(dx * dx + dy * dy);
    let minDistance = puck.radius + paddle.radius;

    if (distance < minDistance) {
        let nx = dx / distance, ny = dy / distance;
        puck.x = paddle.x + nx * minDistance;
        puck.y = paddle.y + ny * minDistance;

        audio.playSound(600, 0.1, timeScale);
        
        let pVx = isPlayer ? (player.x - lastPlayerX) : 0;
        let pVy = isPlayer ? (player.y - lastPlayerY) : 0;
        
        let impactSpeed = Math.sqrt(pVx**2 + pVy**2);
        let currentSpeed = Math.sqrt(puck.dx**2 + puck.dy**2);
        
        let newSpeed = Math.min(5 + (currentSpeed * 0.1) + (impactSpeed * 0.8), physics.maxSpeed);
        let angle = Math.atan2(dy, dx);
        
        puck.dx = Math.cos(angle) * newSpeed + (pVx * 0.5);
        puck.dy = Math.sin(angle) * newSpeed + (pVy * 0.5);
    }
}

function update() {
    if (!gameStarted || isGameOver) return;

    // Slow-Motion Logik
    const inGoalZone = (puck.y < 120 || puck.y > 480) && (puck.x > 120 && puck.x < 280);
    timeScale += ((inGoalZone ? 0.3 : 1.0) - timeScale) * 0.1;
    audio.updatePitch(timeScale);

    // Sub-Stepping Loop
    for (let i = 0; i < SUB_STEPS; i++) {
        let stepTS = timeScale / SUB_STEPS;
        puck.dy += (physics.gravity || 0) * stepTS;
        puck.x += puck.dx * stepTS;
        puck.y += puck.dy * stepTS;
        
        puck.dx *= Math.pow(1 - physics.friction * timeScale, 1 / SUB_STEPS);
        puck.dy *= Math.pow(1 - physics.friction * timeScale, 1 / SUB_STEPS);

        checkCollision(player, true);
        checkCollision(computer, false);

        if (puck.x < puck.radius || puck.x > canvas.width - puck.radius) {
            puck.dx *= -1;
            puck.x = puck.x < puck.radius ? puck.radius : canvas.width - puck.radius;
            if (i === 0) audio.playSound(300, 0.05, timeScale);
        }
    }

    // Anti-Stuck
    if (Math.sqrt(puck.dx**2 + puck.dy**2) < 1) stuckTimer++; else stuckTimer = 0;
    if (stuckTimer > 120) { puck.dx = (puck.x < 200 ? 3 : -3); puck.dy = (puck.y < 300 ? 3 : -3); stuckTimer = 0; }

    // Effekte & Tore
    puckTrail.unshift({x: puck.x, y: puck.y});
    if(puckTrail.length > 12) puckTrail.pop();
    goalParticles.forEach((p, i) => { p.update(); if(p.alpha <= 0) goalParticles.splice(i,1); });

    if (puck.y < 0 || puck.y > 600) {
        if (puck.x > 120 && puck.x < 280) {
            const isPlayerGoal = puck.y < 0;
            if (isPlayerGoal) playerScore++; else computerScore++;
            for(let i=0; i<40; i++) goalParticles.push(new GoalParticle(puck.x, isPlayerGoal ? 0 : 600, isPlayerGoal ? player.color : computer.color));
            audio.playSound(200, 0.4, 1, 0.3);
            resetPuck();
        } else {
            puck.dy *= -1;
            puck.y = puck.y < 0 ? puck.radius : 600 - puck.radius;
        }
    }

    if (playerScore >= 7 || computerScore >= 7) {
        isGameOver = true;
        winner = playerScore >= 7 ? "SPIELER" : currentOpponent.name;
    }

    updateAI(computer, puck, currentOpponent, canvas, timeScale);
    lastPlayerX = player.x; lastPlayerY = player.y;
}

// --- RENDER LOOP ---
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Feld-Deko
    ctx.strokeStyle = "rgba(0,0,0,0.05)"; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(0, 300); ctx.lineTo(400, 300); ctx.stroke();
    ctx.beginPath(); ctx.arc(200, 300, 60, 0, Math.PI*2); ctx.stroke();

    drawGhostTrail(ctx, puckTrail, 12, puck.radius);
    goalParticles.forEach(p => p.draw(ctx));

    // Paddles & Puck
    [player, computer].forEach(p => {
        ctx.save();
        ctx.shadowBlur = 15; ctx.shadowColor = "rgba(0,0,0,0.3)";
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI*2); ctx.fill();
        ctx.restore();
    });

    ctx.fillStyle = "#222";
    ctx.beginPath(); ctx.arc(puck.x, puck.y, puck.radius, 0, Math.PI*2); ctx.fill();

    // Score
    ctx.font = "bold 80px sans-serif"; ctx.fillStyle = "rgba(0,0,0,0.03)"; ctx.textAlign = "center";
    ctx.fillText(computerScore, 200, 240); ctx.fillText(playerScore, 200, 410);

    update();

    if (isGameOver) {
        ctx.fillStyle = "rgba(0,0,0,0.85)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "white"; ctx.font = "bold 30px sans-serif";
        ctx.fillText("SIEG: " + winner, 200, 300);
        ctx.font = "18px sans-serif"; ctx.fillText("Klicke zum Neustart", 200, 350);
    }
    requestAnimationFrame(draw);
}

// --- EVENTS ---
canvas.addEventListener("mousemove", (e) => handleInput(e.clientX, e.clientY));
canvas.addEventListener("touchmove", (e) => { e.preventDefault(); handleInput(e.touches[0].clientX, e.touches[0].clientY); }, { passive: false });
canvas.addEventListener("mousedown", () => { if (isGameOver) { playerScore = 0; computerScore = 0; isGameOver = false; resetPuck(); } });

init();
draw();