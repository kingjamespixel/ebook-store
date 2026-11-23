# Store setup status

Track public progress only. Do not add secrets, recovery codes, buyer data or private purchase links.

Last updated: 23 November 2026.

## Where things stand

| Area | State | Evidence or next step |
| --- | --- | --- |
| Own GitHub repository | Done | https://github.com/kingjamespixel/ebook-store, branch `main`. New history from the clean starter files (first commit 5e59d32). Push access confirmed through git on the owner's PC. |
| Implementation tools | Checked | Claude Code desktop app: can edit files, run Node 26 and npm 11, push with git and use a built-in browser. GitHub CLI and a Wrangler login are not set up yet. |
| Local checks | Partly verified | 23 Nov 2026 on Windows: `npm ci` OK, `npm run check` passed, `npm run build` (dry run) passed with DB, FILES and ASSETS bindings, `npm test` 80 of 107 passed. The 27 failures are Windows-only: the local Workers runtime resets the connection when the app rejects a POST before reading its body, and later tests that share that state then fail; the deploy-script tests need symlinks and spawn `npm` in a way Windows does not support. Test file paths were fixed to work in folders with spaces. A full test run on Linux is still needed. |
| Business identity and copy | Pending | Waiting for intake answers (store name, contact details, copy). |
| Domain and Cloudflare | Pending | Waiting for domain, registrar and Cloudflare account details. |
| Independent D1 and private R2 | Not created | Created by `npm run deploy` after the domain and Cloudflare account are ready. |
| Owner login and authenticator | Not initialized | Needs AUTHOR_INITIAL_PASSWORD as a private build secret before the first deploy. |
| Catalog, covers and PDFs | Empty | Waiting for the owner's books. SEED_BOOKS stays empty. |
| Payment providers and currencies | Disabled | Waiting for provider choice and account approval. |
| Resend and support inbox | Disabled | Waiting for email decisions. |
| Privacy, terms, refunds, cancellation | Partial | A generic privacy page exists at /books/privacy. There are no terms, refund, cancellation or delivery notices yet. They need the owner's rules. |
| Meta Pixel and CAPI | Disabled | Optional owner decision. |
| Checkout reminders | Disabled | Optional owner decision. |
| Mobile, payments, files | Local tests only | Pending own-domain checks. |
| Live launch | Not deployed | Nothing is deployed. |

## Notes from reading the source

- Some text still says "Bookshop" in fixed strings instead of using store.config.json: the support-request email subject, the sales CSV filename, the page title suffix "The Bookshop", the privacy page heading, and the starting HTML of index.html and author.html. These will use the owner's store name once it is known.
- Prices are stored in NGN (`price_ngn`). Reports and the twice-daily rate windows use UTC.
- Flutterwave uses one saved webhook hash for both test and live.

## Pending owner decisions

The intake questions were sent in the Claude session on 23 Nov 2026. Answers will be recorded here without any secrets.

## Next actions

1. Owner answers the intake questions.
2. Fill in store.config.json and run `npm run configure`.
3. Set up Cloudflare (account, zone, Workers Builds) and run the first deploy.
