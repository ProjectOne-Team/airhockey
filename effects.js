export class GoalParticle {
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
    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    }
}

export function drawGhostTrail(ctx, trail, maxTrailLength, radius) {
    trail.forEach((pos, index) => {
        let op = (1 - (index / maxTrailLength)) * 0.2;
        ctx.fillStyle = `rgba(0,0,0,${op})`;
        ctx.beginPath(); 
        ctx.arc(pos.x, pos.y, (1 - (index / maxTrailLength)) * radius, 0, Math.PI * 2); 
        ctx.fill();
    });
}