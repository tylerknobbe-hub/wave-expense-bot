// /app/api/categorize/route.js
export async function POST(request) {
  try {
    const { anthropicKey, prompt } = await request.json();
    if (!prompt) {
      return Response.json({ error: "Missing prompt" }, { status: 400 });
    }

    const key = anthropicKey || process.env.ANTHROPIC_API_KEY;
    if (!key) {
      return Response.json({ error: "No Anthropic API key" }, { status: 400 });
    }

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1500,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const data = await res.json();
    return Response.json(data);
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
