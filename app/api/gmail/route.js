export async function POST(request) {
  try {
    const { token, query } = await request.json();
    if (!token || !query) return Response.json({ error: "Missing token or query" }, { status: 400 });
    const searchRes = await fetch(`https://www.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=3`, { headers: { Authorization: `Bearer ${token}` } });
    const searchData = await searchRes.json();
    if (searchData.error) return Response.json({ found: false, error: searchData.error.message });
    if (!searchData.messages || searchData.messages.length === 0) return Response.json({ found: false });
    const msgRes = await fetch(`https://www.googleapis.com/gmail/v1/users/me/messages/${searchData.messages[0].id}?format=metadata&metadataHeaders=Subject&metadataHeaders=Date&metadataHeaders=From`, { headers: { Authorization: `Bearer ${token}` } });
    const msg = await msgRes.json();
    const subject = msg.payload?.headers?.find(h => h.name === "Subject")?.value || "Receipt";
    return Response.json({ found: true, provider: "gmail", messageId: searchData.messages[0].id, subject, link: `https://mail.google.com/mail/u/0/#inbox/${searchData.messages[0].id}`, totalResults: searchData.messages.length });
  } catch (e) { return Response.json({ found: false, error: e.message }, { status: 500 }); }
}
