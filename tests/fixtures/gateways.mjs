// esbuild plugin for tests that cover both built-in gateways. It bundles the
// Worker with the store's real store.config.json plus both gateways enabled and
// Resend email (the starter's original provider),
// so shared payment checks keep their Flutterwave coverage even when this
// store's own configuration uses Bachs only (see tests/gateways.test.mjs).
import {readFile} from 'node:fs/promises';

export const bothGateways={
  name:'both-gateways',
  setup(build){
    build.onLoad({filter:/store\.config\.json$/},async args=>{
      const config=JSON.parse(await readFile(args.path,'utf8'));
      return {contents:JSON.stringify({...config,payment_gateways:['flutterwave','bachs'],email_provider:'resend'}),loader:'json'};
    });
  }
};
