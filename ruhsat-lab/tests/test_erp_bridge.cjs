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
    document:{getElementById(id){return id==='ototrRuhsatFrame'?frame:form;},createElement(){return {};}},
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
