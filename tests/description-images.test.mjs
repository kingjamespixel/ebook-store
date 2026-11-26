import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sanitizeHtml} from '../src/security.js';

test('Descriptions keep images uploaded to this store and drop every other image source',()=>{
  const kept=sanitizeHtml('<p>Readers say<img src="/books/api/cover/abc_DEF-12.webp" alt="Reader &amp; friend" onerror="steal()" style="width:9999px" width="9"></p>');
  assert.equal(kept,'<p>Readers say<img src="/books/api/cover/abc_DEF-12.webp" alt="Reader &amp; friend" loading="lazy"></p>');
  for(const src of ['https://evil.example/a.png','//evil.example/a.webp','/books/api/cover/../secret.webp','/books/api/cover/a.png','data:image/png;base64,AAAA','javascript:alert(1)','/books/api/download?x=1',''])
    assert.equal(sanitizeHtml('<img src="'+src+'" alt="x">'),'',src);
  assert.equal(sanitizeHtml("<img alt='single' src='/books/api/cover/ok.webp'>"),'<img src="/books/api/cover/ok.webp" alt="single" loading="lazy">');
  assert.doesNotMatch(sanitizeHtml('<img src="/books/api/cover/a.webp" alt="&quot;><script>alert(1)</script>">'),/<script/i);
  assert.equal(sanitizeHtml('<p>Text</img></p>'),'<p>Text</p>');
});
