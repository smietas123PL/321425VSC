import { state } from '../core/state.js';

let graphNodes: any[] = [];
let graphEdges: any[] = [];
let graphAnimFrame: any = null;

function buildGraphFromAgents() {
    const agents = state.generatedAgents || [];
    if (!agents.length) return;

    const canvas = (document.getElementById('agent-graph') as HTMLCanvasElement);
    if (!canvas) return;

    if (graphAnimFrame) {
        cancelAnimationFrame(graphAnimFrame);
        graphAnimFrame = null;
    }
    const W = canvas.offsetWidth || 800;
    const H = 400;
    canvas.width = W;
    canvas.height = H;

    const cx = W / 2, cy = H / 2;
    const radius = Math.min(W, H) * 0.33;

    const tech = agents.filter(a => a.type === 'technical');
    const biz = agents.filter(a => a.type !== 'technical');

    graphNodes = [];

    tech.forEach((a, i) => {
        const angle = (Math.PI * 0.8) + (i / Math.max(tech.length - 1, 1)) * Math.PI * 0.8 - Math.PI * 0.4;
        graphNodes.push({
            id: a.id, label: a.name, emoji: a.emoji || '⚙',
            type: 'technical',
            x: cx - radius * 0.6 + Math.cos(angle) * radius * 0.5,
            y: cy + Math.sin(angle) * radius * 0.7,
            vx: 0, vy: 0, r: 28
        });
    });

    biz.forEach((a, i) => {
        const angle = (Math.PI * 0.1) + (i / Math.max(biz.length - 1, 1)) * Math.PI * 0.8 - Math.PI * 0.4;
        graphNodes.push({
            id: a.id, label: a.name, emoji: a.emoji || '💼',
            type: 'business',
            x: cx + radius * 0.6 + Math.cos(angle) * radius * 0.5,
            y: cy + Math.sin(angle) * radius * 0.7,
            vx: 0, vy: 0, r: 28
        });
    });

    graphEdges = [];
    for (let i = 0; i < tech.length - 1; i++) {
        graphEdges.push({ from: tech[i].id, to: tech[i + 1].id, label: 'pipeline', style: 'tech' });
    }
    biz.forEach(b => {
        tech.forEach(tn => {
            graphEdges.push({ from: b.id, to: tn.id, label: 'context', style: 'biz' });
        });
    });

    drawGraph();
}

function drawGraph() {
    const canvas = (document.getElementById('agent-graph') as HTMLCanvasElement);
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const W = canvas.width, H = canvas.height;

    ctx.clearRect(0, 0, W, H);

    ctx.strokeStyle = 'rgba(242,185,13,0.04)';
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

    graphEdges.forEach(edge => {
        const from = graphNodes.find(n => n.id === edge.from);
        const to = graphNodes.find(n => n.id === edge.to);
        if (!from || !to) return;

        const isBiz = edge.style === 'biz';
        const color = isBiz ? 'rgba(255,107,53,0.35)' : 'rgba(242,185,13,0.4)';

        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = isBiz ? 1.5 : 2;
        if (isBiz) ctx.setLineDash([4, 4]);
        else ctx.setLineDash([]);

        const mx = (from.x + to.x) / 2;
        const my = (from.y + to.y) / 2 - 30;
        ctx.moveTo(from.x, from.y);
        ctx.quadraticCurveTo(mx, my, to.x, to.y);
        ctx.stroke();
        ctx.setLineDash([]);

        const angle = Math.atan2(to.y - my, to.x - mx);
        const arrowLen = 8;
        ctx.beginPath();
        ctx.fillStyle = color.replace('0.35', '0.7').replace('0.4', '0.8');
        ctx.moveTo(to.x, to.y);
        ctx.lineTo(to.x - arrowLen * Math.cos(angle - 0.4), to.y - arrowLen * Math.sin(angle - 0.4));
        ctx.lineTo(to.x - arrowLen * Math.cos(angle + 0.4), to.y - arrowLen * Math.sin(angle + 0.4));
        ctx.closePath();
        ctx.fill();
    });

    graphNodes.forEach(node => {
        const isTech = node.type === 'technical';
        const color = isTech ? '#f2b90d' : '#e05a1a';
        const glow = isTech ? 'rgba(242,185,13,0.25)' : 'rgba(224,90,26,0.22)';

        ctx.beginPath();
        ctx.arc(node.x, node.y, node.r + 8, 0, Math.PI * 2);
        ctx.fillStyle = glow;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(node.x, node.y, node.r, 0, Math.PI * 2);
        ctx.fillStyle = isTech ? 'rgba(196,147,10,0.2)' : 'rgba(255,107,53,0.15)';
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.font = '16px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(node.emoji, node.x, node.y - 2);
    });
}

// Export
window.buildGraphFromAgents = buildGraphFromAgents;
window.drawGraph = drawGraph;
