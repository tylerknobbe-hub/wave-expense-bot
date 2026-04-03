export async function POST(request) {
  try {
    const { token, bizUrlId, receiptUrl, description, sessionToken, waveTransactionId } = await request.json();
    if (!token || !bizUrlId) return Response.json({ error: "Missing token or bizUrlId" }, { status: 400 });

    const bizId = bizUrlId || "ccdf6ab4-d13f-464e-a63d-e33d54b27aa8";
    const results = { uploaded: false, linked: false, uuid: null, error: null };

    // Step 1: Create a simple receipt image with the description text
    // We'll create a minimal PNG-like placeholder since we can't fetch Gmail content server-side without OAuth
    // For now, upload a text-based receipt as a simple file
    const receiptText = [
      "RECEIPT",
      "─".repeat(40),
      description || "Business Expense",
      "",
      receiptUrl ? `Receipt: ${receiptUrl}` : "",
      "",
      `Generated: ${new Date().toISOString().split("T")[0]}`,
    ].join("\n");

    // Create a simple text file as receipt placeholder
    const boundary = "----WaveReceiptBoundary" + Date.now();
    const filename = `receipt-${Date.now()}.txt`;
    
    const body = [
      `--${boundary}`,
      `Content-Disposition: form-data; name="file"; filename="${filename}"`,
      `Content-Type: text/plain`,
      "",
      receiptText,
      `--${boundary}--`,
    ].join("\r\n");

    // Upload to Wave REST API
    const uploadRes = await fetch(`https://api.waveapps.com/businesses/${bizId}/attachments/`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
      },
      body,
    });

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      results.error = `Upload failed: ${uploadRes.status} ${errText}`;
      return Response.json(results);
    }

    const uploadData = await uploadRes.json();
    results.uuid = uploadData.uuid;
    results.uploaded = true;

    // Step 1b: Trigger processing by calling the GET endpoint
    if (results.uuid) {
      try {
        await fetch(`https://api.waveapps.com/businesses/${bizId}/attachments/?uuid=${results.uuid}&type=RECEIPT`, {
          headers: { "Authorization": `Bearer ${token}`, "Accept": "application/json" },
        });
      } catch (e) { /* ignore */ }
    }

    // Step 2: Try to link receipt to transaction via internal GraphQL (requires session token)
    if (sessionToken && waveTransactionId && results.uuid) {
      try {
        const attachmentId = Buffer.from(`Business:${bizId};Receipt:${results.uuid}`).toString("base64");
        const transactionId = Buffer.from(`Business:${bizId};Transaction:${waveTransactionId}`).toString("base64");

        const linkRes = await fetch("https://gql.waveapps.com/graphql/internal", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${sessionToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: `mutation InlineTransactionPatch($input: TransactionPatchInput!) {
              transactionPatch(input: $input) {
                didSucceed
                inputErrors { message }
                transaction { id }
              }
            }`,
            variables: {
              input: {
                id: transactionId,
                sequence: 1,
                attachment: { id: attachmentId, type: "RECEIPT" },
              },
            },
          }),
        });

        const linkData = await linkRes.json();
        if (linkData?.data?.transactionPatch?.didSucceed) {
          results.linked = true;
        } else {
          results.linkError = linkData?.errors?.[0]?.message || "Link failed — receipt uploaded but not attached. Auto-merge may handle it.";
        }
      } catch (e) {
        results.linkError = `Link attempt failed: ${e.message}. Receipt uploaded — check Wave Receipts for auto-merge.`;
      }
    }

    return Response.json(results);
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
