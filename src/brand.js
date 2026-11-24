import config from '../store.config.json' with {type:'json'};
export const BRAND=config;
// payment_gateways lists the gateways this store uses. Without the list, both
// built-in gateways stay available, as in the original starter.
export const FLUTTERWAVE_ENABLED=!Array.isArray(config.payment_gateways)||config.payment_gateways.includes('flutterwave');
