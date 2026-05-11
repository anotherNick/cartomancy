/**
 * deck.js
 *
 * Requires spritesheet.png and spritesheet.json to be in the same directory.
 * Card coordinates are read from the JSON at runtime.
 */

let frames = {};
let cardNames = [];
let deck = [];
let spritesheet = null;
let shuffled = false;

const deckArea    = document.getElementById('deck-area');
const shuffleBtn  = document.getElementById('shuffle-btn');
const statusEl    = document.getElementById('status');
const drawSection = document.getElementById('draw-section');
const drawnArea   = document.getElementById('drawn-area');
const resetBtn    = document.getElementById('reset-btn');

/* ── Load JSON + spritesheet ── */

async function init() {
  try {
    const res = await fetch('spritesheet.json');
    const data = await res.json();

    // Filter out alternate-art variants (those with "2" suffix)
    frames = {};
    for (const [key, val] of Object.entries(data.frames)) {
      const isVariant = /\d\.png$/.test(key);   // e.g. jack_of_clubs2.png
      if (!isVariant) {
        frames[key] = val;
      }
    }

    cardNames = Object.keys(frames);
  } catch (err) {
    console.warn('Could not load spritesheet.json — using hardcoded frame data.', err);
    useFallbackFrames();
  }

  spritesheet = await loadImage('spritesheet.png');
  buildStack();
}

function loadImage(src) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload  = () => resolve(img);
    img.onerror = () => { console.warn(`Could not load ${src}`); resolve(null); };
    img.src = src;
  });
}

/* ── Build the visual stack ── */

function buildStack() {
  deckArea.innerHTML = '';
  const configs = [
    { ox: '-3px', oy: '-3px', or: '-2deg'   },
    { ox:  '2px', oy: '-2px', or:  '1deg'   },
    { ox: '-1px', oy: '-1px', or:  '0.5deg' },
    { ox:  '1px', oy:  '1px', or: '-0.5deg' },
    { ox:  '0px', oy:  '0px', or:  '0deg'   },
  ];
  configs.forEach((c, i) => {
    const el = document.createElement('div');
    el.className = 'stack-card';
    el.style.cssText = `
      --ox:${c.ox}; --oy:${c.oy}; --or:${c.or};
      z-index:${i};
      transform: translate(calc(-50% + ${c.ox}), calc(-50% + ${c.oy})) rotate(${c.or});
    `;
    deckArea.appendChild(el);
  });
}

/* ── Fisher-Yates shuffle ── */

function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

/* ── CSS animation for the stack ── */

function animateShuffle() {
  return new Promise(resolve => {
    const cards = deckArea.querySelectorAll('.stack-card');
    const spreads = [
      { tx: '-38px', ty:  '-8px', tr: '-18deg' },
      { tx:  '32px', ty:  '-6px', tr:  '12deg' },
      { tx: '-18px', ty:  '10px', tr:  '-6deg' },
      { tx:  '22px', ty:   '6px', tr:   '9deg' },
      { tx:   '0px', ty:   '0px', tr:   '0deg' },
    ];
    cards.forEach((card, i) => {
      const s = spreads[i] ?? spreads[4];
      card.style.setProperty('--tx', s.tx);
      card.style.setProperty('--ty', s.ty);
      card.style.setProperty('--tr', s.tr);
      card.classList.add('shuffling');
    });
    setTimeout(() => {
      cards.forEach(c => c.classList.remove('shuffling'));
      resolve();
    }, 600);
  });
}

/* ── Main shuffle handler ── */

async function doShuffle() {
  shuffleBtn.disabled = true;
  drawSection.style.display = 'none';
  drawnArea.innerHTML = '';
  resetBtn.style.display = 'none';
  document.querySelectorAll('.draw-btn').forEach(b => b.disabled = false);

  statusEl.textContent = 'Shuffling…';

  deck = [...cardNames];
  shuffleArray(deck);

  await animateShuffle();
  await new Promise(r => setTimeout(r, 80));
  await animateShuffle();

  shuffled = true;
  statusEl.textContent = `Deck shuffled — ${deck.length} cards ready`;
  drawSection.style.display = 'flex';
  shuffleBtn.disabled = false;
  shuffleBtn.textContent = 'Shuffle again';
}

/* ── Render a single card from the spritesheet ── */

function renderCardCanvas(cardKey) {
  const entry = frames[cardKey];
  if (!entry) return null;

  const f = entry.frame;
  const canvas = document.createElement('canvas');
  canvas.width  = f.w;
  canvas.height = f.h;
  const ctx = canvas.getContext('2d');

  if (spritesheet) {
    // Slice the correct region out of the spritesheet
    ctx.drawImage(spritesheet, f.x, f.y, f.w, f.h, 0, 0, f.w, f.h);
  } else {
    // Fallback: plain card with text label
    const isRed = cardKey.includes('hearts') || cardKey.includes('diamonds');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, f.w, f.h);
    ctx.fillStyle = isRed ? '#c0392b' : '#1a1a2e';
    ctx.font = '22px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(cardKey.replace('.png', '').replace(/_/g, ' '), f.w / 2, f.h / 2);
  }

  return canvas;
}

/* ── Draw N cards ── */

function drawCards(n) {
  if (!shuffled || deck.length < n) return;

  drawnArea.innerHTML = '';
  resetBtn.style.display = 'none';

  const drawn = deck.splice(0, n);
  statusEl.textContent = `${deck.length} card${deck.length !== 1 ? 's' : ''} remaining`;

  const rotMap = { 1: [0], 2: [-4, 4], 3: [-5, 0, 5] };
  const rots = rotMap[n] ?? Array(n).fill(0);

  drawn.forEach((cardKey, i) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'card-display';
    wrapper.style.setProperty('--rot', `${rots[i]}deg`);

    const canvas = renderCardCanvas(cardKey);
    if (canvas) wrapper.appendChild(canvas);
    drawnArea.appendChild(wrapper);

    // Staggered entrance animation
    setTimeout(() => wrapper.classList.add('visible'), 80 + i * 130);
  });

  if (deck.length === 0) {
    statusEl.textContent = 'Deck empty!';
    document.querySelectorAll('.draw-btn').forEach(b => b.disabled = true);
  }

  setTimeout(() => {
    resetBtn.style.display = 'inline-block';
  }, 400 + n * 130);
}

/* ── Reset ── */

function resetDeck() {
  shuffled = false;
  deck = [];
  drawnArea.innerHTML = '';
  drawSection.style.display = 'none';
  resetBtn.style.display = 'none';
  document.querySelectorAll('.draw-btn').forEach(b => b.disabled = false);
  shuffleBtn.textContent = 'Shuffle';
  statusEl.textContent = 'Press shuffle to begin';
  buildStack();
}

/* ── Wire up events ── */

shuffleBtn.addEventListener('click', doShuffle);
resetBtn.addEventListener('click', resetDeck);
document.querySelectorAll('.draw-btn').forEach(btn => {
  btn.addEventListener('click', () => drawCards(Number(btn.dataset.n)));
});

/* ── Hardcoded frame fallback (if JSON fetch fails) ── */

function useFallbackFrames() {
  frames = {"10_of_clubs.png":{"frame":{"x":0,"y":0,"w":200,"h":290}},"10_of_diamonds.png":{"frame":{"x":200,"y":0,"w":200,"h":290}},"10_of_hearts.png":{"frame":{"x":400,"y":0,"w":200,"h":290}},"10_of_spades.png":{"frame":{"x":0,"y":290,"w":200,"h":290}},"2_of_clubs.png":{"frame":{"x":200,"y":290,"w":200,"h":290}},"2_of_diamonds.png":{"frame":{"x":400,"y":290,"w":200,"h":290}},"2_of_hearts.png":{"frame":{"x":600,"y":0,"w":200,"h":290}},"2_of_spades.png":{"frame":{"x":600,"y":290,"w":200,"h":290}},"3_of_clubs.png":{"frame":{"x":800,"y":0,"w":200,"h":290}},"3_of_diamonds.png":{"frame":{"x":800,"y":290,"w":200,"h":290}},"3_of_hearts.png":{"frame":{"x":0,"y":580,"w":200,"h":290}},"3_of_spades.png":{"frame":{"x":200,"y":580,"w":200,"h":290}},"4_of_clubs.png":{"frame":{"x":400,"y":580,"w":200,"h":290}},"4_of_diamonds.png":{"frame":{"x":600,"y":580,"w":200,"h":290}},"4_of_hearts.png":{"frame":{"x":800,"y":580,"w":200,"h":290}},"4_of_spades.png":{"frame":{"x":1000,"y":0,"w":200,"h":290}},"5_of_clubs.png":{"frame":{"x":1000,"y":290,"w":200,"h":290}},"5_of_diamonds.png":{"frame":{"x":1000,"y":580,"w":200,"h":290}},"5_of_hearts.png":{"frame":{"x":0,"y":870,"w":200,"h":290}},"5_of_spades.png":{"frame":{"x":200,"y":870,"w":200,"h":290}},"6_of_clubs.png":{"frame":{"x":400,"y":870,"w":200,"h":290}},"6_of_diamonds.png":{"frame":{"x":600,"y":870,"w":200,"h":290}},"6_of_hearts.png":{"frame":{"x":800,"y":870,"w":200,"h":290}},"6_of_spades.png":{"frame":{"x":1000,"y":870,"w":200,"h":290}},"7_of_clubs.png":{"frame":{"x":1200,"y":0,"w":200,"h":290}},"7_of_diamonds.png":{"frame":{"x":1200,"y":290,"w":200,"h":290}},"7_of_hearts.png":{"frame":{"x":1200,"y":580,"w":200,"h":290}},"7_of_spades.png":{"frame":{"x":1200,"y":870,"w":200,"h":290}},"8_of_clubs.png":{"frame":{"x":1400,"y":0,"w":200,"h":290}},"8_of_diamonds.png":{"frame":{"x":1400,"y":290,"w":200,"h":290}},"8_of_hearts.png":{"frame":{"x":1400,"y":580,"w":200,"h":290}},"8_of_spades.png":{"frame":{"x":1400,"y":870,"w":200,"h":290}},"9_of_clubs.png":{"frame":{"x":0,"y":1160,"w":200,"h":290}},"9_of_diamonds.png":{"frame":{"x":200,"y":1160,"w":200,"h":290}},"9_of_hearts.png":{"frame":{"x":400,"y":1160,"w":200,"h":290}},"9_of_spades.png":{"frame":{"x":600,"y":1160,"w":200,"h":290}},"ace_of_clubs.png":{"frame":{"x":800,"y":1160,"w":200,"h":290}},"ace_of_diamonds.png":{"frame":{"x":1000,"y":1160,"w":200,"h":290}},"ace_of_hearts.png":{"frame":{"x":1200,"y":1160,"w":200,"h":290}},"ace_of_spades.png":{"frame":{"x":1600,"y":0,"w":200,"h":290}},"jack_of_clubs.png":{"frame":{"x":1600,"y":870,"w":200,"h":290}},"jack_of_diamonds.png":{"frame":{"x":0,"y":1450,"w":200,"h":290}},"jack_of_hearts.png":{"frame":{"x":400,"y":1450,"w":200,"h":290}},"jack_of_spades.png":{"frame":{"x":800,"y":1450,"w":200,"h":290}},"king_of_clubs.png":{"frame":{"x":1200,"y":1450,"w":200,"h":290}},"king_of_diamonds.png":{"frame":{"x":1600,"y":1450,"w":200,"h":290}},"king_of_hearts.png":{"frame":{"x":1800,"y":290,"w":200,"h":290}},"king_of_spades.png":{"frame":{"x":1800,"y":870,"w":200,"h":290}},"queen_of_clubs.png":{"frame":{"x":1800,"y":1450,"w":200,"h":290}},"queen_of_diamonds.png":{"frame":{"x":2000,"y":290,"w":200,"h":290}},"queen_of_hearts.png":{"frame":{"x":2000,"y":870,"w":200,"h":290}},"queen_of_spades.png":{"frame":{"x":2000,"y":1450,"w":200,"h":290}}};
  cardNames = Object.keys(frames);
}

/* ── Kick everything off ── */
init();
