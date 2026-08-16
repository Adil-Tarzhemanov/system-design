// Конкретный транспорт. Изображает сеть: вместо запроса складывает сообщение в outbox,
// чтобы тест мог убедиться, что оно действительно ушло.
export type Sent = { userId: string; text: string };

export const outbox: Sent[] = [];

export async function sendTelegram(userId: string, text: string): Promise<void> {
  if (!userId) throw new Error('sendTelegram: пустой userId');
  outbox.push({ userId, text });
}

export function resetOutbox(): void {
  outbox.length = 0;
}
