// Корень композиции: единственное место, которому разрешено знать одновременно
// и про notifications, и про конкретный транспорт. После рефакторинга вся конкретика
// живёт здесь — и это ровно то, ради чего упражнение делалось.
import { createNotifier } from '../notifications/notify.ts';
import { sendTelegram } from '../transport/telegram.ts';

// { send: sendTelegram } — это адаптер целиком. Он подошёл под тип Transport
// по структуре, без implements: сигнатуры совпали, значит, годится.
export const notifier = createNotifier({
  transport: { send: sendTelegram },
});
