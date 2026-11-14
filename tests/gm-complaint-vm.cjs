const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.join(__dirname,'..');

function element(){
  return {innerHTML:'',textContent:'',value:'',checked:false,scrollTop:0,style:{},dataset:{},h:0,classList:{add(){},remove(){}},focus(){},querySelector(){return null},appendChild(){}};
}

function loadComplaintVm({storageThrows=false}={}){
  const html=fs.readFileSync(path.join(root,'gm-sikayet','index.html'),'utf8');
  const start=html.indexOf('const ST=');
  const end=html.indexOf('</script><script src="performance-model.js"',start);
  if(start<0||end<0) throw new Error('Şikâyet ana script sınırları bulunamadı');
  const elements=new Map(),store=new Map();
  const get=id=>{if(!elements.has(id))elements.set(id,element());return elements.get(id)};
  const localStorage={
    getItem(key){if(storageThrows)throw new Error('storage blocked');return store.has(key)?store.get(key):null},
    setItem(key,value){if(storageThrows)throw new Error('storage blocked');store.set(key,String(value))},
    removeItem(key){if(storageThrows)throw new Error('storage blocked');store.delete(key)}
  };
  const math=Object.create(Math);math.random=()=>0.314159;
  const context={console,Date,URL,Math:math,JSON,Object,Array,String,Number,Boolean,RegExp,Map,Set,Intl,localStorage,location:{href:''},navigator:{clipboard:{writeText:()=>Promise.resolve()}},setTimeout:()=>0,clearTimeout(){},document:{
    activeElement:null,
    querySelector(selector){return get(String(selector).replace(/^#/,''))},
    getElementById(id){return get(id)},
    querySelectorAll(){return[]},
    createElement(){return element()},
    addEventListener(){}
  }};
  context.window=context;context.globalThis=context;
  vm.createContext(context);
  for(const file of ['roles.js','evidence-model.js','chart-model.js']) vm.runInContext(fs.readFileSync(path.join(root,'gm-sikayet',file),'utf8'),context,{filename:file});
  let main=html.slice(start,end);
  main=main.replace(/setTimeout\(\(\)=>\{LOAD=0;draw\(\)\},400\);draw\(\);\s*$/,'');
  vm.runInContext(main,context,{filename:'index.inline.js'});
  for(const file of ['performance-model.js','integration.js']) vm.runInContext(fs.readFileSync(path.join(root,'gm-sikayet',file),'utf8'),context,{filename:file});
  const run=source=>vm.runInContext(source,context);
  const json=source=>JSON.parse(run(`JSON.stringify(${source})`));
  return {context,run,json,store,elements};
}

module.exports={loadComplaintVm};
