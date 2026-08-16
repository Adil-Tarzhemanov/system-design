// НАРУШЕНИЕ №2. Shared — самый нижний слой, он не знает вообще ни о чём,
// а этот файл импортирует сущность пользователя.
import { currentUser } from '../entities/user/model.ts';

export function upper(s: string): string {
  return s.toUpperCase();
}

export function greeting(): string {
  return `Привет, ${currentUser().name}`;
}
