export async function POST(request) {
  try {
    const { token, messageId, toEmail, subject, description } = await request.json();
    if (!token || !messageId || !toEmail) {
      return Response.json({ error: "Missing token, messageId, or toEmail" }, { status: 400 });
    }

    // Step 1: Get the full message to extract HTML body
    const msgRes = await fetch(
      `https://www.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    if (!msgRes.ok) {
      const err = await msgRes.text();
      return Response.json({ forwarded: false, error: `Failed to fetch: ${err}` });
    }
    
    const msg = await msgRes.json();
    const headers = msg.payload?.headers || [];
    const origSubject = headers.find(h => h.name === "Subject")?.value || "Receipt";
    const origFrom = headers.find(h => h.name === "From")?.value || "";
    const origDate = headers.find(h => h.name === "Date")?.value || "";

    // Step 2: Extract HTML body from MIME parts
    let htmlBody = "";
    let textBody = "";
    
    function extractParts(part) {
      if (part.mimeType === "text/html" && part.body?.data) {
        htmlBody = Buffer.from(part.body.data, "base64url").toString("utf-8");
      }
      if (part.mimeType === "text/plain" && part.body?.data && !textBody) {
        textBody = Buffer.from(part.body.data, "base64url").toString("utf-8");
      }
      if (part.parts) {
        for (const p of part.parts) extractParts(p);
      }
    }
    extractParts(msg.payload);

    // Step 3: Build the forwarded email with original content inline
    const boundary = `fwd_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const fwdHeader = `---------- Forwarded message ----------\r\nFrom: ${origFrom}\r\nDate: ${origDate}\r\nSubject: ${origSubject}\r\n\r\n`;

    let emailContent;
    
    if (htmlBody) {
      // Send as multipart with HTML body containing the original receipt
      emailContent = [
        `To: ${toEmail}`,
        `Subject: Fwd: ${origSubject}`,
        `MIME-Version: 1.0`,
        `Content-Type: multipart/alternative; boundary="${boundary}"`,
        ``,
        `--${boundary}`,
        `Content-Type: text/plain; charset="UTF-8"`,
        `Content-Transfer-Encoding: 7bit`,
        ``,
        fwdHeader,
        textBody || "See HTML version",
        ``,
        `--${boundary}`,
        `Content-Type: text/html; charset="UTF-8"`,
        `Content-Transfer-Encoding: 7bit`,
        ``,
        `<div style="font-family:Arial,sans-serif;padding:10px">`,
        `<p style="color:#666;font-size:12px">---------- Forwarded message ----------<br>`,
        `<b>From:</b> ${origFrom}<br>`,
        `<b>Date:</b> ${origDate}<br>`,
        `<b>Subject:</b> ${origSubject}</p>`,
        `<hr style="border:1px solid #eee">`,
        htmlBody,
        `</div>`,
        ``,
        `--${boundary}--`,
      ].join("\r\n");
    } else {
      // Plain text only
      emailContent = [
        `To: ${toEmail}`,
        `Subject: Fwd: ${origSubject}`,
        `Content-Type: text/plain; charset="UTF-8"`,
        ``,
        fwdHeader,
        textBody || "Receipt forwarded",
      ].join("\r\n");
    }

    // Step 4: Encode and send
    const encoded = Buffer.from(emailContent)
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
        body: JSON.stringify({ raw: encoded }),
      }
    );

    if (!sendRes.ok) {
      const errText = await sendRes.text();
      return Response.json({ forwarded: false, error: `Send failed: ${errText}` });
    }

    return Response.json({ forwarded: true, method: htmlBody ? "html" : "text" });
  } catch (e) {
    return Response.json({ forwarded: false, error: e.message }, { status: 500 });
  }
}
