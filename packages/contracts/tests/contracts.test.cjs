const {test}=require('node:test');
const assert=require('node:assert/strict');
const {ProfileSchema,ReportObservationSchema,ChatResponseSchema,NearbyFacilitySchema}=require('../dist/index.js');
const uid='11111111-1111-4111-8111-111111111111';
test('new profiles can have an unknown age without inventing one',()=>{
  assert.equal(ProfileSchema.parse({user_id:uid,name:'User',age:null}).age,null);
  assert.equal(ProfileSchema.safeParse({user_id:uid,name:'User',age:5}).success,false);
});
test('report observations require explicit review status',()=>{
  const observation={id:uid,report_id:uid,user_id:uid,original_label:'HbA1c',canonical_test:'hba1c',value_text:'6.2',unit:'%'};
  assert.equal(ReportObservationSchema.parse(observation).status,'proposed');
  assert.equal(ReportObservationSchema.safeParse({...observation,status:'clinically_verified'}).success,false);
});
test('empty evidence is a valid honest answer',()=>{
  assert.equal(ChatResponseSchema.parse({answer:'No evidence found',intent:'general_health',mode:'extractive',citations:[],limitations:'Insufficient information',request_id:uid}).citations.length,0);
});
test('nearby listings can omit contact and opening details',()=>{
  const result=NearbyFacilitySchema.safeParse({id:'node-1',name:'Clinic',type:'clinic',lat:28,lon:77,map_url:'https://www.openstreetmap.org',phone:null,opening_hours:null});
  assert.equal(result.success,true);
});
