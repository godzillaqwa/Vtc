import test from 'node:test';
import assert from 'node:assert/strict';

test('production dashboard does not contain seeded mining telemetry', async () => {
  const source = await import('node:fs/promises').then(fs => fs.readFile('./server/index.js', 'utf8'));
  assert.equal(source.includes('123456789'), false);
  assert.equal(source.includes('fake'), false);
  assert.equal(source.includes('simulation'), false);
});

test('required environment keys are documented', async () => {
  const env = await import('node:fs/promises').then(fs => fs.readFile('./.env.example', 'utf8'));
  for (const key of ['BRAIINS_POOL_TOKEN', 'BITCOIN_PAYOUT_ADDRESS', 'COMPANY_NAME']) {
    assert.match(env, new RegExp('^' + key + '=', 'm'));
  }
});
