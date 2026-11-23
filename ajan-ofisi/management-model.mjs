export const STATES = { planned:'Planlandı', reviewing:'İncelemede', blocked:'Bağımlılık bekliyor', ready:'İnceleme paketi hazır' };
export function cleanNotes(raw, modules) {
  const result = {};
  for (const m of modules) {
    const item = raw?.[m.id];
    if (item && Object.hasOwn(STATES,item.state)) result[m.id] = {state:item.state,note:typeof item.note==='string'?item.note.slice(0,1200):''};
  }
  return result;
}
export function selectedModules(modules, query='', filter='all') {
  const q=query.toLocaleLowerCase('tr');
  return modules.filter(m=>(filter==='all'||(filter==='current'&&m.kind==='existing')||(filter==='proposed'&&m.kind==='proposed')||(filter==='first'&&m.phase===1)) && [m.name,m.mission,...m.agents.map(a=>a.name)].join(' ').toLocaleLowerCase('tr').includes(q));
}
export function planningSummary(data,notes={}) {
  return ['OTOTR · Yönetim çalışma planı','Planlama kaydıdır; canlı görev veya onay kuyruğu değildir.',
    `Sınırlar: ${data.limits.queue} karar / ${data.limits.dailyMinutes} dk günlük hedef / ${data.limits.weeklyMinutes/60} saat haftalık üst sınır.`,
    ...[...data.modules].sort((a,b)=>a.phase-b.phase).map(m=>`\n${m.name} · ${m.manager} · ${m.window}\nDurum: ${STATES[notes[m.id]?.state]||STATES.planned}\nSonraki adım: ${m.next}\nSami kararı: ${m.decision}\nBağımlılık: ${m.dependencies.join(', ')||'Başlangıç incelemesi'}\n${notes[m.id]?.note ? 'Yerel not: '+notes[m.id].note : ''}`)
  ].join('\n');
}
