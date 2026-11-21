/* ---------- HOME ---------- */
import { TODAY, diffD, esc, parse } from '../core/utils.js';
import { ic } from '../core/icons.js';
import { D, S, allTasks, isOver, pColor, proj } from '../core/store.js';
import { empty } from '../ui/helpers.js';
import { sortTasks } from '../shell/view-engine.js';
import { miniRow } from '../components/task-list.js';

export function pageHome() {
  const h = new Date().getHours();
  const greet = h < 12 ? 'Günaydın' : h < 18 ? 'İyi günler' : 'İyi akşamlar';
  const all = allTasks();
  const mineAll = all.filter(t => t.assignee === D().me);
  const open = all.filter(t => t.status !== 'done');
  const over = all.filter(isOver);
  const tab = S.ui.homeTab;
  const lists = {
    upcoming: sortTasks(
      mineAll.filter(t => t.status !== 'done' && !isOver(t)),
      { f: 'due', dir: 1 },
    ),
    overdue: mineAll.filter(isOver),
    completed: sortTasks(
      mineAll.filter(t => t.status === 'done'),
      { f: 'updated', dir: 1 },
    ),
  };
  const cur = lists[tab].slice(0, 7);
  const dl = (lab, a, b) => {
    const ts = sortTasks(
      open.filter(t => t.due && diffD(parse(t.due), TODAY) >= a && diffD(parse(t.due), TODAY) <= b),
      { f: 'priority', dir: 1 },
    );
    return { lab, ts };
  };
  const dls = [dl('Bugün', 0, 0), dl('Yarın', 1, 1), dl('Bu hafta', 2, 7)];
  return `<div class="page">
    <div class="ph"><div><h1>${greet}, ${esc(S.prefs.name.split(' ')[0])}</h1><p><span class="num">${new Intl.DateTimeFormat('tr-TR',{weekday:'long',day:'numeric',month:'long'}).format(TODAY)}</span></p></div>
      <div class="acts"><button class="btn btn-secondary hide-m" data-a="invite">${ic('user-plus', 14)}Üye davet et</button><button class="btn btn-secondary hide-m" data-a="newProject">${ic('folder-plus', 14)}Yeni proje</button><button class="btn btn-primary" data-a="newTask">${ic('plus', 14)}Yeni görev</button></div></div>
    <div class="stats home-stats" style="margin-bottom:16px">
      <button class="stat" data-a="goTasks" data-f="open"><span class="k">${ic('circle-dashed', 14)}Open tasks</span><span class="v">${open.length}</span><span class="d">${open.filter(t => t.assignee === D().me).length} assigned to you</span></button>
      <button class="stat" data-a="goTasks" data-f="overdue"><span class="k">${ic('clock-alert', 14)}Overdue</span><span class="v" style="${over.length ? 'color:var(--red)' : ''}">${over.length}</span><span class="d ${over.length ? 'bad' : ''}">${over.length ? 'need attention' : 'all on track'}</span></button>
    </div>
    <div class="grid2">
      <div class="stack">
        <section class="panel" aria-labelledby="h-mytasks">
          <div class="panel-h mytasks-panel-h"><h2 id="h-mytasks">My tasks</h2>
            <div class="acts"><div class="seg" role="tablist">${[
              ['upcoming', 'Upcoming'],
              ['overdue', 'Overdue'],
              ['completed', 'Completed'],
            ]
              .map(
                ([k, n]) =>
                  `<button role="tab" class="${tab === k ? 'on' : ''}" data-a="set" data-k="homeTab" data-v="${k}">${n} <span class="faint tab-count">${lists[k].length}</span></button>`,
              )
              .join('')}</div>
            <button class="ibtn ibtn-sm" data-a="go" data-r="mytasks" data-tip="Open My Tasks" aria-label="Open My Tasks">${ic('arrow-up-right', 15)}</button></div></div>
          ${cur.length ? cur.map(t => miniRow(t, { av: false })).join('') : empty(tab === 'overdue' ? 'circle-check' : 'list-checks', tab === 'overdue' ? 'Nothing overdue' : 'No tasks here', tab === 'overdue' ? 'Every task assigned to you is on schedule.' : 'Add a task to get things moving.', '', 'sm')}
          ${lists[tab].length > 7 ? `<button class="addrow" style="padding-left:14px;border-top:1px solid var(--divider);border-bottom:0" data-a="go" data-r="mytasks">View all ${lists[tab].length} tasks ${ic('arrow-right', 13)}</button>` : ''}
        </section>
      </div>
      <div class="stack">
        <section class="panel">
          <div class="panel-h"><h2>Upcoming deadlines</h2><div class="acts"><button class="btn btn-sm btn-ghost" data-a="go" data-r="calendar">${ic('calendar', 13)}Calendar</button></div></div>
          <div class="panel-b" style="padding-bottom:6px">
          ${dls
            .map(
              g => `<div style="margin-bottom:10px"><div class="row" style="font-size:11.5px;font-weight:600;color:var(--text-2);margin-bottom:4px">${g.lab}<span class="faint" style="font-weight:500">${g.ts.length}</span></div>
            ${
              g.ts.length
                ? g.ts
                    .slice(0, 4)
                    .map(
                      t =>
                        `<div class="row" style="height:30px;cursor:pointer;gap:8px;font-size:13px" data-a="openTask" data-id="${t.id}"><span class="pdot" style="--c:${pColor(proj(t.project))}"></span><span class="trunc grow">${esc(t.title)}</span></div>`,
                    )
                    .join('') + (g.ts.length > 4 ? `<div class="faint" style="font-size:11.5px;padding-left:16px">+${g.ts.length - 4} more</div>` : '')
                : `<div class="faint" style="font-size:12.5px;padding:4px 0 2px">Nothing due</div>`
            }</div>`,
            )
            .join('')}
          </div>
        </section>
      </div>
    </div>
  </div>`;
}
