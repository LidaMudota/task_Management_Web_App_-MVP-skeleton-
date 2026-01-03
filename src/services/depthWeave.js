const perspective = 1200;
const threadCount = 72;
const baseRadius = 540;

const sampleEase = (t) => 1 - Math.pow(1 - t, 3);

const createThread = (index) => {
  const ratio = index / threadCount;
  return {
    angle: ratio * Math.PI * 2,
    spin: 0.003 + Math.random() * 0.004,
    drift: 0.6 + Math.random() * 0.4,
    radius: baseRadius * (0.56 + sampleEase(ratio) * 0.4),
    depth: -260 + Math.random() * 520,
    hue: 190 + ratio * 90,
    shimmer: 0.2 + Math.random() * 0.3,
  };
};

const project = (x, y, z) => {
  const scale = perspective / (perspective + z);
  return { x: x * scale, y: y * scale, scale };
};

const drawFrame = (ctx, threads, settings) => {
  const { w, h, parallax, time } = settings;
  ctx.clearRect(0, 0, w, h);
  ctx.globalCompositeOperation = "lighter";

  const centerX = w / 2 + parallax.x * 0.6;
  const centerY = h / 2 + parallax.y * 0.6;

  threads.forEach((thread, idx) => {
    const wave = Math.sin(time * thread.drift + idx * 0.08);
    const z = thread.depth + wave * 140;
    const angle = thread.angle + time * thread.spin;
    const x = Math.cos(angle) * thread.radius;
    const y = Math.sin(angle * 0.7) * thread.radius * 0.6 + wave * 30;

    const { x: px, y: py, scale } = project(x, y, z);
    const thickness = Math.max(1, 3 * scale);
    const opacity = Math.max(0.15, 0.8 * scale * thread.shimmer);
    const gradient = ctx.createLinearGradient(centerX, centerY, centerX + px, centerY + py);
    gradient.addColorStop(0, `hsla(${thread.hue}, 78%, 64%, ${opacity * 0.4})`);
    gradient.addColorStop(1, `hsla(${thread.hue + 30}, 86%, 72%, ${opacity})`);

    ctx.strokeStyle = gradient;
    ctx.lineWidth = thickness;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(centerX + px, centerY + py);
    ctx.stroke();
  });
};

export const mountDepthWeave = () => {
  const canvas = document.querySelector("#depth-weave");
  if (!canvas) return;

  const prefersReduced =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const ctx = canvas.getContext("2d");
  const pixelRatio = prefersReduced ? 1 : Math.min(1.35, Math.max(0.85, window.devicePixelRatio || 1));
  const threads = Array.from({ length: threadCount }, (_, idx) => createThread(idx));

  const stage = canvas.parentElement;
  if (stage) {
    stage.dataset.motion = prefersReduced ? "static" : "active";
  }

  let size = { w: 0, h: 0 };
  const setSize = () => {
    size = { w: window.innerWidth * pixelRatio, h: window.innerHeight * pixelRatio };
    canvas.width = size.w;
    canvas.height = size.h;
    canvas.style.width = "100%";
    canvas.style.height = "100%";
  };
  setSize();

  const parallax = { x: 0, y: 0 };
  let targetParallax = { x: 0, y: 0 };

  const syncParallax = () => {
    parallax.x += (targetParallax.x - parallax.x) * 0.08;
    parallax.y += (targetParallax.y - parallax.y) * 0.08;
  };

  const onPointerMove = (event) => {
    const midX = window.innerWidth / 2;
    const midY = window.innerHeight / 2;
    targetParallax = {
      x: ((event.clientX - midX) / midX) * 48,
      y: ((event.clientY - midY) / midY) * 48,
    };
  };

  window.addEventListener("resize", setSize);
  window.addEventListener("pointermove", onPointerMove, { passive: true });

  if (prefersReduced) {
    drawFrame(ctx, threads, { w: size.w, h: size.h, parallax: { x: 0, y: 0 }, time: 0.6 });
    return;
  }

  let frame = 0;
  const render = () => {
    frame += 1;
    syncParallax();
    drawFrame(ctx, threads, {
      w: size.w,
      h: size.h,
      parallax,
      time: frame * 0.012,
    });
    requestAnimationFrame(render);
  };
  render();
};
