const {chromium}=require('playwright');
const http=require('http');
const fs=require('fs');
const path=require('path');

const root=path.resolve(__dirname,'..');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.webmanifest':'application/manifest+json'};
const server=http.createServer((request,response)=>{
  let file=path.join(root,decodeURIComponent(request.url.split('?')[0]));
  if(file.endsWith(path.sep))file=path.join(file,'index.html');
  if(!file.startsWith(root)||!fs.existsSync(file)){response.writeHead(404);response.end();return;}
  response.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');
  response.setHeader('Cache-Control','no-store');
  fs.createReadStream(file).pipe(response);
});

const assert=(value,message)=>{if(!value)throw new Error(message)};

(async()=>{
  await new Promise(resolve=>server.listen(4180,'127.0.0.1',resolve));
  const browser=await chromium.launch({headless:true,executablePath:'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'});
  const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(()=>{
    const managerMode=sessionStorage.getItem('managerMode')==='1';
    const userId='11111111-1111-4111-8111-111111111111';
    const otherUserId='22222222-2222-4222-8222-222222222222';
    const projectId='33333333-3333-4333-8333-333333333333';
    const categoryId='44444444-4444-4444-8444-444444444444';
    const now='2026-08-18T09:00:00.000Z';
    const db={
      task_projects:[{id:projectId,branch_id:'77777777-7777-4777-8777-777777777777',name:'OTOTR Referans Şube Dönüşümü',description:'',status:'active',target_date:null,progress_percent:0,archived_at:null,created_at:now}],
      task_categories:[{id:categoryId,project_id:projectId,name:'Dükkan İçi / Dış Tasarım',description:'',sort_order:1,archived_at:null}],
      task_tasks:[
        {id:'55555555-5555-4555-8555-555555555555',project_id:projectId,category_id:categoryId,title:'Tabela iç görselleri',description:'Mevcut ölçüleri kontrol et.',status:'todo',priority:'high',due_at:'2026-08-22T14:00:00.000Z',requires_approval:false,requires_evidence:false,sort_order:1,created_by:userId,archived_at:null,created_at:now,updated_at:now,task_assignees:[{user_id:userId}]},
        {id:'66666666-6666-4666-8666-666666666666',project_id:projectId,category_id:categoryId,title:'Dış cephe fotoğrafları',description:null,status:'doing',priority:'medium',due_at:null,requires_approval:false,requires_evidence:false,sort_order:2,created_by:otherUserId,archived_at:null,created_at:now,updated_at:now,task_assignees:[]}
      ]
    };
    const members=[
      {user_id:userId,full_name:'Ahmet Usta',role:'INSPECTION_TECHNICIAN'},
      {user_id:otherUserId,full_name:'Şube Yöneticisi',role:'BRANCH_MANAGER'}
    ];
    const managedUsers=[
      {user_id:userId,auth_user_id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',full_name:'Ahmet Usta',email:'ahmet.usta@ototr.test',role:'BRANCH_MANAGER',is_active:true},
      {user_id:otherUserId,auth_user_id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',full_name:'Şube Yöneticisi',email:'yonetici@ototr.test',role:'BRANCH_MANAGER',is_active:true}
    ];

    function builder(table){
      const query={table,filters:{},select(){return this},is(key,value){this.filters[key]=value;return this},order(){return this},limit(){return this},single(){this.wantSingle=true;return this},eq(key,value){this.filters[key]=value;return this},insert(){return this},update(){return this},delete(){return this},then(resolve){
        let data=(db[this.table]||[]).filter(row=>Object.entries(this.filters).every(([key,value])=>row[key]===value));
        resolve({data:this.wantSingle?(data[0]||null):structuredClone(data),error:null});
      }};
      return query;
    }

    window.__fakeClient={
      auth:{
        getSession:async()=>({data:{session:{user:{email:'ahmet.usta@ototr.test'}}},error:null}),
        setSession:async()=>({data:{session:{user:{email:'ahmet.usta@ototr.test'}}},error:null}),
        signInWithPassword:async()=>({data:{session:{user:{email:'ahmet.usta@ototr.test'}}},error:null}),
        signOut:async()=>({error:null})
      },
      from:builder,
      functions:{invoke:async(_name,{body})=>{
        const newId='99999999-9999-4999-8999-999999999999';
        const user={user_id:newId,auth_user_id:'cccccccc-cccc-4ccc-8ccc-cccccccccccc',full_name:body.fullName,email:body.email,role:body.role,is_active:true};
        managedUsers.push(user);
        members.push({user_id:newId,full_name:body.fullName,role:body.role});
        return {data:structuredClone(user),error:null};
      }},
      rpc:async(name,args={})=>{
        if(name==='task_current_user_context')return {data:[{app_user_id:userId,full_name:'Ahmet Usta',email:'ahmet.usta@ototr.test',role:managerMode?'BRANCH_MANAGER':'INSPECTION_TECHNICIAN',branch_id:'77777777-7777-4777-8777-777777777777',can_manage_projects:managerMode}],error:null};
        if(name==='list_task_project_members')return {data:structuredClone(members),error:null};
        if(name==='list_task_project_users')return {data:structuredClone(managedUsers),error:null};
        if(name==='create_task_for_project'){
          const created={id:`88888888-8888-4888-8888-${String(db.task_tasks.length).padStart(12,'0')}`,project_id:args.target_project_id,category_id:args.target_category_id,title:args.task_title,description:args.task_description,status:'todo',priority:args.task_priority,due_at:args.task_due_at,requires_approval:false,requires_evidence:false,sort_order:db.task_tasks.length+1,created_by:userId,archived_at:null,created_at:new Date().toISOString(),updated_at:new Date().toISOString(),task_assignees:(args.assignee_user_ids??[userId]).map(assignedId=>({user_id:assignedId}))};
          db.task_tasks.push(created);
          return {data:structuredClone(created),error:null};
        }
        if(name==='update_task_for_project'){
          const task=db.task_tasks.find(item=>item.id===args.target_task_id);
          Object.assign(task,{category_id:args.target_category_id,title:args.task_title,description:args.task_description,priority:args.task_priority,due_at:args.task_due_at,updated_at:new Date().toISOString(),task_assignees:(args.assignee_user_ids||[]).map(assignedId=>({user_id:assignedId}))});
          return {data:structuredClone(task),error:null};
        }
        if(name==='archive_task_for_project'){
          const task=db.task_tasks.find(item=>item.id===args.target_task_id);
          Object.assign(task,{archived_at:new Date().toISOString(),updated_at:new Date().toISOString()});
          return {data:structuredClone(task),error:null};
        }
        if(name==='update_task_project_user'){
          const user=managedUsers.find(item=>item.user_id===args.target_user_id);
          Object.assign(user,{full_name:args.target_full_name,role:args.target_role,is_active:args.target_is_active});
          const member=members.find(item=>item.user_id===args.target_user_id);
          if(member)Object.assign(member,{full_name:args.target_full_name,role:args.target_role});
          return {data:structuredClone(user),error:null};
        }
        if(name==='update_task_with_version'){
          const task=db.task_tasks.find(item=>item.id===args.target_task_id);
          Object.assign(task,args.patch,{updated_at:new Date().toISOString()});
          return {data:structuredClone(task),error:null};
        }
        return {data:null,error:null};
      },
      channel(){return {on(){return this},subscribe(){return this}}},
      removeChannel:async()=>({error:null})
    };
  });
  await page.route('**/task-merkezi-v2/js/vendor/supabase.js',route=>route.fulfill({
    status:200,
    contentType:'text/javascript; charset=utf-8',
    body:'export function createClient(){return window.__fakeClient}'
  }));

  await page.goto('http://127.0.0.1:4180/task-merkezi-v2/',{waitUntil:'networkidle'});
  await page.getByRole('heading',{name:'OTOTR Referans Şube Dönüşümü'}).waitFor();
  assert(await page.locator('.task-card').count()===2,'Task listesi yüklenmedi.');
  assert(!(await page.locator('body').innerText()).includes('#task_'),'Teknik task kimliği arayüzde görünüyor.');

  await page.getByRole('button',{name:/Tasklarım/}).click();
  assert(await page.locator('.task-card').count()===1,'Tasklarım filtresi doğru çalışmıyor.');

  await page.locator('.task-card').getByRole('button',{name:'Düzenle'}).click();
  await page.getByLabel('Task başlığı').fill('Tabela iç görselleri güncel');
  await page.getByRole('button',{name:'Değişiklikleri kaydet'}).click();
  await page.getByText('Task güncellendi.').waitFor();
  assert(await page.locator('.task-card').filter({hasText:'Tabela iç görselleri güncel'}).count()===1,'Task sahibi kendi taskını düzenleyemedi.');

  await page.getByRole('button',{name:'+ Yeni task',exact:true}).click();
  await page.getByLabel('Task başlığı').fill('Giriş alanı kontrolü');
  await page.getByLabel('Açıklama').fill('Mobil arayüzden oluşturulan kontrol taskı.');
  await page.locator('.modal select[name="category"]').selectOption('44444444-4444-4444-8444-444444444444');
  assert((await page.locator('.self-assignment').innerText()).includes('otomatik olarak size atanır'),'Personel self-assignment bilgisi yok.');
  await page.getByRole('button',{name:'Task oluştur',exact:true}).click();
  await page.getByText('Task oluşturuldu ve listenize eklendi.').waitFor();

  const created=page.locator('.task-card').filter({hasText:'Giriş alanı kontrolü'});
  await created.waitFor();
  await created.locator('.status-select').selectOption('doing');
  await page.getByText(/Task “Giriş alanı kontrolü” güncellendi/).waitFor();
  assert(await created.locator('.status-select').inputValue()==='doing','Task durum takibi güncellenmedi.');
  assert(await page.locator('body').evaluate(element=>element.scrollWidth<=window.innerWidth),'Mobil yatay taşma var.');

  await page.evaluate(()=>sessionStorage.setItem('managerMode','1'));
  await page.reload({waitUntil:'networkidle'});
  await page.getByRole('heading',{name:'OTOTR Referans Şube Dönüşümü'}).waitFor();

  await page.getByRole('button',{name:/Ekip 2/}).click();
  assert(await page.locator('.team-user').count()===2,'Ekip kullanıcıları yüklenmedi.');
  await page.getByRole('button',{name:'+ Kullanıcı ekle'}).click();
  await page.getByLabel('Ad soyad').fill('Yeni Personel');
  await page.getByLabel('E-posta').fill('yeni.personel@ototr.test');
  await page.locator('#userForm select[name="role"]').selectOption('RECEPTION_STAFF');
  await page.locator('#newUserPassword').fill('Guvenli123!');
  await page.getByRole('button',{name:'Kullanıcı oluştur'}).click();
  await page.getByText('Kullanıcı oluşturuldu ve girişe hazır.').waitFor();
  let newUser=page.locator('.team-user').filter({hasText:'Yeni Personel'});
  await newUser.waitFor();
  assert((await newUser.innerText()).includes('Aktif'),'Yeni kullanıcı aktif oluşturulmadı.');

  await newUser.getByRole('button',{name:'Düzenle'}).click();
  await page.getByLabel('Ad soyad').fill('Yeni Personel Güncel');
  await page.getByRole('button',{name:'Kaydet',exact:true}).click();
  await page.getByText('Kullanıcı güncellendi.').waitFor();
  newUser=page.locator('.team-user').filter({hasText:'Yeni Personel Güncel'});
  await newUser.getByRole('button',{name:'Kaldır'}).click();
  await page.getByRole('button',{name:'Kullanıcıyı kaldır'}).click();
  await page.getByText('Kullanıcı Task Merkezi’nden kaldırıldı.').waitFor();
  newUser=page.locator('.team-user').filter({hasText:'Yeni Personel Güncel'});
  assert((await newUser.innerText()).includes('Pasif'),'Kullanıcı erişimi kapatılmadı.');
  await page.getByRole('button',{name:'Pencereyi kapat'}).click();

  await page.getByRole('button',{name:'+ Yeni task',exact:true}).click();
  assert(await page.locator('.member-options input[name="assignees"]').count()===2,'Yönetici kişi seçimi yüklenmedi.');
  await page.locator('.member-options input[value="22222222-2222-4222-8222-222222222222"]').check();
  await page.getByLabel('Task başlığı').fill('İki sorumlu taskı');
  await page.locator('.modal select[name="category"]').selectOption('44444444-4444-4444-8444-444444444444');
  await page.getByRole('button',{name:'Task oluştur',exact:true}).click();
  await page.getByText('Task oluşturuldu ve listenize eklendi.').waitFor();
  let managerTask=page.locator('.task-card').filter({hasText:'İki sorumlu taskı'});
  assert((await managerTask.innerText()).includes('Şube Yöneticisi'),'Seçilen sorumlu task kartında görünmüyor.');
  await managerTask.getByRole('button',{name:'Düzenle'}).click();
  await page.getByLabel('Task başlığı').fill('Güncellenen yönetici taskı');
  await page.getByRole('button',{name:'Değişiklikleri kaydet'}).click();
  await page.getByText('Task güncellendi.').waitFor();
  managerTask=page.locator('.task-card').filter({hasText:'Güncellenen yönetici taskı'});
  await managerTask.getByRole('button',{name:'Sil'}).click();
  await page.getByRole('button',{name:'Taskı sil'}).click();
  await page.getByText('Task silindi.').waitFor();
  assert(await page.locator('.task-card').filter({hasText:'Güncellenen yönetici taskı'}).count()===0,'Silinen task listeden kaldırılmadı.');
  assert(errors.length===0,errors.join('; '));

  console.log('PASS — V2 oturum, ekip ekleme/düzenleme/kaldırma, task CRUD, kişi atama ve mobil görünüm');
  await browser.close();
  server.close();
})().catch(error=>{console.error(error);server.close();process.exit(1)});
