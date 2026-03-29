# 🔒 בדיקת אבטחת מידע - LinkedIn Post Creator

**תאריך:** 30/3/2026
**סטטוס:** עדכון (sessionStorage + auto-load)

---

## 📊 סיכונים וגנות

### 1️⃣ API KEY MANAGEMENT
**סיכון:** חשיפת API Key לאנתרופיק

#### סיכון קודם (localStorage):
| תכונה | סטטוס |
|------|--------|
| שמור לצמיתות | ❌ גבוה |
| אם מישהו יגש למחשב | ❌ גבוה |
| בbroadcast בNetwork | ✅ בטוח |
| בקובץ בדיסק | ❌ גבוה (Chrome cache) |

#### הגנה חדשה (sessionStorage):
| תכונה | סטטוס |
|------|--------|
| שמור לצמיתות | ✅ מתנקה עם סגירה |
| אם מישהו יגש למחשב | ✅ לא נמצא אחרי סגירה |
| בbroadcast בNetwork | ✅ בטוח |
| בקובץ בדיסק | ✅ לא נשמר |
| Auto-load מ-config.txt | ✅ נוח וביטוח |

**הערכה:** 🟢 **טוב** (מטובעה עם sessionStorage + auto-load)

---

### 2️⃣ FALLBACK DIRECT API CALLS
**סיכון:** אם proxy לא פועל, קוד שולח API Key ישירות ל-Anthropic

```javascript
// שורה 2612-2620: Direct API call fallback
if(!proxyAvailable) {
  API_KEY = sessionStorage.getItem('claude_api_key')
  // שלח ישירות ל-api.anthropic.com עם API Key בheader
}
```

**בעיה:**
- 🔴 **Critical** - API Key נשלח בplanet-text בheader
- CORS security bypass (הוא עובד בbrainteaser בגלל header `anthropic-dangerous-direct-browser-access`)
- אם מישהו יכיל את ה-network traffic, הוא רואה את ה-API Key

**הגנה:**
- ✅ sessionStorage (לא localStorage)
- ⚠️ **אבל:** אם proxy לא פועל, זה עדיין מעביר את הכל בopen

**המלצה:** תמיד צריך proxy, לא fallback ישיר

**הערכה:** 🟡 **בינוני** (תלוי בproxy availability)

---

### 3️⃣ XSS VIA RSS DATA
**סיכון:** נתונים מ-RSS עשויים להיות מזוהמים עם harmful scripts

```javascript
// שורה 1576: innerHTML עם data מRSS
el.innerHTML = list.map(a=>{
  // a.title, a.date, a.source מגיעים מRSS חיצוני
  return `<div>${a.title}</div>`
})

// שורה 2488: IMG src מ-user input
preview.innerHTML=`<img src="${src}"...`
```

**בעיה:**
- 🔴 **High** - `<img onerror="alert(sessionStorage.getItem('claude_api_key'))">` יכול לגנוב API Key
- RSS הוא חיצוני (כן, זה מproxy/trusted sources, אבל עדיין חיצוני)
- innerHTML לא בטוח עם untrusted content

**הגנה קיימת:**
- ✅ Filtering: `filter(a => a.url.startsWith('http'))` (URL validation)
- ✅ Source trusted (מproxy שלו שחופר RSS)
- ⚠️ **אבל:** אין HTML escaping לתוכן הטקסט

**בעיה בפרטית (שורה 2488):**
- User יכול להעלות image URL שמכיל `onerror` event
- זה יעשה XSS attack

**הערכה:** 🟡 **בינוני** (תלוי בJavaScript safty של הuniversal sources)

---

### 4️⃣ STRING INTERPOLATION IN EVENT HANDLERS
**סיכון:** `onclick="function('${variable}')"` עלול להיות inject

```javascript
// שורה 1614: clipboard copy
onclick="navigator.clipboard.writeText('${safeSrcUrl}')"

// שורה 2201: fetch trending retry
onclick="fetchTrending('${mode}')"

// שורה 2504: emoji category switch
onclick="showEmojiCat(this,'${k}')"
```

**בעיה:**
- 🟠 **Medium** - אם `mode` או `safeSrcUrl` מכילים single quote, אפשר להוציא מה-function
- `safeSrcUrl` escapes quotes אבל לא לחלוטין בטוח
- חדש: יש `replace(/'/g,"\\'")` שמנסה להגן

**הגנה קיימת:**
- ✅ `safeSrcUrl.replace(/'/g,"\\'")` (escape single quotes)
- ✅ `safeTitleJs.replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/"/g,'\\"')` (triple escape)
- ⚠️ **אבל:** יכול להיות bypass עם backticks ודברים אחרים

**המלצה:** להשתמש ב-addEventListener במקום onclick בattribute

**הערכה:** 🟡 **בינוני** (יש escaping אבל לא perfect)

---

### 5️⃣ CONFIG.TXT + API KEY AUTO-LOAD
**סיכון:** config.txt קיים בdirectory ציבורי

```javascript
// שורה 2993: auto-load מ-config.txt
fetch('config.txt')
  .then(r => r.text())
  .then(key => { API_KEY = key; ... })
```

**בעיה:**
- 🟠 **Medium** - אם קוד רץ על HTTP server (localhost:8000), config.txt accessible מברוזר
- אם מישהו יודע על הקיימת, הוא יכול לגשת ישירות

**הגנה:**
- ✅ .gitignore (לא committed לgit)
- ✅ sessionStorage (לא localStorage, מתנקה עם סגירה)
- ✅ Local only (localhost:8000, לא public)
- ⚠️ **אבל:** אם server נחשף, config.txt נחשף

**המלצה:** במקום file, להעלות לserver environment variable (בproxy-server.js)

**הערכה:** 🟢 **טוב** (עבור local-only use)

---

### 6️⃣ BUFFER TOKEN + ZAPIER WEBHOOK
**סיכון:** שמורים בsessionStorage

```javascript
sessionStorage.setItem('buffer_token', token)
sessionStorage.setItem('zapier_url', url)
```

**בעיה:**
- 🟡 **Low** - sessionStorage בטוח מלocalStorage
- buffer token הוא read-only(?) תוקף עם הרשאות מוגבלות
- zapier webhook הוא intent-less (אם מישהו לא יודע עליו, זה לא בעיה)

**הגנה:**
- ✅ sessionStorage (מתנקה עם סגירה)
- ✅ לא in URL parameters
- ✅ לא in logs

**הערכה:** 🟢 **בטוח** (עבור personal use)

---

### 7️⃣ DAILY RUN LIMIT BYPASS
**סיכון:** Run limit נשמר בsessionStorage, אפשר להשחת

```javascript
localStorage.getItem(LAST10_KEY) // ← עכשיו sessionStorage
```

**בעיה:**
- 🟡 **Low** - זה לא ביטחון (לא API limit enforcement)
- אם מישהו פותח DevTools ומוחק את sessionStorage, הם עשויים להחקות את הlimit

**הגנה:**
- ✅ Session-based (מתנקה עם סגירה)
- ✅ בטוח מלocalStorage
- ⚠️ **אבל:** זה client-side validation (לא חזק)

**הערכה:** 🟡 **בינוני** (שמן client-side לא reliable, אבל סדיר להפיק usage tracking)

---

### 8️⃣ CORS + PROXY AVAILABILITY
**סיכון:** אם proxy לא פועל, fallback לישיר API

```javascript
// שורה 2554-2583: checkProxy()
const proxyAvailable = await checkProxy()
if(proxyAvailable) {
  // ✅ משתמש בproxy (API Key לא בברוזר)
} else {
  // ❌ fallback לישיר API (API Key בברוזר)
}
```

**בעיה:**
- 🔴 **Critical** - אם proxy לא פועל, fallback לישיר API עוד טוב
- proxy-server.js דורש `CLAUDE_API_KEY` environment variable
- אם proxy לא started כמו שצריך, זה עובד ממש לא

**הגנה קיימת:**
- ✅ Proxy available check (בכל init)
- ✅ CORS headers בproxy (מאפשר localhost בלבד)
- ✅ Header `anthropic-dangerous-direct-browser-access` (warning)
- ⚠️ **אבל:** אם user לא מפעיל proxy, fallback עדיין מעביר את הכל

**המלצה:** להכריח proxy, לא לאפשר fallback

**הערכה:** 🟡 **בינוני** (תלוי בproxy operability)

---

## 📋 סיכום כללי

### ✅ הגנות שקיימות:

1. **sessionStorage** - בטוח יותר מlocalStorage
2. **Auto-load מ-config.txt** - נוח וטוב
3. **Proxy Server** - API Key לא בברוזר (אם proxy פועל)
4. **URL Validation** - חפץ תיקייה בRSS data
5. **Input Escaping** - מנסה להגן מ-injection בonclick handlers
6. **.gitignore** - config.txt לא מcommitted
7. **CORS Policy** - proxy אפשר רק localhost

---

### ⚠️ סיכונים שנשארים:

| סיכון | חומרה | גורם |
|------|--------|------|
| **Proxy fallback** | 🔴 High | API Key בישיר API call |
| **XSS via RSS** | 🟠 Medium | innerHTML עם untrusted data |
| **onclick Injection** | 🟠 Medium | string interpolation בevent handlers |
| **config.txt exposure** | 🟠 Medium | אם server נחשף |
| **Run limit bypass** | 🟡 Low | Client-side validation |

---

## 🎯 המלצות:

### עדיפות גבוהה:
1. **מנע fallback ישיר** - אם proxy לא פועל, תיתן שגיאה, לא fallback
2. **Sanitize RSS data** - השתמש בtext content, לא innerHTML
3. **Replace onclick** - השתמש בaddEventListener במקום onclick="..."

### עדיפות בינונית:
4. **Move config.txt** - העבר ל-environment variable בproxy
5. **Validate all inputs** - לא רק URL validation

### עדיפות נמוכה:
6. **Server-side run limit** - לא client-side only
7. **Logging** - הוסף audit trail

---

## 🔐 תמצית:

**עבור personal use בבית שלך (בלבד):**
- ✅ **בטוח** - sessionStorage + auto-load זה מוכן
- ✅ **אתה היחיד** שיכול לגשת
- ✅ **proxy פועל** - API Key לא בברוזר

**אם תוציא את זה לפומבי:**
- ❌ **לא בטוח** - צריך לקבוע את הsecurity issues שלמעלה
