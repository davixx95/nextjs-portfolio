// Contact form handler for davide.fedele.dev.
// Flow: browser form -> this Worker -> Turnstile siteverify -> Resend email.

const TURNSTILE_ACTION = "contact";
const SITEVERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

const LIMITS = { name: 100, email: 254, message: 5000 };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const csv = (value) =>
  (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

function corsHeaders(request, env) {
  const origin = request.headers.get("Origin");
  const allowed = csv(env.ALLOWED_ORIGINS);
  return {
    "Access-Control-Allow-Origin": allowed.includes(origin)
      ? origin
      : (allowed[0] ?? ""),
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Accept",
    Vary: "Origin",
  };
}

function json(body, status, cors) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...cors },
  });
}

async function verifyTurnstile(token, request, env) {
  const expectedHostnames = new Set(csv(env.TURNSTILE_HOSTNAMES));
  if (
    typeof token !== "string" ||
    token.length === 0 ||
    token.length > 2048 ||
    expectedHostnames.size === 0 ||
    !env.TURNSTILE_SECRET
  ) {
    return false;
  }

  const body = new URLSearchParams({
    secret: env.TURNSTILE_SECRET,
    response: token,
  });
  const ip = request.headers.get("CF-Connecting-IP");
  if (ip) body.set("remoteip", ip);

  let result;
  try {
    const res = await fetch(SITEVERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`siteverify ${res.status}`);
    result = await res.json();
  } catch (err) {
    console.error("Turnstile siteverify failed:", err);
    return false; // fail closed
  }

  // Cloudflare's public test secret (used only in local dev) returns no action.
  const actionOk =
    result.action === TURNSTILE_ACTION ||
    result.metadata?.result_with_testing_key === true;

  if (!result.success || !actionOk || !expectedHostnames.has(result.hostname)) {
    console.warn("Turnstile rejected:", {
      success: result.success,
      action: result.action,
      hostname: result.hostname,
      errors: result["error-codes"],
    });
    return false;
  }
  return true;
}

export default {
  async fetch(request, env) {
    const cors = corsHeaders(request, env);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: cors });
    }
    if (request.method !== "POST") {
      return json({ error: "Method not allowed." }, 405, cors);
    }

    let formData;
    try {
      formData = await request.formData();
    } catch {
      return json({ error: "Invalid form submission." }, 400, cors);
    }

    const field = (key) => {
      const value = formData.get(key);
      return typeof value === "string" ? value.trim() : "";
    };
    const name = field("name");
    const email = field("email");
    const message = field("message");

    if (!name || !email || !message) {
      return json({ error: "Please fill in all fields." }, 400, cors);
    }
    if (
      name.length > LIMITS.name ||
      email.length > LIMITS.email ||
      message.length > LIMITS.message
    ) {
      return json({ error: "One of the fields is too long." }, 400, cors);
    }
    if (!EMAIL_RE.test(email)) {
      return json({ error: "Please enter a valid email address." }, 400, cors);
    }

    const human = await verifyTurnstile(
      formData.get("cf-turnstile-response"),
      request,
      env,
    );
    if (!human) {
      return json(
        { error: "Verification failed. Please refresh and try again." },
        403,
        cors,
      );
    }

    const subjectName = name.replace(/[\r\n]+/g, " ");

    if (env.EMAIL_DRY_RUN === "true") {
      console.log("EMAIL_DRY_RUN: would send", {
        name: subjectName,
        email,
        length: message.length,
      });
      return json({ success: true }, 200, cors);
    }

    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Portfolio Contact <onboarding@resend.dev>",
          to: env.MAIL_TO,
          reply_to: email,
          subject: `Portfolio message from ${subjectName}`,
          text: message,
        }),
      });

      if (!res.ok) {
        console.error("Resend error:", res.status, await res.text());
        return json(
          { error: "Failed to send message. Please try again later." },
          502,
          cors,
        );
      }
      return json({ success: true }, 200, cors);
    } catch (err) {
      console.error("Resend request failed:", err);
      return json(
        { error: "Failed to send message. Please try again later." },
        502,
        cors,
      );
    }
  },
};
