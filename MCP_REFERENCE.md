# Search The Watch Market — AI Assistant Access (MCP)

Connect supported AI assistants — such as **Cursor** or **Claude Desktop** — to live watch market data using your existing Business API subscription.

**Endpoint:** `https://data.searchthewatchmarket.com/mcp`  
**Requires:** Active [Business API](https://searchthewatchmarket.com/subscribe) subscription and API key

For HTTP API integration (custom apps, scripts), see the [Business API Reference](./API_REFERENCE.md).

---

## Table of Contents

1. [Overview](#1-overview)
2. [What you need](#2-what-you-need)
3. [What you can ask](#3-what-you-can-ask)
4. [Set up Cursor](#4-set-up-cursor)
5. [Other AI apps](#5-other-ai-apps)
6. [Usage limits](#6-usage-limits)
7. [Tips & example questions](#7-tips--example-questions)
8. [Help & troubleshooting](#8-help--troubleshooting)
9. [Changelog](#9-changelog)

---

## 1. Overview

**MCP** is a standard way for AI apps to connect to external data sources. Once configured, you can ask questions in plain language and your assistant fetches Search The Watch Market data for you — no coding required.

This uses the **same subscription and API key** as the Business API. You are not buying separate data; you are choosing a different way to access it.

Typical workflow:

1. Add Search The Watch Market to your AI app’s MCP settings (one-time).
2. Ask a question, e.g. *“What’s the market price for a Rolex Submariner 126610LN?”*
3. The assistant looks up the model, retrieves prices, and answers in chat.

Your AI app handles the technical connection. You only need your API key and the endpoint URL below.

---

## 2. What you need

### Business API subscription

MCP access is included with an active **Business API** plan. Subscribe at [searchthewatchmarket.com/subscribe](https://searchthewatchmarket.com/subscribe).

### API key

After approval, your API key appears on the subscription page under **API Access**. Copy it exactly from the page and paste it into your AI app configuration.

---

## 3. What you can ask

Your assistant can retrieve:

| Topic | Examples of what you can learn |
| ----- | ------------------------------ |
| **Find a model** | Match a brand, model name, or reference number to our catalogue |
| **Current market prices** | Latest low, high, average asking price, and market value across current listings |
| **Specifications** | Brand, reference, case size, movement, materials, and other model attributes |
| **Price trends** | Up to 13 weeks of weekly price movement (roughly three months) |
| **New listings** | Watches listed for sale in the past 7 days for a given model |
| **Listing price history** | How one dealer’s asking price changed over time |

All access is **read-only**. The assistant cannot change listings, place orders, or access data outside your subscription.

---

## 4. Set up Cursor

### Step 1 — Add the MCP server

Create or edit **`.cursor/mcp.json`** in your project folder, or in your user config at **`~/.cursor/mcp.json`** for all projects:

```json
{
  "mcpServers": {
    "search-the-watch-market": {
      "url": "https://data.searchthewatchmarket.com/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_API_KEY_HERE"
      }
    }
  }
}
```

Replace `YOUR_API_KEY_HERE` with your full API key from the subscription page.

### Step 2 — Enable in Cursor

1. Open **Cursor Settings → MCP** (or **Features → MCP**).
2. Confirm **search-the-watch-market** appears and shows as connected.
3. If it does not connect, restart Cursor or use the refresh control for that server.

### Step 3 — Try it

Open **Agent** mode and ask a watch market question (see [§7](#7-tips--example-questions)).

---

## 5. Other AI apps

Any MCP-compatible app that supports a **remote server URL** and **custom headers** can use the same settings:

| Setting | Value |
| ------- | ----- |
| **Server URL** | `https://data.searchthewatchmarket.com/mcp` |
| **Authorization** | `Bearer YOUR_API_KEY_HERE` |

Check your app’s documentation for where to add MCP servers. The name you choose (e.g. `search-the-watch-market`) is only a label for your own reference.

---

## 6. Usage limits

MCP shares your **daily request allowance** with the Business API:

| Plan | Plan ID | Requests per day |
| ---- | ------- | ---------------- |
| Business API 1k | `business_api_1k` | 1,000 |
| Business API 5k | `business_api_5k` | 5,000 |
| Business API 5k (distribution) | `business_api_5k_distribution` | 5,000 |

**Important:** Each data lookup the assistant makes counts as one request. A single question may trigger several lookups (for example, finding the model, then fetching prices), so chat use can consume your allowance faster than one-off API calls.

Limits reset at **midnight UTC**.

If you reach your daily limit, data lookups will fail (the HTTP API returns **429 Too Many Requests** for the same condition) until the next UTC day. You can upgrade your plan on the subscription page if you need a higher allowance.

---

## 7. Tips & example questions

**Tips**

- Include the **reference number** when you can (e.g. `126610LN`) — results are more reliable than nicknames alone.
- You do not need to know internal IDs or technical terms; ask naturally.
- For “new listings” questions, the assistant can page through results if needed.

**Example questions**

| Goal | Example |
| ---- | ------- |
| Current price | *What’s the current market price for a Rolex Submariner 126610LN?* |
| Specifications | *What are the specs for Omega Speedmaster 310.32.42.50.01.002?* |
| Price trend | *How has the Tudor Black Bay 58 price changed over the last 13 weeks?* |
| New stock | *Show me new listings for Rolex Datejust 126300 from the past week.* |
| Dealer pricing | *How has the asking price changed on listing 112578408?* |

---

## 8. Help & troubleshooting

| Problem | What to try |
| ------- | ----------- |
| Server not showing in Cursor | Check `mcp.json` syntax (valid JSON, no trailing commas). Restart Cursor. |
| Connection fails or “unauthorized” | Confirm your Business API subscription is active. Re-copy your API key from the subscription page. |
| Worked earlier, stopped today | You may have hit your daily limit. Wait until midnight UTC or upgrade your plan. |
| “No matching group found” | Check spelling; try the manufacturer reference number instead of a colloquial name. |
| No price or listing data | Some models have limited coverage. The same applies to the Business API — not an MCP-specific issue. |
| Wrong URL | Use `https://data.searchthewatchmarket.com/mcp` — not a `/data/...` path. |

**Service status:** If Search The Watch Market data services are unavailable, MCP will not work until they are restored. For HTTP API status details, see the [Business API Reference — Health Check](./API_REFERENCE.md#health-check).

**Field-level data questions** (what each price field means, currencies, pagination, etc.) are documented in the [Business API Reference](./API_REFERENCE.md).

---

## 9. Changelog

| Date | Change |
| ---- | ------ |
| 2026-06-30 | Initial release of AI assistant (MCP) access |
