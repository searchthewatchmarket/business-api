# Search The Watch Market Business API Example

This repository contains documentation and tooling for the Search The Watch Market `/data` Business API.

## What is in this repo

- **API documentation:** See [API_REFERENCE.md](./API_REFERENCE.md) for full endpoint and authentication details.

- **AI assistant (MCP) access:** See [MCP_REFERENCE.md](./MCP_REFERENCE.md) to connect Cursor or other MCP-compatible apps using the same subscription and API key.

- **Main website:** [https://searchthewatchmarket.com](https://searchthewatchmarket.com)

- **Pre-created Insomnia collection:** [insomnia_collection.json](./insomnia_collection.json) is ready to import so you can test endpoints quickly.

- **Example app:** [example-app](./example-app) contains a working Node.js + vanilla JavaScript example client for the API.

## API key requirement

A valid API key is required for all `/data/*` endpoints.

You can obtain your API key from:

- [https://searchthewatchmarket.com/subscribe](https://searchthewatchmarket.com/subscribe)

After subscribing to a Business API plan, use the key as a Bearer token in the `Authorization` header as described in [API_REFERENCE.md](./API_REFERENCE.md). The same key works for [MCP assistant access](./MCP_REFERENCE.md).
