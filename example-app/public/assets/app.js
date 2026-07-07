(function () {
  // Preferred currencies for history display.
  // Replace this list if your upstream only supports a subset.
  const HISTORY_CURRENCIES = [
    "GBP",
    "USD",
    "AUD",
    "CAD",
    "EUR",
    "CHF",
    "HKD",
    "SGD",
    "PLN",
    "AED",
    "JPY",
  ];

  // In-memory UI state.
  // When grafting this into a framework app, this maps naturally to component/store state.
  const state = {
    currentGroupId: null,
    nextCursor: null,
    historyWeeks: [],
    historyCurrency: "USD",
  };

  // Centralized DOM lookups so all behavior code can reference stable element handles.
  // If your IDs differ, this is the only section you need to rewire first.
  const els = {
    apiKey: document.getElementById("apiKey"),
    resolveQuery: document.getElementById("resolveQuery"),
    groupId: document.getElementById("groupId"),
    cursor: document.getElementById("cursor"),
    listingId: document.getElementById("listingId"),
    historyCurrency: document.getElementById("historyCurrency"),
    paginationInfo: document.getElementById("paginationInfo"),
    listingsMeta: document.getElementById("listingsMeta"),
    resolvedCard: document.getElementById("resolvedCard"),
    pricesCards: document.getElementById("pricesCards"),
    specsGrid: document.getElementById("specsGrid"),
    historyBody: document.getElementById("historyBody"),
    historySummary: document.getElementById("historySummary"),
    listingsGrid: document.getElementById("listingsGrid"),
    listingHistoryBody: document.getElementById("listingHistoryBody"),
    meta: document.getElementById("meta"),
    output: document.getElementById("output"),
    resolvedPanel: document.getElementById("resolvedPanel"),
    pricesPanel: document.getElementById("pricesPanel"),
    specsPanel: document.getElementById("specsPanel"),
    historyPanel: document.getElementById("historyPanel"),
    listingsPanel: document.getElementById("listingsPanel"),
    listingHistoryPanel: document.getElementById("listingHistoryPanel"),
    btnHealth: document.getElementById("btnHealth"),
    btnResolve: document.getElementById("btnResolve"),
    btnLoadOverview: document.getElementById("btnLoadOverview"),
    btnPrices: document.getElementById("btnPrices"),
    btnSpecs: document.getElementById("btnSpecs"),
    btnHistory: document.getElementById("btnHistory"),
    btnListingsFirst: document.getElementById("btnListingsFirst"),
    btnListingsWithCursor: document.getElementById("btnListingsWithCursor"),
    btnListingsNext: document.getElementById("btnListingsNext"),
    btnListingHistory: document.getElementById("btnListingHistory"),
    btnManualPrices: document.getElementById("btnManualPrices"),
    btnManualSpecs: document.getElementById("btnManualSpecs"),
    btnManualHistory: document.getElementById("btnManualHistory"),
    btnManualListings: document.getElementById("btnManualListings"),
  };

  // Keep auth collection in one place so every request path stays consistent.
  function getApiKeyOrThrow() {
    const value = els.apiKey.value.trim();
    if (!value) {
      throw new Error("API key is required.");
    }
    return value;
  }

  // Shared positive integer validation for group_id and listing_id inputs.
  function getPositiveIntOrThrow(inputEl, name) {
    const value = String(inputEl.value || "").trim();
    if (!/^\d+$/.test(value) || Number(value) <= 0) {
      throw new Error(`${name} must be a positive integer.`);
    }
    return Number(value);
  }

  // Resolve current group ID from state first (populated by /resolve),
  // then fall back to manual input for direct testing.
  function getCurrentGroupIdOrThrow() {
    if (state.currentGroupId) {
      return state.currentGroupId;
    }
    return getPositiveIntOrThrow(els.groupId, "group_id");
  }

  function formatValue(value, currency) {
    if (value === null || value === undefined) {
      return "N/A";
    }
    return `${value} ${currency || ""}`.trim();
  }

  // Panel toggles are isolated so visibility behavior is easy to port/change.
  function setPanelVisible(panelEl, shouldShow) {
    panelEl.classList.toggle("hidden", !shouldShow);
  }

  // Unified GET request helper for all API calls.
  // Returns both parsed JSON and raw metadata for easy debugging in a demo app.
  async function request(path, requiresAuth) {
    const headers = {};
    if (requiresAuth) {
      const apiKey = getApiKeyOrThrow();
      headers.Authorization = `Bearer ${apiKey}`;
    }

    const res = await fetch(path, { method: "GET", headers });
    const status = res.status;
    const contentType = res.headers.get("content-type") || "";
    const rateLimit = res.headers.get("x-ratelimit-limit");
    const rateRemaining = res.headers.get("x-ratelimit-remaining");
    let body = null;
    let rawText = "";

    if (status !== 503) {
      rawText = await res.text();
      if (rawText && contentType.includes("application/json")) {
        try {
          body = JSON.parse(rawText);
        } catch (err) {
          body = null;
        }
      }
    }

    return {
      status,
      body,
      rawText,
      success: status === 200 && body && body.status === 1,
      rateLimit,
      rateRemaining,
    };
  }

  // Standard request/response diagnostic output shown in the side panel.
  function renderResult(title, result) {
    const lines = [
      `Request: ${title}`,
      `HTTP Status: ${result.status}`,
      `Success (HTTP 200 + status=1): ${result.success ? "yes" : "no"}`,
      `X-RateLimit-Limit: ${result.rateLimit || "(not provided)"}`,
      `X-RateLimit-Remaining: ${result.rateRemaining || "(not provided)"}`,
    ];
    els.meta.textContent = lines.join("\n");

    if (result.status === 503) {
      els.output.textContent = "503 Service Unavailable (body may be empty).";
      return;
    }

    if (result.body) {
      els.output.textContent = JSON.stringify(result.body, null, 2);
      return;
    }

    els.output.textContent = result.rawText || "(empty response body)";
  }

  // Client-side validation/runtime failures render separately from server responses.
  function renderClientError(title, error) {
    els.meta.textContent = `Request: ${title}\nClient Error: ${error.message}`;
    els.output.textContent = "";
  }

  // Wrapper that keeps all click handlers short and gives a uniform error boundary.
  async function run(title, fn) {
    try {
      const result = await fn();
      renderResult(title, result);
      return result;
    } catch (error) {
      renderClientError(title, error);
      return null;
    }
  }

  // Mirrors pagination cursor into UI so a user can copy/edit/retry pages manually.
  function updatePaginationInfo() {
    els.paginationInfo.textContent = `Stored next_cursor: ${state.nextCursor || "null"}`;
    if (!els.cursor.value.trim() && state.nextCursor) {
      els.cursor.value = state.nextCursor;
    }
  }

  // Render helpers below transform API payloads into small, isolated UI fragments.
  // In another project, swap these to template components without touching fetch logic.
  function renderResolvedCard(data) {
    const items = [
      ["Display Name", data.display_name || "N/A"],
      ["Brand", data.brand || "N/A"],
      ["Model Number", data.model_number || "N/A"],
      ["Group ID", String(data.group_id || "N/A")],
    ];
    els.resolvedCard.innerHTML = items
      .map(function (item) {
        return `<div class="resolved-pill"><b>${item[0]}</b><span>${item[1]}</span></div>`;
      })
      .join("");
    setPanelVisible(els.resolvedPanel, true);
  }

  function renderPrices(data) {
    const metrics = [
      ["Currency", data.currency],
      ["Listings In Week", data.listing_count],
      ["Minimum", formatValue(data.min, data.currency)],
      ["Mean", formatValue(data.mean, data.currency)],
      ["Maximum", formatValue(data.max, data.currency)],
      ["Market Value", formatValue(data.market_value, data.currency)],
    ];
    els.pricesCards.innerHTML = metrics
      .map(function (m) {
        return `<article class="metric"><div class="label">${m[0]}</div><div class="value">${m[1]}</div></article>`;
      })
      .join("");
    setPanelVisible(els.pricesPanel, true);
  }

  function renderSpecs(data) {
    const entries = Object.entries(data.properties || {});
    if (!entries.length) {
      els.specsGrid.innerHTML =
        '<div class="spec-item">No properties returned.</div>';
    } else {
      els.specsGrid.innerHTML = entries
        .map(function (entry) {
          return `<div class="spec-item"><b>${entry[0].replace(/_/g, " ")}</b><span>${entry[1]}</span></div>`;
        })
        .join("");
    }
    setPanelVisible(els.specsPanel, true);
  }

  function renderHistoryCurrencyOptions(weeks) {
    let currency = state.historyCurrency;
    const firstWeek = weeks[0] || {};
    const mean = firstWeek.mean || {};
    const available = HISTORY_CURRENCIES.filter(function (code) {
      return Object.prototype.hasOwnProperty.call(mean, code);
    });
    const usable = available.length ? available : HISTORY_CURRENCIES;
    if (!usable.includes(currency)) {
      currency = usable[0] || "USD";
    }
    state.historyCurrency = currency;

    els.historyCurrency.innerHTML = usable
      .map(function (code) {
        const selected = code === currency ? "selected" : "";
        return `<option value="${code}" ${selected}>${code}</option>`;
      })
      .join("");
  }

  // Re-renders history rows for currently selected currency without another API call.
  function renderHistoryTable() {
    const currency = state.historyCurrency;
    const weeks = state.historyWeeks;
    if (!weeks.length) {
      els.historyBody.innerHTML =
        '<tr><td colspan="5">No complete weeks returned.</td></tr>';
      els.historySummary.textContent =
        "No history data available for the selected model.";
      setPanelVisible(els.historyPanel, true);
      return;
    }

    const latest = weeks[weeks.length - 1];
    const latestMean = latest && latest.mean ? latest.mean[currency] : null;
    els.historySummary.textContent = `Showing ${weeks.length} complete weeks in ${currency}. Latest week mean: ${formatValue(latestMean, currency)}.`;

    els.historyBody.innerHTML = weeks
      .map(function (week) {
        return [
          "<tr>",
          `<td>${week.week || "N/A"}</td>`,
          `<td>${formatValue(week.min && week.min[currency], currency)}</td>`,
          `<td>${formatValue(week.mean && week.mean[currency], currency)}</td>`,
          `<td>${formatValue(week.max && week.max[currency], currency)}</td>`,
          `<td>${week.count === null || week.count === undefined ? "N/A" : week.count}</td>`,
          "</tr>",
        ].join("");
      })
      .join("");
    setPanelVisible(els.historyPanel, true);
  }

  function renderListings(data) {
    const items = data.items || [];
    state.nextCursor = data.next_cursor || null;
    updatePaginationInfo();

    els.listingsMeta.textContent = `Total new listings in rolling 7-day window: ${data.total_count}. Page size: ${data.page_size}.`;

    if (!items.length) {
      els.listingsGrid.innerHTML = "<p>No listings returned for this page.</p>";
      setPanelVisible(els.listingsPanel, true);
      return;
    }

    els.listingsGrid.innerHTML = items
      .map(function (item) {
        // URL is provided by upstream and rendered directly for demo purposes.
        // In production, consider stricter URL validation/sanitization policy.
        const safeUrl = item.url || "";
        return [
          '<article class="listing-card">',
          `<div><b>Listing ID:</b> ${item.listing_id}</div>`,
          `<div class="price">${formatValue(item.price, item.currency)}</div>`,
          `<div><b>Seller:</b> ${item.seller || "N/A"}</div>`,
          `<div><b>Added:</b> ${item.added_date || "N/A"}</div>`,
          `<a href="${safeUrl}" target="_blank" rel="noreferrer">Open Listing URL</a>`,
          `<button class="btn-listing-history" data-listing-id="${item.listing_id}">Load Price Timeline</button>`,
          "</article>",
        ].join("");
      })
      .join("");
    setPanelVisible(els.listingsPanel, true);
  }

  function renderListingHistory(data) {
    const rows = data.history || [];
    if (!rows.length) {
      els.listingHistoryBody.innerHTML =
        '<tr><td colspan="2">No history entries returned.</td></tr>';
    } else {
      els.listingHistoryBody.innerHTML = rows
        .map(function (item) {
          return `<tr><td>${item.date || "N/A"}</td><td>${item.price}</td></tr>`;
        })
        .join("");
    }
    setPanelVisible(els.listingHistoryPanel, true);
  }

  // Fetch helpers separate transport from event wiring.
  // This keeps each endpoint reusable from buttons, auto-load flows, or future scripts.
  async function fetchPrices(groupId) {
    const result = await run("GET /data/model/:group_id/prices", function () {
      return request(`/data/model/${groupId}/prices`, true);
    });
    if (result && result.success) {
      renderPrices(result.body);
    }
  }

  async function fetchSpecs(groupId) {
    const result = await run("GET /data/model/:group_id/specs", function () {
      return request(`/data/model/${groupId}/specs`, true);
    });
    if (result && result.success) {
      renderSpecs(result.body);
    }
  }

  async function fetchHistory(groupId) {
    const result = await run("GET /data/model/:group_id/history", function () {
      return request(`/data/model/${groupId}/history`, true);
    });
    if (result && result.success) {
      state.historyWeeks = Array.isArray(result.body.weeks)
        ? result.body.weeks
        : [];
      renderHistoryCurrencyOptions(state.historyWeeks);
      renderHistoryTable();
    }
  }

  async function fetchListings(groupId, cursor) {
    const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
    const title = cursor
      ? "GET /data/model/:group_id/listings?cursor=..."
      : "GET /data/model/:group_id/listings";
    const result = await run(title, function () {
      return request(`/data/model/${groupId}/listings${query}`, true);
    });
    if (result && result.success) {
      renderListings(result.body);
    }
  }

  async function fetchListingHistory(listingId) {
    const result = await run(
      "GET /data/listing/:listing_id/history",
      function () {
        return request(`/data/listing/${listingId}/history`, true);
      },
    );
    if (result && result.success) {
      els.listingId.value = String(listingId);
      renderListingHistory(result.body);
    }
  }

  async function loadOverview() {
    const groupId = getCurrentGroupIdOrThrow();
    await fetchPrices(groupId);
    await fetchSpecs(groupId);
    await fetchHistory(groupId);
    await fetchListings(groupId);
  }

  // Event bindings map UI controls to fetch helpers.
  // If you embed this in another app shell, these handlers are the integration surface.
  els.btnHealth.addEventListener("click", function () {
    run("GET /", function () {
      return request("/", false);
    });
  });

  els.btnResolve.addEventListener("click", async function () {
    const query = els.resolveQuery.value.trim();
    const result = await run("GET /data/resolve", function () {
      return request(`/data/resolve?q=${encodeURIComponent(query)}`, true);
    });

    if (result && result.success) {
      const body = result.body;
      state.currentGroupId = body.group_id;
      els.groupId.value = String(body.group_id);
      renderResolvedCard(body);
    }
  });

  els.btnLoadOverview.addEventListener("click", function () {
    loadOverview().catch(function (error) {
      renderClientError("Load Overview", error);
    });
  });

  els.btnPrices.addEventListener("click", function () {
    Promise.resolve()
      .then(getCurrentGroupIdOrThrow)
      .then(fetchPrices)
      .catch(function (error) {
        renderClientError("GET /data/model/:group_id/prices", error);
      });
  });

  els.btnSpecs.addEventListener("click", function () {
    Promise.resolve()
      .then(getCurrentGroupIdOrThrow)
      .then(fetchSpecs)
      .catch(function (error) {
        renderClientError("GET /data/model/:group_id/specs", error);
      });
  });

  els.btnHistory.addEventListener("click", function () {
    Promise.resolve()
      .then(getCurrentGroupIdOrThrow)
      .then(fetchHistory)
      .catch(function (error) {
        renderClientError("GET /data/model/:group_id/history", error);
      });
  });

  els.btnListingsFirst.addEventListener("click", function () {
    Promise.resolve()
      .then(getCurrentGroupIdOrThrow)
      .then(function (groupId) {
        return fetchListings(groupId);
      })
      .catch(function (error) {
        renderClientError("GET /data/model/:group_id/listings", error);
      });
  });

  els.btnListingsWithCursor.addEventListener("click", function () {
    Promise.resolve()
      .then(getCurrentGroupIdOrThrow)
      .then(function (groupId) {
        const cursor = els.cursor.value.trim();
        return fetchListings(groupId, cursor);
      })
      .catch(function (error) {
        renderClientError(
          "GET /data/model/:group_id/listings?cursor=...",
          error,
        );
      });
  });

  els.btnListingsNext.addEventListener("click", function () {
    Promise.resolve()
      .then(function () {
        const groupId = getCurrentGroupIdOrThrow();
        if (!state.nextCursor) {
          throw new Error(
            "No next_cursor available. Load the first listings page first.",
          );
        }
        return fetchListings(groupId, state.nextCursor);
      })
      .catch(function (error) {
        renderClientError("GET next_cursor", error);
      });
  });

  els.btnListingHistory.addEventListener("click", function () {
    Promise.resolve()
      .then(function () {
        return getPositiveIntOrThrow(els.listingId, "listing_id");
      })
      .then(fetchListingHistory)
      .catch(function (error) {
        renderClientError("GET /data/listing/:listing_id/history", error);
      });
  });

  els.btnManualPrices.addEventListener("click", function () {
    Promise.resolve()
      .then(function () {
        return getPositiveIntOrThrow(els.groupId, "group_id");
      })
      .then(fetchPrices)
      .catch(function (error) {
        renderClientError("Manual GET prices", error);
      });
  });

  els.btnManualSpecs.addEventListener("click", function () {
    Promise.resolve()
      .then(function () {
        return getPositiveIntOrThrow(els.groupId, "group_id");
      })
      .then(fetchSpecs)
      .catch(function (error) {
        renderClientError("Manual GET specs", error);
      });
  });

  els.btnManualHistory.addEventListener("click", function () {
    Promise.resolve()
      .then(function () {
        return getPositiveIntOrThrow(els.groupId, "group_id");
      })
      .then(fetchHistory)
      .catch(function (error) {
        renderClientError("Manual GET history", error);
      });
  });

  els.btnManualListings.addEventListener("click", function () {
    Promise.resolve()
      .then(function () {
        return getPositiveIntOrThrow(els.groupId, "group_id");
      })
      .then(function (groupId) {
        return fetchListings(groupId, els.cursor.value.trim());
      })
      .catch(function (error) {
        renderClientError("Manual GET listings", error);
      });
  });

  els.historyCurrency.addEventListener("change", function () {
    state.historyCurrency = els.historyCurrency.value;
    renderHistoryTable();
  });

  // Event delegation keeps listing cards lightweight even as pagination adds more items.
  els.listingsGrid.addEventListener("click", function (event) {
    const button = event.target.closest(".btn-listing-history");
    if (!button) {
      return;
    }

    const listingId = Number(button.getAttribute("data-listing-id"));
    if (!Number.isSafeInteger(listingId) || listingId <= 0) {
      return;
    }
    fetchListingHistory(listingId);
  });

  updatePaginationInfo();
})();
