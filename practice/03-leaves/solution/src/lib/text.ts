// РЕШЕНИЕ. Разрыв №1 — вынужденный.
//
// Было: этот файл импортировал tasks ради функции userSummary. Утилита знала,
// что такое «активная задача», то есть знала слова предметной области — и из-за
// этого нижний слой тянулся вверх, к домену. Именно этот импорт замыкал кольцо.
//
// Стало: здесь снова только строки. Ни одного импорта, ни одного доменного слова.
// userSummary уехал в app — см. dashboard.ts.

// \b здесь не годится: границы слов в JS считаются по ASCII, и кириллицу они не видят.
export function titleCase(s: string): string {
  return s.replace(/(^|\s)(\p{L})/gu, (_, space: string, letter: string) => space + letter.toUpperCase());
}

export function isBlank(s: string): boolean {
  return s.trim().length === 0;
}
