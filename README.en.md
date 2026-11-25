# Market Analyst App

A small energy-market analytics demo built as a Microsoft Fabric app with Rayfin. The UI is in Polish ("Analityk Rynku"). Prices in the app are synthetic.

Polish version: [README.md](README.md).

## What it does

After signing in, the user sees four tabs:

- **Dashboard** with summary numbers and top movers.
- **Market prices**: a list of commodities with the latest price and change, price history per commodity, a form to add a price observation and a form to add a new commodity.
- **Alerts**: price alerts (above/below a threshold) per commodity. An alert is highlighted in the UI when the latest price crosses the threshold. No notifications are sent.
- **Notes**: analyst notes with a sentiment tag, optionally linked to a commodity.

The seed button creates six sample instruments (EU ETS allowances, Dutch TTF gas, German and Polish baseload power, API2 coal, Brent) with a 22-day random walk of prices labelled "Demo feed". These are not real quotes. Alerts and notes are stored per user.

## Stack

- React 19, Vite 7, Tailwind CSS 4, TypeScript
- Rayfin (`@microsoft/rayfin-*` packages): auth, data (MSSQL dialect) and static hosting on Microsoft Fabric
- Data model in `rayfin/data/`: `Commodity`, `PriceObservation`, `PriceAlert`, `AnalysisNote`

## Running locally

Requirements: Node.js 20+, Docker Desktop (for the local Rayfin backend).

```bash
npm ci
npm run rayfin:db      # apply the schema to the local backend
npm run dev:local      # local backend in Docker + Vite on http://localhost:5173
```

With a localhost API URL the app uses email/password sign-in.

## Deploying to Microsoft Fabric

```bash
npx rayfin login -t <TENANT_ID>
npm run up
```

When the API URL is not localhost, the app uses Fabric (Entra ID) sign-in. After the first deployment add the app URL to `allowedRedirectUris` in `rayfin/rayfin.yml` if the CLI has not done it.

`AGENTS.md`, `.agents/` and `.mcp.json` contain the standard Rayfin context for coding agents (skill file and the `@microsoft/rayfin-mcp` server).

## Disclaimer

This is a demo. Prices are randomly generated and must not be used for any trading or investment decision. The project is not an official Microsoft product.

## License

MIT, see [LICENSE](LICENSE).
