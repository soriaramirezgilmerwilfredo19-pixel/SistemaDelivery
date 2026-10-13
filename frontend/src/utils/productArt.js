const PALETTES = {
  hamburguesas: ['#d9480f', '#ff922b'],
  pizzas: ['#c92a2a', '#f03e3e'],
  acompanantes: ['#f59f00', '#ffd43b'],
  snacks: ['#a61e4d', '#f783ac'],
  ensaladas: ['#2b8a3e', '#94d82d'],
  combos: ['#c2255c', '#f06595'],
  bebidas: ['#1971c2', '#4dabf7'],
  cafes: ['#7f5539', '#d4a373'],
  postres: ['#ae3ec9', '#ffd43b']
};

const DEFAULT_PALETTE = ['#e85d04', '#f07f13'];

const EMOJI_TABLE = [
  ['burger', '🍔'], ['hamburguesa', '🍔'], ['hamb', '🍔'],
  ['pizza', '🍕'], ['pepperoni', '🍕'],
  ['papa', '🍟'], ['papas', '🍟'], ['fritas', '🍟'],
  ['cebolla', '🧅'], ['nugget', '🍗'], ['alita', '🍖'], ['pollo', '🍗'],
  ['nacho', '🧀'], ['bolon', '🍌'], ['empanada', '🥟'],
  ['ensalada', '🥗'], ['tropical', '🍍'], ['cesar', '🥗'],
  ['combo', '🍱'], ['gaseosa', '🥤'], ['agua', '💧'], ['jugo', '🍊'],
  ['cafe', '☕'], ['capuchino', '🥛'], ['te', '🧋'], ['helado', '🍦'],
  ['brownie', '🍫'], ['cheesecake', '🍰'], ['tres leches', '🍮'], ['pastel', '🍰'],
  ['postre', '🍮'], ['flauta', '🌯'], ['taco', '🌮'], ['torta', '🍰']
];

function pickFor(product) {
  const name = String(product?.name || '').toLowerCase();
  for (const [key, emoji] of EMOJI_TABLE) {
    if (name.includes(key)) return emoji;
  }
  return '🍽️';
}

export function artForProduct(product) {
  const palette = PALETTES[product?.category?.slug] || DEFAULT_PALETTE;
  const emoji = pickFor(product);
  const [c1, c2] = palette;
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 600'>` +
    `<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>` +
    `<stop offset='0' stop-color='${c1}'/><stop offset='1' stop-color='${c2}'/>` +
    `</linearGradient></defs>` +
    `<rect width='800' height='600' fill='url(#g)'/>` +
    `<circle cx='685' cy='65' r='185' fill='rgba(255,255,255,0.10)'/>` +
    `<circle cx='90' cy='565' r='155' fill='rgba(255,255,255,0.10)'/>` +
    `<circle cx='400' cy='300' r='185' fill='rgba(255,255,255,0.95)'/>` +
    `<text x='402' y='412' font-size='215' text-anchor='middle' opacity='0.07' fill='#1c130a'>${emoji}</text>` +
    `<text x='400' y='410' font-size='215' text-anchor='middle'` +
    ` style='font-family:Segoe UI Emoji,Apple Color Emoji,Noto Color Emoji,emoji'>${emoji}</text>` +
    `</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}