# הרגעים שלנו 📷

אפליקציית תמונות חברתית בעברית, RTL, למחשב ולטלפון. React + TypeScript + Vite + Tailwind + HashRouter, עם Supabase Auth, PostgreSQL ו-Storage. אין נתוני הדגמה ואין שרת Node בפריסה: GitHub Pages מגיש רק קבצים סטטיים. מיועד לתמונות חברתיות רגילות ולא למידע רגיש.

## מה צריך לספק

1. פרויקט Supabase משלכם וכתובת `https://….supabase.co`.
2. המפתח הציבורי **publishable** של הפרויקט. מותר לכלול אותו בבנייה; ההרשאות נאכפות באמצעות RLS.
3. חשבון GitHub ומאגר עבור הקוד, עם הרשאה להפעיל Pages ו-Actions.
4. מזהים, שמות וצוותים בקובץ CSV מקומי. אין לשלוח או לפרסם קודי גישה או מפתח ניהול. התחילו עם חברים פיקטיביים.
5. דומיין פנימי עקבי, למשל `members.example.invalid`. זהו מיפוי טכני בלבד; לא צריך תיבת דואר. אל תשנו אותו לאחר יצירת המשתמשים ללא תכנון מעבר.

## 1. יצירת הפרויקט והמסד

צרו פרויקט ב-[Supabase](https://supabase.com/dashboard). שמרו את סיסמת מסד הנתונים אצלכם. פתחו SQL Editor והריצו את `supabase/migrations/001_company.sql` **פעם אחת**. לחלופין עם Supabase CLI מותקן: `supabase link --project-ref PROJECT_REF` ואחריו `supabase db push`. המיגרציה יוצרת טבלאות, אינדקסים, RLS, פונקציית פיד ו-bucket פרטי בשם `company-photos`. אין seed עם משתמשי Auth.

אין לבטל RLS ואין להפוך את ה-bucket לציבורי. רק מנהל עם מפתח שרת יכול לשנות צוות/מזהה/פעילות של חבר. predicate צר עם `SECURITY DEFINER` בודק רק את `auth.uid()` כדי למנוע רקורסיה במדיניות; פיד ה-RPC הוא `SECURITY INVOKER`. סמכות משתמש נקבעת מ-Auth, לא ממידע ניתן לעריכה בדפדפן.

## 2. הגדרות Auth

ב-Authentication → Providers הפעילו Email/password וכבו **Allow new users to sign up**. אם מוצגת אפשרות Confirm email ניתן לכבותה לפרויקט זה; סקריפט הניהול בכל מקרה יוצר משתמשים עם `email_confirm: true`. אין צורך ב-SMTP, Google או טלפון. אין מסך הרשמה ואין שחזור באמצעות דוא"ל. איפוס מתבצע אצל המנהל. השאירו הגנות brute-force ומגבלות קצב מופעלות.

הגדירו Site URL לכתובת Pages הסופית. מומלץ JWT קצר (למשל 15 דקות): מצב פעילות נבדק גם בכל בקשת מסד/Storage, בלי להמתין לפקיעת JWT. בדיקה תקופתית בממשק מוציאה חבר לא פעיל מהתוכן.

## 3. התקנה והגדרות מקומיות

דרוש Node.js 24 נתמך ו-npm. בתיקיית הפרויקט:

```powershell
npm ci
Copy-Item .env.example .env.local
Copy-Item .env.admin.example .env.admin
```

ערכו `.env.local` והגדירו `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_AUTH_EMAIL_DOMAIN`. `VITE_BASE_PATH=/REPOSITORY-NAME/` מתאים ל-Pages; `/` מתאים לאתר root או דומיין אישי. כל `VITE_*` נכנס לקובצי הדפדפן הציבוריים. **אסור לשים שם service-role, secret key או סיסמת מסד**. הפרויקט משתמש במפתח publishable; בפרויקט ישן anon key ציבורי יכול לשמש באותו משתנה, עם אותן מדיניות RLS.

רק ב-`.env.admin` המקומי הגדירו `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_PUBLISHABLE_KEY` ו-`AUTH_EMAIL_DOMAIN`. כלי הניהול משתמשים ב-service-role JWT המיועד לשרת בלבד. קובץ זה לא נפרס ואינו נכלל ב-Git. אל תמסרו את המפתח בצ'אט. שמרו הרשאות קבצים מקומיות מצומצמות; במחשב Windows בדקו גם ACL של קבצי האישורים.

## 4. יצירת חברים

העתיקו `members.example.csv` אל `members.local.csv`. שמרו UTF-8 והכותרת:

```csv
member_identifier,display_name,team_name
demo-001,נועם לדוגמה,צוות אופק
demo-002,תמר לדוגמה,צוות ניצן
```

מזהה: 3–40 תווי אנגלית קטנים/ספרות/מקף/קו תחתון; תו ראשון אות או ספרה. הסקריפט מנרמל אותיות גדולות ומונע כפילויות לפני כתיבה. אפשר שמות וצוותים בעברית, עד 80 תווים. אין להשתמש במידע רגיש במזהה.

```powershell
npm run provision -- members.local.csv
```

נוצרים צוותים, חשבונות Auth מאושרים ופרופילים מקושרים. קודים אקראיים של 192 ביט נכתבים רק ל-`credentials.local.jsonl` המוחרג מ-Git. אל תצלמו או תפרסמו את הקובץ; מסרו לכל חבר את המזהה והקוד שלו בערוץ פרטי. משתמש אינו צריך לראות את הדוא"ל הסינתטי. הרצה חוזרת משמרת קודים ופרופילים קיימים ומשלימה פרופיל אם יצירתו נכשלה קודם. אם שמירת קוד נכשלת, החשבון החדש נמחק; בשגיאה הסקריפט עוצר עם הודעה ללא סודות. בקוד שיצירתו הצליחה אבל הרשת נקטעה לפני התשובה אפשר להשתמש בנוהל האיפוס.

להוספת חברים/צוותים, הוסיפו שורות והריצו שוב. לעדכון שם/צוות של חבר קיים השתמשו ב-Table Editor כמנהל; rerun לא משנה פרופילים קיימים. ניתן להוסיף צוות גם ישירות לטבלת teams. אין צורך בממשק ניהול באתר.

## 5. איפוס והשבתה

```powershell
npm run admin -- reset demo-001
npm run admin -- disable demo-001
npm run admin -- enable demo-001
```

איפוס מוסיף קוד חדש לקובץ המקומי; הרשומה האחרונה היא הקוד החדש רק לאחר הודעת הצלחה. אם עדכון Auth נכשל אין למסור את הרשומה החדשה; הריצו שוב. השבתה משנה `is_active=false` תחילה, ואז חוסמת Auth. גם אם שלב החסימה נכשל, RLS כבר שולל גישה עם session קיים. הפעלה מחזירה את שני המצבים. איפוס אינו מחייב ניתוק מיידי של session קיים; במקרה של קוד שנחשף השביתו את החבר ונהלו ביטול session ב-Auth לפני הפעלה מחדש.

## 6. הפעלה ובדיקות

בדיקות מקומיות הורצו בהכנת הפרויקט: TypeScript, lint, בניית production ו-20 בדיקות אוטומטיות עברו. הבדיקות כוללות UI עם jsdom ומסד PostgreSQL מקומי באמצעות PGlite שמריץ את המיגרציה עצמה עם סכמות auth/storage מצומצמות לצורך הבדיקה. זה אינו תחליף לבדיקה מול שירותי Supabase האמיתיים. בדיקת Auth/Storage ברשת, בדיקת תמונות בדפדפן ופריסת Pages עדיין דורשות הגדרה חיצונית.

```powershell
npm run dev
npm run typecheck
npm run lint
npm test
npm run build
```

פתחו את הכתובת שה-Vite מציג, כולל base אם הוגדר. הנתיבים הם `#/`, `#/upload`, `#/search`, `#/user/UUID`. הפיד מסונן בשרת, משתמש בסמן `(created_at,id)` ומציג 20 תמונות בכל עמוד. שינוי צוות מאפס את הסמן. כמות התמונות בפרופיל היא ספירה מלאה במסד.

לאחר החלת המיגרציה והגדרת `.env.admin`:

```powershell
npm run test:auth
```

הבדיקה יוצרת שני חברים פיקטיביים וצוות זמני, מעלה JPEG זעיר ובודקת קריאת אנונימי, התחזות בפוסט/לייק, מחיקת לייק של אחר, תיקייה זרה, כפילות, איסור עריכת פרופיל/דריסת קובץ, פיד והרשאות של חבר לא פעיל עם JWT קיים. בסיום היא מנסה לנקות חשבונות, צוות וקבצים. הריצו בפרויקט בדיקה או אחרי בדיקת הרשאות המפתח. במצב עצירה חיצונית בדקו ונקו רשומות עם prefix `test-`.

בדיקת דפדפן עם שני חשבונות פיקטיביים: התחברו, טענו מחדש (session משוחזר), התנתקו, התחברו שוב; העלו JPEG/PNG/WebP לאורך/לרוחב ובדקו הסרת metadata וקובץ עד 2048; נסו HEIC ויותר מ-15 MB; ודאו שאין שליחה כפולה. בדקו 21+ תמונות, עמוד שני בפיד/פרופיל, סינון צוות, חיפוש עברית מהיר ללא תוצאות ישנות, לייק/ביטול עקביים בין viewer ופיד. נתקו רשת ובדקו שגיאה ו-rollback; כשל insertion נבדק גם אוטומטית עם cleanup. פתחו viewer במקלדת, Escape, חזרה לפוקוס, וחסימת גלילת הרקע. השביתו חשבון עם session פעיל והמתינו עד דקה לתצוגת חסימה; הנתונים כבר חסומים בשרת.

## 7. GitHub Pages

העלו את **תוכן תיקיית הפרויקט** למאגר אחד, בשורש. אל תעלו `node_modules`, `.env`, CSV אמיתי או קבצי credentials. אם אין מאגר מקומי: `git init`, `git add .`, `git commit -m "Build company photo application"`; הגדירו remote למאגר שלכם והעלו main. המפתח הציבורי בלבד מותר בפריסה.

ב-GitHub Settings → Pages בחרו **GitHub Actions**. ב-Settings → Secrets and variables → Actions → Variables הוסיפו:

| משתנה | ערך |
|---|---|
| VITE_SUPABASE_URL | כתובת הפרויקט |
| VITE_SUPABASE_PUBLISHABLE_KEY | מפתח ציבורי |
| VITE_AUTH_EMAIL_DOMAIN | הדומיין שהוגדר גם בכלי הניהול |
| VITE_BASE_PATH | אופציונלי; ברירת המחדל ב-workflow היא `/שם-המאגר/`; root/custom: `/` |

אין צורך במפתח ניהול ב-GitHub Actions. `.github/workflows/deploy.yml` מריץ npm ci, typecheck, lint, test ובנייה, מעלה dist ופורס ל-environment של Pages. הוא רץ ב-push ל-main או manual dispatch. בדקו הרשאות Actions/Pages ומגבלות חשבון GitHub עבור מאגר פרטי. במאגר ציבורי הקוד גלוי; RLS ו-Storage מגינים על הנתונים.

אחרי הצלחת workflow פתחו `https://USERNAME.github.io/REPOSITORY-NAME/`, בצעו את בדיקות הדפדפן לעיל, פתחו קישור פרופיל ורעננו כדי לבדוק HashRouter, ובדקו בקשות assets תחת subpath. URL משותף אינו מעניק גישה בלי התחברות. ההפצה לא בוצעה במסגרת ההכנה ללא מאגר ופרויקט זמינים.

## 8. אחסון, תפוגה ותחזוקה

קבצים נשמרים כ-`UUID/POST-UUID.jpg` ללא דריסה. תמונת מקור עד 15 MB מפוענחת עם כיוון EXIF, מוקטנת עד 2048 ונכתבת מחדש ל-JPEG על canvas; מקור ונתוני EXIF/GPS אינם מועלים. הרשאות Storage עצמאיות מהרשאות הטבלאות. ה-bucket מוגבל ל-15 MB ול-MIME JPEG/PNG/WebP. avatar אופציונלי יכול להיטען מאותו bucket; מנהל יכול להעלות JPEG בנתיב UUID ולשים את הנתיב בפרופיל. אין עריכת avatar באתר.

כתובות חתומות תקפות 120 שניות ומתחדשות כל 90 שניות; שגיאה מאפשרת retry. הן לא נשמרות במסד או ביומני היישום. כתובת שכבר נחתמה היא bearer link ויכולה לעבוד עד תפוגתה גם אחרי השבתת חשבון; אי אפשר לבטל אותה מיידית דרך RLS. מכאן זמן התוקף הקצר. מטמון דפדפן ותמונות שכבר נצפו אינם ניתנים להחזרה. אין להפיץ קישורים חתומים.

אם insertion נכשל, מתבצע ניסיון להסיר את ה-object. חבר רשאי למחוק רק object שלו שעדיין אינו מקושר לפוסט. הפסקת דפדפן או רשת יכולה להשאיר orphan. ללא מחיקה:

```powershell
npm run orphans
```

הסקריפט מדווח על objects שאינם מקושרים ונוצרו לפני יותר מ-24 שעות. להפעלת מחיקה לאחר בדיקת הדוח:

```powershell
npm run orphans -- --delete
```

בצעו מחיקה בחלון תחזוקה ללא העלאות; הסקריפט בודק שוב קישור לפני מחיקה אך SQL ו-Storage אינם transaction אחד. במקרה של כמות גדולה, הריצו סריקה חוזרת אחרי המחיקה. אל תמחקו רשומות ישירות ב-storage.objects; השתמשו ב-Storage API. אין מחיקת פוסטים רגילה בממשק; טיפול של מנהל צריך להסיר גם את הקובץ וגם את הרשומה בהתאם למדיניות התחזוקה.

עקבו בדשבורד אחרי נפח Storage, traffic, גודל מסד ומגבלות תוכנית. קובצי התמונות דורשים גיבוי נפרד: גיבוי מסד אינו גיבוי תוכן ה-bucket. בדקו מדיניות retention, תקציב, גיבוי ושחזור לפני שימוש קבוע. שמרו secrets וקודי גישה מחוץ למאגר גם בזמן גיבוי.

## מקורות

[Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [Storage access control](https://supabase.com/docs/guides/storage/security/access-control), [Admin createUser](https://supabase.com/docs/reference/javascript/auth-admin-createuser), [Vite static deploy](https://vite.dev/guide/static-deploy.html#github-pages).
