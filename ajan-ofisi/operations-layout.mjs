const main=document.querySelector('main'),lead=main.querySelector('.lead');
const section=id=>document.querySelector(id)?.closest('section');
const personal=section('#decisionDeskStatus'),team=section('#internal');
personal.querySelector('h2').textContent='Benden hangi karar isteniyor?';
const cards=document.createElement('div');cards.id='personalDecisionPreview';personal.append(cards);
lead.after(personal);personal.after(team);
function fold(nodes,title){const d=document.createElement('details');d.className='control-fold';d.innerHTML='<summary></summary>';d.querySelector('summary').textContent=title;main.append(d);nodes.filter(Boolean).forEach(n=>d.append(n));return d;}
const pending=fold([section('#routingStatus')],'Hazırlık bekleyen bağlantılar');const note=document.createElement('p');note.id='pendingSources';note.textContent='Kaynaklar kontrol ediliyor…';pending.prepend(note);pending.querySelector('summary').after(note);
fold([section('#sources'),section('#task2Handoff'),document.querySelector('#workerPanel'),section('#decisions')],'Kaynaklar, devirler ve teknik ayrıntılar');
const finance=[...main.querySelectorAll(':scope > section')].find(s=>s.querySelector('a[href="finance-health.html"]'));if(finance)pending.append(finance);
