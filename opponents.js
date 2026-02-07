let puckHistory = [];
export let gameData = null;

// Lädt die JSON-Datei
export async function loadGameData() {
    const response = await fetch('./levels.json');
    gameData = await response.json();
    return gameData;
}

export function updateAI(computer, puck, opponent, canvas, timeScale) {
    if (!opponent) return;
    
    puckHistory.push({ x: puck.x, y: puck.y });
    if (puckHistory.length > 30) puckHistory.shift();

    const delay = opponent.reactionDelay || 0;
    const delayedPuck = puckHistory[puckHistory.length - 1 - delay] || puck;

    let targetX = delayedPuck.x;
    let targetY = 60;

    // Einfache Verfolgung mit dem geladenen aiSpeed
    computer.x += (targetX - computer.x) * opponent.aiSpeed * timeScale;
    computer.y += (targetY - computer.y) * opponent.aiSpeed * timeScale;

    computer.y = Math.max(25, Math.min(280, computer.y));
}