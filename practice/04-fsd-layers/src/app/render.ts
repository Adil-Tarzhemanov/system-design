// Точка входа приложения и единственный вход для тестов.
// Сигнатуры этих четырёх функций менять нельзя.
import { renderHome } from '../pages/home/ui.ts';
import { login, logout } from '../features/auth/model.ts';
import { greeting } from '../shared/format.ts';

export function render(): string {
  return renderHome();
}

export function greetingLine(): string {
  return greeting();
}

export { login, logout };
