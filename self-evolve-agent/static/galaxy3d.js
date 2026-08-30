/**
 * 3D Holographic Knowledge Galaxy (Canvas 3D WebGL / Three.js).
 * Interactive constellation of episodic lessons, custom tools, and verifiable task nodes.
 */

class Galaxy3D {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.canvas = null;
    this.ctx = null;
    this.nodes = [];
    this.animId = null;
    this.angleX = 0.003;
    this.angleY = 0.005;
    this.rotX = 0;
    this.rotY = 0;
    this.isDragging = false;
    this.lastMouseX = 0;
    this.lastMouseY = 0;
    this.selectedNode = null;
  }

  init() {
    if (!this.container) return;
    this.container.innerHTML = "";

    this.canvas = document.createElement("canvas");
    this.canvas.width = this.container.clientWidth || 700;
    this.canvas.height = 420;
    this.canvas.style.width = "100%";
    this.canvas.style.height = "420px";
    this.canvas.style.borderRadius = "14px";
    this.canvas.style.background = "radial-gradient(circle at 50% 50%, #f1f5f9 0%, #e2e8f0 100%)";
    this.canvas.style.cursor = "grab";
    this.container.appendChild(this.canvas);

    this.ctx = this.canvas.getContext("2d");

    // Mouse Controls
    this.canvas.addEventListener("mousedown", (e) => {
      this.isDragging = true;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
      this.canvas.style.cursor = "grabbing";
    });

    window.addEventListener("mousemove", (e) => {
      if (!this.isDragging) return;
      const dx = e.clientX - this.lastMouseX;
      const dy = e.clientY - this.lastMouseY;
      this.rotY += dx * 0.008;
      this.rotX += dy * 0.008;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    });

    window.addEventListener("mouseup", () => {
      this.isDragging = false;
      if (this.canvas) this.canvas.style.cursor = "grab";
    });

    this.populateGalaxy();
    this.animate();
  }

  populateGalaxy() {
    const categories = [
      { type: "task", color: "#0284c7", count: 10, label: "Task Types" },
      { type: "lesson", color: "#d97706", count: 12, label: "Retained Lessons" },
      { type: "tool", color: "#10b981", count: 6, label: "Synthesized Tools" },
    ];

    this.nodes = [];
    categories.forEach((cat) => {
      for (let i = 0; i < cat.count; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(Math.random() * 2 - 1);
        const radius = 120 + Math.random() * 60;

        this.nodes.push({
          x: radius * Math.sin(phi) * Math.cos(theta),
          y: radius * Math.sin(phi) * Math.sin(theta),
          z: radius * Math.cos(phi),
          baseRadius: radius,
          size: cat.type === "task" ? 6 : (cat.type === "lesson" ? 5 : 7),
          color: cat.color,
          type: cat.type,
          label: `${cat.type.toUpperCase()} #${i + 1}`,
        });
      }
    });
  }

  animate() {
    if (!this.ctx) return;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    if (!this.isDragging) {
      this.rotY += this.angleY;
      this.rotX += this.angleX;
    }

    const cx = this.canvas.width / 2;
    const cy = this.canvas.height / 2;
    const fov = 300;

    // Projected nodes
    const projected = this.nodes.map((node) => {
      // 3D rotation matrix
      let x1 = node.x * Math.cos(this.rotY) + node.z * Math.sin(this.rotY);
      let z1 = -node.x * Math.sin(this.rotY) + node.z * Math.cos(this.rotY);

      let y2 = node.y * Math.cos(this.rotX) - z1 * Math.sin(this.rotX);
      let z2 = node.y * Math.sin(this.rotX) + z1 * Math.cos(this.rotX);

      const scale = fov / (fov + z2 + 200);
      const px = cx + x1 * scale;
      const py = cy + y2 * scale;

      return { ...node, px, py, scale, zIndex: z2 };
    });

    // Sort by depth
    projected.sort((a, b) => a.zIndex - b.zIndex);

    // Draw connecting laser constellations
    for (let i = 0; i < projected.length; i++) {
      for (let j = i + 1; j < projected.length; j++) {
        const dx = projected[i].px - projected[j].px;
        const dy = projected[i].py - projected[j].py;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 65) {
          const alpha = (1 - dist / 65) * 0.35;
          this.ctx.strokeStyle = `rgba(2, 132, 199, ${alpha})`;
          this.ctx.lineWidth = 1;
          this.ctx.beginPath();
          this.ctx.moveTo(projected[i].px, projected[i].py);
          this.ctx.lineTo(projected[j].px, projected[j].py);
          this.ctx.stroke();
        }
      }
    }

    // Draw glowing 3D spheres
    projected.forEach((node) => {
      const r = Math.max(2, node.size * node.scale);
      this.ctx.beginPath();
      this.ctx.arc(node.px, node.py, r, 0, Math.PI * 2);
      this.ctx.fillStyle = node.color;
      this.ctx.shadowBlur = 10 * node.scale;
      this.ctx.shadowColor = node.color;
      this.ctx.fill();
      this.ctx.shadowBlur = 0;
    });

    this.animId = requestAnimationFrame(() => this.animate());
  }

  destroy() {
    if (this.animId) cancelAnimationFrame(this.animId);
  }
}

window.Galaxy3D = Galaxy3D;
