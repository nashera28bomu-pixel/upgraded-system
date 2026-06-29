# 🇰🇪 KRA Tax Filing Bot

A Telegram bot that files KRA nil returns on behalf of Kenyan users, with manual M-Pesa payment verification.

## Features
- ✅ File KRA nil returns via Puppeteer automation
- 💳 Manual M-Pesa payment (Ksh 100) with transaction code verification
- 🛡️ Admin dashboard to approve/reject payments
- 📊 Filing history and stats
- 👑 Admin gets free access (via Telegram ID)

## Setup

### 1. Clone & Install
```bash
npm install
```

### 2. Install Puppeteer dependencies (on Linux/Render)
Puppeteer downloads Chromium automatically on `npm install`.

### 3. Configure Environment
Copy `.env.example` to `.env` and fill in:
```
BOT_TOKEN=        # From @BotFather on Telegram
MONGODB_URI=      # MongoDB Atlas connection string
ADMIN_IDS=        # Your Telegram ID (get from @userinfobot)
MPESA_NUMBER=     # 0113821327
```

### 4. Run
```bash
node index.js
```

## Deploy to Render

1. Push to GitHub
2. Create new **Background Worker** on Render
3. Add environment variables
4. Deploy

> ⚠️ Use Render's **paid plan** for Puppeteer (free tier has memory limits).
> Or use `puppeteer-core` + `chrome-aws-lambda` for lighter builds.

## Admin Commands

Send `/admin` in Telegram to access the admin dashboard.

From there you can:
- View pending payment requests
- Approve or reject M-Pesa codes
- View recent users and filings

## Flow

```
User → /start
     → Pay Ksh 100 to 0113821327
     → Enter M-Pesa TX code
     → Admin approves (you get notified)
     → User gets notified → Enter KRA PIN + Password
     → Bot files nil return on iTax
     → Success confirmation sent
```

## Notes

- KRA credentials are used only to file the return and are **not stored** permanently
- Puppeteer selectors may need updating if KRA redesigns iTax portal
- Test with your own KRA PIN first before going live
