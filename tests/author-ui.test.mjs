import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {parseHTML} from 'linkedom';
const source=(await readFile(new URL('../public/author.js',import.meta.url),'utf8')).replace(/^import[^\n]+\n/,'');
const tick=async()=>{for(let i=0;i<6;i++)await new Promise(resolve=>setImmediate(resolve));};
class FormValues{
 constructor(form){this.values=[...form.querySelectorAll('[name]')].filter(el=>!['checkbox','radio'].includes(el.type)||el.checked).map(el=>[el.name,el.value]);}
 entries(){return this.values.values();}getAll(name){return this.values.filter(v=>v[0]===name).map(v=>v[1]);}
}
async function portal(enabled=false,extra={}){
 const {window,document}=parseHTML('<html><body><main id="portal"></main><dialog id="book-dialog"></dialog><div id="notice" hidden></div></body></html>'),requests=[];
 Object.defineProperty(window.HTMLSelectElement.prototype,'value',{configurable:true,get(){return [...this.querySelectorAll('option')].find(o=>o.hasAttribute('selected'))?.value||this.querySelector('option')?.value||'';},set(v){for(const o of this.querySelectorAll('option'))o.toggleAttribute('selected',o.value===v);}});
 window.HTMLElement.prototype.reset=function(){for(const el of this.querySelectorAll('[name]'))el.value=el.getAttribute('value')||'';};
 const settings={username:'owner',mode:'setup',currencies:['NGN'],active_currencies:[],typography:'classic',public_origin:'https://store.example.invalid',support_email:'support@example.invalid',mfa_enabled:enabled,...extra};
 const fetch=async(url,options={})=>{
  const data=options.body?JSON.parse(options.body):undefined;requests.push({url,options,data});let response={ok:true};
  if(url.endsWith('admin/session'))response={authenticated:true,csrf:'first-csrf'};
  if(url.endsWith('admin/settings'))response=settings;
  if(url.endsWith('admin/books'))response=options.method==='POST'?{ok:true,id:data.id||'new-book',slug:data.slug,url:'https://store.example.invalid/books/'+data.slug+'/'}:{books:extra.books||[]};
  if(url.endsWith('security/enroll'))response={secret:'TESTONLYSETUPKEY234567TESTONLYKEY',account:'owner',issuer:'Bookshop'};
  if(url.endsWith('security/enable')){settings.mfa_enabled=true;response={ok:true,csrf:'replacement-csrf',recovery_codes:['FIRST-FAKE-CODE','SECOND-FAKE-CODE']};}
  if(url.endsWith('security/recovery'))response={ok:true,csrf:'recovery-csrf',recovery_codes:['NEW-FAKE-CODE']};
  return Response.json(response);
 };
 const context=vm.createContext({window,document,fetch,FormData:FormValues,location:{origin:'https://store.example.invalid'},URLSearchParams,Intl,Date,setTimeout:()=>1,clearTimeout:()=>{},confirm:()=>true});
 await vm.runInContext('(async()=>{'+source+'})()',context);document.querySelector('[data-tab="settings"]').dispatchEvent(new window.Event('click',{bubbles:true}));await tick();
 return {window,document,requests,settings};
}
async function submit(p,id,values){const form=p.document.getElementById(id);assert.ok(form,id);for(const [key,value] of Object.entries(values)){const field=form.querySelector('[name="'+key+'"]');assert.ok(field,key);field.value=value;}form.dispatchEvent(new p.window.Event('submit',{bubbles:true,cancelable:true}));await tick();}

test('Author settings shows separate valid security forms and supports enrollment through recovery-code display',async()=>{
 const p=await portal();assert.equal(p.document.querySelector('form form'),null);assert.ok(p.document.getElementById('settings-password'));assert.equal(p.document.querySelector('[name=new_password]').getAttribute('minlength'),'15');
 await submit(p,'security-enroll-form',{current_password:'only-for-ui-test-password'});assert.ok(p.document.getElementById('authenticator-secret'),p.document.getElementById('notice').textContent+' '+JSON.stringify(p.requests.slice(-2))); assert.equal(p.document.querySelector('form form'),null);
 await submit(p,'security-enable-form',{current_password:'only-for-ui-test-password',security_code:'123456'});
 assert.equal(p.document.getElementById('saved-recovery-codes').value,'FIRST-FAKE-CODE\nSECOND-FAKE-CODE');assert.equal(p.document.getElementById('authenticator-secret'),null);assert.equal(p.document.querySelector('form form'),null);
 await submit(p,'security-manage-form',{action:'recovery',current_password:'only-for-ui-test-password',security_code:'654321'});
 const last=p.requests.findLast(r=>r.url.endsWith('security/recovery'));assert.equal(last.options.headers['X-BS-CSRF'],'replacement-csrf');assert.equal(p.document.getElementById('saved-recovery-codes').value,'NEW-FAKE-CODE');
});

test('Enabled MFA appears in settings and password confirmation and sends a code with password changes',async()=>{
 const p=await portal(true);assert.ok(p.document.getElementById('settings-code'));assert.ok(p.document.getElementById('password-code'));assert.equal(p.document.getElementById('security-enroll-form'),null);
 await submit(p,'password-form',{current_password:'only-for-ui-test-password',new_password:'only-for-ui-test-new-password',confirm_password:'only-for-ui-test-new-password',security_code:'123456'});
 const sent=p.requests.find(r=>r.url.endsWith('admin/password')).data;assert.equal(sent.security_code,'123456');assert.equal(sent.new_password,'only-for-ui-test-new-password');assert.ok(p.document.querySelector('#login [name=security_code]'));
});
test('A Bachs-only store shows no Flutterwave settings, and a store with both gateways keeps the naira choice',async()=>{
 const only=await portal(false,{flutterwave_enabled:false});const text=only.document.getElementById('portal').textContent;
 assert.doesNotMatch(text,/Flutterwave/);assert.equal(only.document.querySelector('[name="flutterwave_test"]'),null);assert.equal(only.document.querySelector('[name="webhook_secret"]'),null);assert.equal(only.document.querySelector('[name="ngn_gateway"]'),null);
 assert.match(text,/Bachs payments/);assert.match(text,/NGN uses Bachs card and bank transfer/);assert.ok(only.document.querySelector('[name="bachs_test"]'));
 const both=await portal(false,{flutterwave_enabled:true,ngn_gateway:'bachs'});
 assert.ok(both.document.querySelector('[name="ngn_gateway"]'));assert.ok(both.document.querySelector('[name="flutterwave_test"]'));assert.match(both.document.getElementById('portal').textContent,/NGN uses the gateway selected above/);
});
test('The book editor keeps, removes and saves the second image and sales page images',async()=>{
 const book={id:'book-1',title:'Book with images',slug:'book-with-images',author:'Owner',category:'Books',price_ngn:3000,active:true,position:0,description_html:'<p>About</p>',image_url:'/books/api/cover/main.webp',image2_url:'/books/api/cover/back.webp',image2_small_url:'/books/api/cover/back-small.webp',gallery_title:'Readers say',gallery:[{url:'/books/api/cover/t1.webp',small_url:'/books/api/cover/t1-small.webp'},{url:'/books/api/cover/t2.webp',small_url:''}],cross_sell:[]};
 const p=await portal(false,{books:[book]});
 if(!p.window.HTMLElement.prototype.showModal)p.window.HTMLElement.prototype.showModal=function(){this.setAttribute('open','');};
 const click=selector=>{const el=p.document.querySelector(selector);assert.ok(el,selector);el.dispatchEvent(new p.window.Event('click',{bubbles:true}));};
 click('[data-tab="books"]');await tick();click('[data-edit-book="book-1"]');await tick();
 const form=p.document.getElementById('book-form');assert.ok(form);
 assert.equal(p.document.getElementById('image2-preview').getAttribute('src'),'/books/api/cover/back.webp');assert.equal(p.document.getElementById('image2-preview').hasAttribute('hidden'),false);
 assert.equal(p.document.querySelectorAll('#gallery-list .gallery-item').length,2);assert.equal(p.document.getElementById('gallery_title').value,'Readers say');
 assert.ok(p.document.querySelector('#gallery-file').hasAttribute('multiple'));
 click('[data-remove-gallery="0"]');assert.equal(p.document.querySelectorAll('#gallery-list .gallery-item').length,1);assert.match(p.document.querySelector('#gallery-list img').getAttribute('src'),/t2\.webp/);
 click('[data-remove-image2]');assert.equal(p.document.getElementById('image2-preview').hasAttribute('hidden'),true);
 form.dispatchEvent(new p.window.Event('submit',{bubbles:true,cancelable:true}));await tick();
 const saved=p.requests.filter(r=>r.url.endsWith('admin/books')&&r.options.method==='POST').at(-1);assert.ok(saved,'the book was saved');
 assert.equal(saved.data.image2_url,'');assert.equal(saved.data.image2_small_url,'');assert.deepEqual(saved.data.gallery,[{url:'/books/api/cover/t2.webp',small_url:''}]);assert.equal(saved.data.gallery_title,'Readers say');assert.equal(saved.data.image_url,'/books/api/cover/main.webp');
});
test('A Brevo store asks for a Brevo API key instead of a Resend key',async()=>{
 const brevo=await portal(false,{email_provider:'brevo',has_brevo_key:true});
 assert.ok(brevo.document.querySelector('[name="brevo_key"]'));assert.equal(brevo.document.querySelector('[name="resend_key"]'),null);
 const text=brevo.document.getElementById('portal').textContent;assert.match(text,/Brevo API key/);assert.match(text,/Block unknown IP addresses/);assert.doesNotMatch(text,/Resend/);
 const resend=await portal(false,{email_provider:'resend'});assert.ok(resend.document.querySelector('[name="resend_key"]'));assert.equal(resend.document.querySelector('[name="brevo_key"]'),null);
});
