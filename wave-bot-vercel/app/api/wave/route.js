// /app/api/wave/route.js
export async function POST(request) {
  try {
    const { token, query, variables } = await request.json();
    if (!token || !query) {
      return Response.json({ error: "Missing token or query" }, { status: 400 });
    }

    const res = await fetch("https://gql.waveapps.com/graphql/public", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ query, variables }),
    });
    const data = await res.json();
    return Response.json(data);
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
