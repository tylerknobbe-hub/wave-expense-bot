export async function GET() {
  const html = `<!DOCTYPE html><html><head><title>Connecting...</title></head>
<body style="background:#08090e;color:#dcdff0;font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">
<div style="text-align:center"><div style="font-size:48px;margin-bottom:16px">✅</div><h2>Connected!</h2><p style="color:#555">You can close this window.</p></div>
<script>
const hash=window.location.hash.substring(1);const params=new URLSearchParams(hash);const token=params.get('access_token');const state=params.get('state')||'gmail';
if(token&&window.opener){window.opener.postMessage({type:'oauth_token',provider:state,token},'*');setTimeout(()=>window.close(),1500)}
else if(token){document.body.innerHTML='<div style="text-align:center;padding:40px"><h2>Token received!</h2><p>Copy and paste in Settings:</p><textarea style="width:90%;height:100px;background:#10111a;color:#dcdff0;border:1px solid #1c1d30;border-radius:8px;padding:12px;font-family:monospace;font-size:11px">'+token+'</textarea></div>'}
</script></body></html>`;
  return new Response(html, { headers: { "Content-Type": "text/html" } });
}
