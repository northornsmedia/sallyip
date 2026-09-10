// Manual IndexNow submission for changed public URLs only.
// Usage: INDEXNOW_KEY=<key> npm run seo:indexnow -- https://sallyip.com/ https://sallyip.com/compare/...
// Policy: submit ONLY new/updated/deleted URLs after deployment. Never bulk-resubmit unchanged URLs.
// Bing supports IndexNow to notify participating engines of creates/updates/deletes.
const KEY = process.env.INDEXNOW_KEY || '';
const HOST = 'sallyip.com';
const urls = process.argv.slice(2).filter(u => u.startsWith('https://sallyip.com/'));

if (!KEY) {
  console.error('INDEXNOW_KEY is not set. Generate one, host it at https://sallyip.com/<KEY>.txt, then re-run.');
  process.exit(1);
}
if (!urls.length) {
  console.error('No changed URLs passed. Example: npm run seo:indexnow -- https://sallyip.com/');
  process.exit(1);
}
if (urls.length > 50) {
  console.error('Refusing to submit >50 URLs at once (spam guard). Split into smaller changed-URL batches.');
  process.exit(1);
}

const body = JSON.stringify({ host: HOST, key: KEY, keyLocation: `https://${HOST}/${KEY}.txt`, urlList: urls });
const res = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' }, body
});
console.log('IndexNow status:', res.status);
console.log(await res.text().catch(() => ''));
