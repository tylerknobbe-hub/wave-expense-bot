export async function POST(request) {
  try {
    const { token, query } = await request.json();
    if (!token || !query) return Response.json({ error: "Missing token or query" }, { status: 400 });

    const searchRes = await fetch(
      `https://www.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=3`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const searchData = await searchRes.json();
    if (searchData.error) return Response.json({ found: false, error: searchData.error.message });
    if (!searchData.messages || searchData.messages.length === 0) return Response.json({ found: false });

    const msgRes = await fetch(
      `https://www.googleapis.com/gmail/v1/users/me/messages/${searchData.messages[0].id}?format=full`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const msg = await msgRes.json();

    const subject = msg.payload?.headers?.find(h => h.name === "Subject")?.value || "Receipt";
    const snippet = msg.snippet || "";

    let receiptAmount = null;

    const subjectMatch = subject.match(/(?:Total|total)\s*\$?([\d,]+\.?\d{0,2})/);
    if (subjectMatch) {
      receiptAmount = parseFloat(subjectMatch[1].replace(/,/g, ""));
    }

    if (!receiptAmount) {
      const snippetMatch = snippet.match(/(?:Total|total|charged|amount)\s*[\$:]?\s*\$?([\d,]+\.\d{2})/);
      if (snippetMatch) {
        receiptAmount = parseFloat(snippetMatch[1].replace(/,/g, ""));
      }
    }

    if (!receiptAmount && msg.payload) {
      const textData = findTextPart(msg.payload);
      if (textData) {
        try {
          const bodyText = Buffer.from(textData, "base64url").toString("utf-8");
          const bodyMatch = bodyText.match(/(?:Total|Order Total|Amount Charged|Grand Total)\s*[\$:]?\s*\$?([\d,]+\.\d{2})/i);
          if (bodyMatch) {
            receiptAmount = parseFloat(bodyMatch[1].replace(/,/g, ""));
          }
        } catch (e) {}
      }
    }

    return Response.json({
      found: true,
      provider: "gmail",
      messageId: searchData.messages[0].id,
      subject,
      receiptAmount,
      link: `https://mail.google.com/mail/u/0/#inbox/${searchData.messages[0].id}`,
      totalResults: searchData.messages.length,
    });
  } catch (e) {
    return Response.json({ found: false, error: e.message }, { status: 500 });
  }
}

function findTextPart(payload) {
  if (payload.mimeType === "text/plain" && payload.body?.data) return payload.body.data;
  if (payload.parts) { for (const part of payload.parts) { const f = findTextPart(part); if (f) return f; } }
  return null;
}
