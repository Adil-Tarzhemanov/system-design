// РЕШЕНИЕ. Модуль уведомлений больше не знает, чем именно отправляют сообщения.
// Ни одного импорта: всё, что ему нужно от внешнего мира, он объявляет сам — типом.

export type Notification = {
  userId: string;
  text: string;
};

// Контракт: единственное, что модуль требует от транспорта. Про телеграм здесь ни слова,
// и это принципиально — тип объявлен на стороне того, кто зависимостью пользуется.
export type Transport = {
  send(userId: string, text: string): Promise<void>;
};

export type NotifierDeps = {
  transport: Transport;
};

// Фабрика: сама ничего не отправляет, а собирает готовый нотифаер вокруг переданного
// транспорта. Замыкание играет роль конструктора — классы для этого не нужны.
export function createNotifier({ transport }: NotifierDeps) {
  async function notifyUser(n: Notification): Promise<void> {
    await transport.send(n.userId, n.text);
  }

  async function notifyAll(users: string[], text: string): Promise<void> {
    for (const userId of users) {
      await notifyUser({ userId, text });
    }
  }

  return { notifyUser, notifyAll };
}
