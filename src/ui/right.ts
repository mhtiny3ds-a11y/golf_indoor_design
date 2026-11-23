import { Result, OVERALL_LABEL } from '../engine';
import { readout, explain, buildList } from '../engine/summary';
import { fmtLen } from '../engine/units';
import { PARTNERS } from '../engine/data';
import { esc, badge } from './fmt';

export function verdictText(r: Result): string {
  const p = r.plan, m = p.metric, L = (v: number) => fmtLen(v, m);
  const room = `Phòng ${L(p.W).replace(/ m$/, '')} × ${L(p.D)}, trần ${L(p.H)}`;
  if (r.overall.st === 'fail') return `${room} chưa chứa được cấu hình này. Xem các mục đỏ bên dưới để biết thiếu gì và cách sửa.`;
  if (r.overall.st === 'warn') return `${room} chứa được cấu hình này nhưng có chỗ chật. Hãy thử swing chậm với gậy dài nhất trước.`;
  return `${room} chứa được cấu hình này và đủ chỗ swing driver.`;
}

export function renderRight(r: Result, okOpen: boolean): string {
  const p = r.plan, ov = r.overall;
  const rows = readout(p);
  const bad = r.checks.filter(c => c.st !== 'ok').sort((a, b) => ({ fail: 0, warn: 1, note: 2, ok: 3 }[a.st] - { fail: 0, warn: 1, note: 2, ok: 3 }[b.st]));
  const good = r.checks.filter(c => c.st === 'ok');
  const card = (c: (typeof r.checks)[number]) => `<article class="check c-${c.st}"><header><h4>${esc(c.title)}</h4>${badge(c.st)}</header><p>${esc(c.text)}</p>${c.fix ? `<p class="fix"><b>Cách sửa:</b> ${esc(c.fix)}</p>` : ''}${c.estimate ? '<span class="est">Ước tính</span>' : ''}</article>`;
  const items = buildList(p);
  const hasLinks = items.some(i => i.url);
  return `
  <section class="verdict v-${ov.st}">
    <h2>${OVERALL_LABEL[ov.st].toUpperCase()}</h2>
    <p>${esc(verdictText(r))}</p>
  </section>
  <table class="readout"><tbody>${rows.map(x => `<tr><th scope="row">${esc(x.label)}</th><td>${esc(x.value)}${x.estimate ? ' <span class="est">Ước tính</span>' : ''}</td></tr>`).join('')}</tbody></table>
  <p class="explain">${esc(explain(p))}</p>
  <section class="consult">
    <h3>Tư vấn miễn phí</h3>
    <p>Gửi cấu hình này cho đội ngũ ${esc(PARTNERS.brand.name.replace(' Sim Builder', ''))}. Chúng tôi kiểm tra lại bố cục, báo giá trọn gói hoặc từng thiết bị, giá lắp đặt và máy tính phù hợp.</p>
    <button type="button" class="btn primary" data-act="lead">Gửi cấu hình cho ${esc(PARTNERS.brand.name.replace(' Sim Builder', ''))}</button>
    <button type="button" class="link" data-act="scrollBuild">Tự mua? Xem danh sách thiết bị cho cấu hình này</button>
  </section>
  <section class="checks">
    <h3>Kiểm tra độ phù hợp</h3>
    ${bad.map(card).join('')}
    <details ${okOpen ? 'open' : ''} data-sec="okList"><summary>${good.length} mục vừa. Xem chi tiết</summary>${good.map(card).join('')}</details>
  </section>
  <section class="build" id="build">
    <h3>Thiết bị của bạn</h3>
    ${items.map(i => `<article class="item"><small>${esc(i.title)}</small><b>${esc(i.name)}</b><p>${esc(i.reason)}</p>
      ${i.price ? `<p class="price">${i.price.toLocaleString('vi-VN')} ₫ <span class="est">Tham khảo</span></p>` : ''}
      <div class="row-btns">${i.code ? `<button type="button" class="btn sm" data-copy="${esc(i.code)}">Sao chép mã</button>` : ''}${i.url ? `<a class="btn sm" href="${esc(i.url)}" target="_blank" rel="noopener">Xem</a>` : ''}<button type="button" class="btn sm" data-focus="${i.focus}">Hiện trong phòng</button></div></article>`).join('')}
    ${hasLinks ? '' : '<p class="hint">Link mua và mã giảm giá sẽ hiện khi được cấu hình trong <code>config/partners.json</code>.</p>'}
    <div class="row2"><button type="button" class="btn sm" data-act="shareImg">Chia sẻ ảnh cấu hình</button><button type="button" class="btn sm" data-act="copySummary">Sao chép tóm tắt</button></div>
  </section>
  <section class="finish">
    <h3>Hoàn tất</h3>
    <button type="button" class="btn primary" data-act="lead">Gửi cho ${esc(PARTNERS.brand.name.replace(' Sim Builder', ''))} (báo giá trọn gói)</button>
    <button type="button" class="btn" data-act="share">Chia sẻ cấu hình</button>
  </section>`;
}

export function statusBox(r: Result): string {
  const o = r.overall;
  return `<b class="v-${o.st}">${OVERALL_LABEL[o.st]}</b><small>${o.ok} vừa · ${o.note} ghi chú · ${o.warn} chật · ${o.fail} không vừa</small>`;
}
