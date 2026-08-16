// Деталь реализации сущности: как именно приводится артикул — её частное дело.
// Сегодня trim + uppercase, завтра проверка контрольной цифры.
export function normalizeSku(sku: string): string {
  return sku.trim().toUpperCase();
}
