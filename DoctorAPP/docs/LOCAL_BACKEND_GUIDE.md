# Running the Backend on Your Laptop (with ngrok)

Instead of deploying the FastAPI backend to a cloud service, you can run it
directly on your personal laptop and expose it to the internet with **ngrok**.
Your Vercel-deployed frontend will then call your laptop's API through the
ngrok tunnel.

```
  Browser / Phone
       │
       ▼
  Vercel (front-end)
       │  NEXT_PUBLIC_API_URL
       ▼
  ngrok tunnel  ──────►  Your Laptop
                          uvicorn :8000
                          FastAPI + PubMedBERT + MongoDB
```

---

## Prerequisites

| Tool | Install |
|------|---------|
| **Python 3.11+** | `brew install python@3.11` or [python.org](https://python.org) |
| **ngrok** | `brew install ngrok` or [ngrok.com/download](https://ngrok.com/download) |
| **ngrok account** | Free at [dashboard.ngrok.com/signup](https://dashboard.ngrok.com/signup) — run `ngrok config add-authtoken <TOKEN>` once |

---

## Step 1 — Start the Backend

```bash
cd back-end

# First time only
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env              # fill in your API keys

# Every time
source venv/bin/activate
./start.sh                        # or: uvicorn app.main:app --reload --port 8000
```

Verify: open <http://localhost:8000/health> — you should see `{"status":"ok"}`.

## Step 2 — Open the ngrok Tunnel

In a **second terminal**:

```bash
ngrok http 8000
```

ngrok will print something like:

```
Forwarding  https://a1b2-c3d4.ngrok-free.app -> http://localhost:8000
```

Copy that `https://xxxx.ngrok-free.app` URL — that's your public backend.

> **Tip:** The free ngrok URL changes each restart. To get a stable subdomain,
> upgrade to ngrok's free static domain: `ngrok http --url=your-name.ngrok-free.app 8000`

## Step 3 — Point Vercel at Your Laptop

In your Vercel project dashboard → **Settings** → **Environment Variables**:

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_API_URL` | `https://a1b2-c3d4.ngrok-free.app` |

Then **redeploy** (or push a commit) so the env var takes effect.

That's it. Your Vercel frontend now sends all API requests to your laptop
through ngrok.

## Step 4 — Verify End-to-End

1. Open your Vercel URL in a browser.
2. Go to **Patients** → **Add Patient** → create one.
3. Click **Schedule** → schedule an appointment.
4. Open the intake link on your phone.
5. Fill out the form → submit.
6. Watch the doctor dashboard auto-update (SWR polling every 3 s).

Check the uvicorn terminal on your laptop — you should see the incoming
requests.

---

## CORS

The `.env.example` ships with `ALLOWED_ORIGINS=*` which allows any origin.
This is fine for hackathon demos. For production, replace `*` with your
exact Vercel domain:

```
ALLOWED_ORIGINS=https://diagnostic.vercel.app,http://localhost:3000
```

---

## Keeping Your Laptop Awake

Make sure your laptop doesn't go to sleep during the demo:

| OS | Setting |
|----|---------|
| **macOS** | System Settings → Displays → Advanced → "Prevent automatic sleeping on power adapter" |
| **Windows** | Settings → System → Power → Screen / Sleep → **Never** |
| **Linux** | `systemd-inhibit --what=idle sleep` or `caffeine` |

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Frontend shows "Network Error" | Check that ngrok is running and `NEXT_PUBLIC_API_URL` in Vercel matches the ngrok URL |
| ngrok says "Your account may not run an HTTP tunnel" | Run `ngrok config add-authtoken <TOKEN>` (free sign-up) |
| PubMedBERT download is slow on first start | The model is ~400 MB — first `./start.sh` can take 2–5 minutes. Subsequent starts use cache. |
| CORS errors in browser console | Verify `ALLOWED_ORIGINS=*` in your `back-end/.env` |
| ngrok URL changed after restart | Update `NEXT_PUBLIC_API_URL` in Vercel and redeploy |
