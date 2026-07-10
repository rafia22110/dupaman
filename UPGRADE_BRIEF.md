# דופמין — שדרוג לאתר אמיתי

## המצב הנוכחי
- Landing (index.html): פיד של 10 מאמרים, RTL עברית, עיצוב שחור-ירוק
- כרגע `openArticle(id)` פותח **modal** בתוך אותו דף — זה מה שהמשתמש לא רוצה
- Fallback: `public/articles-today.json` (10 מאמרים אמיתיים עם title, lines[], life, question, link)
- API: `/api/sheets` קורא מ-Google Sheets דרך gviz עם fallback ל-JSON

## מה נדרש (הוראות המשתמש)
1. **כל כותרת → מאמר מלא בתוך האתר** (לא modal, לא קישור חיצוני)
2. **View Transitions** — מעבר morph חלק בין הפיד לעמוד המאמר
3. **פיצ'רי HTML/CSS מודרניים** — Popover, `:has()`, `scroll-timeline`, container queries
4. **בלי n8n בכלל** — כבר הוסרו הקבצים n8n_*.json, script.js, index-1.html. עכשיו צריך להסיר את SUBSCRIBE_WEBHOOK ואת החיבור ל-webhook בטופס הרישום (שורות 345-347, 668-694 ב-index.html)

## Deliverables
1. **index.html משודרג**:
   - הסר את `SUBSCRIBE_WEBHOOK` וכל fetch ל-n8n. השאר טופס הרשמה שממש מציג "תודה, נרשמת" בלבד (בלי backend)
   - החלף `openArticle(id)` — במקום לפתוח modal, `<a href="article/[id].html">` עם `view-transition-name: card-${id}`
   - הסר את המודל `#article-modal` (שורות 329-336)
   - הוסף `@view-transition { navigation: auto }` ב-CSS
   - הוסף פס גלילה עליון עם `animation-timeline: scroll(root)` 
   - הפוך את פאנל "התנתק" / auth ל-Popover נטיבי (`popover` attribute) במקום `.moverlay`
   - שמור על כל שאר הפונקציונליות: search, tabs, pills, filter, i18n (he/en), lang switcher, dark theme

2. **צור `article/[id].html`** לכל 10 המאמרים — עמוד סטטי אמיתי:
   - header עם `view-transition-name: card-${id}` — יעשה morph מהכרטיס
   - הצג את כל תוכן המאמר: title, lines[] כפסקאות, "משפט לחיים", "שאלה", תאריך, מקור
   - קישור חיצוני "המשך במקור" למקור המקורי
   - כפתור חזרה לפיד
   - צריך להיראות באותו עיצוב שחור-ירוק
   - עמודי המאמר צריכים לטעון את אותו CSS (אפשר להוציא ל-`style.css` משותף, או להטמיע inline באותה תבנית)
   - הוסף פיצ'רים מודרניים גם כאן: `text-wrap: balance` לכותרת, `text-wrap: pretty` לפסקאות, Container Query ל-layout רספונסיבי

3. **צור סקריפט Node.js `build-articles.js`** שיוצר את עמודי המאמר אוטומטית מ-`public/articles-today.json`:
   - קורא את ה-JSON, מייצר `article/[id].html` לכל מאמר
   - יש להריץ אותו ב-`vercel-build` script ב-package.json כדי שהעמודים ייבנו על כל deploy
   - כדי שהאתר יעבוד גם עם עדכוני Sheets דינמיים: אם `/api/sheets` מחזיר מאמרים חדשים, index.html יטען אותם דינמית. עמודי המאמר הסטטיים יהיו בסיס מה-JSON.

4. **package.json**: הוסף `"scripts": { "vercel-build": "node build-articles.js" }`. תשאיר את googleapis dependency.

5. **vercel.json**: הוסף rewrite/route ל-`article/*.html` אם צריך. נקודה חשובה: ב-Vercel, קבצים ב-root של הפרויקט מוגשים כ-static. `article/popover-api.html` צריך להיות ב-`article/` בתיקיית root.

## פיצ'רי HTML/CSS מודרניים לשלב
בפיד (index.html):
- **@view-transition { navigation: auto }** — מעברים חלקים
- **`view-transition-name: card-${id}` על כל כרטיס** + על header המאמר
- **`animation-timeline: scroll(root)`** — פס progress עליון
- **`popover` attribute** — פאנל "אודות" / "התחבר" / "הגדרות" במקום `.moverlay`
- **`:has()`** — סטייל לכרטיסים לפי selectors (למשל: `.grid:has(.card:hover) .card:not(:hover) { opacity: 0.6 }`)
- **Container queries** — הכרטיסים מגיבים לרוחב `.grid-wrap` (`container-type: inline-size`)
- **`@starting-style`** — אנימציית כניסה של Popovers
- **`text-wrap: balance/pretty`** — לכותרות ופסקאות

בעמודי המאמר:
- **View Transition source name** — header של המאמר עם אותו `view-transition-name: card-${id}`
- **Container queries** — `.article-body { container-type: inline-size }` עם `@container (min-width: 700px)` ל-layout רחב
- **`text-wrap: balance`** לכותרות H1
- **`text-wrap: pretty`** לפסקאות טקסט
- אופציונלי: **`<dialog>` עם invoker commands** לתצוגת "שיתוף" / "תגובות"

## סטייל
שמור על הפלטה הקיימת (שחור-ירוק-לבן). אל תשנה צבעים.

## תוצאה סופית
פרויקט מוכן לפריסה ב-Vercel. אני (הסוכן הראשי) אבצע את הפריסה עצמה — אתה (subagent) לא צריך לפרוס.
