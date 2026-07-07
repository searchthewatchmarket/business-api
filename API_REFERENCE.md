# Search The Watch Market Data API

Business-facing reference for external API consumers.

Base URL (production): https://data.searchthewatchmarket.com

## Capabilities

The API allows you to:

- Retrieve latest model-level pricing snapshot
- Retrieve model specifications
- Retrieve 13-week model price history
- Retrieve newly added listings for a model (paginated)
- Retrieve full price-change history for a listing
- Resolve free-text watch queries to a group_id

All data endpoints are GET endpoints.

For AI assistant access (Cursor, Claude Desktop, etc.) over the same subscription and API key, see [MCP_REFERENCE.md](./MCP_REFERENCE.md).

## Authentication

All /data/\* endpoints require an API key in the Authorization header:

```http
Authorization: Bearer <api_key>
```

API keys are available from:

- [https://searchthewatchmarket.com/subscribe](https://searchthewatchmarket.com/subscribe)

After approval, your API key appears on the subscription page under **API Access**. Copy the full value exactly and use it as a Bearer token.

If authentication fails, the API returns 401 with:

```json
{
  "status": 0,
  "error": "unauthorized",
  "message": "Unauthorized"
}
```

## Rate Limits

Rate limits apply per account, with a daily reset at midnight UTC.

Typical daily plans:

- business_api_1k: 1,000 requests/day
- business_api_5k: 5,000 requests/day
- business_api_5k_distribution: 5,000 requests/day

Responses include:

- X-RateLimit-Limit
- X-RateLimit-Remaining

When exceeded, the API returns 429.

The same daily allowance is shared with [MCP (AI assistant) access](./MCP_REFERENCE.md).

## Response Format

Successful responses use:

```json
{
  "status": 1,
  "...": "payload"
}
```

Error responses use:

```json
{
  "status": 0,
  "error": "<error_code>",
  "message": "<description>"
}
```

Common HTTP statuses:

- 400 invalid input
- 401 unauthorized
- 404 not found
- 429 rate limited
- 500 server error
- 503 temporarily unavailable

## Quick Start

1. Obtain your API key from [https://searchthewatchmarket.com/subscribe](https://searchthewatchmarket.com/subscribe).
2. Resolve a watch query to a group_id.
3. Call model endpoints with that group_id.
4. Use listing_id values from listings responses for listing-history calls.

Example:

```bash
API_KEY="YOUR_API_KEY"
BASE_URL="https://data.searchthewatchmarket.com"

curl -s "$BASE_URL/data/resolve?q=rolex%20submariner%20126610ln" \
  -H "Authorization: Bearer $API_KEY"
```

## Core Identifiers

- group_id: Model-level identifier used by model endpoints
- listing_id: Listing-level identifier used by listing history endpoint

## Endpoints Overview

| Endpoint                               | Purpose                                   |
| -------------------------------------- | ----------------------------------------- |
| GET /data/resolve?q={query}            | Resolve free-text watch query to group_id |
| GET /data/model/{group_id}/prices      | Latest model pricing snapshot             |
| GET /data/model/{group_id}/specs       | Model specification attributes            |
| GET /data/model/{group_id}/history     | 13-week model price history               |
| GET /data/model/{group_id}/listings    | New listings in the last 7 days           |
| GET /data/listing/{listing_id}/history | Price-change history for one listing      |

## Endpoint Reference

### 1) Resolve Query

GET /data/resolve?q={query}

Use this first when you do not yet have a group_id.

Query parameters:

- q (required, string): e.g. rolex submariner 126610ln

Success example:

```json
{
  "status": 1,
  "group_id": 2341,
  "brand": "Submariner",
  "model_number": "126610LN",
  "display_name": "Submariner 126610LN"
}
```

Request example:

```bash
curl -s "https://data.searchthewatchmarket.com/data/resolve?q=rolex%20submariner%20126610ln" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

No match example (404):

```json
{
  "status": 0,
  "error": "not_found",
  "message": "No matching group found"
}
```

If you see this message, check spelling and try the manufacturer reference number instead of a colloquial name.

### 2) Model Prices

GET /data/model/{group_id}/prices

Returns latest model-level pricing snapshot.

Path parameters:

- group_id (required, integer)

Success example:

```json
{
  "status": 1,
  "group_id": 2314,
  "currency": "USD",
  "listing_count": 47,
  "min": 6640,
  "max": 11360,
  "mean": 8600,
  "market_value": 8370
}
```

Request example:

```bash
curl -s "https://data.searchthewatchmarket.com/data/model/2314/prices" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### 3) Model Specs

GET /data/model/{group_id}/specs

Returns specification attributes for the model.

Path parameters:

- group_id (required, integer)

Success example:

```json
{
  "status": 1,
  "group_id": 2314,
  "properties": {
    "brand": "Omega",
    "model": "Speedmaster",
    "reference_number": "310.32.42.50.01.002",
    "base_caliber": "3861",
    "case_diameter": "42mm",
    "water_resistance": "50m",
    "power_reserve": "50h",
    "case_material": "Stainless Steel",
    "bracelet_material": "Stainless Steel",
    "crystal": "Sapphire",
    "functions": "Hours, Minutes, Seconds, Chronograph, Date",
    "year_introduced": "2021"
  }
}
```

Request example:

```bash
curl -s "https://data.searchthewatchmarket.com/data/model/2314/specs" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### 4) Model History

GET /data/model/{group_id}/history

Returns up to 13 complete weekly points with mean, min, max and count.

Path parameters:

- group_id (required, integer)

Supported currency keys in mean/min/max:

- GBP, USD, EUR, AUD, CAD, CHF, HKD, SGD, PLN, AED, JPY

Success example:

```json
{
  "status": 1,
  "group_id": 2314,
  "weeks": [
    {
      "week": "2026-02-09",
      "mean": {
        "GBP": 6210,
        "USD": 8380,
        "EUR": 7290
      },
      "min": {
        "GBP": 5600,
        "USD": 7550,
        "EUR": 6570
      },
      "max": {
        "GBP": 7100,
        "USD": 9580,
        "EUR": 8340
      },
      "count": 38
    }
  ]
}
```

Request example:

```bash
curl -s "https://data.searchthewatchmarket.com/data/model/2314/history" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### 5) Model Listings (New in Last 7 Days)

GET /data/model/{group_id}/listings?cursor={token}

Returns paginated listings feed.

Path parameters:

- group_id (required, integer)

Query parameters:

- cursor (optional, string): Use next_cursor from prior response

Success example:

```json
{
  "status": 1,
  "group_id": 2314,
  "page_size": 20,
  "total_count": 43,
  "next_cursor": "eyJhZGRlZF9kYXRlIjoiMjAyNi0wNS0wM1QxODo0MjowMC4wMDBaIiwibGlzdGluZ19pZCI6MTEyNjAxMzM0fQ",
  "items": [
    {
      "listing_id": 112578408,
      "url": "https://example.com/listings/omega-speedmaster-moonwatch",
      "added_date": "2026-05-04T09:14:00.000Z",
      "price": 6450,
      "currency": "GBP",
      "seller": "Example LTD"
    }
  ]
}
```

First page example:

```bash
curl -s "https://data.searchthewatchmarket.com/data/model/2314/listings" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

Next page example:

```bash
curl -s "https://data.searchthewatchmarket.com/data/model/2314/listings?cursor=YOUR_NEXT_CURSOR" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### 6) Listing Price History

GET /data/listing/{listing_id}/history

Returns observed price-change timeline for one listing.

Path parameters:

- listing_id (required, integer)

Success example:

```json
{
  "status": 1,
  "listing_id": 112578408,
  "history": [
    { "price": 6800, "date": "2026-02-14T12:00:00.000Z" },
    { "price": 6650, "date": "2026-03-01T08:00:00.000Z" },
    { "price": 6500, "date": "2026-03-22T14:00:00.000Z" },
    { "price": 6450, "date": "2026-04-16T21:17:04.000Z" }
  ]
}
```

Request example:

```bash
curl -s "https://data.searchthewatchmarket.com/data/listing/112578408/history" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

## Health Check

GET /

No authentication required.

Example:

```bash
curl -s "https://data.searchthewatchmarket.com/"
```

## How To Integrate

1. Store API key in a secure secret manager.
2. Add Authorization: Bearer <api_key> to all /data/\* requests.
3. Resolve user input to group_id via /data/resolve.
4. Use model endpoints for analytics (prices, specs, history).
5. Use listings endpoint for recent supply monitoring.
6. Use listing history endpoint for price-change tracking.
7. Handle 429 with retry/backoff logic.

## cURL Collection (Copy/Paste)

```bash
API_KEY="YOUR_API_KEY"
BASE_URL="https://data.searchthewatchmarket.com"
GROUP_ID="2314"
LISTING_ID="112578408"

# Resolve query
curl -s "$BASE_URL/data/resolve?q=omega%20speedmaster%20310.32.42.50.01.002" -H "Authorization: Bearer $API_KEY"

# Prices
curl -s "$BASE_URL/data/model/$GROUP_ID/prices" -H "Authorization: Bearer $API_KEY"

# Specs
curl -s "$BASE_URL/data/model/$GROUP_ID/specs" -H "Authorization: Bearer $API_KEY"

# History
curl -s "$BASE_URL/data/model/$GROUP_ID/history" -H "Authorization: Bearer $API_KEY"

# Listings
curl -s "$BASE_URL/data/model/$GROUP_ID/listings" -H "Authorization: Bearer $API_KEY"

# Listing history
curl -s "$BASE_URL/data/listing/$LISTING_ID/history" -H "Authorization: Bearer $API_KEY"
```
