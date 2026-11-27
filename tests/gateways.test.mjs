// Checks the store exactly as store.config.json configures it. This store lists
// only Bachs in payment_gateways, so Flutterwave must be unreachable: no portal
// keys, no webhook, no checkout and no Content-Security-Policy allowance.
import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import mfPackage from 'miniflare';
const {Miniflare,convertV4MiniflareOptions}=mfPackage;

const root=fileURLToPath(new URL('../',import.meta.url)),origin='https://bachs-only.example',password='bachs-only-store-test-password';
const storeConfig=JSON.parse(await readFile(root+'store.config.json','utf8'));
const bachsOnly=Array.isArray(storeConfig.payment_gateways)&&!storeConfig.payment_gateways.includes('flutterwave');
const rates={NGN:1,GHS:.008,KES:.09,MWK:1.3,RWF:1.1,TZS:1.9,UGX:2.5,XAF:.45,XOF:.45,ZMW:.017,USD:.0007};
const outbound=[],brevo=[];let mf,cookie,csrf,sequence=0;
async function external(req){
  const u=new URL(req.url);outbound.push(u.hostname+u.pathname);
  if(u.hostname==='open.er-api.com')return Response.json({result:'success',base_code:'NGN',time_last_update_unix:Math.floor(Date.now()/1000),rates});
  if(u.hostname==='images.example'){
    if(u.pathname==='/testimony.png')return new Response(new Uint8Array([137,80,78,71,13,10,26,10,1,2,3]),{headers:{'Content-Type':'image/png'}});
    if(u.pathname==='/page.html')return new Response('<html></html>',{headers:{'Content-Type':'text/html'}});
    if(u.pathname==='/huge.jpg')return new Response(new Uint8Array(16*1024*1024),{headers:{'Content-Type':'image/jpeg'}});
    return new Response('missing',{status:404});
  }
  if(u.hostname==='api.brevo.com'&&u.pathname==='/v3/smtp/email'&&req.method==='POST'){
    const body=await req.json();brevo.push({key:req.headers.get('api-key'),authorization:req.headers.get('Authorization'),body});
    if(req.headers.get('api-key')==='xkeysib-good-test-key')return Response.json({messageId:'<test.'+brevo.length+'@relay.example>'},{status:201});
    return Response.json({code:'unauthorized',message:'Key not found'},{status:401});
  }
  if(u.hostname==='sandbox-api.bachs.io'&&u.pathname==='/v1/checkout-sessions'&&req.method==='GET'){
    const auth=req.headers.get('Authorization');if(auth==='Bearer sk_sandbox_only_a_test_value')return Response.json({data:[]});
    return Response.json({detail:'Invalid API key'},{status:auth==='Bearer sk_sandbox_no_scope_value'?403:401});
  }
  if(u.hostname==='sandbox-api.bachs.io'&&u.pathname==='/v1/checkout-sessions'&&req.method==='POST'){
    const body=await req.json(),id='chk_only_'+(++sequence);outbound.push(JSON.stringify(body.payment_method_types));
    return Response.json({checkout_id:id,checkout_url:'https://sandbox-checkout.bachs.io/c/token_'+sequence,status:'open',reference:body.reference},{status:201});
  }
  throw new Error('Unexpected external request '+u.hostname+u.pathname);
}
const call=(path,{method='GET',data,raw,headers={}}={})=>mf.dispatchFetch(origin+path,{method,redirect:'manual',cf:{country:'NG'},headers:{...(method!=='GET'?{Origin:origin}:{}),...(data?{'Content-Type':'application/json'}:{}),...headers},body:raw??(data?JSON.stringify(data):undefined)});
const admin=(path,options={})=>call('/books/api/admin/'+path,{...options,headers:{Cookie:cookie,'X-BS-CSRF':csrf,...(options.headers||{})}});

before(async()=>{
  if(!bachsOnly)return;
  const bundle=await build({entryPoints:[root+'src/worker.js'],bundle:true,write:false,format:'esm',platform:'browser',target:'es2022'});
  mf=new Miniflare(convertV4MiniflareOptions({name:'bachs-only-store',cf:false,telemetry:{enabled:false},modules:true,script:bundle.outputFiles[0].text,compatibilityDate:'2026-10-10',bindings:{PUBLIC_ORIGIN:origin,CONFIG_KEY:'bachs-only-test-key-over-thirty-two-characters',AUTHOR_INITIAL_PASSWORD:password},d1Databases:['DB'],r2Buckets:['FILES'],outboundService:external,assets:{directory:root+'public',binding:'ASSETS',run_worker_first:true,routerConfig:{has_user_worker:true},assetConfig:{html_handling:'none',not_found_handling:'none'}}}));
  const db=await mf.getD1Database('DB');for(const file of (await readdir(root+'migrations')).filter(f=>f.endsWith('.sql')).sort())await db.exec(await readFile(root+'migrations/'+file,'utf8'));
  const login=await call('/books/api/admin/login',{method:'POST',data:{username:'owner',password}});const data=await login.json();assert.equal(login.status,200,JSON.stringify(data));
  cookie=login.headers.get('Set-Cookie').split(';')[0];csrf=data.csrf;
});
after(async()=>{await mf?.dispose();});

test('This store is configured for Bachs only',()=>{assert.ok(bachsOnly,'store.config.json payment_gateways should list only bachs');});

test('A Bachs-only store refuses Flutterwave settings and routes naira through Bachs card and bank transfer',{skip:!bachsOnly},async()=>{
  const settings=await (await admin('settings')).json();assert.equal(settings.flutterwave_enabled,false);assert.equal(settings.ngn_gateway,'bachs');
  for(const data of [{flutterwave_test:'FLWSECK_TEST-only-a-test-value'},{flutterwave_live:'FLWSECK-only-a-test-value'},{webhook_secret:'only-a-test-webhook-hash'},{ngn_gateway:'flutterwave'}]){
    const r=await admin('settings',{method:'POST',data:{current_password:password,...data}});assert.equal(r.status,400,JSON.stringify(data));
  }
  const saved=await admin('settings',{method:'POST',data:{current_password:password,mode:'test',currencies:['NGN','GHS'],bachs_test:'sk_sandbox_only_a_test_value',bachs_webhook_test:'whsec_only_a_test_value'}});assert.equal(saved.status,200,await saved.text());
  const pdf=await admin('upload?kind=pdf',{method:'POST',raw:'%PDF-1.7\nTest book\n%%EOF'});const pdfKey=(await pdf.json()).key;assert.ok(pdfKey);
  const book=await admin('books',{method:'POST',data:{title:'Bachs only test book',slug:'bachs-only-test-book',price_ngn:2000,active:true,pdf_key:pdfKey}});assert.equal(book.status,200,await book.text());
  const catalog=await (await call('/books/api/catalog')).json();assert.equal(catalog.ngn_gateway,'bachs');assert.equal(catalog.checkout_enabled,true);
  const item=catalog.books.find(b=>b.slug==='bachs-only-test-book');
  const checkout=await call('/books/api/checkout',{method:'POST',headers:{'X-BS-Nonce':catalog.nonce,Cookie:cookie},data:{name:'Test Reader',email:'reader@example.com',currency:'NGN',books:[item.id],expected_amount:item.prices.NGN,consent:true}});
  const order=await checkout.json();assert.equal(checkout.status,200,JSON.stringify(order));assert.equal(order.provider,'bachs');assert.equal(new URL(order.checkout_url).hostname,'sandbox-checkout.bachs.io');
  assert.ok(outbound.includes('["NGN_CARD","NGN_BANK_TRANSFER"]'));assert.equal(outbound.some(h=>h.includes('flutterwave')),false);
});

test('The Bachs key check explains a missing key, a wrong key and a key without permission',{skip:!bachsOnly},async()=>{
  const check=async mode=>{const r=await admin('bachs/check',{method:'POST',data:{mode}});return {status:r.status,message:(await r.json()).message};};
  let r=await check('live');assert.equal(r.status,400);assert.match(r.message,/No Bachs live API key is saved yet/);assert.match(r.message,/sk_live_/);
  for(const [key,pattern] of [['sk_sandbox_wrong_key_value',/did not recognise the saved sandbox key/],['sk_sandbox_no_scope_value',/lacks permission/],['sk_sandbox_only_a_test_value',/Bachs accepted the test API key/]]){
    const saved=await admin('settings',{method:'POST',data:{current_password:password,bachs_test:key}});assert.equal(saved.status,200,await saved.text());
    r=await check('test');assert.match(r.message,pattern,key);
  }
});

test('Pasted keys with stray spaces save, and a key in the wrong field gets a clear message',{skip:!bachsOnly},async()=>{
  const save=data=>admin('settings',{method:'POST',data:{current_password:password,...data}});
  let r=await save({bachs_live:'  sk_live_Test.key-123_ok \r\n'});assert.equal(r.status,200,await r.text());
  assert.equal((await (await admin('settings')).json()).has_bachs_live,true);
  for(const [data,pattern] of [[{bachs_live:'sk_sandbox_wrong_field_value'},/That is a sandbox key/],[{bachs_test:'sk_live_wrong_field_value'},/That is a live key/],[{bachs_live:'pk_live_not_a_secret_key'},/starts with sk_live_/],[{bachs_live:'sk_live_two words here'},/without spaces/]]){
    r=await save(data);assert.equal(r.status,400,JSON.stringify(data));assert.match((await r.json()).message,pattern);
  }
  r=await admin('bachs/check',{method:'POST',data:{mode:'live'}});assert.doesNotMatch((await r.json()).message,/No Bachs live API key is saved yet/);
});

test('Receipts and test emails go through Brevo with the saved key, sender and reply address',{skip:!bachsOnly},async()=>{
  const save=data=>admin('settings',{method:'POST',data:{current_password:password,...data}});
  const before=await (await admin('settings')).json();assert.equal(before.email_provider,'brevo');assert.equal(before.has_brevo_key,false);
  let r=await save({resend_key:'re_test_resend_key_value'});assert.equal(r.status,400);assert.match((await r.json()).message,/through Brevo/);
  r=await save({brevo_key:' xkeysib-good-test-key\n',from_email:'books@bachs-only.example',from_name:'Evergreen Christian',support_email:'help@bachs-only.example'});assert.equal(r.status,200,await r.text());
  assert.equal((await (await admin('settings')).json()).has_brevo_key,true);assert.equal((await (await call('/books/api/catalog')).json()).contact_enabled,true);
  r=await admin('test-email',{method:'POST',data:{}});assert.equal(r.status,200,await r.text());
  const sent=brevo.at(-1);assert.equal(sent.key,'xkeysib-good-test-key');assert.equal(sent.authorization,null);
  assert.deepEqual(sent.body.sender,{name:'Evergreen Christian',email:'books@bachs-only.example'});assert.deepEqual(sent.body.to,[{email:'help@bachs-only.example'}]);assert.deepEqual(sent.body.replyTo,{email:'help@bachs-only.example'});
  assert.ok(sent.body.subject);assert.match(sent.body.htmlContent,/email service accepted this test/);assert.ok(sent.body.headers['X-Mailin-custom']);
  r=await save({brevo_key:'xkeysib-revoked-test-key'});assert.equal(r.status,200);
  r=await admin('test-email',{method:'POST',data:{}});assert.equal(r.status,502);assert.match((await r.json()).message,/Brevo rejected the API key/);
  r=await save({brevo_key:'xkeysib-good-test-key'});assert.equal(r.status,200);
});

test('Books keep a second product image and up to 12 uploaded sales page images, and refuse outside links',{skip:!bachsOnly},async()=>{
  const webp=await readFile(root+'tests/fixtures/cover.webp');
  const upload=async()=>{const r=await admin('upload?kind=cover',{method:'POST',raw:webp,headers:{'Content-Type':'image/webp'}});const data=await r.json();assert.equal(r.status,200,JSON.stringify(data));return data.url;};
  const [main,second,secondSmall,t1,t1Small,t2]=[await upload(),await upload(),await upload(),await upload(),await upload(),await upload()];
  const base={title:'Book with images',slug:'book-with-images',price_ngn:3000,active:true,image_url:main};
  let saved=await admin('books',{method:'POST',data:{...base,image2_url:second,image2_small_url:secondSmall,gallery_title:'What readers are saying',gallery:[{url:t1,small_url:t1Small},{url:t2}]}});const {id}=await saved.json();assert.equal(saved.status,200);
  const find=async()=>(await (await admin('books')).json()).books.find(b=>b.id===id);
  let book=await find();assert.equal(book.image2_url,second);assert.equal(book.image2_small_url,secondSmall);assert.deepEqual(book.gallery,[{url:t1,small_url:t1Small},{url:t2,small_url:''}]);assert.equal(book.gallery_title,'What readers are saying');
  const publicBook=(await (await call('/books/api/catalog')).json()).books.find(b=>b.id===id);assert.equal(publicBook.image2_url,second);assert.equal(publicBook.gallery.length,2);
  for(const bad of [{image2_url:'https://evil.example/x.webp'},{image2_url:'/books/assets/logo.svg'},{image2_url:second,image2_small_url:'javascript:alert(1)'},{gallery:[{url:'https://evil.example/t.webp'}]},{gallery:[{url:t1,small_url:'/books/api/cover/../x.webp'}]},{gallery:Array.from({length:13},()=>({url:t1}))},{gallery:'not a list'},{gallery:[null]}]){
    const r=await admin('books',{method:'POST',data:{...base,id,...bad}});assert.equal(r.status,400,JSON.stringify(bad));
  }
  saved=await admin('books',{method:'POST',data:{...base,id,summary:'Edited without touching images'}});assert.equal(saved.status,200);book=await find();assert.equal(book.image2_url,second);assert.equal(book.gallery.length,2);
  saved=await admin('books',{method:'POST',data:{...base,id,image2_url:'',gallery:[]}});assert.equal(saved.status,200);book=await find();assert.equal(book.image2_url,undefined);assert.equal(book.image2_small_url,undefined);assert.deepEqual(book.gallery,[]);
});

test('Pasted web images are copied only for the signed-in owner, and descriptions keep only store images',{skip:!bachsOnly},async()=>{
  const fetchImage=(url,headers={})=>call('/books/api/admin/fetch-image',{method:'POST',data:{url},headers});
  assert.equal((await fetchImage('https://images.example/testimony.png')).status,401);
  const ok=await admin('fetch-image',{method:'POST',data:{url:'https://images.example/testimony.png'}});assert.equal(ok.status,200);assert.equal(ok.headers.get('Content-Type'),'image/png');assert.equal((await ok.arrayBuffer()).byteLength,11);
  const noCsrf=await call('/books/api/admin/fetch-image',{method:'POST',data:{url:'https://images.example/testimony.png'},headers:{Cookie:cookie}});assert.equal(noCsrf.status,403);
  for(const [url,status] of [['https://images.example/page.html',415],['https://images.example/missing.png',502],['https://images.example/huge.jpg',413],['http://localhost/a.png',400],['http://127.0.0.1/a.png',400],['http://192.168.0.1/a.png',400],['file:///etc/passwd',400],['https://user:pass@images.example/testimony.png',400],['not a url',400]]){
    const r=await admin('fetch-image',{method:'POST',data:{url}});assert.equal(r.status,status,url);
  }
  const webp=await readFile(root+'tests/fixtures/cover.webp');
  const stored=(await (await admin('upload?kind=cover',{method:'POST',raw:webp,headers:{'Content-Type':'image/webp'}})).json()).url;
  const saved=await admin('books',{method:'POST',data:{title:'Book with pasted images',slug:'book-with-pasted-images',price_ngn:2500,active:true,description_html:'<h2>Testimonies</h2><p>Great book<img src="'+stored+'" alt="Reader message"></p><p><img src="https://images.example/testimony.png"><img src="data:image/png;base64,AAAA"></p>'}});
  assert.equal(saved.status,200);const {id}=await saved.json();
  const book=(await (await admin('books')).json()).books.find(b=>b.id===id);
  assert.match(book.description_html,new RegExp('<img src="'+stored.replace(/[.*+?^${}()|[\]\\/]/g,'\\$&')+'" alt="Reader message" loading="lazy">'));
  assert.doesNotMatch(book.description_html,/images\.example|data:image/);
});

test('Short book links open the book page, keep tracking codes and follow renamed links',{skip:!bachsOnly},async()=>{
  const created=await admin('books',{method:'POST',data:{title:'Moving on',slug:'moving-on-short',price_ngn:1500,active:true}});assert.equal(created.status,200);const {id}=await created.json();
  for(const [path,location] of [['/moving-on-short','/books/moving-on-short/'],['/moving-on-short/','/books/moving-on-short/'],['/Moving-On-Short','/books/moving-on-short/'],['/moving-on-short?fbclid=abc&utm_source=wa','/books/moving-on-short/?fbclid=abc&utm_source=wa']]){
    const r=await call(path);assert.equal(r.status,302,path);assert.equal(r.headers.get('Location'),origin+location,path);
  }
  const renamed=await admin('books',{method:'POST',data:{id,title:'Moving on',slug:'moveon',price_ngn:1500,active:true}});assert.equal(renamed.status,200);
  let r=await call('/moving-on-short');assert.equal(r.headers.get('Location'),origin+'/books/moveon/');
  r=await call('/moveon');assert.equal(r.headers.get('Location'),origin+'/books/moveon/');
  assert.equal((await call('/no-such-book')).status,404);
  assert.equal((await call('/author')).status,301);assert.equal((await call('/author/')).status,200);assert.equal((await call('/')).headers.get('Location'),origin+'/books/');
  const reserved=await admin('books',{method:'POST',data:{title:'Clash',slug:'books',price_ngn:1000,active:true}});assert.equal(reserved.status,400);
  await admin('books/'+id,{method:'DELETE'});assert.equal((await call('/moveon')).status,404);
});

test('A Bachs-only store has no Flutterwave webhook and no Flutterwave form target',{skip:!bachsOnly},async()=>{
  const hook=await call('/books/api/webhook',{method:'POST',headers:{'verif-hash':'only-a-test-webhook-hash'},data:{event:'charge.completed',data:{id:1,tx_ref:'BS-test',status:'successful'}}});assert.equal(hook.status,404);
  const page=await call('/books/');assert.equal(page.status,200);assert.equal(page.headers.get('Content-Security-Policy').includes('flutterwave'),false);
});
