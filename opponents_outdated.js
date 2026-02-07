export const OPPONENTS = {
    EASY: { name: "Training-Bot", color: "#39ff14", aiSpeed: 0.06, strategy: "defensive", errorRate: 0.4 },
    MEDIUM: { name: "Striker-7", color: "#ffaa00", aiSpeed: 0.12, strategy: "balanced", errorRate: 0.1 },
    HARD: { name: "The Wall", color: "#ff3300", aiSpeed: 0.18, strategy: "aggressive", errorRate: 0.0 }
};

export function updateAI(computer, puck, opponent, canvas, timeScale) {
    let targetX, targetY;
    
    if (puck.y < canvas.height * 0.45 && opponent.strategy === "aggressive") {
        let dirX = puck.x - canvas.width / 2, dirY = puck.y - canvas.height;
        let dist = Math.sqrt(dirX**2 + dirY**2) || 1;
        targetX = puck.x + (dirX / dist) * 35;
        targetY = puck.y + (dirY / dist) * 35;
    } else {
        targetX = canvas.width / 2 + (puck.x - canvas.width / 2) * (1 - opponent.errorRate);
        targetY = 60;
    }

    computer.x += (targetX - computer.x) * opponent.aiSpeed * timeScale;
    computer.y += (targetY - computer.y) * opponent.aiSpeed * timeScale;
    computer.y = Math.max(25, Math.min(280, computer.y));
}