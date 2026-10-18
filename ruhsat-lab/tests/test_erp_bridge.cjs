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
