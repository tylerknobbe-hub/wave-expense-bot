# Wave Expense Bot — TY2025

AI-powered expense categorization and Wave Accounting sync with Gmail + Outlook receipt search.

## Features
- **Multi-source import**: Credit Card CSV, DoorDash, Uber Eats, Uber Rides
- **Smart descriptions**: "Business dinner at Thai Palace (DoorDash) to discuss ongoing projects"
- **3-layer dedup**: Cross-source, internal, and Wave-side
- **Local + AI categorization**: ~70% categorized instantly, remainder via Claude API
- **Receipt search**: Gmail + Outlook integration finds receipt emails automatically
- **Wave merge**: Updates existing Wave records with richer descriptions, preserves receipts
- **Tax year scoped**: Only 2025 transactions imported

## Deploy to Vercel (60 seconds)

### Step 1: Push to GitHub
1. Create a new repo on github.com
2. Upload all these files (drag and drop works)

### Step 2: Deploy
1. Go to [vercel.com](https://vercel.com) → Sign up with GitHub
2. Click "Import Project" → Select your repo
3. Click "Deploy" — that's it!

### Step 3: Configure
Once deployed, go to your app URL → Settings tab:
- **Anthropic API Key**: For AI categorization (get from console.anthropic.com)
- **Wave API Token**: Settings → Integrations → Full Access app
- **Gmail**: Paste OAuth token from [OAuth Playground](https://developers.google.com/oauthplayground) (select gmail.readonly)
- **Outlook**: Paste token or connect via Azure AD

## For Gmail OAuth (proper setup)
1. Google Cloud Console → Create OAuth Client ID (Web Application)
2. Add redirect URI: `https://your-app.vercel.app/api/auth`
3. Enter Client ID in Settings → Click "Connect Gmail"

## For Outlook OAuth
1. Azure Portal → App Registration → New
2. Add redirect URI: `https://your-app.vercel.app/api/auth`  
3. Add `Mail.Read` permission
4. Enter Client ID in Settings → Click "Connect Outlook"

## Project Structure
```
app/
  page.js          — Main UI (React)
  layout.js        — Root layout
  api/
    gmail/route.js     — Gmail receipt search (server-side)
    outlook/route.js   — Outlook receipt search (server-side)
    wave/route.js      — Wave GraphQL proxy
    categorize/route.js — Claude AI categorization
    auth/route.js      — OAuth callback handler
```

## Environment Variables (optional)
Set in Vercel dashboard → Settings → Environment Variables:
- `ANTHROPIC_API_KEY` — Default API key (users can also enter in-app)
