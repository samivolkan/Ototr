const test = require('node:test');
const assert = require('node:assert/strict');
const {vehicleDraft} = require('../../ruhsat-erp.js');
test('ERP boundary transfers only vehicle form fields',()=>{
  const result=vehicleDraft({plate:'16TST123',vin:'TEST1234567890123',brand:'DENEME',model_year:2023,
    owner_name:'KURGUSAL',owner_surname:'SAHIP',tc_or_tax_no:'00000000000',sellerTaxNo:'123',image:'private',lines:['private']});
  assert.deepEqual(result,{plate:'16TST123',vin:'TEST1234567890123',vehicleMake:'DENEME',year:'2023'});
});
test('ERP boundary rejects missing plate, invalid VIN and structured values',()=>{
  assert.equal(vehicleDraft({plate:'',vin:'TEST1234567890123'}),null);
  assert.equal(vehicleDraft({plate:'16TST123',vin:'short'}),null);
  assert.equal(vehicleDraft({plate:{value:'16TST123'},vin:'TEST1234567890123'}),null);
});

test('OCR fuel labels match ERP choice values',()=>{
  for (const [fuel,expected] of [['BENZİN','Benzin'],['BENZINLI','Benzin'],['DİZEL','Dizel'],['MOTORİN','Dizel'],['ELEKTRİKLİ','Elektrik'],['HİBRİT','Hibrit'],['LPG','LPG']]) {
    assert.equal(vehicleDraft({plate:'16TST123',vin:'TEST1234567890123',fuel_type:fuel}).fuel,expected);
  }
});

test('first transfer waits for schema before building and filling the ERP form',async()=>{
  const vm=require('node:vm');
  const fs=require('node:fs');
  let handler, resolveSchema, filled;
  const calls=[];
  const frame={contentWindow:{},isConnected:true};
  const form={prepend(){},scrollIntoView(){}};
  const context={
    window:{addEventListener(type,fn){handler=fn;},OTOTR_ASSET_LOADER:{loadInspectionSchema(){calls.push('load');return new Promise(resolve=>{resolveSchema=resolve;});}}},
    document:{addEventListener(){},getElementById(id){return id==='ototrRuhsatFrame'?frame:form;},createElement(){return {};}},
    location:{origin:'https://erp.example',hash:'#ruhsat'},
    toast(){},applyInspectionSchemaToReportData(){calls.push('schema');},
    dealerClearStoredWorkOrderDraft(){},saveDealerPortalState(){},
    route(){calls.push('route');},renderDealerPageOnly(){calls.push('render');},
    dealerFindVehicleMake(value){return value;},
    dealerApplyWorkOrderDraft(_form,draft){calls.push('fill');filled=draft;}
  };
  vm.runInNewContext(fs.readFileSync(require.resolve('../../ruhsat-erp.js'),'utf8'),context);
  const transfer=handler({origin:'https://erp.example',source:frame.contentWindow,data:{type:'ototr:ruhsat-reviewed',version:1,data:{plate:'16TST123',vin:'TEST1234567890123',fuel_type:'BENZİN',owner_name:'PRIVATE'}}});
  assert.deepEqual(calls,['load']);
  resolveSchema();
  await transfer;
  assert.deepEqual(calls,['load','schema','route','render','fill']);
  assert.equal(filled.fuel,'Benzin');
  assert.equal(filled.owner_name,undefined);
});

test('all additional vehicle fields survive persistence and reject owner or diagnostic data',()=>{
  const {persistence,formValues}=require('../../ruhsat-erp.js');
  const draft=vehicleDraft({plate:'16TST123',vin:'TEST1234567890123',color:'MOR',vehicle_class:'M1',registration_date:'2024-08-08',owner_name:'PRIVATE',address:'PRIVATE'});
  assert.equal(draft.ruhsat_color,'MOR');
  const saved=persistence({...draft,ruhsat_owner_name:'PRIVATE',ruhsat_address:'PRIVATE',ruhsatVehicle:{owner_name:'PRIVATE'}});
  assert.deepEqual(saved,{ruhsatVehicle:{color:'MOR',vehicle_class:'M1',registration_date:'2024-08-08'}});
  assert.equal(formValues(saved).ruhsat_color,'MOR');
  assert(!JSON.stringify(saved).includes('PRIVATE'));
});

test('new reading preserves user package while clearing stale vehicle details',()=>{
  const {mergeDraft}=require('../../ruhsat-erp.js');
  const merged=mergeDraft({packageName:'Full Ekspertiz',customer:'USER ENTERED',vin:'OLD',mileage:'9000',ruhsat_color:'MOR',vehicleVariant:'OLD TRIM'},vehicleDraft({plate:'16TST123',vin:'TEST1234567890123'}));
  assert.equal(merged.packageName,'Full Ekspertiz');assert.equal(merged.customer,'USER ENTERED');
  assert.equal(merged.ruhsat_color,undefined);assert.equal(merged.vehicleVariant,undefined);assert.equal(merged.mileage,undefined);
});

test('registration markup escapes document values',()=>{
  const {extraMarkup}=require('../../ruhsat-erp.js');
  const html=extraMarkup({ruhsat_color:'"><img src=x onerror=alert(1)>'});
  assert(!html.includes('<img'));assert(html.includes('&lt;img'));
});
