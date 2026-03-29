# 📦 LinkedIn Post Creator - Releases

## v2.0.0-stable (2026-03-30) 🟢 **CURRENT STABLE**

### ✨ תאריך: 30 במרץ 2026

### 🔐 שיפורי אבטחה:
- ✅ **sessionStorage** בתחום localStorage (מתנקה כשסוגרים ברוזר)
- ✅ **Auto-load API Key** מ-config.txt (לא צריך להכניס ידנית)
- ✅ **Proxy-based API calls** (API Key לא משלוח בישיר מברוזר)
- ✅ **Security Audit** - דוח מלא בSECURITY_AUDIT.md

### 🚀 תכונות:
- 🌐 ממשק עברי מלא
- 📰 כתבות trending מ-25+ מקורות סייבר ו-AI
- 🤖 יצירת פוסטים בעזרת Claude API
- 🪝 Hooks בזמן אמת
- 😊 emoji picker
- ⏳ Daily run limits
- 💾 שמירת drafts ותזמון
- 🎯 LinkedIn integration (כתיבה בלבד)

### 📋 דרישות:
```bash
# Start the app:
python -m http.server 8000      # HTML server (port 8000)
CLAUDE_API_KEY=sk-ant-... node proxy-server.js  # Proxy (port 3001)

# Or use:
node run.bat  # All-in-one launcher (if exists)
```

### ⚙️ Configuration:
- `config.txt` - API Key (auto-loaded)
- `.env` - Environment variables (for proxy)
- `.gitignore` - config.txt, .env (secure)

### 🔒 Security Status:
**Status:** ✅ **Safe for Personal Local Use**
- ✅ sessionStorage (not localStorage)
- ✅ Proxy server (API Key never in browser)
- ✅ .gitignore (sensitive files protected)
- ⚠️ See SECURITY_AUDIT.md for remaining considerations

### 📊 Known Limitations:
- Proxy fallback to direct API (if proxy down)
- RSS data rendered with innerHTML
- onclick handlers use string interpolation
- Daily limit is client-side only (no server enforcement)

### 🎯 For Production Use:
See SECURITY_AUDIT.md "Recommendations" section for:
- Preventing proxy fallback
- Sanitizing RSS data
- Replacing onclick handlers
- Server-side run limit enforcement

---

## v1.0.0 (Earlier Version)
- Initial release with localStorage
- Basic LinkedIn post generation
- No proxy server
- No security audit

---

## 📌 Current Git State:

```bash
# View this release:
git show v2.0.0-stable-2026-03-30

# Checkout this version:
git checkout v2.0.0-stable-2026-03-30

# List all releases:
git tag -l
```

**Commit:** 4004393 (Add detailed security audit report)
**Date:** 2026-03-30 01:12:33 +0300
