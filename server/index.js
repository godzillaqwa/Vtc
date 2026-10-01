import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = Number(process.env.PORT || 3000);

app.disable('x-powered-by');
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

const company = process.env.COMPANY_NAME || 'Mining Operations';
const site = process.env.SITE_NAME || 'Unconfigured Site';
const braiinsToken = process.env.BRAIINS_POOL_TOKEN?.trim();
const payoutAddress = process.env.BITCOIN_PAYOUT_ADDRESS?.trim();

async function getJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      accept: 'application/json',
      ...(options.headers || {})
    },
    signal: AbortSignal.timeout(10000)
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} from ${new URL(url).hostname}`);
  }
  return response.json();
}

function requireBraiins() {
  if (!braiinsToken) {
    const error = new Error('BRAIINS_POOL_TOKEN is not configured');
    error.code = 'NOT_CONFIGURED';
    throw error;
  }
}

async function braiins(endpoint) {
  requireBraiins();
  return getJson(`https://pool.braiins.com${endpoint}`, {
    headers: { 'Pool-Auth-Token': braiinsToken }
  });
}

function unavailable(source, error) {
  return {
    source,
    connected: false,
    reason: error?.code === 'NOT_CONFIGURED' ? 'NOT_CONFIGURED' : 'ERROR',
    error: error?.message || 'Unknown error'
  };
}

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'mining-operations',
    readOnly: process.env.READ_ONLY !== 'false',
    integrations: {
      braiinsPool: Boolean(braiinsToken),
      bitcoinAddress: Boolean(payoutAddress)
    }
  });
});

app.get('/api/overview', async (_req, res) => {
  const result = {
    company,
    site,
    generatedAt: new Date().toISOString(),
    readOnly: process.env.READ_ONLY !== 'false',
    pool: null,
    workers: null,
    payouts: null,
    wallet: null
  };

  try {
    const data = await braiins('/accounts/profile/json/btc/');
    const btc = data?.btc;
    result.pool = {
      connected: true,
      username: data?.username || null,
      hashRateUnit: btc?.hash_rate_unit || null,
      hashRate5m: btc?.hash_rate_5m ?? null,
      hashRate60m: btc?.hash_rate_60m ?? null,
      hashRate24h: btc?.hash_rate_24h ?? null,
      todayReward: btc?.today_reward ?? null,
      estimatedReward: btc?.estimated_reward ?? null,
      currentBalance: btc?.current_balance ?? null,
      allTimeReward: btc?.all_time_reward ?? null,
      okWorkers: btc?.ok_workers ?? 0,
      lowWorkers: btc?.low_workers ?? 0,
      offWorkers: btc?.off_workers ?? 0,
      disabledWorkers: btc?.dis_workers ?? 0,
      shares24h: btc?.shares_24h ?? null
    };
  } catch (error) {
    result.pool = unavailable('Braiins Pool', error);
  }

  try {
    const data = await braiins('/accounts/workers/json/btc');
    const workers = data?.btc?.workers || {};
    result.workers = {
      connected: true,
      items: Object.entries(workers).map(([name, worker]) => ({
        name,
        state: worker.state || 'unknown',
        hashRateUnit: worker.hash_rate_unit || null,
        hashRate5m: worker.hash_rate_5m ?? null,
        hashRate60m: worker.hash_rate_60m ?? null,
        hashRate24h: worker.hash_rate_24h ?? null,
        shares24h: worker.shares_24h ?? null,
        lastShare: worker.last_share ? new Date(worker.last_share * 1000).toISOString() : null
      }))
    };
  } catch (error) {
    result.workers = unavailable('Braiins Workers', error);
  }

  try {
    const to = new Date().toISOString().slice(0, 10);
    const fromDate = new Date(Date.now() - 30 * 86400000);
    const from = fromDate.toISOString().slice(0, 10);
    const data = await braiins(`/accounts/payouts/json/btc?from=${from}&to=${to}`);
    result.payouts = {
      connected: true,
      onchain: (data?.onchain || []).map((p) => ({
        status: p.status,
        amountSats: p.amount_sats ?? null,
        feeSats: p.fee_sats ?? null,
        destination: p.destination ?? null,
        txId: p.tx_id ?? null,
        requestedAt: p.requested_at_ts ? new Date(p.requested_at_ts * 1000).toISOString() : null,
        resolvedAt: p.resolved_at_ts ? new Date(p.resolved_at_ts * 1000).toISOString() : null
      }))
    };
  } catch (error) {
    result.payouts = unavailable('Braiins Payouts', error);
  }

  if (payoutAddress) {
    try {
      const data = await getJson(`https://mempool.space/api/address/${encodeURIComponent(payoutAddress)}`);
      result.wallet = {
        connected: true,
        address: payoutAddress,
        funded: data?.chain_stats?.funded_txo_sum ?? 0,
        spent: data?.chain_stats?.spent_txo_sum ?? 0,
        transactionCount: data?.chain_stats?.tx_count ?? 0,
        mempoolTxCount: data?.mempool_stats?.tx_count ?? 0
      };
    } catch (error) {
      result.wallet = unavailable('Bitcoin mainnet address', error);
      result.wallet.address = payoutAddress;
    }
  } else {
    result.wallet = unavailable('Bitcoin mainnet address', Object.assign(new Error('BITCOIN_PAYOUT_ADDRESS is not configured'), { code: 'NOT_CONFIGURED' }));
  }

  res.json(result);
});

app.get('/api/workers', async (_req, res) => {
  try {
    const data = await braiins('/accounts/workers/json/btc');
    const workers = data?.btc?.workers || {};
    res.json({
      connected: true,
      items: Object.entries(workers).map(([name, worker]) => ({ name, ...worker }))
    });
  } catch (error) {
    res.status(error?.code === 'NOT_CONFIGURED' ? 503 : 502).json(unavailable('Braiins Workers', error));
  }
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.listen(port, () => {
  console.log(`Mining operations dashboard listening on http://localhost:${port}`);
});
