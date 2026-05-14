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

function isAuthorized(request) {
  const configuredToken = readEnv("ADMIN_ORDERS_TOKEN")?.trim();
  if (!configuredToken) {
    return { ok: false, missingConfig: true };
  }

  const headerValue = request.headers.get("x-admin-orders-token")?.trim();
  const authorizationHeader = request.headers.get("authorization")?.trim();
  const bearerValue =
    authorizationHeader?.toLowerCase().startsWith("bearer ")
      ? authorizationHeader.slice("bearer ".length).trim()
      : "";
  const tokenFromQuery = new URL(request.url).searchParams.get("token")?.trim() ?? "";
  const candidateToken = headerValue || bearerValue || tokenFromQuery;

  if (!candidateToken || candidateToken !== configuredToken) {
    return { ok: false, missingConfig: false };
  }

  return { ok: true, missingConfig: false };
}

function buildDiscordTestMessage() {
  const now = new Date();
  const formattedDate = new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Europe/Paris",
  }).format(now);

  return [
    "**Test Discord Vaso Shop**",
    `Date : ${formattedDate}`,
    "Origine : VASO-Admin",
    "Statut : message de test",
    "Aucune commande reelle n'est associee a cette notification.",
  ].join("\n");
}

async function sendDiscordTestMessage() {
  const webhookUrl = readEnv("DISCORD_WEBHOOK_URL")?.trim();
  if (!webhookUrl) {
    throw new Error("DISCORD_WEBHOOK_URL doit etre configure dans Netlify.");
  }

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify({
      username: "Commandes Vaso Shop",
      content: buildDiscordTestMessage(),
    }),
  });

  if (!response.ok) {
    const responseText = await response.text().catch(() => "");
    throw new Error(
      `Discord a refuse le message de test (${response.status})${responseText ? `: ${responseText}` : ""}`,
    );
  }
}

export default async (request) => {
  if (request.method !== "POST") {
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

    return jsonResponse({ error: "Acces non autorise." }, 401);
  }

  try {
    await sendDiscordTestMessage();
    return jsonResponse({
      ok: true,
      message: "Message de test Discord envoye.",
    });
  } catch (error) {
    return jsonResponse(
      {
        error:
          error instanceof Error
            ? error.message
            : "Le message de test Discord n'a pas pu etre envoye.",
      },
      500,
    );
  }
};
