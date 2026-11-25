import config from '../store.config.json' with {type:'json'};
export const BRAND=config;
// payment_gateways lists the gateways this store uses. Without the list, both
// built-in gateways stay available, as in the original starter.
export const FLUTTERWAVE_ENABLED=!Array.isArray(config.payment_gateways)||config.payment_gateways.includes('flutterwave');
// email_provider chooses the service that sends receipts and support email:
// "brevo" or "resend" (the original starter's default).
export const EMAIL_PROVIDER=config.email_provider==='brevo'?'brevo':'resend';
export const EMAIL_KEY=EMAIL_PROVIDER==='brevo'?'brevo_key':'resend_key';
export const emailReady=s=>Boolean(s?.[EMAIL_KEY]&&s?.from_email);
