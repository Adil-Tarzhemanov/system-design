// НАРУШЕНИЕ №1. Сущность полезла в слой фич: entities находится ниже features,
// а значит про существование авторизации знать не может.
import { isLoggedIn } from '../../features/auth/model.ts';

export type User = { id: string; name: string };

const user: User = { id: 'u1', name: 'Аиша' };

export function currentUser(): User {
  return user;
}

export function displayName(): string {
  return isLoggedIn() ? user.name : 'гость';
}
