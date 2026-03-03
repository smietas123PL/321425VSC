import { state } from '../core/state.js';

// ─── Types ────────────────────────────────────────────────
interface Agent {
  id: string;
  name: string;
  emoji?: string;
  type?: string;
}

interface GraphNode {
  id: string;
  label: string;
  emoji: string;
  type: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
}

interface GraphEdge {
  from: string;
  to: string;
  label: string;
  style: 'tech' | 'biz';
}

// ─── State ────────────────────────────────────────────────
let graphNodes: GraphNode[] = [];
let graphEdges: GraphEdge[] = [];
let graphAnimFrame: number | null = null;

function buildGraphFromAgents(): void {
  const agents: Agent[] = state.generatedAgents || [];
  if (!agents.length) return;

  const canvas = document.getElementById('agent-graph') as HTMLCanvasElement | null;
  if (!canvas) return;

  if (graphAnimFrame !== null) {
    cancelAnimationFrame(graphAnimFrame);
    graphAnimFrame = null;
  }

  const W = canvas.offsetWidth || 800;
  const H = 400;
  canvas.width = W;
  canvas.height = H;

  const cx = W / 2;
  const cy = H / 2;
  const radius = Math.min(W, H) * 0.33;

  const tech: Agent[] = agents.filter((a: Agent) => a.type === 'technical');
  const biz: Agent[] = agents.filter((a: Agent) => a.type !== 'technical');

  graphNodes = [];

  tech.forEach((a: Agent, i: number) => {
    const angle = (Math.PI * 0.8) + (i / Math.max(tech.length - 1, 1)) * Math.PI * 0.8 - Math.PI * 0.4;
    graphNodes.push({
      id: a.id,
      label: a.name,
      emoji: a.emoji || '⚙',
      type: 'technical',
      x: cx - radius * 0.6 + Math.cos(angle) * radius * 0.5,
      y: cy + Math.sin(angle) * radius * 0.7,
      vx: 0, vy: 0, r: 28,
    });
  });

  biz.forEach((a: Agent, i: number) => {
    const angle = (Math.PI * 0.1) + (i / Math.max(biz.length - 1, 1)) * Math.PI * 0.8 - Math.PI * 0.4;
    graphNodes.push({
      id: a.id,
      label: a.name,
      emoji: a.emoji || '💼',
      type: 'business',
      x: cx + radius * 0.6 + Math.cos(angle) * radius * 0.5,
      y: cy + Math.sin(angle) * radius * 0.7,
      vx: 0, vy: 0, r: 28,
    });
  });

  graphEdges = [];
  for (let i = 0; i < tech.length - 1; i++) {
    graphEdges.push({ from: tech[i].id, to: tech[i + 1].id, label: 'pipeline', style: 'tech' });
  }
  biz.forEach((b: Agent) => {
    tech.forEach((tn: Agent) => {
      graphEdges.push({ from: b.id, to: tn.id, label: 'context', style: 'biz' });
    });
  });

  drawGraph();
}

function drawGraph(): void {
  const canvas = document.getElementById('agent-graph') as HTMLCanvasElement | null;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const W = canvas.width;
  const H = canvas.height;

  ctx.clearRect(0, 0, W, H);

  // Grid
  ctx.strokeStyle = 'rgba(242,185,13,0.04)';
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 40) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  }
  for (let y = 0; y < H; y += 40) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }

  // Edges
  graphEdges.forEach((edge: GraphEdge) => {
    const from = graphNodes.find((n: GraphNode) => n.id === edge.from);
    const to = graphNodes.find((n: GraphNode) => n.id === edge.to);
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

  // Nodes
  graphNodes.forEach((node: GraphNode) => {
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

// Export to window for backwards compatibility with non-module scripts
window.buildGraphFromAgents = buildGraphFromAgents;
window.drawGraph = drawGraph;
