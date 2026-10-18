const test = require('node:test');
const assert = require('node:assert/strict');
const policy = require('../web/data-policy.js');
const owner = [
  {key:'owner_name',value:'KURGUSAL-AD',alternatives:[{value:'ALTERNATIF-AD'}]},
  {key:'owner_surname',value:'KURGUSAL-SOYAD'},
  {key:'tc_or_tax_no',value:'KURGUSAL-NUMARA'}
];
for (const legacy of [false, true]) {
  for (const reviewed of [false, true]) {
    test(`${legacy?'legacy':'current'} response, ${reviewed?'reviewed':'draft'} export excludes seller and diagnostics`,()=>{
      const result = {
        schema_version:'1.1',fields:[{key:'plate',value:'16TST123'},...(legacy?owner:[]),{key:'address',value:'KURGUSAL-ADRES'}],
        seller_suggestion:{fields:legacy?[]:owner},
        analysed:{Data:{owner_name:'KURGUSAL-AD'}},
        lines:[{text:'KURGUSAL-HAM-METIN'}],image:{preview:'KURGUSAL-GORSEL'},warnings:[]
      };
      const edits = {plate:'34TST123',owner_name:'DUZELTILMIS-AD',tc_or_tax_no:'DUZELTILMIS-NO'};
      const exported = policy.buildExport(result,edits,new Set(['plate','owner_name']),reviewed,true);
      assert.deepEqual(exported.analysed.Data,{plate:'34TST123'});
      assert.equal(exported.fields.length,1);
      assert.equal(exported.fields[0].ocr_value,'16TST123');
      assert.equal(exported.fields[0].human_confirmed,true);
      const text = JSON.stringify(exported);
      for(const forbidden of ['owner_name','owner_surname','tc_or_tax_no','KURGUSAL-','ALTERNATIF-AD','DUZELTILMIS-']) assert.equal(text.includes(forbidden),false,forbidden);
      assert.equal(policy.suggestionFields(result).length,3);
    });
  }
}
