// Окно торговца
G.Shop = (() => {
  const S = G.Game; let el, open = false;
  const render = () => {
    const rows = S.shop.stock.map((it, i) => `<div class="row${S.gold < it.price ? ' poor' : ''}" data-i="${i}"><img src="${G.Sprites.url(it.ch, it.color)}"><span><b style="color:${it.color}">${i + 1}. ${it.name}</b><br><small>${G.describe(it)}</small></span><em>${it.price}💰</em></div>`).join('');
    el.innerHTML = `<h2>Торговец</h2><p>Твоё золото: ${S.gold} 💰</p>${rows || '<p>Распродано.</p>'}<p><small>Клик или клавиши 1-4 — купить · Esc — выйти</small></p>`;
  };
  const api = {
    isOpen: () => open,
    open() {
      if (!S.shop) return;
      if (!el) { el = document.createElement('div'); el.id = 'shop'; document.body.appendChild(el); }
      open = true; el.style.display = 'block'; render(); S.snd('pickup');
    },
    close() { open = false; if (el) el.style.display = 'none'; },
    buy(i) {
      const it = S.shop?.stock[i]; if (!it) return;
      if (S.gold < it.price) { S.say('Не хватает золота.', '#ff8a9a'); return; }
      if (it.kind === 'weapon' || it.kind === 'armor') S.p[it.kind] = it;
      else if (S.p.inv.length < 9) S.p.inv.push(it);
      else { S.say('Инвентарь полон.'); return; }
      S.gold -= it.price; S.shop.stock.splice(i, 1); S.snd('coin'); S.say(`Куплено: ${it.name}.`, '#ffd34d');
      render(); G.refresh && G.refresh();
    },
  };
  document.addEventListener('click', e => { const r = e.target.closest('#shop .row'); if (r) api.buy(+r.dataset.i); });
  return api;
})();ы