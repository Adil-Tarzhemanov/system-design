// НАРУШЕНИЕ №3. Виджет тянет константу со страницы: pages лежит выше widgets.
// Из-за этого виджет нельзя переиспользовать ни на одной другой странице.
import { PAGE_TITLE } from '../../pages/home/meta.ts';
import { displayName } from '../../entities/user/model.ts';
import { upper } from '../../shared/format.ts';

export function renderHeader(): string {
  return `${upper(PAGE_TITLE)} · ${displayName()}`;
}
