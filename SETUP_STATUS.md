# Store setup status

Track public progress only. Do not add secrets, recovery codes, buyer data or private purchase links.

Last updated: 23 November 2026.

## Owner answers (intake, 23 Nov 2026)

| Topic | Answer |
| --- | --- |
| Store name | Evergreen Christian |
| Registered business name | Not stated |
| Public contact | evergreenorganization29@gmail.com |
| Seller country and reader countries | Selling internationally, not only to Nigeria. Seller country not stated (pricing in naira and Lagos time). |
| Domain | evergreenchristian.online, registered at Namecheap, on Cloudflare according to the owner, already in use by a website and email |
| Store path | `https://evergreenchristian.online/books/` (path-route mode, existing site kept) |
| Cloudflare | Owner has an account. Whether the domain's DNS is already on Cloudflare is pending. |
| Support email and replies | evergreenorganization29@gmail.com |
| Sending address | Agreed: a sender on evergreenchristian.online (for example books@), replies to the Gmail address. The domain already has email, so its MX records must be kept. |
| Payment provider | Bachs only. Owner reports the account is approved for all currencies, including USD card. |
| Base currency | NGN. Buyers can choose any enabled currency through Bachs. |
| Report timezone | Lagos time (WAT) |
| Books | Ready. Owner will add them through the portal. Featured book to be chosen later. |
| Logo | Added as public/assets/evergreen-logo.jpg (200x200 copy from chat). A larger original would look sharper. |
| Colours | Green and white with a little black (the current design is already green and white) |
| Support response time | No promise to publish |
| Refund and cancellation rules | Approved refunds paid back within 3 to 7 days. The refund conditions on the terms page are a draft for the owner to confirm. |
| Checkout reminder email | Yes, once notices are in place |
| Meta Pixel and CAPI | Yes, both. Owner has a Meta business account. |
| Background | This store is a replica of the owner's own store (christianpositive.online) for the owner's brother. It uses its own accounts, keys, database and storage; nothing is copied from the other store's portal or data. |

## Where things stand

| Area | State | Evidence or next step |
| --- | --- | --- |
| Own GitHub repository | Done | https://github.com/kingjamespixel/ebook-store (public), branch `main`. New history from the clean starter files (first commit 5e59d32). Push access confirmed through git on the owner's PC. |
| Implementation tools | Checked | Claude Code desktop app: can edit files, run Node 26 and npm 11, push with git and use a built-in browser. GitHub CLI and a Wrangler login are not set up yet. |
| Linux tests (GitHub Actions) | Passing | Workflow `.github/workflows/test.yml` runs `npm ci`, `npm run check`, `npm test` and `npm run build` on Ubuntu with Node 22, writes totals and failures to the run summary, and lists failing tests as public annotations. An intermittent "fetch failed" in the security tests was traced to responses sent while the request body was unread; the Worker now reads any unread body (up to 1 MB) first. After the fix, 8 parallel repeat runs (run #13) and the main run (#12, commit 703e15a) passed. |
| Windows local tests | 105 of 110 pass | The 5 remaining failures need tools this PC lacks: Python (ZIP check), symlink permission and a Unix-style npm (deploy-script tests). |
| Business identity and copy | Done (copy to confirm) | store.config.json now holds Evergreen Christian, the support email, the domain and resource names. The tagline and homepage text are drafts for the owner to confirm. Fixed "Bookshop" strings now use the store name. |
| Deployment config | Generated | `npm run configure` wrote path routes for `evergreenchristian.online/books/*` and `/books` in zone `evergreenchristian.online`, PUBLIC_ORIGIN `https://evergreenchristian.online`, Worker `evergreen-books`, D1 `evergreen-books`, R2 `evergreen-book-files`. |
| Domain and Cloudflare | Pending | Need to confirm the domain's DNS is active on Cloudflare and which hostname the existing site uses (apex or www). |
| Independent D1 and private R2 | Not created | Created by `npm run deploy` in Workers Builds after Cloudflare is ready. |
| Owner login and authenticator | Not initialized | Needs AUTHOR_INITIAL_PASSWORD as a private build secret before the first deploy. |
| Catalog, covers and PDFs | Empty | Owner adds books in the portal. SEED_BOOKS stays empty. |
| USD for other countries | Code ready | The portal currency list now has "USD (card)". Buyers outside the listed countries see US$ prices and pay by Bachs card (`USD_CARD`). Tested. |
| Payments | Code ready, keys not entered | NGN can now use Bachs card (`NGN_CARD`) and bank transfer (`NGN_BANK_TRANSFER`), chosen with the new "Gateway for NGN payments" setting in the portal. Other currencies use Bachs mobile money. Sandbox tests pending. |
| Lagos time | Done | Price windows change at midnight and noon Lagos time. Sales date filters, portal times and the CSV export use Africa/Lagos. |
| Resend and support inbox | Pending | Needs a sending domain on evergreenchristian.online, verified in Resend. |
| Privacy, terms, refunds, cancellation | Draft published in code | New /books/terms/ page covers purchase, prices, delivery, cancellation, refunds (3 to 7 working days once approved) and consumer rights. Linked in the footer and the checkout consent. Refund conditions await owner confirmation. |
| Meta Pixel and CAPI | Pending setup | Owner wants both. Pixel ID and CAPI token are entered privately in the portal later. Consent requirements still to review. |
| Checkout reminders | Off for now | Owner wants them. Turn on after the notices are published. |
| Live launch | Not deployed | Nothing is deployed. |

## Code changes made for this store

- NGN gateway choice: new `ngn_gateway` setting (`bachs` or `flutterwave`). It is a sensitive setting, so changing it needs the current password. Existing installs keep Flutterwave unless the owner changes it. Test: "Naira can use Bachs card and bank transfer and still needs signed, verified payment before delivery".
- Lagos time for price windows, reports and CSV export, with the rate-window test updated to match.
- Store name used in the support email subject, page titles, CSV file name and starting HTML.

## Next actions

1. Owner confirms: site hostname (apex or www), refund conditions, tagline wording, and optionally sends a larger logo file.
2. Set up Workers Builds on Cloudflare for this repository and add AUTHOR_INITIAL_PASSWORD as a private build secret.
3. First deploy, then sign in to the portal, change the password, turn on the authenticator and set the NGN gateway to Bachs.
4. Enter Bachs sandbox keys and webhook secrets in the portal, then run sandbox purchases.
