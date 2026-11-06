const panel = document.getElementById('financeWalkthrough');
if (panel && new URLSearchParams(location.search).get('walkthrough') === '1') {
  const movements = [
    {label: 'THS-01 · İlk tahsilat', amount: 60000},
    {label: 'THS-02 · İkinci tahsilat', amount: 40000},
    {label: 'İAD-01 · THS-01’e bağlı kısmi iade', amount: -20000}
  ];
  const steps = [
    ['600 TL müşteri tahsilatı', 'İlk müşteri tahsilatını kaydedin.', 'Fatura yok'],
    ['400 TL müşteri tahsilatı', 'İlk tahsilat kesinleşti. 72 TL royalty tahakkuku oluştu.', 'Tahakkuk oluştu'],
    ['200 TL müşteri iadesi', 'İkinci tahsilat kesinleşti. Royalty alacağı 120 TL’ye çıktı.', 'Faturalanabilir · 120 TL'],
    ['Fatura taslağını hazırla', 'İlk tahsilata bağlı iade, 20 TL royalty ve 4 TL KDV ters kaydı oluşturdu.', '24 TL mahsup bekliyor'],
    ['Demo faturayı düzenle', 'Taslak, 120 TL tahakkuku ve 24 TL iade mahsubunu gösteriyor.', 'Taslak · 96 TL'],
    ['96 TL royalty ödemesini kaydet', 'Demo faturanın 96 TL bakiyesi ödeme bekliyor.', 'Düzenlendi · 96 TL ödeme bekliyor'],
    ['Demo tamamlandı', 'Şubenin 96 TL ödemesi faturaya işlendi.', 'Ödendi · 0 TL açık']
  ];
  const money = new Intl.NumberFormat('tr-TR', {style: 'currency', currency: 'TRY'});
  const format = cents => money.format(cents / 100);
  const field = name => panel.querySelector('[data-demo-' + name + ']');
  const back = field('back');
  const next = field('next');
  const ledger = field('ledger');
  let step = 0;

  function render() {
    const posted = movements.slice(0, step);
    let cash = 0;
    let royalty = 0;
    let tax = 0;
    const rows = posted.map(({label, amount}) => {
      const fee = Math.round(amount / 10);
      const vat = Math.round(fee / 5);
      cash += amount;
      royalty += fee;
      tax += vat;
      const row = document.createElement('tr');
      for (const value of [label, format(amount), format(fee), format(vat), format(fee + vat)]) {
        row.insertCell().textContent = value;
      }
      return row;
    });
    const total = document.createElement('tr');
    for (const value of ['Net toplam', format(cash), format(royalty), format(tax), format(royalty + tax)]) {
      total.insertCell().textContent = value;
    }
    ledger.replaceChildren(...rows, total);
    const [action, status, invoice] = steps[step];
    field('status').textContent = status;
    field('invoice').textContent = invoice;
    field('cash').textContent = format(cash);
    field('open').textContent = format(step === steps.length - 1 ? 0 : royalty + tax);
    field('step').textContent = step + ' / ' + (steps.length - 1);
    back.disabled = step === 0;
    next.disabled = step === steps.length - 1;
    next.textContent = action;
  }

  back.addEventListener('click', () => { step = Math.max(0, step - 1); render(); });
  next.addEventListener('click', () => { step = Math.min(steps.length - 1, step + 1); render(); });
  render();
  panel.hidden = false;
  if (location.hash === '#financeWalkthrough') panel.scrollIntoView();
}
