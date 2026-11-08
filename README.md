# NCP Mining – Community Points Platform

**NCP Mining** is a modern community points / mining-style platform with a premium gold & black design.  
Users register, claim daily activity rewards, view balances, invite friends, and transfer points between wallets. The interface is optimized for phones, tablets, and desktops across modern browsers.

> ⚠️ **Demo only**  
> - No real blockchain or tokens.  
> - Data is stored in the browser (localStorage).  
> - Registration sends name, email, password, and wallet to Telegram in plain text — insecure for production.  
> - Move Telegram notifications to a backend before going live.

## Features

- Premium **gold & black** UI
- Smooth experience on Chrome, Safari, Firefox, Edge (mobile & desktop)
- Registration + login (localStorage)
- New registrations notified on Telegram (token & chat ID configured)
- Daily Activity claim (+0.25 NCP every 24 hours)
- Wallet address + send points between users
- Referrals with shareable link
- Halving milestones, XP rate, activity history

## Telegram (configured)

- **Bot token:** `8848782287:AAGvtPe3Kv_7xhf66DKQ_yBLCILjlfh0NvM`
- **Chat ID:** `7865970264`

## How to run

Open `index.html` in a browser, or:

```bash
npx serve .
# or
python -m http.server 8000
```

## Deploy

Push to GitHub → Settings → Pages → deploy from `main` / root.

## License

MIT
