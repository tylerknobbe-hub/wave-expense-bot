// /app/api/outlook/route.js
export async function POST(request) {
  try {
    const { token, query } = await request.json();
    if (!token || !query) {
      return Response.json({ error: "Missing token or query" }, { status: 400 });
    }

    const res = await fetch(
      `https://graph.microsoft.com/v1.0/me/messages?$search="${encodeURIComponent(query)}"&$top=3&$select=subject,webLink,receivedDateTime,from`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const data = await res.json();

    if (data.error) {
      return Response.json({ found: false, error: data.error.message });
    }

    if (!data.value || data.value.length === 0) {
      return Response.json({ found: false });
    }

    const msg = data.value[0];
    return Response.json({
      found: true,
      provider: "outlook",
      subject: msg.subject,
      date: msg.receivedDateTime,
      from: msg.from?.emailAddress?.address || "",
      link: msg.webLink || "",
      totalResults: data.value.length,
    });
  } catch (e) {
    return Response.json({ found: false, error: e.message }, { status: 500 });
  }
}
