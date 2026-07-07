const express = require("express");
const path = require("path");
require("dotenv").config();

const app = express();
// For your own project, keep PORT and UPSTREAM_BASE_URL in env so you can swap
// providers/environments without editing code.
const PORT = Number(process.env.PORT || 6006);
const UPSTREAM_BASE_URL = (
  process.env.UPSTREAM_BASE_URL || "https://data.searchwatchmarket.com"
).replace(/\/$/, "");

// Standard API error shape returned by this adapter.
// Reuse this if you want your frontend to handle all errors consistently.
function errorEnvelope(res, httpStatus, error, message) {
  return res.status(httpStatus).json({
    status: 0,
    error,
    message,
  });
}

// Preserve upstream rate-limit headers so clients can implement backoff/retry UX.
// This is useful when the browser never calls the upstream service directly.
function copyRateLimitHeaders(upstreamRes, res) {
  const limit = upstreamRes.headers.get("x-ratelimit-limit");
  const remaining = upstreamRes.headers.get("x-ratelimit-remaining");

  if (limit) {
    res.setHeader("X-RateLimit-Limit", limit);
  }
  if (remaining) {
    res.setHeader("X-RateLimit-Remaining", remaining);
  }
}

// This sample expects "Bearer user_id:subscription_id".
// If your auth token format differs, update this parser only and keep route logic intact.
function parseApiKeyFromAuthHeader(authHeader) {
  if (!authHeader) {
    return null;
  }

  const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!bearerMatch) {
    return null;
  }

  const token = bearerMatch[1].trim();
  if (!token) {
    return null;
  }

  return token;
}

// Middleware guard that extracts and stores the validated token on req.
// In another app, this is where you'd plug in session/JWT/API-key validation.
function requireDataAuth(req, res, next) {
  const token = parseApiKeyFromAuthHeader(req.header("Authorization"));
  if (!token) {
    return errorEnvelope(
      res,
      401,
      "unauthorized",
      "Missing or malformed Authorization header. Expected: Bearer <API key>.",
    );
  }

  req.dataApiToken = token;
  return next();
}

// Shared route-param validator to avoid repeating integer checks in each endpoint.
function parsePositiveInteger(value) {
  if (!/^\d+$/.test(String(value))) {
    return null;
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

// Single GET proxy path for all upstream resources.
// If you add new endpoints, call this helper instead of duplicating fetch/error handling.
async function proxyUpstreamGet(req, res, upstreamPath) {
  try {
    const upstreamRes = await fetch(`${UPSTREAM_BASE_URL}${upstreamPath}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${req.dataApiToken}`,
      },
    });

    copyRateLimitHeaders(upstreamRes, res);

    if (upstreamRes.status === 503) {
      return res.status(503).end();
    }

    const rawBody = await upstreamRes.text();

    if (!rawBody) {
      if (upstreamRes.ok) {
        return errorEnvelope(
          res,
          500,
          "server_error",
          "Upstream returned an empty body for a non-503 response.",
        );
      }
      return errorEnvelope(
        res,
        upstreamRes.status,
        "server_error",
        "Upstream returned an empty error body.",
      );
    }

    let payload;
    try {
      payload = JSON.parse(rawBody);
    } catch (err) {
      return errorEnvelope(
        res,
        upstreamRes.status || 500,
        "server_error",
        "Upstream returned non-JSON content.",
      );
    }

    return res.status(upstreamRes.status).json(payload);
  } catch (err) {
    return res.status(503).end();
  }
}

// Serves the demo UI under /app so API routes and frontend are from one origin.
app.use("/app", express.static(path.join(__dirname, "public")));

// Lightweight health route for local smoke tests and uptime probes.
app.get("/", (req, res) => {
  res.json({
    status: "ok",
    service: "data-api",
    port: PORT,
  });
});

// Endpoint pass-throughs below intentionally validate params before proxying.
// Copy this pattern for any future route you expose from your backend.
app.get("/data/model/:group_id/prices", requireDataAuth, (req, res) => {
  const groupId = parsePositiveInteger(req.params.group_id);
  if (!groupId) {
    return errorEnvelope(
      res,
      400,
      "invalid_param",
      "group_id must be a positive integer.",
    );
  }
  return proxyUpstreamGet(req, res, `/data/model/${groupId}/prices`);
});

app.get("/data/model/:group_id/specs", requireDataAuth, (req, res) => {
  const groupId = parsePositiveInteger(req.params.group_id);
  if (!groupId) {
    return errorEnvelope(
      res,
      400,
      "invalid_param",
      "group_id must be a positive integer.",
    );
  }
  return proxyUpstreamGet(req, res, `/data/model/${groupId}/specs`);
});

app.get("/data/model/:group_id/history", requireDataAuth, (req, res) => {
  const groupId = parsePositiveInteger(req.params.group_id);
  if (!groupId) {
    return errorEnvelope(
      res,
      400,
      "invalid_param",
      "group_id must be a positive integer.",
    );
  }
  return proxyUpstreamGet(req, res, `/data/model/${groupId}/history`);
});

app.get("/data/model/:group_id/listings", requireDataAuth, (req, res) => {
  const groupId = parsePositiveInteger(req.params.group_id);
  if (!groupId) {
    return errorEnvelope(
      res,
      400,
      "invalid_param",
      "group_id must be a positive integer.",
    );
  }

  const cursor = typeof req.query.cursor === "string" ? req.query.cursor : "";
  // Cursor passthrough lets the frontend drive pagination without understanding
  // upstream cursor internals.
  const suffix = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";

  return proxyUpstreamGet(req, res, `/data/model/${groupId}/listings${suffix}`);
});

app.get("/data/listing/:listing_id/history", requireDataAuth, (req, res) => {
  const listingId = parsePositiveInteger(req.params.listing_id);
  if (!listingId) {
    return errorEnvelope(
      res,
      400,
      "invalid_param",
      "listing_id must be a positive integer.",
    );
  }

  return proxyUpstreamGet(req, res, `/data/listing/${listingId}/history`);
});

app.get("/data/resolve", requireDataAuth, (req, res) => {
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (!q) {
    return errorEnvelope(
      res,
      400,
      "invalid_param",
      "q is required and cannot be empty.",
    );
  }

  return proxyUpstreamGet(req, res, `/data/resolve?q=${encodeURIComponent(q)}`);
});

// Boot log prints both API and UI entry points for quick local onboarding.
app.listen(PORT, () => {
  console.log(`data-example listening on http://localhost:${PORT}`);
  console.log(`UI available at http://localhost:${PORT}/app`);
});