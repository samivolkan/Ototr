import {HrStore as Base} from './parity.mjs';
import {seed} from './demo-seed.mjs';
export {seed};
// Presentation scope for fictional data; not server authorization.
export class HrStore extends Base {
 constructor(data=seed(),options={}){super(data,options);this.scope='';}
 restore(data){if(data?.demoScenario!=='ototr-network-v1')throw Error('İK OTOTR bayi demo yedeği seçin. İK2 şablon yedekleri bu alana yüklenmez.');return super.restore(data);}
 setScope(branch){if(branch&&!this.state.settings.branches.includes(branch))throw Error('Birim bulunamadı.');this.scope=branch;}
 managerOptions(employee){const rows=this.readable('employees').filter(e=>e.status==='active'&&e.id!==employee.id);if(employee.managerId&&!rows.some(e=>e.id===employee.managerId))rows.push(this.employee(employee.managerId));return rows.map(e=>[e.id,e.name]);}
 inScope(id){return !this.scope||this.state.employees.some(e=>e.id===id&&e.branch===this.scope);}
 allowedEmployee(id){return this.inScope(id)&&super.allowedEmployee(id);}
 allowedRoute(route,id){if(this.permissions?.financial===false&&['payroll','compensation','reports','expenses','integrations'].includes(route))return false;return (route!=='employee'||this.inScope(id))&&super.allowedRoute(route,id);}
 readable(collection){let rows=super.readable(collection);if(!this.scope)return rows;const allowed=id=>this.inScope(id);
  if(collection==='employees')return rows.filter(e=>e.branch===this.scope);
  if(collection==='payrolls')return rows.map(p=>({...p,rows:p.rows.filter(r=>allowed(r.employeeId))})).filter(p=>p.rows.length);
  return rows.filter(r=>r.employeeId?allowed(r.employeeId):r.branch?r.branch===this.scope:r.participants?r.participants.some(allowed):r.actor?allowed(r.actor):true).map(r=>r.participants?{...r,participants:r.participants.filter(allowed),scores:(r.scores||[]).filter(x=>allowed(x.employeeId)),proposals:(r.proposals||[]).filter(x=>allowed(x.employeeId)),reviewerAssignments:(r.reviewerAssignments||[]).filter(x=>allowed(x.employeeId)),reviews:(r.reviews||[]).filter(x=>allowed(x.employeeId))}:r);
 }
 saveRecord(collection,input,id){return super.saveRecord(collection,{...input,...(!id&&this.scope&&!input.employeeId?{branch:this.scope}:{})},id);}
}
