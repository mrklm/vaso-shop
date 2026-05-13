import { getStore } from "@netlify/blobs";

function readEnv(name) {
  if (globalThis.Netlify?.env?.get) {
    const value = globalThis.Netlify.env.get(name);
    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }

  return process.env[name];
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function unauthorizedResponse() {
  return jsonResponse({ error: "Acces non autorise." }, 401);
}

function isAuthorized(request) {
  const configuredToken = readEnv("ADMIN_ORDERS_TOKEN")?.trim();
  if (!configuredToken) {
    return { ok: false, missingConfig: true };
  }

  const headerValue = request.headers.get("x-admin-orders-token")?.trim();
  if (!headerValue || headerValue !== configuredToken) {
    return { ok: false, missingConfig: false };
  }

  return { ok: true, missingConfig: false };
}

export default async (request) => {
  if (request.method !== "GET") {
    return jsonResponse({ error: "Methode non autorisee." }, 405);
  }

  const authState = isAuthorized(request);
  if (!authState.ok) {
    if (authState.missingConfig) {
      return jsonResponse(
        { error: "ADMIN_ORDERS_TOKEN doit etre configure dans Netlify." },
        503,
      );
    }

    return unauthorizedResponse();
  }

  const store = getStore("vaso-orders");
  const { blobs } = await store.list({
    prefix: "orders/",
  });

  const orders = await Promise.all(
    blobs.map(async (blob) => {
      const entry = await store.get(blob.key, { type: "json" });
      return entry;
    }),
  );

  const normalizedOrders = orders
    .filter((order) => order && typeof order === "object")
    .sort((left, right) => `${right.createdAt ?? ""}`.localeCompare(`${left.createdAt ?? ""}`));

  return jsonResponse({
    orders: normalizedOrders,
    total: normalizedOrders.length,
  });
};
