# Mining Operations Dashboard

Production-oriented operations software for a real Bitcoin mining business.

The existing Frosted Apex Mining app exposes many modules—dashboard, mining, wallets, portfolio, markets, payments, payouts, transactions, verified ledger, rig verification, reports, profitability and operations logs. This repository is a streamlined operations core: live mining telemetry first, with accounting and fleet modules added behind real data integrations rather than placeholder numbers.

## No simulation policy

This repository contains no generated miner readings, fake hashrates, fake payouts, seeded balances, or simulated revenue. If a live integration is not configured or is unavailable, the dashboard explicitly reports that state.

## Implemented

- Live Braiins Pool account telemetry:
  - 5m / 60m / 24h hashrate
  - worker states
  - shares
  - current pool balance
  - today's reward
  - estimated reward
  - all-time reward
- Live Braiins worker list.
- Live Braiins payout history for the previous 30 days.
- Optional Bitcoin mainnet payout-address inspection through mempool.space.
- Server-side API credentials; pool tokens are never exposed to browser JavaScript.
- Read-only operations mode by default.
- Responsive dashboard.
- Automated tests that reject obvious seeded/fake telemetry patterns.

Braiins documents its pool API as JSON endpoints for profile, workers, rewards, block rewards and payouts, authenticated with a `Pool-Auth-Token` or `X-Pool-Auth-Token` header. Its monitoring documentation also describes worker-level health states and individual worker monitoring. 

## Run locally

1. Install Node.js 20+.
2. Copy `.env.example` to `.env`.
3. Set `BRAIINS_POOL_TOKEN` to a real API token from the mining account.
4. Optionally set `BITCOIN_PAYOUT_ADDRESS` to the actual company payout address.
5. Run:

```bash
npm install
npm test
npm start
```

Open `http://localhost:3000`.

## Production architecture

The next modules should use the same rule: **real source → normalized record → immutable audit record → dashboard**.

Planned integrations:

1. Pool adapters: Braiins, Luxor, Foundry and other supported pools.
2. Fleet telemetry: ASIC APIs or a fleet manager such as Braiins Manager.
3. Electricity meters and power contracts for actual cost-per-kWh.
4. Hardware inventory, serial numbers, purchase records, warranties and maintenance.
5. Daily reconciliation of pool rewards, on-chain payouts and the accounting ledger.
6. Role-based authentication, audit logs and least-privilege API keys.
7. Alerting for worker outages, hashrate deviation, temperature and power anomalies.
8. Financial reporting that separates gross mining rewards, pool fees, electricity, hosting, maintenance and net operating result.

Luxor's current API documentation provides pool statistics and worker hashrate/efficiency reporting, while Braiins Manager provides fleet observability and worker telemetry. 

## Important legal/operational boundary

Software cannot by itself make a mining company "legit." Real-world legitimacy depends on the actual business entity, ownership, equipment, site, power agreements, pool accounts, wallets, taxes, accounting records, insurance, contracts and any licenses or registrations that apply to the operation.

This application therefore does not manufacture proof of ownership, revenue, assets, balances or transactions. It is designed to ingest evidence from real systems and preserve the source data.

## Security

- Never commit `.env` or API tokens.
- Never put wallet private keys in this repository.
- Use deployment-platform secret storage.
- Use read-only pool/API credentials wherever possible.
- Separate operational wallets from treasury/signing wallets.
- Add hardware-control endpoints only after authentication, authorization, CSRF protection, audit logging and explicit safety controls are implemented.
