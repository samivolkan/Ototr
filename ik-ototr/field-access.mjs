export function financialAccess(sync,unit){return !sync||sync.access.some(a=>(!unit||a.unit===unit)&&a.can_write);}
export function applyFieldAccess(store,sync){
 store.permissions=sync?{financial:financialAccess(sync,store.scope),identity:!!sync.capabilities?.identity,health:!!sync.capabilities?.health,discipline:!!sync.capabilities?.discipline}:{financial:true,identity:true,health:true,discipline:true};
}
export function protectFields(store,root=document){
 const p=store.permissions;if(!p)return;
 const fields=[...(!p.identity?['identity','bank','iban']:[]),...(!p.health?['disability','bloodGroup']:[])];
 for(const name of fields)for(const el of root.querySelectorAll(`[name="${name}"]`)){el.value='';el.readOnly=true;el.title='Bu alan için sunucu yetkiniz yok';const label=el.closest('label');if(label&&!label.querySelector('.restricted-field')){const note=document.createElement('small');note.className='restricted-field';note.textContent='Kısıtlı alan';label.append(note);}}
}
