// Анализ графа импортов. Используется тестами упражнений как автоматический ревьюер:
// проверяет не поведение кода, а форму зависимостей — то, ради чего упражнение и делается.
//
// Умышленно наивный: регулярки вместо парсера. Для учебных папок на 5–10 файлов этого
// достаточно, а читать такой код можно целиком за пять минут — что тоже часть обучения.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, dirname, relative, resolve, sep } from 'node:path';

const CODE_EXT = ['.ts', '.tsx'];

// `from '...'`, `import '...'`, `import('...')`, `export ... from '...'`
const SPEC_RE = /(?:\bfrom\s*|\bimport\s*\(?\s*)['"]([^'"]+)['"]/g;
const STAR_RE = /\bexport\s*\*\s*from\s*['"]([^'"]+)['"]/g;

const stripComments = (src) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

const norm = (p) => p.split(sep).join('/');

/** Все файлы с кодом внутри root, путями относительно root. */
export function collectFiles(root) {
  const out = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (CODE_EXT.some((e) => name.endsWith(e))) out.push(norm(relative(root, full)));
    }
  };
  walk(root);
  return out.sort();
}

/** Сырые спецификаторы импортов одного файла. */
export function readSpecifiers(absFile) {
  const src = stripComments(readFileSync(absFile, 'utf8'));
  return [...src.matchAll(SPEC_RE)].map((m) => m[1]);
}

/** Файлы, где есть `export * from` — размытый публичный API. */
export function starExports(root) {
  return collectFiles(root)
    .filter((f) => [...stripComments(readFileSync(join(root, f), 'utf8')).matchAll(STAR_RE)].length)
    .map((f) => f);
}

/**
 * Граф внутренних зависимостей: Map<файл, файлы[]>.
 * Внешние пакеты и неразрешимые пути отбрасываются — нас интересуют связи внутри упражнения.
 */
export function buildGraph(root) {
  const files = new Set(collectFiles(root));
  const edges = new Map();
  for (const file of files) {
    const deps = [];
    for (const spec of readSpecifiers(join(root, file))) {
      if (!spec.startsWith('.')) continue;
      const target = norm(relative(root, resolve(dirname(join(root, file)), spec)));
      if (files.has(target)) deps.push(target);
      else if (files.has(`${target}/index.ts`)) deps.push(`${target}/index.ts`);
    }
    edges.set(file, [...new Set(deps)]);
  }
  return edges;
}

/** Всё, до чего файл дотягивается по цепочке импортов, включая транзитивные. */
export function reachableFrom(edges, start) {
  const seen = new Set();
  const stack = [...(edges.get(start) ?? [])];
  while (stack.length) {
    const cur = stack.pop();
    if (seen.has(cur)) continue;
    seen.add(cur);
    stack.push(...(edges.get(cur) ?? []));
  }
  return seen;
}

/** Циклы импортов. Возвращает массив путей вида [a, b, a]. */
export function findCycles(edges) {
  const cycles = [];
  const state = new Map(); // 0 — в процессе, 1 — закрыт
  const path = [];

  const visit = (node) => {
    if (state.get(node) === 1) return;
    if (state.get(node) === 0) {
      cycles.push([...path.slice(path.indexOf(node)), node]);
      return;
    }
    state.set(node, 0);
    path.push(node);
    for (const next of edges.get(node) ?? []) visit(next);
    path.pop();
    state.set(node, 1);
  };

  for (const node of edges.keys()) visit(node);
  return cycles;
}

/** Первый сегмент пути после src/ — имя модуля или слоя. */
export const moduleOf = (file) => {
  const parts = file.replace(/^src\//, '').split('/');
  return parts.length > 1 ? parts[0] : null;
};

/**
 * Модули, у которых нет исходящих связей на другие модули — ни прямых, ни транзитивных.
 * Возвращает Map<модуль, до каких чужих модулей дотягивается>.
 */
export function moduleReach(root) {
  const edges = buildGraph(root);
  const reach = new Map();
  for (const file of edges.keys()) {
    const own = moduleOf(file);
    if (!own) continue;
    const hit = reach.get(own) ?? new Set();
    for (const target of reachableFrom(edges, file)) {
      const other = moduleOf(target);
      if (other && other !== own) hit.add(other);
    }
    reach.set(own, hit);
  }
  return reach;
}

/**
 * Нарушения порядка слоёв FSD. layers идут сверху вниз: слой может импортировать
 * только те, что ниже его в списке, и никогда — соседа по своему слою.
 */
export function layerViolations(root, layers) {
  const rank = new Map(layers.map((l, i) => [l, i]));
  const out = [];
  for (const [file, deps] of buildGraph(root)) {
    const from = moduleOf(file);
    if (!rank.has(from)) continue;
    for (const dep of deps) {
      const to = moduleOf(dep);
      if (!rank.has(to) || to === from) continue;
      if (rank.get(to) <= rank.get(from)) out.push({ file, dep, from, to });
    }
  }
  return out;
}

/** Слайс файла — <layer>/<slice>, если файл лежит в одном из перечисленных слоёв. */
export function sliceOf(file, layers) {
  const parts = file.replace(/^src\//, '').split('/');
  return layers.includes(parts[0]) && parts.length > 2 ? `${parts[0]}/${parts[1]}` : null;
}

/**
 * До каких чужих слайсов дотягивается каждый слайс, с учётом транзитивных связей.
 * В отличие от moduleReach различает соседей по одному слою: features/cart и features/checkout.
 */
export function sliceReach(root, layers) {
  const edges = buildGraph(root);
  const reach = new Map();
  for (const file of edges.keys()) {
    const own = sliceOf(file, layers);
    if (!own) continue;
    const hit = reach.get(own) ?? new Set();
    for (const target of reachableFrom(edges, file)) {
      const other = sliceOf(target, layers);
      if (other && other !== own) hit.add(other);
    }
    reach.set(own, hit);
  }
  return reach;
}

/**
 * Импорты, пробивающие публичный API: обращение внутрь чужого слайса мимо его index.ts.
 * Слайс — это <layer>/<slice>, где layer перечислен в layers.
 */
export function deepImports(root, layers) {
  const sliceOf_ = (file) => sliceOf(file, layers);
  const out = [];
  for (const [file, deps] of buildGraph(root)) {
    const own = sliceOf_(file);
    for (const dep of deps) {
      const target = sliceOf_(dep);
      if (!target || target === own) continue;
      if (!dep.endsWith(`${target}/index.ts`)) out.push({ file, dep, slice: target });
    }
  }
  return out;
}
