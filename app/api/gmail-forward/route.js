export async function POST(request) {
  try {
    const { token, messageId, toEmail, subject, description } = await request.json();
    if (!token || !messageId || !toEmail) {
      return Response.json({ error: "Missing token, messageId, or toEmail" }, { status: 400 });
    }

    // Step 1: Get the original message in raw format
    const msgRes = await fetch(
      `https://www.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=raw`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    if (!msgRes.ok) {
      const err = await msgRes.text();
      return Response.json({ forwarded: false, error: `Failed to fetch message: ${err}` });
    }
    
    const msgData = await msgRes.json();
    const originalRaw = msgData.raw || "";

    // Step 2: Get message metadata for subject
    const metaRes = await fetch(
      `https://www.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const metaData = await metaRes.json();
    const origSubject = metaData.payload?.headers?.find(h => h.name === "Subject")?.value || "Receipt";
    const origFrom = metaData.payload?.headers?.find(h => h.name === "From")?.value || "";
    const origDate = metaData.payload?.headers?.find(h => h.name === "Date")?.value || "";

    // Step 3: Decode original message
    // Convert from URL-safe base64 to regular base64, then to buffer
    const originalB64 = originalRaw.replace(/-/g, "+").replace(/_/g, "/");
    const originalBuffer = Buffer.from(originalB64, "base64");
    const originalMime = originalBuffer.toString("utf-8");

    // Step 4: Construct a forwarded email with the original as attachment
    const boundary = `boundary_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    
    const forwardEmail = [
      `To: ${toEmail}`,
      `Subject: Fwd: ${origSubject}`,
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      ``,
      `--${boundary}`,
      `Content-Type: text/plain; charset="UTF-8"`,
      ``,
      `---------- Forwarded message ----------`,
      `From: ${origFrom}`,
      `Date: ${origDate}`,
      `Subject: ${origSubject}`,
      ``,
      description || "Forwarded receipt",
      ``,
      `--${boundary}`,
      `Content-Type: message/rfc822`,
      `Content-Disposition: attachment; filename="receipt.eml"`,
      ``,
      originalMime,
      `--${boundary}--`,
    ].join("\r\n");

    // Step 5: Encode and send
    const encodedEmail = Buffer.from(forwardEmail)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    const sendRes = await fetch(
      "https://www.googleapis.com/gmail/v1/users/me/messages/send",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ raw: encodedEmail }),
      }
    );

    if (!sendRes.ok) {
      // Fallback: try simpler forward without attachment
      const simpleEmail = [
        `To: ${toEmail}`,
        `Subject: Fwd: ${origSubject}`,
        `Content-Type: text/html; charset="UTF-8"`,
        ``,
        `<div style="font-family:Arial,sans-serif">`,
        `<p><b>Forwarded receipt:</b> ${description || origSubject}</p>`,
        `<hr>`,
        `<p><b>From:</b> ${origFrom}<br><b>Date:</b> ${origDate}<br><b>Subject:</b> ${origSubject}</p>`,
        `<hr>`,
        `<p>Original receipt attached as .eml or view in Gmail.</p>`,
        `</div>`,
      ].join("\r\n");

      const simpleEncoded = Buffer.from(simpleEmail)
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");

      const sendRes2 = await fetch(
        "https://www.googleapis.com/gmail/v1/users/me/messages/send",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ raw: simpleEncoded }),
        }
      );

      if (!sendRes2.ok) {
        const errText = await sendRes2.text();
        return Response.json({ forwarded: false, error: `Send failed: ${errText}` });
      }

      return Response.json({ forwarded: true, method: "simple" });
    }

    return Response.json({ forwarded: true, method: "full" });
  } catch (e) {
    return Response.json({ forwarded: false, error: e.message }, { status: 500 });
  }
}
