(function(){
  'use strict';

  const STORAGE_KEY='ototr-test-master-admin-v1';
  const MAX_HISTORY=30;
  const ROW_TYPES=['CONTROL','METADATA','QUERY','EVIDENCE','DERIVED'];
  const INPUT_TYPES=['STATUS','BOOLEAN','ENUM','ENUM_RESULT','TEXT','TEXTAREA','NUMBER','NUMERIC_KM','MEASUREMENT','REF','DATE','DATETIME','TIME','YEAR','SIGNATURE','AUTO_REFERENCE','AUTO_DERIVED','EVIDENCE_FILE','QUERY_RESULT','STRUCTURAL_STATUS','BODY_STATUS','MODULE_SCAN'];
  const APPLICABILITY=['ALWAYS','IF_PRESENT','IF_SAFE_TO_TEST','IF_EQUIPPED','IF_PACKAGE_ACTIVE','IF_SECTION_ACTIVE','IF_SELECTED','CONDITIONAL'];
  const REQUIRED_POLICIES=['REQUIRED','OPTIONAL','REQUIRED_BY_WORK_ORDER','REQUIRED_BY_TEST','REQUIRED_IF_SECTION_ACTIVE','REQUIRED_IF_PRESENT','REQUIRED_IF_SAFE','AUTO_DERIVED_REQUIRED'];
  const FINAL_GROUPS=['NONE','KAPORTA_BOYA','SASI_YAPISAL','MOTOR_MEKANIK','ELEKTRIK_ELEKTRONIK','FREN_SUSPANSIYON_LASTIK','AIRBAG_SRS'];
  const LOCK_STATUSES=['KİLİTLİ','DÜZENLENEBİLİR','TASLAK'];

  const ui={
    master:null,
    activeSectionId:null,
    selected:null,
    openCategories:{},
    view:'tree',
    filters:{query:'',rowType:'ALL',activity:'ACTIVE',counted:false,allSections:false},
    notice:null,
    searchFocus:false,
    past:[],
    future:[],
    lastSavedAt:null,
    dragging:null
  };

  const clone=value=>typeof structuredClone==='function'?structuredClone(value):JSON.parse(JSON.stringify(value));
  const esc=value=>String(value??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
  const ico=name=>`<i data-lucide="${esc(name)}"></i>`;
  const nowLabel=()=>new Date().toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'});
  const uid=prefix=>`${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`;
  const asBool=value=>value===true||String(value).toLowerCase()==='true'||String(value).toLocaleUpperCase('tr-TR')==='EVET';

  function seed(){
    if(!window.OTOTR_TEST_MASTER_SEED) throw new Error('OtoTR test master başlangıç verisi bulunamadı.');
    return clone(window.OTOTR_TEST_MASTER_SEED);
  }

  function initialize(){
    if(ui.master) return;
    let loaded=null;
    try{
      const raw=localStorage.getItem(STORAGE_KEY);
      if(raw) loaded=JSON.parse(raw);
    }catch(error){}
    ui.master=loaded&&Array.isArray(loaded.sections)?loaded:seed();
    normalizeMaster();
    ui.activeSectionId=ui.master.sections[0]?.id||null;
    ui.selected=ui.activeSectionId?{kind:'section',id:ui.activeSectionId}:null;
    const firstCategory=ui.master.sections[0]?.categories?.[0];
    if(firstCategory) ui.openCategories[firstCategory.id]=true;
  }

  function normalizeMaster(){
    const master=ui.master;
    master.schemaVersion=master.schemaVersion||'1.0.0';
    master.masterVersion=master.masterVersion||'CUSTOM';
    master.title=master.title||'OtoTR Ekspertiz Masterı';
    master.source=master.source||{};
    master.referenceData=master.referenceData||{};
    master.validationPolicy=master.validationPolicy||{};
    master.sections=Array.isArray(master.sections)?master.sections:[];
    master.sections.forEach((section,sectionIndex)=>{
      section.id=section.id||uid('section');
      section.code=String(section.code??'').trim();
      section.name=String(section.name??'').trim();
      section.active=section.active!==false;
      section.order=sectionIndex+1;
      section.categories=Array.isArray(section.categories)?section.categories:[];
      section.categories.forEach((category,categoryIndex)=>{
        category.id=category.id||uid('category');
        category.code=String(category.code??'').trim();
        category.name=String(category.name??'').trim();
        category.active=category.active!==false;
        category.order=categoryIndex+1;
        category.items=Array.isArray(category.items)?category.items:[];
        category.items.forEach((item,itemIndex)=>{
          item.id=item.id||uid('item');
          item.code=String(item.code??'').trim();
          item.label=String(item.label??'').trim();
          item.rowType=item.rowType||'CONTROL';
          item.inputType=item.inputType||'STATUS';
          item.applicability=item.applicability||'ALWAYS';
          item.requiredPolicy=item.requiredPolicy||'REQUIRED';
          item.countInTotal=asBool(item.countInTotal);
          item.active=item.active!==false;
          item.finalResultGroup=item.finalResultGroup||'NONE';
          item.lockStatus=item.lockStatus||'DÜZENLENEBİLİR';
          item.order=itemIndex+1;
        });
      });
    });
    master.stats=calculateStats(master);
  }

  function calculateStats(master=ui.master){
    const sections=master.sections||[];
    const categories=sections.flatMap(section=>section.categories||[]);
    const items=categories.flatMap(category=>category.items||[]);
    return {
      sections:sections.length,
      categories:categories.length,
      treeItems:items.length,
      mainRows:items.filter(item=>item.origin==='01_KONTROL_MASTER').length,
      countedControls:items.filter(item=>item.active&&item.rowType==='CONTROL'&&item.countInTotal).length,
      evidenceDefinitions:items.filter(item=>item.origin==='07_KANIT_MASTER').length,
      finalDecisionRules:items.filter(item=>item.origin==='09_NIHAI_KANAAT').length
    };
  }

  function saveMaster(){
    normalizeMaster();
    ui.master.source.lastModifiedAt=new Date().toISOString();
    ui.master.source.lastModifiedIn='OTOTR CRM Ekspertiz Masterı';
    try{ localStorage.setItem(STORAGE_KEY,JSON.stringify(ui.master)); }catch(error){}
    ui.lastSavedAt=nowLabel();
  }

  function allItems(){ return ui.master.sections.flatMap(section=>section.categories.flatMap(category=>category.items)); }
  function sectionById(id){ return ui.master.sections.find(section=>section.id===id)||null; }
  function categoryById(id){
    for(const section of ui.master.sections){
      const category=section.categories.find(entry=>entry.id===id);
      if(category) return {section,category};
    }
    return null;
  }
  function itemById(id){
    for(const section of ui.master.sections){
      for(const category of section.categories){
        const item=category.items.find(entry=>entry.id===id);
        if(item) return {section,category,item};
      }
    }
    return null;
  }
  function selectedRecord(){
    if(!ui.selected) return null;
    if(ui.selected.kind==='section') return {kind:'section',section:sectionById(ui.selected.id)};
    if(ui.selected.kind==='category') return {kind:'category',...categoryById(ui.selected.id)};
    if(ui.selected.kind==='item') return {kind:'item',...itemById(ui.selected.id)};
    return null;
  }

  function historyPush(){
    ui.past.push(JSON.stringify(ui.master));
    if(ui.past.length>MAX_HISTORY) ui.past.shift();
    ui.future=[];
  }

  function mutate(callback,message){
    historyPush();
    callback();
    normalizeMaster();
    saveMaster();
    ui.notice=message?{tone:'success',text:message}:null;
    renderRoot();
  }

  function undo(){
    if(!ui.past.length) return;
    ui.future.push(JSON.stringify(ui.master));
    ui.master=JSON.parse(ui.past.pop());
    normalizeMaster();
    saveMaster();
    ensureSelection();
    ui.notice={tone:'success',text:'Son değişiklik geri alındı.'};
    renderRoot();
  }

  function redo(){
    if(!ui.future.length) return;
    ui.past.push(JSON.stringify(ui.master));
    ui.master=JSON.parse(ui.future.pop());
    normalizeMaster();
    saveMaster();
    ensureSelection();
    ui.notice={tone:'success',text:'Değişiklik yeniden uygulandı.'};
    renderRoot();
  }

  function ensureSelection(){
    const selected=selectedRecord();
    if(selected&&(selected.section||selected.category||selected.item)) return;
    const section=ui.master.sections[0];
    ui.activeSectionId=section?.id||null;
    ui.selected=section?{kind:'section',id:section.id}:null;
  }

  function validationIssues(){
    const issues=[];
    const seenSections=new Map(),seenItems=new Map();
    const addDuplicate=(map,code,type,label)=>{
      const key=String(code||'').trim().toLocaleUpperCase('tr-TR');
      if(!key){ issues.push({tone:'error',title:`${type} kodu boş`,detail:label||'Adsız kayıt'}); return; }
      if(map.has(key)) issues.push({tone:'error',title:`Mükerrer ${type.toLocaleLowerCase('tr-TR')} kodu: ${code}`,detail:`${map.get(key)} ve ${label}`});
      else map.set(key,label);
    };
    const nonCounted=new Set(ui.master.validationPolicy?.nonCountedRowTypes||['METADATA','QUERY','EVIDENCE','DERIVED']);
    const forbidden=ui.master.validationPolicy?.forbiddenActiveTokens||[];
    ui.master.sections.forEach(section=>{
      const seenCategories=new Map();
      addDuplicate(seenSections,section.code,'Bölüm',section.name);
      if(!section.name) issues.push({tone:'error',title:`${section.code||'Kod yok'} bölüm adı boş`,detail:'Bölüm adı zorunludur.'});
      if(!section.categories.length) issues.push({tone:'warning',title:`${section.code} bölümünde kategori yok`,detail:section.name});
      section.categories.forEach(category=>{
        addDuplicate(seenCategories,category.code,'Kategori',category.name);
        if(!category.name) issues.push({tone:'error',title:`${category.code||'Kod yok'} kategori adı boş`,detail:section.name});
        if(!category.items.length) issues.push({tone:'warning',title:`${category.code} kategorisi boş`,detail:category.name});
        category.items.forEach(item=>{
          addDuplicate(seenItems,item.code,'Alt madde',item.label);
          if(!item.label) issues.push({tone:'error',title:`${item.code||'Kod yok'} madde adı boş`,detail:`${section.name} / ${category.name}`});
          if(item.countInTotal&&item.rowType!=='CONTROL') issues.push({tone:'error',title:`${item.code} yanlışlıkla sayaca dahil`,detail:`${item.rowType} satırı teknik kontrol sayılmaz.`});
          if(nonCounted.has(item.rowType)&&item.countInTotal) issues.push({tone:'error',title:`${item.code} sayım kuralını ihlal ediyor`,detail:`${item.rowType} için COUNT_IN_TOTAL kapalı olmalıdır.`});
          const haystack=`${item.code} ${item.label}`.toLocaleUpperCase('tr-TR');
          forbidden.forEach(token=>{ if(item.active&&haystack.includes(String(token).toLocaleUpperCase('tr-TR'))) issues.push({tone:'error',title:`Yasaklı aktif kayıt: ${item.code}`,detail:`Kilitli karara göre “${token}” masterda aktif olamaz.`}); });
        });
      });
    });
    const expected=Number(ui.master.validationPolicy?.expectedCountedControls||0);
    const current=calculateStats().countedControls;
    if(expected&&current!==expected) issues.push({tone:'warning',title:`Kontrol sayısı ${current}`,detail:`Kilitli başlangıç masterı ${expected} kontroldü. Bu değişiklik bilinçliyse JSON sürüm notuna ekleyin.`});
    if(!issues.some(issue=>issue.tone==='error')) issues.unshift({tone:'info',title:'Yapısal doğrulama başarılı',detail:'Kod, sayım ve yasaklı alan kontrollerinde engelleyici hata bulunmadı.'});
    return issues;
  }

  function options(values,current){ return values.map(value=>`<option value="${esc(value)}" ${String(current)===String(value)?'selected':''}>${esc(value)}</option>`).join(''); }
  function chipClass(rowType){ return String(rowType||'').toLowerCase(); }
  function sectionCounts(section){
    const items=section.categories.flatMap(category=>category.items);
    return {items:items.length,controls:items.filter(item=>item.active&&item.rowType==='CONTROL'&&item.countInTotal).length};
  }

  function renderCommand(){
    const stats=calculateStats();
    const issueCounts=validationIssues().reduce((acc,issue)=>{acc[issue.tone]=(acc[issue.tone]||0)+1;return acc;},{});
    const saved=ui.lastSavedAt?`Kaydedildi · ${ui.lastSavedAt}`:'Otomatik kayıt açık';
    return `<div class="tm-command">
      <div class="tm-command-top">
        <div class="tm-command-title"><div class="tm-command-mark">${ico('list-tree')}</div><div><h2>Ekspertiz Test Masterı</h2><p>${esc(ui.master.masterVersion)} · Excel’de kilitlenen test, kategori, kanıt ve nihai kanaat ağacı</p></div></div>
        <div class="tm-command-actions">
          <span class="tm-save-state">${ico('cloud-check')}${esc(saved)}</span>
          <button class="btn" data-tm-action="undo" ${ui.past.length?'':'disabled'}>${ico('undo-2')}Geri Al</button>
          <button class="btn" data-tm-action="redo" ${ui.future.length?'':'disabled'}>${ico('redo-2')}Yinele</button>
          <button class="btn" data-tm-action="import">${ico('upload')}JSON İçe Al</button>
          <button class="btn" data-tm-action="copy-json">${ico('copy')}JSON Kopyala</button>
          <button class="btn primary" data-tm-action="export">${ico('download')}JSON Dışa Aktar</button>
          <input id="tmImportInput" type="file" accept="application/json,.json" hidden>
        </div>
      </div>
      <div class="tm-view-tabs">
        ${[['tree','Master Ağacı',stats.treeItems],['changes','Karar & Değişiklik Logu',ui.master.referenceData?.changeLog?.length||0],['dictionary','Sözlük & Kurallar',(ui.master.referenceData?.enums?.length||0)+(ui.master.referenceData?.conditions?.length||0)],['flow','PDF & İş Akışı',(ui.master.referenceData?.pdfPageMap?.length||0)+(ui.master.referenceData?.workflow?.length||0)]].map(([id,label,count])=>`<button class="tm-view-tab ${ui.view===id?'active':''}" data-tm-view="${id}">${esc(label)}<span>${count}</span></button>`).join('')}
        <button class="tm-view-tab" data-tm-action="validate">Doğrula <span>${issueCounts.error||0} hata</span></button>
      </div>
      <div class="tm-kpis">
        ${[['Bölüm',stats.sections,'Test + destek modülü','red'],['Kategori',stats.categories,'Alt kategori ağacı','blue'],['Tüm Ağaç Kaydı',stats.treeItems,'Kontrol + veri + kanıt',''],['Sayılan Kontrol',stats.countedControls,'COUNT_IN_TOTAL = true','green'],['Kanıt Tanımı',stats.evidenceDefinitions,'Kontrol sayılmaz','amber'],['Nihai Kural',stats.finalDecisionRules,'Son sayfa motoru','blue']].map(row=>`<div class="tm-kpi ${row[3]}"><span>${row[0]}</span><b>${row[1]}</b><small>${row[2]}</small></div>`).join('')}
      </div>
      ${ui.notice?`<div class="tm-notice ${esc(ui.notice.tone||'')}"><span>${esc(ui.notice.text)}</span><button data-tm-dismiss-notice>×</button></div>`:''}
    </div>`;
  }

  function itemMatches(item,section,category){
    const {query,rowType,activity,counted}=ui.filters;
    if(rowType!=='ALL'&&item.rowType!==rowType) return false;
    if(activity==='ACTIVE'&&!item.active) return false;
    if(activity==='INACTIVE'&&item.active) return false;
    if(counted&&!item.countInTotal) return false;
    if(!query.trim()) return true;
    const q=query.trim().toLocaleLowerCase('tr-TR');
    return [section.code,section.name,category.code,category.name,item.code,item.label,item.rowType,item.inputType,item.developerNote].some(value=>String(value||'').toLocaleLowerCase('tr-TR').includes(q));
  }

  function renderSectionSidebar(){
    return `<aside class="tm-pane tm-section-pane">
      <div class="tm-pane-head"><div><b>Test Bölümleri</b><span>Sürükleyerek bölüm sırasını değiştir</span></div><div class="tm-pane-head-actions"><button class="tm-icon-btn" title="Yeni test bölümü" data-tm-action="add-section">${ico('plus')}</button></div></div>
      <div class="tm-section-list">
        ${ui.master.sections.map(section=>{const counts=sectionCounts(section);return `<div class="tm-section-card ${ui.activeSectionId===section.id?'active':''} ${ui.selected?.kind==='section'&&ui.selected.id===section.id?'selected':''}" role="button" tabindex="0" draggable="true" data-tm-drag-kind="section" data-tm-id="${esc(section.id)}" data-tm-drop-kind="section" data-tm-select-section="${esc(section.id)}"><span class="tm-drag-handle">${ico('grip-vertical')}</span><span class="tm-section-code">${esc(section.code)}</span><span class="tm-section-copy"><b>${esc(section.name)}</b><span>${counts.controls} kontrol · ${section.categories.length} kategori · ${counts.items} satır</span></span><span class="tm-section-count">${counts.items}</span></div>`}).join('')||`<div class="tm-empty">${ico('folder-x')}<b>Bölüm yok</b><span>Yeni test bölümü ekleyerek başlayın.</span></div>`}
      </div>
    </aside>`;
  }

  function renderTreeControls(){
    return `<div class="tm-tree-controls">
      <label class="tm-search">${ico('search')}<input id="tmSearch" value="${esc(ui.filters.query)}" autocomplete="off" placeholder="Kod, test, kategori veya alt madde ara"></label>
      <div class="tm-filter-row">
        <select data-tm-filter="rowType"><option value="ALL">Tüm satır tipleri</option>${options(ROW_TYPES,ui.filters.rowType)}</select>
        <select data-tm-filter="activity">${[['ACTIVE','Sadece aktif'],['ALL','Aktif + pasif'],['INACTIVE','Sadece pasif']].map(([value,label])=>`<option value="${value}" ${ui.filters.activity===value?'selected':''}>${label}</option>`).join('')}</select>
        <label class="tm-filter-check"><input type="checkbox" data-tm-filter="counted" ${ui.filters.counted?'checked':''}> Sadece sayılan kontroller</label>
        <label class="tm-filter-check"><input type="checkbox" data-tm-filter="allSections" ${ui.filters.allSections?'checked':''}> Tüm bölümleri tek ağaçta göster</label>
        <button class="tm-icon-btn" title="Tüm kategorileri aç" data-tm-action="expand-all">${ico('chevrons-down')}</button>
        <button class="tm-icon-btn" title="Tüm kategorileri kapat" data-tm-action="collapse-all">${ico('chevrons-up')}</button>
      </div>
    </div>`;
  }

  function renderItem(item,section,category){
    const selected=ui.selected?.kind==='item'&&ui.selected.id===item.id;
    return `<div class="tm-item ${selected?'selected':''} ${item.active?'':'inactive'}" draggable="true" data-tm-drag-kind="item" data-tm-id="${esc(item.id)}" data-tm-drop-kind="item" data-tm-select-kind="item">
      <span class="tm-drag-handle">${ico('grip-vertical')}</span>
      <div class="tm-item-main"><div class="tm-item-title"><code>${esc(item.code||'KOD YOK')}</code><b>${esc(item.label||'Adsız alt madde')}</b></div><div class="tm-item-meta"><span class="tm-chip ${chipClass(item.rowType)}">${esc(item.rowType)}</span><span class="tm-chip">${esc(item.inputType)}</span>${item.countInTotal?'<span class="tm-chip counted">SAYAÇTA</span>':''}${!item.active?'<span class="tm-chip">PASİF</span>':''}</div></div>
      <div class="tm-item-actions"><button class="tm-icon-btn" title="Yukarı taşı" data-tm-action="move-up" data-tm-kind="item" data-tm-id="${esc(item.id)}">${ico('arrow-up')}</button><button class="tm-icon-btn" title="Aşağı taşı" data-tm-action="move-down" data-tm-kind="item" data-tm-id="${esc(item.id)}">${ico('arrow-down')}</button></div>
    </div>`;
  }

  function renderCategory(section,category){
    const queryOpen=Boolean(ui.filters.query.trim());
    const open=queryOpen||ui.openCategories[category.id]!==false;
    const items=category.items.filter(item=>itemMatches(item,section,category));
    const categoryTextMatch=[section.code,section.name,category.code,category.name].some(value=>String(value||'').toLocaleLowerCase('tr-TR').includes(ui.filters.query.trim().toLocaleLowerCase('tr-TR')));
    const hasActiveFilters=ui.filters.rowType!=='ALL'||ui.filters.activity!=='ALL'||ui.filters.counted;
    if(ui.filters.query.trim()&&!categoryTextMatch&&!items.length) return '';
    if(!ui.filters.query.trim()&&hasActiveFilters&&!items.length) return '';
    const selected=ui.selected?.kind==='category'&&ui.selected.id===category.id;
    return `<article class="tm-category ${selected?'selected':''}" draggable="true" data-tm-drag-kind="category" data-tm-id="${esc(category.id)}" data-tm-drop-kind="category">
      <div class="tm-category-head" data-tm-select-kind="category">
        <span class="tm-drag-handle">${ico('grip-vertical')}</span>
        <span class="tm-category-head-copy"><b>${esc(category.code)} · ${esc(category.name)}</b><span>${category.items.length} alt madde · ${category.items.filter(item=>item.active&&item.rowType==='CONTROL'&&item.countInTotal).length} sayılan kontrol</span></span>
        <span class="tm-category-actions"><button class="tm-icon-btn" title="Alt madde ekle" data-tm-action="add-item" data-tm-category-id="${esc(category.id)}">${ico('plus')}</button><button class="tm-icon-btn" title="Kategori yukarı" data-tm-action="move-up" data-tm-kind="category" data-tm-id="${esc(category.id)}">${ico('arrow-up')}</button><button class="tm-icon-btn" title="Aç / kapat" data-tm-toggle-category="${esc(category.id)}">${ico(open?'chevron-up':'chevron-down')}</button></span>
      </div>
      ${open?`<div class="tm-category-body">${items.map(item=>renderItem(item,section,category)).join('')||`<div class="tm-empty"><b>Filtreye uygun madde yok</b><span>Filtreleri temizleyin veya yeni alt madde ekleyin.</span></div>`}<div class="tm-category-drop" data-tm-drop-kind="category" data-tm-id="${esc(category.id)}">Alt maddeyi buraya sürükleyin</div></div>`:''}
    </article>`;
  }

  function renderTreeSection(section){
    const counts=sectionCounts(section);
    const categories=section.categories.map(category=>renderCategory(section,category)).filter(Boolean);
    if(ui.filters.query.trim()&&!categories.length) return '';
    return `<section class="tm-tree-section" data-tm-drop-kind="section" data-tm-id="${esc(section.id)}"><div class="tm-tree-section-title"><div><b>${esc(section.code)} · ${esc(section.name)}</b><span>${counts.controls} kontrol · ${counts.items} toplam kayıt · PDF ${esc(section.pdfPage||'-')}</span></div><div class="tm-inline-actions"><button class="tm-icon-btn" title="Kategori ekle" data-tm-action="add-category" data-tm-section-id="${esc(section.id)}">${ico('folder-plus')}</button><button class="tm-icon-btn" title="Bölümü düzenle" data-tm-select-section="${esc(section.id)}">${ico('settings-2')}</button></div></div>${categories.join('')||`<div class="tm-empty">${ico('list-filter')}<b>Sonuç bulunamadı</b><span>Arama veya filtre koşullarını değiştirin.</span></div>`}</section>`;
  }

  function renderTreePane(){
    const active=sectionById(ui.activeSectionId)||ui.master.sections[0];
    const sections=ui.filters.allSections||ui.filters.query.trim()?ui.master.sections:(active?[active]:[]);
    return `<main class="tm-pane tm-tree-pane"><div class="tm-pane-head"><div><b>Test · Kategori · Alt Madde</b><span>Maddeyi kategoriye, kategoriyi bölüme sürükleyebilirsiniz</span></div><div class="tm-pane-head-actions"><button class="tm-icon-btn" title="Yeni kategori" data-tm-action="add-category">${ico('folder-plus')}</button><button class="tm-icon-btn" title="Yeni alt madde" data-tm-action="add-item">${ico('list-plus')}</button></div></div>${renderTreeControls()}<div class="tm-tree-list">${sections.map(renderTreeSection).join('')||`<div class="tm-empty">${ico('search-x')}<b>Eşleşen kayıt yok</b><span>Arama metnini veya filtreleri değiştirin.</span></div>`}</div></main>`;
  }

  function field(label,name,value,{full=false,type='text',values=null,rows=3,readonly=false}={}){
    let control='';
    if(values) control=`<select data-tm-field="${esc(name)}">${options(values,value)}</select>`;
    else if(type==='textarea') control=`<textarea rows="${rows}" data-tm-field="${esc(name)}" ${readonly?'readonly':''}>${esc(value)}</textarea>`;
    else control=`<input type="${esc(type)}" value="${esc(value)}" data-tm-field="${esc(name)}" ${readonly?'readonly':''}>`;
    return `<div class="tm-field ${full?'full':''}"><label>${esc(label)}</label>${control}</div>`;
  }

  function renderValidation(limit=5){
    const issues=validationIssues();
    const errors=issues.filter(issue=>issue.tone==='error').length,warnings=issues.filter(issue=>issue.tone==='warning').length;
    return `<div class="tm-validation"><div class="tm-validation-summary"><div><span>Hata</span><b>${errors}</b></div><div><span>Uyarı</span><b>${warnings}</b></div><div><span>Kontrol</span><b>${calculateStats().countedControls}</b></div></div>${issues.slice(0,limit).map(issue=>`<div class="tm-issue ${issue.tone}">${ico(issue.tone==='error'?'circle-x':issue.tone==='warning'?'triangle-alert':'circle-check')}<div><b>${esc(issue.title)}</b><span>${esc(issue.detail)}</span></div></div>`).join('')}${issues.length>limit?`<button class="btn" data-tm-action="validate">${issues.length-limit} kayıt daha · doğrulama özetini aç</button>`:''}</div>`;
  }

  function editorActions(kind,id){
    return `<div class="tm-pane-head-actions"><button class="tm-icon-btn" title="Yukarı taşı" data-tm-action="move-up" data-tm-kind="${kind}" data-tm-id="${esc(id)}">${ico('arrow-up')}</button><button class="tm-icon-btn" title="Aşağı taşı" data-tm-action="move-down" data-tm-kind="${kind}" data-tm-id="${esc(id)}">${ico('arrow-down')}</button><button class="tm-icon-btn" title="Kopyasını oluştur" data-tm-action="duplicate">${ico('copy-plus')}</button><button class="tm-icon-btn danger" title="Sil" data-tm-action="delete">${ico('trash-2')}</button></div>`;
  }

  function renderEditor(){
    const record=selectedRecord();
    if(!record||(!record.section&&!record.category&&!record.item)) return `<aside class="tm-pane tm-editor-pane"><div class="tm-pane-head"><div><b>Detay Düzenleyici</b><span>Bir kayıt seçin</span></div></div><div class="tm-editor-body"><div class="tm-empty">${ico('mouse-pointer-click')}<b>Kayıt seçilmedi</b><span>Bölüm, kategori veya alt maddeye tıklayın.</span></div>${renderValidation()}</div></aside>`;
    let title='',subtitle='',form='',origin='';
    if(record.kind==='section'){
      const section=record.section; title=section.name;subtitle=`Bölüm · ${section.code}`;origin=section.origin||'USER';
      form=`${field('Bölüm Kodu','code',section.code)}${field('Bölüm Adı','name',section.name,{full:true})}${field('PDF Sayfası','pdfPage',section.pdfPage||'')}${field('Kaynak','origin',origin,{readonly:true})}<div class="tm-switch-row"><label class="tm-switch"><input type="checkbox" data-tm-field="active" ${section.active?'checked':''}> Bölüm aktif</label></div>`;
    }else if(record.kind==='category'){
      const {section,category}=record;title=category.name;subtitle=`Kategori · ${category.code}`;origin=category.origin||'USER';
      form=`${field('Kategori Kodu','code',category.code)}${field('Bağlı Bölüm','parentName',`${section.code} · ${section.name}`,{readonly:true})}${field('Kategori Adı','name',category.name,{full:true})}${field('Kaynak','origin',origin,{readonly:true})}<div class="tm-switch-row"><label class="tm-switch"><input type="checkbox" data-tm-field="active" ${category.active?'checked':''}> Kategori aktif</label></div>`;
    }else{
      const {section,category,item}=record;title=item.label;subtitle=`Alt madde · ${item.code}`;origin=item.origin||'USER';
      form=`${field('Madde Kodu','code',item.code)}${field('Satır Tipi','rowType',item.rowType,{values:ROW_TYPES})}${field('Madde Adı','label',item.label,{full:true})}${field('Input Tipi','inputType',item.inputType,{values:[...new Set([...INPUT_TYPES,item.inputType])].filter(Boolean)})}${field('Uygulanabilirlik','applicability',item.applicability,{values:[...new Set([...APPLICABILITY,item.applicability])].filter(Boolean)})}${field('Zorunluluk','requiredPolicy',item.requiredPolicy,{values:[...new Set([...REQUIRED_POLICIES,item.requiredPolicy])].filter(Boolean)})}${field('Nihai Sonuç Grubu','finalResultGroup',item.finalResultGroup,{values:[...new Set([...FINAL_GROUPS,item.finalResultGroup])].filter(Boolean)})}${field('PDF Sayfası','pdfPage',item.pdfPage||'')}${field('PDF Alanı','pdfSlot',item.pdfSlot||'')}${field('Kilit Durumu','lockStatus',item.lockStatus,{values:LOCK_STATUSES})}${field('Kanıt Kuralı','evidenceRule',item.evidenceRule||'',{full:true,type:'textarea',rows:2})}${field('Geliştirici Notu','developerNote',item.developerNote||'',{full:true,type:'textarea',rows:3})}${item.attributes?field('Ek Alanlar (JSON)','attributesJson',JSON.stringify(item.attributes,null,2),{full:true,type:'textarea',rows:5}):''}<div class="tm-switch-row"><label class="tm-switch"><input type="checkbox" data-tm-field="active" ${item.active?'checked':''}> Aktif</label><label class="tm-switch"><input type="checkbox" data-tm-field="countInTotal" ${item.countInTotal?'checked':''}> Toplam kontrole dahil</label></div><div class="tm-origin"><b>Konum:</b> ${esc(section.code)} / ${esc(category.code)}<br><b>Kaynak:</b> ${esc(origin)}</div>`;
    }
    const target=record.item||record.category||record.section;
    return `<aside class="tm-pane tm-editor-pane"><div class="tm-pane-head"><div><b>Detay Düzenleyici</b><span>Değişiklikler otomatik kaydedilir</span></div>${editorActions(record.kind,target.id)}</div><div class="tm-editor-body"><div class="tm-editor-intro"><code>${esc(subtitle)}</code><h3>${esc(title||'Adsız kayıt')}</h3><p>Kod, ad, koşul, sayım ve PDF eşleşmesini bu panelden yönetin.</p></div><div class="tm-editor-form">${form}</div><div class="tm-editor-footer"><button class="btn" data-tm-action="duplicate">${ico('copy-plus')}Kopyala</button><button class="btn tm-danger" data-tm-action="delete">${ico('trash-2')}Sil</button></div>${renderValidation()}</div></aside>`;
  }

  function renderTreeView(){ return `<div class="tm-workspace">${renderSectionSidebar()}${renderTreePane()}${renderEditor()}</div>`; }

  function tableView(headers,rows){
    return `<div class="tm-reference-body"><table class="tm-reference-table"><thead><tr>${headers.map(header=>`<th>${esc(header.label)}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${headers.map(header=>`<td>${esc(row[header.key]??'-')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  }

  function renderChanges(){
    const rows=ui.master.referenceData?.changeLog||[];
    return `<section class="tm-reference"><div class="tm-reference-head"><div><h3>Karar & Değişiklik Logu</h3><p>Excel masterında kayıtlı nihai taşıma, kaldırma, birleştirme ve veri sahipliği kararları.</p></div><span class="tm-save-state">${rows.length} karar</span></div>${tableView([{key:'id',label:'ID'},{key:'bolum',label:'Bölüm'},{key:'kararTuru',label:'Karar'},{key:'oncekiSorun',label:'Önceki Sorun'},{key:'nihaiKarar',label:'Nihai Karar'},{key:'gelistiriciEtkisi',label:'Geliştirici Etkisi'},{key:'durum',label:'Durum'}],rows)}</section>`;
  }

  function renderDictionary(){
    const enums=ui.master.referenceData?.enums||[],conditions=ui.master.referenceData?.conditions||[],qa=ui.master.referenceData?.qa||[];
    return `<div style="display:grid;gap:12px"><section class="tm-reference"><div class="tm-reference-head"><div><h3>Enum / Durum Sözlüğü</h3><p>Backend değeri ile kullanıcıya gösterilen Türkçe PDF etiketi.</p></div><span class="tm-save-state">${enums.length} değer</span></div><div class="tm-reference-body"><div class="tm-reference-grid">${enums.map(entry=>`<article class="tm-reference-card"><span>${esc(entry.enumGroup)}</span><b>${esc(entry.value)} → ${esc(entry.pdfLabel)}</b><p>${esc(entry.description)}</p></article>`).join('')}</div></div></section><section class="tm-reference"><div class="tm-reference-head"><div><h3>Koşul Kuralları</h3><p>Uygulanabilirlik, N/A davranışı ve örnekleri.</p></div></div>${tableView([{key:'applicability',label:'Applicability'},{key:'uygulamaKurali',label:'Uygulama Kuralı'},{key:'nADavranisi',label:'N/A Davranışı'},{key:'ornek',label:'Örnek'}],conditions)}</section><section class="tm-reference"><div class="tm-reference-head"><div><h3>Master QA Kontrolleri</h3><p>Excel üretimindeki kilitli kalite kapıları.</p></div></div>${tableView([{key:'kontrol',label:'Kontrol'},{key:'beklenen',label:'Beklenen'},{key:'gercekFormul',label:'Gerçek / Formül'},{key:'sonuc',label:'Sonuç'}],qa)}</section></div>`;
  }

  function renderFlow(){
    const pages=ui.master.referenceData?.pdfPageMap||[],workflow=ui.master.referenceData?.workflow||[];
    return `<div style="display:grid;gap:12px"><section class="tm-reference"><div class="tm-reference-head"><div><h3>PDF Sayfa Eşleşmesi</h3><p>Rapor sayfası, veri kaynağı, sayım ve dinamik yerleşim kuralı.</p></div><span class="tm-save-state">${pages.length} sayfa kuralı</span></div>${tableView([{key:'sira',label:'Sıra'},{key:'pdfSayfaKonum',label:'Konum'},{key:'sayfaAdi',label:'Sayfa'},{key:'kaynakBolum',label:'Kaynak Bölüm'},{key:'veriTipi',label:'Veri Tipi'},{key:'sayac',label:'Sayaç'},{key:'dinamikKural',label:'Dinamik Kural'}],pages)}</section><section class="tm-reference"><div class="tm-reference-head"><div><h3>İş Akışı & Gate’ler</h3><p>Araç kabulden rapor teslimine zorunlu tetikleyici ve hata dönüşleri.</p></div></div>${tableView([{key:'step',label:'Adım'},{key:'akisAsamasi',label:'Aşama'},{key:'tetikleyici',label:'Tetikleyici'},{key:'zorunluGate',label:'Zorunlu Gate'},{key:'cikti',label:'Çıktı'},{key:'hataGeriDonus',label:'Hata Dönüşü'},{key:'audit',label:'Audit'}],workflow)}</section></div>`;
  }

  function renderInner(){
    const content=ui.view==='changes'?renderChanges():ui.view==='dictionary'?renderDictionary():ui.view==='flow'?renderFlow():renderTreeView();
    return `${renderCommand()}${content}`;
  }

  function renderRoot(){
    const root=document.getElementById('testMasterApp');
    if(!root) return;
    const treeScroll=root.querySelector('.tm-tree-pane')?.scrollTop||0;
    const sectionScroll=root.querySelector('.tm-section-list')?.scrollTop||0;
    root.innerHTML=renderInner();
    const nextTree=root.querySelector('.tm-tree-pane'); if(nextTree) nextTree.scrollTop=treeScroll;
    const nextSections=root.querySelector('.tm-section-list'); if(nextSections) nextSections.scrollTop=sectionScroll;
    if(ui.searchFocus){
      const search=root.querySelector('#tmSearch');
      if(search){search.focus();search.setSelectionRange(search.value.length,search.value.length);}
      ui.searchFocus=false;
    }
    if(window.lucide) window.lucide.createIcons();
  }

  function activeTargetSection(explicitId){
    return sectionById(explicitId)||sectionById(ui.activeSectionId)||selectedRecord()?.section||ui.master.sections[0]||null;
  }

  function activeTargetCategory(explicitId){
    const explicit=categoryById(explicitId); if(explicit) return explicit;
    const selected=selectedRecord();
    if(selected?.category) return {section:selected.section,category:selected.category};
    const section=activeTargetSection();
    return section?.categories?.[0]?{section,category:section.categories[0]}:null;
  }

  function createSection(){
    const numeric=ui.master.sections.map(section=>Number(section.code)).filter(Number.isFinite);
    const code=String((numeric.length?Math.max(...numeric):14)+1).padStart(2,'0');
    const section={id:uid('section'),code,name:'YENİ TEST BÖLÜMÜ',active:true,pdfPage:'',origin:'USER',categories:[]};
    mutate(()=>{ui.master.sections.push(section);ui.activeSectionId=section.id;ui.selected={kind:'section',id:section.id};},`${code} yeni test bölümü eklendi.`);
  }

  function createCategory(sectionId){
    const section=activeTargetSection(sectionId);
    if(!section){ui.notice={tone:'error',text:'Kategori eklemek için önce bir test bölümü oluşturun.'};renderRoot();return;}
    const index=section.categories.length+1;
    const code=`${section.code}-K${String(index).padStart(2,'0')}`;
    const category={id:uid('category'),code,name:'YENİ KATEGORİ',active:true,origin:'USER',items:[]};
    mutate(()=>{section.categories.push(category);ui.activeSectionId=section.id;ui.openCategories[category.id]=true;ui.selected={kind:'category',id:category.id};},`${code} kategorisi eklendi.`);
  }

  function createItem(categoryId){
    let target=activeTargetCategory(categoryId);
    let newCategory=null;
    if(!target){
      const section=activeTargetSection();
      if(!section){ui.notice={tone:'error',text:'Alt madde eklemek için önce bölüm ve kategori oluşturun.'};renderRoot();return;}
      newCategory={id:uid('category'),code:`${section.code}-K01`,name:'GENEL',active:true,origin:'USER',items:[]};
      target={section,category:newCategory};
    }
    const item={id:uid('item'),code:`NEW-${Date.now().toString(36).toUpperCase()}`,label:'Yeni alt madde',rowType:'CONTROL',inputType:'STATUS',applicability:'ALWAYS',requiredPolicy:'REQUIRED',countInTotal:true,active:true,pdfPage:target.section.pdfPage||'',pdfSlot:'',finalResultGroup:'NONE',evidenceRule:'NONE',developerNote:'',lockStatus:'DÜZENLENEBİLİR',origin:'USER'};
    mutate(()=>{if(newCategory)target.section.categories.push(newCategory);target.category.items.push(item);ui.activeSectionId=target.section.id;ui.openCategories[target.category.id]=true;ui.selected={kind:'item',id:item.id};},`${item.code} alt maddesi eklendi.`);
  }

  function removeSelected(){
    const record=selectedRecord(); if(!record) return;
    const label=record.item?.label||record.category?.name||record.section?.name||'kayıt';
    if(!confirm(`“${label}” silinsin mi? Alt kayıtlar varsa birlikte silinir.`)) return;
    mutate(()=>{
      if(record.kind==='section') ui.master.sections=ui.master.sections.filter(section=>section.id!==record.section.id);
      if(record.kind==='category') record.section.categories=record.section.categories.filter(category=>category.id!==record.category.id);
      if(record.kind==='item') record.category.items=record.category.items.filter(item=>item.id!==record.item.id);
      ui.selected=null; ensureSelection();
    },`${label} silindi.`);
  }

  function uniqueCopyCode(code){
    const existing=new Set(allItems().map(item=>String(item.code).toLocaleUpperCase('tr-TR')));
    let candidate=`${code||'ITEM'}-KOPYA`,index=2;
    while(existing.has(candidate.toLocaleUpperCase('tr-TR'))) candidate=`${code||'ITEM'}-KOPYA-${index++}`;
    return candidate;
  }

  function duplicateSelected(){
    const record=selectedRecord(); if(!record) return;
    mutate(()=>{
      if(record.kind==='item'){
        const copy=clone(record.item);copy.id=uid('item');copy.code=uniqueCopyCode(copy.code);copy.label=`${copy.label} (Kopya)`;copy.origin='USER';record.category.items.splice(record.category.items.indexOf(record.item)+1,0,copy);ui.selected={kind:'item',id:copy.id};
      }else if(record.kind==='category'){
        const copy=clone(record.category);copy.id=uid('category');copy.code=`${copy.code}-KOPYA`;copy.name=`${copy.name} (Kopya)`;copy.origin='USER';copy.items.forEach(item=>{item.id=uid('item');item.code=uniqueCopyCode(item.code);item.origin='USER';});record.section.categories.splice(record.section.categories.indexOf(record.category)+1,0,copy);ui.selected={kind:'category',id:copy.id};ui.openCategories[copy.id]=true;
      }else{
        const copy=clone(record.section);copy.id=uid('section');copy.code=`${copy.code}-K`;copy.name=`${copy.name} (Kopya)`;copy.origin='USER';copy.categories.forEach(category=>{category.id=uid('category');category.code=`${category.code}-K`;category.origin='USER';category.items.forEach(item=>{item.id=uid('item');item.code=uniqueCopyCode(item.code);item.origin='USER';});});ui.master.sections.splice(ui.master.sections.indexOf(record.section)+1,0,copy);ui.activeSectionId=copy.id;ui.selected={kind:'section',id:copy.id};
      }
    },'Seçili kayıt kopyalandı.');
  }

  function moveWithin(kind,id,direction){
    const record=kind==='section'?{section:sectionById(id)}:kind==='category'?categoryById(id):itemById(id);
    if(!record) return;
    const list=kind==='section'?ui.master.sections:kind==='category'?record.section.categories:record.category.items;
    const node=kind==='section'?record.section:kind==='category'?record.category:record.item;
    const index=list.indexOf(node),next=index+direction;
    if(index<0||next<0||next>=list.length) return;
    mutate(()=>{list.splice(index,1);list.splice(next,0,node);},`${node.code||node.name} sırası güncellendi.`);
  }

  function applyEditorField(field,target){
    const record=selectedRecord(); if(!record) return;
    const object=record.item||record.category||record.section;
    const name=target.dataset.tmField;
    let value=target.type==='checkbox'?target.checked:target.value;
    if(name==='attributesJson'){
      try{value=value.trim()?JSON.parse(value):{};}catch(error){ui.notice={tone:'error',text:'Ek Alanlar geçerli JSON değil; değişiklik kaydedilmedi.'};renderRoot();return;}
      mutate(()=>{object.attributes=value;},'Ek alanlar güncellendi.');return;
    }
    if(name==='parentName'||target.readOnly) return;
    mutate(()=>{object[name]=value;},`${field} güncellendi.`);
  }

  function exportPayload(){
    const payload=clone(ui.master);
    payload.stats=calculateStats(payload);
    payload.exportedAt=new Date().toISOString();
    payload.exportedFrom='OTOTR CRM Ekspertiz Test Masterı';
    return payload;
  }

  function exportJson(){
    const payload=exportPayload();
    const blob=new Blob([`${JSON.stringify(payload,null,2)}\n`],{type:'application/json;charset=utf-8'});
    const url=URL.createObjectURL(blob),link=document.createElement('a');
    link.href=url;link.download=`OTOTR_TEST_MASTER_${new Date().toISOString().slice(0,10)}.json`;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
    ui.notice={tone:'success',text:'Güncel test masterı JSON olarak indirildi.'};renderRoot();
  }

  async function copyJson(){
    const text=JSON.stringify(exportPayload(),null,2);
    try{
      if(navigator.clipboard?.writeText) await navigator.clipboard.writeText(text);
      else throw new Error('clipboard unavailable');
    }catch(error){
      const area=document.createElement('textarea');area.value=text;area.style.position='fixed';area.style.opacity='0';document.body.appendChild(area);area.select();document.execCommand('copy');area.remove();
    }
    ui.notice={tone:'success',text:'Güncel master JSON panoya kopyalandı.'};renderRoot();
  }

  async function importJson(file){
    if(!file) return;
    try{
      const parsed=JSON.parse(await file.text());
      const candidate=parsed.master&&Array.isArray(parsed.master.sections)?parsed.master:parsed;
      if(!candidate||!Array.isArray(candidate.sections)) throw new Error('sections dizisi bulunamadı');
      if(!confirm(`${candidate.sections.length} bölümlü JSON mevcut masterın yerine alınsın mı?`)) return;
      historyPush();ui.master=clone(candidate);normalizeMaster();saveMaster();ui.activeSectionId=ui.master.sections[0]?.id||null;ui.selected=ui.activeSectionId?{kind:'section',id:ui.activeSectionId}:null;ui.openCategories={};ui.notice={tone:'success',text:'JSON içe aktarıldı ve tarayıcıya kaydedildi.'};renderRoot();
    }catch(error){ui.notice={tone:'error',text:`JSON içe aktarılamadı: ${error.message}`};renderRoot();}
  }

  function resetMaster(){
    if(!confirm('Tüm yerel değişiklikler silinip 24.08.2026 kilitli masterına dönülsün mü?')) return;
    historyPush();ui.master=seed();normalizeMaster();saveMaster();ui.activeSectionId=ui.master.sections[0]?.id||null;ui.selected=ui.activeSectionId?{kind:'section',id:ui.activeSectionId}:null;ui.openCategories={};ui.notice={tone:'success',text:'Kilitli başlangıç masterı geri yüklendi.'};renderRoot();
  }

  function canDrop(sourceKind,targetKind){
    if(sourceKind==='section') return targetKind==='section';
    if(sourceKind==='category') return targetKind==='section'||targetKind==='category';
    if(sourceKind==='item') return ['section','category','item'].includes(targetKind);
    return false;
  }

  function moveDragged(source,targetKind,targetId){
    if(!source||!canDrop(source.kind,targetKind)) return;
    if(source.id===targetId) return;
    if(source.kind==='section'){
      const node=sectionById(source.id),target=sectionById(targetId);if(!node||!target)return;
      mutate(()=>{const list=ui.master.sections;list.splice(list.indexOf(node),1);list.splice(list.indexOf(target),0,node);},`${node.code} bölümü taşındı.`);return;
    }
    if(source.kind==='category'){
      const found=categoryById(source.id);if(!found)return;
      const sourceIndex=found.section.categories.indexOf(found.category);
      let targetSection=null,targetIndex=null;
      if(targetKind==='section'){targetSection=sectionById(targetId);targetIndex=targetSection?.categories.length;}
      else{const target=categoryById(targetId);targetSection=target?.section;targetIndex=targetSection?.categories.indexOf(target.category);}
      if(!targetSection||found.category.id===targetId)return;
      if(found.section===targetSection&&sourceIndex<targetIndex) targetIndex-=1;
      mutate(()=>{found.section.categories.splice(found.section.categories.indexOf(found.category),1);targetIndex=Math.min(targetIndex,targetSection.categories.length);targetSection.categories.splice(Math.max(0,targetIndex),0,found.category);ui.activeSectionId=targetSection.id;ui.selected={kind:'category',id:found.category.id};ui.openCategories[found.category.id]=true;},`${found.category.code} kategorisi ${targetSection.name} bölümüne taşındı.`);return;
    }
    const found=itemById(source.id);if(!found)return;
    const sourceIndex=found.category.items.indexOf(found.item);
    let targetSection=null,targetCategory=null,targetIndex=null,newTargetCategory=null;
    if(targetKind==='item'){
      const target=itemById(targetId);targetSection=target?.section;targetCategory=target?.category;targetIndex=targetCategory?.items.indexOf(target.item);
    }else if(targetKind==='category'){
      const target=categoryById(targetId);targetSection=target?.section;targetCategory=target?.category;targetIndex=targetCategory?.items.length;
    }else{
      targetSection=sectionById(targetId);
      if(targetSection&&!targetSection.categories.length) newTargetCategory={id:uid('category'),code:`${targetSection.code}-K01`,name:'GENEL',active:true,origin:'USER',items:[]};
      targetCategory=newTargetCategory||targetSection?.categories?.[0];targetIndex=targetCategory?.items.length;
    }
    if(!targetSection||!targetCategory)return;
    if(found.category===targetCategory&&sourceIndex<targetIndex) targetIndex-=1;
    mutate(()=>{found.category.items.splice(found.category.items.indexOf(found.item),1);if(newTargetCategory)targetSection.categories.push(newTargetCategory);targetIndex=Math.min(targetIndex,targetCategory.items.length);targetCategory.items.splice(Math.max(0,targetIndex),0,found.item);ui.activeSectionId=targetSection.id;ui.openCategories[targetCategory.id]=true;ui.selected={kind:'item',id:found.item.id};},`${found.item.code} maddesi ${targetCategory.code} kategorisine taşındı.`);
  }

  function showValidationSummary(){
    const issues=validationIssues(),errors=issues.filter(issue=>issue.tone==='error').length,warnings=issues.filter(issue=>issue.tone==='warning').length;
    ui.view='tree';ui.notice={tone:errors?'error':'success',text:errors?`Doğrulama: ${errors} hata, ${warnings} uyarı. İlk bulgular sağ panelde gösteriliyor.`:`Doğrulama tamam: engelleyici hata yok, ${warnings} uyarı var.`};renderRoot();
  }

  function handleAction(action,element){
    if(action==='undo')return undo();if(action==='redo')return redo();if(action==='add-section')return createSection();if(action==='add-category')return createCategory(element.dataset.tmSectionId);if(action==='add-item')return createItem(element.dataset.tmCategoryId);if(action==='delete')return removeSelected();if(action==='duplicate')return duplicateSelected();if(action==='export')return exportJson();if(action==='copy-json')return copyJson();if(action==='import')return document.getElementById('tmImportInput')?.click();if(action==='reset')return resetMaster();if(action==='validate')return showValidationSummary();
    if(action==='expand-all'){ui.master.sections.forEach(section=>section.categories.forEach(category=>ui.openCategories[category.id]=true));renderRoot();return;}
    if(action==='collapse-all'){ui.master.sections.forEach(section=>section.categories.forEach(category=>ui.openCategories[category.id]=false));renderRoot();return;}
    if(action==='move-up'||action==='move-down') return moveWithin(element.dataset.tmKind||ui.selected?.kind,element.dataset.tmId||ui.selected?.id,action==='move-up'?-1:1);
  }

  function bindRoot(root){
    if(root.dataset.tmBound==='1') return;root.dataset.tmBound='1';
    root.addEventListener('click',event=>{
      const dismiss=event.target.closest('[data-tm-dismiss-notice]');if(dismiss){ui.notice=null;renderRoot();return;}
      const view=event.target.closest('[data-tm-view]');if(view){ui.view=view.dataset.tmView;renderRoot();return;}
      const toggle=event.target.closest('[data-tm-toggle-category]');if(toggle){event.preventDefault();event.stopPropagation();const id=toggle.dataset.tmToggleCategory;ui.openCategories[id]=ui.openCategories[id]===false;renderRoot();return;}
      const action=event.target.closest('[data-tm-action]');if(action){event.preventDefault();event.stopPropagation();handleAction(action.dataset.tmAction,action);return;}
      const section=event.target.closest('[data-tm-select-section]');if(section){const id=section.dataset.tmSelectSection;ui.activeSectionId=id;ui.selected={kind:'section',id};renderRoot();return;}
      const selectable=event.target.closest('[data-tm-select-kind]');if(selectable){const kind=selectable.dataset.tmSelectKind,id=selectable.dataset.tmId||selectable.closest('[data-tm-id]')?.dataset.tmId;if(!id)return;ui.selected={kind,id};const record=kind==='item'?itemById(id):categoryById(id);if(record?.section)ui.activeSectionId=record.section.id;renderRoot();}
    });
    root.addEventListener('input',event=>{
      if(event.target.id==='tmSearch'){ui.filters.query=event.target.value;ui.searchFocus=true;renderRoot();}
    });
    root.addEventListener('change',event=>{
      const filter=event.target.dataset.tmFilter;if(filter){ui.filters[filter]=event.target.type==='checkbox'?event.target.checked:event.target.value;renderRoot();return;}
      if(event.target.id==='tmImportInput'){importJson(event.target.files?.[0]);event.target.value='';return;}
      const fieldName=event.target.dataset.tmField;if(fieldName)applyEditorField(fieldName,event.target);
    });
    root.addEventListener('keydown',event=>{
      const section=event.target.closest('[data-tm-select-section]');if(section&&(event.key==='Enter'||event.key===' ')){event.preventDefault();section.click();}
    });
    root.addEventListener('dragstart',event=>{
      const source=event.target.closest('[data-tm-drag-kind]');if(!source)return;
      const payload={kind:source.dataset.tmDragKind,id:source.dataset.tmId};ui.dragging=payload;source.classList.add('tm-dragging');event.dataTransfer.effectAllowed='move';event.dataTransfer.setData('text/plain',JSON.stringify(payload));
    });
    root.addEventListener('dragover',event=>{
      const target=event.target.closest('[data-tm-drop-kind]');if(!target||!ui.dragging||!canDrop(ui.dragging.kind,target.dataset.tmDropKind))return;event.preventDefault();event.dataTransfer.dropEffect='move';root.querySelectorAll('.tm-drop-active').forEach(node=>node.classList.remove('tm-drop-active'));target.classList.add('tm-drop-active');
    });
    root.addEventListener('drop',event=>{
      const target=event.target.closest('[data-tm-drop-kind]');if(!target)return;event.preventDefault();let payload=ui.dragging;try{payload=JSON.parse(event.dataTransfer.getData('text/plain'))||payload;}catch(error){}root.querySelectorAll('.tm-drop-active,.tm-dragging').forEach(node=>node.classList.remove('tm-drop-active','tm-dragging'));ui.dragging=null;moveDragged(payload,target.dataset.tmDropKind,target.dataset.tmId);
    });
    root.addEventListener('dragend',()=>{root.querySelectorAll('.tm-drop-active,.tm-dragging').forEach(node=>node.classList.remove('tm-drop-active','tm-dragging'));ui.dragging=null;});
  }

  window.TestMasterAdminPage=function(){ initialize();return `<section class="test-master-page" id="testMasterApp">${renderInner()}</section>`; };
  window.bindTestMasterAdmin=function(){ initialize();const root=document.getElementById('testMasterApp');if(root)bindRoot(root); };
  window.OTOTRTestMasterAdmin={exportJson:()=>exportPayload(),reset:resetMaster,validate:validationIssues,getMaster:()=>clone(ui.master)};
})();
