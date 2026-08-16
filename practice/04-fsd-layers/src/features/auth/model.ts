// Фича авторизации. Ниже неё только entities и shared — этот модуль ни от кого не зависит.
let logged = false;

export function login(): void {
  logged = true;
}

export function logout(): void {
  logged = false;
}

export function isLoggedIn(): boolean {
  return logged;
}
