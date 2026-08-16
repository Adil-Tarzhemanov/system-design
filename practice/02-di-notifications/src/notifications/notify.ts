// СТАРТОВОЕ СОСТОЯНИЕ. Модуль уведомлений намертво привязан к конкретному транспорту:
// строка импорта ниже — и есть та зависимость, которую нужно инвертировать.
import { sendTelegram } from '../transport/telegram.ts';

export type Notification = {
  userId: string;
  text: string;
};

export async function notifyUser(n: Notification): Promise<void> {
  await sendTelegram(n.userId, n.text);
}

export async function notifyAll(users: string[], text: string): Promise<void> {
  for (const userId of users) {
    await notifyUser({ userId, text });
  }
}
