// Генератор иконок PWA. Зависимостей в проекте нет, поэтому PNG собирается
// вручную: сырой RGBA -> zlib -> чанки IHDR/IDAT/IEND. Запуск: npm run icons.
// Результат коммитится в course/public — на Vercel нет шага сборки.

import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

const BG = [0x14, 0x16, 0x1a];   // --side
const LINE = [0xb4, 0x55, 0x2d]; // --accent
const NODE = [0xe0, 0x8a, 0x5c]; // --accent (dark theme)

const SS = 4; // суперсэмплинг: рисуем в 4x и усредняем — так получается сглаживание

// ---------------------------------------------------------------- PNG

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(size, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;  // 8 бит на канал
  ihdr[9] = 6;  // RGBA
  // каждая строка с байтом фильтра 0 (None)
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------- геометрия

const inCircle = (x, y, cx, cy, r) => (x - cx) ** 2 + (y - cy) ** 2 <= r * r;

// расстояние до отрезка <= половины толщины
function inSegment(x, y, x1, y1, x2, y2, w) {
  const dx = x2 - x1, dy = y2 - y1;
  const t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy)));
  return (x - (x1 + t * dx)) ** 2 + (y - (y1 + t * dy)) ** 2 <= (w / 2) ** 2;
}

// скруглённый квадрат со стороной 1 и радиусом r
function inRoundRect(x, y, r) {
  if (x < 0 || x > 1 || y < 0 || y > 1) return false;
  const cx = Math.min(Math.max(x, r), 1 - r);
  const cy = Math.min(Math.max(y, r), 1 - r);
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
}

// ---------------------------------------------------------------- отрисовка

// Знак: узел сверху, два снизу, связи между ними — граф системы.
// scale сжимает знак к центру: для maskable нужно уложиться в safe zone (80%).
function mark(x, y, scale) {
  const s = (v) => 0.5 + (v - 0.5) * scale;
  const top = [s(0.5), s(0.28)];
  const bl = [s(0.28), s(0.72)];
  const br = [s(0.72), s(0.72)];
  const r = 0.085 * scale;
  const w = 0.045 * scale;

  if (inCircle(x, y, ...top, r) || inCircle(x, y, ...bl, r) || inCircle(x, y, ...br, r)) return NODE;
  if (inSegment(x, y, ...top, ...bl, w) || inSegment(x, y, ...top, ...br, w)) return LINE;
  return null;
}

// bleed: true — фон на весь квадрат (maskable / iOS), false — скруглённые углы
function render(size, { bleed, scale }) {
  const hi = size * SS;
  const acc = new Float64Array(size * size * 4);

  for (let py = 0; py < hi; py++) {
    for (let px = 0; px < hi; px++) {
      const x = (px + 0.5) / hi;
      const y = (py + 0.5) / hi;

      let rgb = null, a = 0;
      if (bleed || inRoundRect(x, y, 0.22)) { rgb = BG; a = 255; }
      if (a) {
        const m = mark(x, y, scale);
        if (m) rgb = m;
      }

      const i = (Math.floor(py / SS) * size + Math.floor(px / SS)) * 4;
      if (a) {
        acc[i] += rgb[0]; acc[i + 1] += rgb[1]; acc[i + 2] += rgb[2]; acc[i + 3] += 255;
      }
    }
  }

  const n = SS * SS;
  const out = Buffer.alloc(size * size * 4);
  for (let i = 0; i < out.length; i += 4) {
    const alpha = acc[i + 3] / n;
    // цвет усредняем только по закрытым пикселям, иначе края темнеют
    const cov = acc[i + 3] / 255 || 1;
    out[i] = Math.round(acc[i] / cov);
    out[i + 1] = Math.round(acc[i + 1] / cov);
    out[i + 2] = Math.round(acc[i + 2] / cov);
    out[i + 3] = Math.round(alpha);
  }
  return encodePng(size, out);
}

// ---------------------------------------------------------------- вывод

const OUT = join(ROOT, 'course', 'public');
const files = [
  ['icon-192.png', 192, { bleed: false, scale: 1 }],
  ['icon-512.png', 512, { bleed: false, scale: 1 }],
  // знак целиком лежит в круге радиуса 0.396 от центра, safe zone maskable — 0.4;
  // 0.82 даёт запас на срез и не выглядит потерянным в кружке Android
  ['icon-maskable-512.png', 512, { bleed: true, scale: 0.82 }],
  ['apple-touch-icon.png', 180, { bleed: true, scale: 1 }],
];

for (const [name, size, opts] of files) {
  const png = render(size, opts);
  writeFileSync(join(OUT, name), png);
  console.log(`${name.padEnd(24)} ${size}x${size}  ${png.length} b`);
}
