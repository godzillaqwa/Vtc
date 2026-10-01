import test from 'node:test';import assert from 'node:assert/strict';import {profitability,reconcile} from '../server/calculations.js';
test('profitability uses supplied inputs only',()=>{const r=profitability({rewardBtc:1,btcUsd:100000,kwh:1000,usdPerKwh:.05});assert.equal(r.revenueUsd,100000);assert.equal(r.electricityUsd,50);});
test('reconciliation flags variance',()=>{assert.equal(reconcile({poolReward:1,onchainPayout:1}).status,'RECONCILED');assert.equal(reconcile({poolReward:1,onchainPayout:.9}).status,'EXCEPTION');});
