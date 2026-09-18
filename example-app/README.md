# Example app

Sample browser UI for the Search The Watch Market Business API. This folder is
**not** the API server.

## Start

```bash
npm install
npm start
```

Then open `http://localhost:6006/app`. That local process only serves this demo
page. API calls go to `https://data.searchthewatchmarket.com`.

## Notes

- Implements the endpoints in [API_REFERENCE.md](../API_REFERENCE.md), including days-to-sell.
- Override the API host with `UPSTREAM_BASE_URL` in `.env` if needed.
- Paste your Business API key in the UI. It is sent as `Authorization: Bearer <api_key>`.
