#!/usr/bin/env python3
"""
Upload website course lessons to YouTube (WAO channel), add to playlist,
and swap videoSrc → videoId in website-course-data.ts.

Usage:
  python3 scripts/upload-website-course.py                          # pending lessons, capped by --max
  python3 scripts/upload-website-course.py --slug website-lesson-6  # single lesson
  python3 scripts/upload-website-course.py --slug website-lesson-3 --force  # re-upload despite videoId

Requires:
  client_secrets.json in project root
  pip install google-auth-oauthlib google-auth-httplib2 google-api-python-client

OAuth token is cached at scratch/youtube_website_token.json after first login.

SAFETY GATE: before any upload the script verifies the token resolves to the
WAO channel (UCBQXMUIQPC82kXKqihQ8pRw) and aborts otherwise. Lessons 1-2 and
3-5 were uploaded before this gate existed; 3-5 landed on the wrong (personal)
channel and can be re-uploaded here with --force once Eitan decides.

Quota: videos().insert costs 1,600 units of the 10,000/day quota → hard cap
of 6 uploads per day. Default --max is 6.
"""

import os
import re
import sys
import time
import argparse

from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload
from googleapiclient.errors import HttpError

SCOPES = [
    'https://www.googleapis.com/auth/youtube',
    'https://www.googleapis.com/auth/youtube.upload',
]

CLIENT_SECRETS = 'client_secrets.json'
TOKEN_CACHE    = 'scratch/youtube_website_token.json'
COURSE_DATA    = 'src/data/website-course-data.ts'

# The ONLY channel this script is allowed to upload to.
EXPECTED_CHANNEL_ID = 'UCBQXMUIQPC82kXKqihQ8pRw'  # WAO- לא רק ייעוץ שיווקי ברשת

# Playlist title — will be created on the WAO channel if it doesn't exist
PLAYLIST_TITLE = 'בניה + קידום אתרים בעידן ה-AI | WAO'
PLAYLIST_DESC  = 'קורס מלא לבעלי עסקים ישראלים: מבניית אתר עם AI ועד קידום אורגני ב-Google.'

COURSE_URL = 'https://wao.co.il/training/website-course'

BASE_TAGS = ['בניית אתר', 'AI', 'גוגל', 'WAO', 'עסק קטן', 'ישראל']


def lesson(slug, video_num, title, description, task, extra_tags, module_line=None):
    """Build one LESSONS entry. title/description/task are the immutable
    course strings from website-course-data.ts — do not reword them."""
    parts = []
    if module_line:
        parts.append(module_line)
    parts.append(description)
    if task:
        parts.append('משימה: ' + task)
    parts.append('▶ הקורס המלא: ' + COURSE_URL)
    return {
        'slug': slug,
        'video': f'public/media/videos/{slug}.mp4',
        # Thumbnails on disk: lessons 3-5 are .png, everything else .jpg
        'thumbnail': f'public/media/thumbnails/{slug}.png' if 3 <= video_num <= 5
                     else f'public/media/thumbnails/{slug}.jpg',
        'title': title,
        'description': '\n\n'.join(parts),
        'tags': BASE_TAGS + extra_tags,
    }


# Lessons to upload — in order. Lessons 3-5 already have videoIds (on the WRONG
# channel, pending Eitan's call); they stay here for a possible --force re-upload.
LESSONS = [
    # ── Module 1 (already on WAO channel — kept for completeness) ──
    lesson('website-lesson-1', 1,
           'שיעור 1: הדומיין — הכתובת הדיגיטלית שלך',
           'מה זה דומיין, למה הוא לא אותו דבר כמו האתר, ואיך תוודא שהוא רשום על שמך',
           'תפתח את הדפדפן עכשיו. תיכנס ל-GoDaddy.com, Namecheap.com או box.co.il. תחפש את שם העסק שלך — תבדוק אם .co.il ו-.com פנויים. תרשום מה מצאת — בשיעור הבא תבחר ביניהם.',
           ['דומיין'], module_line='מודול 1 — דומיין: הכתובת הדיגיטלית שלך'),
    lesson('website-lesson-2', 2,
           'שיעור 2: איך בוחרים שם דומיין נכון לעסק שלך',
           '5 קריטריונים לשם דומיין טוב, מבחן הרדיו, 3 טעויות נפוצות, ופרומפט AI מוכן לשימוש',
           'תשתמש בפרומפט ה-AI. תיכנס ל-Claude או ChatGPT, תעתיק את הפרומפט מהשיעור. תחליף את [שם העסק] ו[תחום] בפרטים שלך. תקבל 10 הצעות — תסנן לפי 5 הקריטריונים. המטרה: 3 מועמדים פנויים, ברשימה כתובה.',
           ['דומיין'], module_line='מודול 1 — דומיין: הכתובת הדיגיטלית שלך'),
    # ── Module 2 (currently on the personal channel — possible --force re-upload) ──
    lesson('website-lesson-3', 3,
           'שיעור 1 | בניה + קידום אתרים בעידן ה-AI | WAO',
           'שלושה מרכיבים למשפט תיאור עסק מדויק, דוגמה חיה של אינסטלטור, '
           'ותבנית מלאה לניסוח המשפט שיבנה את כל האתר שלך.',
           'תמלא את התבנית מהשיעור. תשמור את המשפט — תצטרך אותו בשיעור הבא.',
           ['פרומפט'], module_line='מודול 2 — הסבירו את העסק ל-AI'),
    lesson('website-lesson-4', 4,
           'שיעור 2 | בניה + קידום אתרים בעידן ה-AI | WAO',
           'איך להפוך את תיאור העסק שלך לפרומפט ראשון, לקבל טיוטת עמוד בית תוך שניות, '
           'ולבדוק אם היא נשמעת כמוך.',
           'תדביק את המשפט שלך ל-AI ותריץ את שלוש הבדיקות. תשמור את הטיוטה — תצטרך אותה בשיעור הבא.',
           ['פרומפט', 'Claude', 'ChatGPT'], module_line='מודול 2 — הסבירו את העסק ל-AI'),
    lesson('website-lesson-5', 5,
           'שיעור 3 | בניה + קידום אתרים בעידן ה-AI | WAO',
           'שלוש שאלות לבדיקת כל טיוטה, נוסחת פרומפט תיקון, '
           'וכמה סבבים צריך עד שמגיעים לתוצאה אמיתית.',
           'תעביר את הטיוטה דרך שלוש השאלות ותכתוב פרומפט תיקון אחד. תשמור את הגרסה החדשה.',
           ['פרומפט', 'איטרציה'], module_line='מודול 2 — הסבירו את העסק ל-AI'),
    # ── Module 0 intro (pinned, not a numbered lesson) ──
    lesson('website-lesson-0', 0,
           'לפני שנתחיל: מי בעצם מדבר אליך',
           'לפני השיעור הראשון: היכרות קצרה עם הצוות שמלווה אותך לאורך הקורס, '
           'ועם הרעיון שעומד מאחורי WAO — לא סוכנות שיווק, אלא מערכת ההפעלה של העסק הקטן',
           '',
           []),
    # ── Module 3 — On-Page SEO Foundations ──
    lesson('website-lesson-6', 6,
           'שיעור 1: הלקוח לא מחפש אותך, הוא מחפש את הבעיה שלו',
           'הפער בין המילים שבהן אתה מתאר את העסק שלך לבין המילים שבהן הלקוח שלך מחפש בגוגל. '
           'שרברב מול אינסטלטור, ולמה שתי המילים שייכות לתוכן שלך',
           'תוריד את דף העבודה ״מתרגם השפה״ מקישור השיעור. הדף כולל את הדוגמאות של אבי, כדי שתבין את השיטה. תמלא את שתי העמודות במילים האמיתיות של העסק שלך. תשמור את הקובץ — תצטרך אותו בשיעור הבא.',
           ['SEO', 'קידום אתרים'], module_line='מודול 3 — השפה שגוגל מבין'),
    lesson('website-lesson-7', 7,
           'שיעור 2: הכותרת שמכניסה אותך לעמוד הראשון (וזו שקוברת אותך)',
           'נוסחת כותרת התג ב-5 חלקים: מילת מפתח, עיר, יתרון אחד, שם העסק בסוף, ובין 50 ל-60 תווים. '
           'איך לכתוב אותה מחדש לדף הבית עם פרומפט AI',
           'תפתח את דף הבית שבנית במודול 2. תשתמש בפרומפט ותכתוב שלוש גרסאות לכותרת. תבדוק כל גרסה לפי הנוסחה: מילת מפתח ראשונה, עיר, יתרון אחד, שם העסק בסוף. תספור תווים — בין 50 ל-60. תשמור את הכותרת שבחרת.',
           ['SEO', 'קידום אתרים'], module_line='מודול 3 — השפה שגוגל מבין'),
    lesson('website-lesson-8', 8,
           'שיעור 3: גוגל קורא רק את הכותרות שלך — הנה מה לכתוב בהן',
           'היררכיית כותרות בתוך העמוד (H1/H2/H3) כתוכן עניינים לבן אדם ולגוגל. '
           'כותרת ראשית אחת שתואמת את מילת המפתח, כותרות משנה ברורות, בלי דילוג רמות ובלי מילוי מילות מפתח',
           'תפתח את העמוד הראשון מתוך החמישה שלך. תריץ עליו בדיקה: כותרת ראשית אחת, כותרות משנה ברורות, בלי דילוג רמות. נכשל באחד מהם? תשלח ל-AI את פרומפט התיקון. תחזור על התהליך על כל חמשת העמודים, ותשמור כל עמוד אחרי התיקון.',
           ['SEO', 'קידום אתרים'], module_line='מודול 3 — השפה שגוגל מבין'),
    lesson('website-lesson-9', 9,
           'שיעור 4: עמוד לכל שירות: הטריק שמכפיל את החשיפה שלך בגוגל',
           'מתי כדאי לפצל שירות לעמוד נפרד ומתי להשאיר אותו ממוזג: '
           'כלל ההכרעה הוא האם לקוח מחפש את השירות הזה בשמו המדויק בגוגל',
           'תרשום רשימה של כל השירותים שהעסק שלך נותן. ליד כל אחד תסמן ״עמוד נפרד״ או ״ממוזג״. תבחר שירות אחד שסימנת ״עמוד נפרד״ ועדיין אין לו עמוד, ותריץ עליו את פרומפט הבנייה. תשמור את הטיוטה, ותעביר עליה כותרת וכותרות משנה לפי שני השיעורים הקודמים.',
           ['SEO', 'קידום אתרים'], module_line='מודול 3 — השפה שגוגל מבין'),
    # ── Module 4 — AI Answers & FAQ ──
    lesson('website-lesson-10', 10,
           'שיעור 1: הלקוח שואל, גוגל עונה — ואתה יכול להיות התשובה',
           'מה זה "תשובת AI" ואיך היא שונה מעמוד תוצאות עם עשרה קישורים כחולים. '
           'למה להיות המקור המצוטט חשוב היום כמו (ולפעמים יותר מ-) דירוג ראשון',
           'תוריד את דף העבודה ״שאלת הלקוח שלי״ מקישור השיעור. תכתוב עליו שאלה אחת אמיתית, במילים של הלקוח ולא במילים שלך. תשמור אותו — תצטרך אותו בשיעור הבא, כשתהפוך אותו לשאלת FAQ.',
           ['תשובות AI', 'FAQ', 'GEO'], module_line='מודול 4 — התשובות שה-AI מצטט'),
    lesson('website-lesson-11', 11,
           'שיעור 2: שאלות ותשובות: הבלוק שה-AI של גוגל מצטט הכי הרבה',
           "איך לנסח שאלת FAQ במילים של הלקוח ולא בז'רגון מקצועי. "
           'שימוש בפרומפט AI שהופך תיאור עסק לשמונה עד עשר שאלות מועמדות, ובחירת שלוש מתוכן',
           'תריץ את הפרומפט עם תיאור העסק שלך ותקבל שמונה עד עשר שאלות מועמדות. תבחר שלוש מתוכן, כולל השאלה ששמרת בשיעור הקודם. תשמור אותן — תצטרך אותן בשיעור הבא.',
           ['תשובות AI', 'FAQ', 'GEO'], module_line='מודול 4 — התשובות שה-AI מצטט'),
    lesson('website-lesson-12', 12,
           'שיעור 3: התשובה המושלמת: שלושה משפטים שגוגל בוחר להציג',
           'נוסחת התשובה: עובדה ישירה קודם, בלי פתיח מהסס, ואז משפט תומך אחד עם פרט קונקרטי. '
           'דוגמה חיה על שאלת המחיר של אבי',
           'תיקח את שלוש השאלות מהשיעור הקודם. תריץ את הפרומפט על כל שאלה בנפרד. תבדוק שכל תשובה מתחילה בעובדה ולא בהיסוס. תשמור את שלושת הזוגות, שאלה ותשובה, ביחד.',
           ['תשובות AI', 'FAQ', 'GEO'], module_line='מודול 4 — התשובות שה-AI מצטט'),
    lesson('website-lesson-13', 13,
           'שיעור 4: המתחרה שלך כבר מצוטט ב-AI. בוא נעקוף אותו',
           'מה סימון FAQPage JSON-LD עושה (עוזר למנועי AI לקרוא את הבלוק נכון) ומה הוא לא עושה — '
           'הוא לא יוצר עוד תוצאת אקורדיון גלויה בגוגל, פיצ׳ר שהוצא משימוש ב-7 במאי 2026',
           'תדביק ל-AI את הפרומפט, עם בלוק השאלות והתשובות שלך. תוודא שהקוד נכנס לדף הנכון באתר. תבדוק אותו בכלי אימות סכמה חיצוני. יש שגיאה? תעתיק אותה חזרה ל-AI ותבקש שיתקן.',
           ['תשובות AI', 'FAQ', 'סכמה', 'JSON-LD'], module_line='מודול 4 — התשובות שה-AI מצטט'),
    # ── Module 5 — Domain, Deploy & Search Console ──
    lesson('website-lesson-14', 14,
           'שיעור 1: דומיין במאה שקל: כתובת שהיא שלך לכל החיים',
           'תהליך הרכישה בפועל של הדומיין שבחרת במודול 1: כניסה לחברת הרישום, תשלום, '
           'ואימות מייל אישור הבעלות — הצעד ששומר עליך מהסיפור של "הדומיין שאבד" משיעור 1.1',
           'תיכנס לחברת הרישום שבחרת, ותרכוש את השם שבחרת במודול 1. לפני שאתה מאשר, תעבור שוב על שלוש הבדיקות: בעלות, חידוש אוטומטי, בלי הוספות מיותרות. אחרי התשלום תחפש את מייל אישור הבעלות ותשמור אותו במקום בטוח.',
           ['דומיין'], module_line='מודול 5 — האתר באוויר, ומחובר לגוגל'),
    lesson('website-lesson-15', 15,
           'שיעור 2: האתר באוויר תוך עשר דקות — בלי לשלם על אחסון',
           'העלאת חמשת הדפים שבנית במודול 2 לאירוח חינמי ב-Cloudflare Pages, '
           'וקבלת כתובת זמנית שהאתר שלך חי עליה. הבהרה: זו עדיין לא הכתובת שקנית בשיעור הקודם',
           'תיכנס לחשבון ה-Cloudflare Pages שלך ותגרור את תיקיית חמשת הדפים פנימה. תמתין לסיום ההעלאה, בדרך כלל דקה או שתיים. תיכנס לכתובת הזמנית שנוצרה, ותוודא שהאתר באמת נטען.',
           ['דומיין', 'Cloudflare', 'אחסון'], module_line='מודול 5 — האתר באוויר, ומחובר לגוגל'),
    lesson('website-lesson-16', 16,
           'שיעור 3: לחבר את הדומיין: השלב שמפחיד את כולם ולוקח חמש דקות',
           'חיבור דומיין = עדכון נתבי שם ברמת "ספר הטלפונים" של האינטרנט, לא נגיעה באתר עצמו. '
           'חמש דקות קליק, ואחר כך תפוצה שיכולה לקחת מדקות עד שעות — וזה נורמלי',
           'תיכנס לפרויקט שלך ב-Cloudflare Pages ותעתיק משם את פרטי החיבור. תיכנס לאתר הרישום של הדומיין ותעדכן שם את הפרטים. תסגור את המחשב, ותבדוק שוב מחר בבוקר.',
           ['דומיין', 'Cloudflare', 'DNS'], module_line='מודול 5 — האתר באוויר, ומחובר לגוגל'),
    lesson('website-lesson-17', 17,
           'שיעור 4: המסך שמראה לך מה גוגל באמת חושב על האתר שלך',
           'אימות בעלות מיידי ב-Google Search Console, ולוח שמראה מה גוגל רואה באתר שלך. '
           'שלושה מספרים שכדאי לעקוב אחריהם: חשיפות, קליקים וכיסוי. אימות בעלות מיידי, נתוני ביצועים יכולים לקחת כמה ימים להופיע',
           'תיכנס ל-Google Search Console עם חשבון גוגל שלך. תוסיף את הדומיין שלך כמאגר חדש, ותבצע את שלב האימות לפי השיטה שמוצעת לך. תאתר את לשונית ״ביצועים״ ואת לשונית ״כיסוי״.',
           ['Search Console', 'דומיין'], module_line='מודול 5 — האתר באוויר, ומחובר לגוגל'),
    lesson('website-lesson-18', 18,
           'שיעור 5: גוגל עוד לא יודע שאתה קיים. ככה מזרזים אותו',
           'שליחת מפת אתר ובקשת אינדוקס ב-Search Console כדי לזרז את הגילוי. '
           'הבהרה חשובה: זה לא מבטיח דירוג גבוה, וזה בטח לא מבטיח שמנועי AI יצטטו אותך כבר מחר',
           'תיכנס ל-Search Console ותשלח את כתובת מפת האתר שלך בלשונית המתאימה. תיכנס ל״בדיקת כתובת URL״, תבדוק את עמוד הבית שלך ותבקש עבורו אינדוקס.',
           ['Search Console', 'אינדוקס'], module_line='מודול 5 — האתר באוויר, ומחובר לגוגל'),
    # ── Module 6 — Update & Maintenance ──
    lesson('website-lesson-19', 19,
           'שיעור 1: לעדכן את האתר בשיחה — כמו לשלוח הודעה לעובד',
           'הלולאה בת שלושה שלבים לעדכון האתר החי שלך: לתאר את השינוי בעברית פשוטה, '
           'ה-AI עורך את הקובץ, ואתה מעלה מחדש באותה גרירה ממודול 5. כולל נוסחת הניסוח שמונעת מה-AI לשנות את כל העיצוב בטעות',
           'תבחר עדכון אמיתי אחד שהאתר שלך צריך עכשיו. תכתוב שורה אחת לפי הנוסחה: מה לעדכן, איפה, ואל תיגע בשאר. תשלח ל-AI ותבדוק שהעדכון נכנס נכון. תעלה מחדש, באותה גרירה ממודול 5. תבדוק באתר החי שהשינוי אכן מופיע.',
           ['תחזוקת אתר'], module_line='מודול 6 — האתר חי, ואתה עסוק'),
    lesson('website-lesson-20', 20,
           'שיעור 2: רבע שעה בחודש ששומרת על המקום שלך בגוגל',
           'צ׳ק ליסט תחזוקה בן ארבעה שלבים: בדיקת חיפושים חדשים ב-Search Console, '
           'איתור שאלה שחוזרת על עצמה, הוספת שאלה ותשובה, ומעבר מהיר על האתר. בלי כלים חדשים, רק שימוש חוזר במה שכבר למדת',
           'תיכנס ל-Search Console שלך ותבדוק אם יש חיפוש שחוזר על עצמו יותר מפעם אחת. אם כן, תוסיף לו שאלה ותשובה אחת עכשיו. תעבור על האתר בעין, לוודא שכלום לא שבור. תוריד את הצ׳ק ליסט מקישור השיעור — תשתמש בו שוב, כל חודש.',
           ['תחזוקת אתר', 'Search Console'], module_line='מודול 6 — האתר חי, ואתה עסוק'),
    lesson('website-lesson-21', 21,
           'שיעור 3: מתי כדאי להפסיק לעשות את זה לבד — והתשובה מפתיעה',
           'מסגרת הערכה עצמית בת שלוש שאלות שעוזרת להחליט אם להמשיך בעצמך או להעביר את התחזוקה הלאה. '
           'סיכום מלא של כל מה שבנית לאורך שישה מודולים, וכניסה לניסיון בבוט האתר של WAO',
           'תוריד את דף ההערכה העצמית מקישור השיעור. תענה על שלוש השאלות בכנות מלאה: כמה זמן פנוי יש לך בחודש, כמה בנוח לך עם הכלים, ובאיזה שלב צמיחה העסק שלך נמצא. תראה לאן התשובות שלך מובילות.',
           ['תחזוקת אתר'], module_line='מודול 6 — האתר חי, ואתה עסוק'),
]


# ── Auth ──────────────────────────────────────────────────────────────────────

def get_youtube():
    creds = None
    if os.path.exists(TOKEN_CACHE):
        try:
            creds = Credentials.from_authorized_user_file(TOKEN_CACHE, SCOPES)
        except Exception as e:
            print(f'Warning: could not load token cache: {e}')

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            try:
                creds.refresh(Request())
            except Exception:
                creds = None

        if not creds:
            if not os.path.exists(CLIENT_SECRETS):
                print(f'Error: {CLIENT_SECRETS} not found.')
                sys.exit(1)
            flow = InstalledAppFlow.from_client_secrets_file(CLIENT_SECRETS, SCOPES)
            creds = flow.run_local_server(port=0, open_browser=False)

        os.makedirs(os.path.dirname(TOKEN_CACHE), exist_ok=True)
        with open(TOKEN_CACHE, 'w') as f:
            f.write(creds.to_json())

    return build('youtube', 'v3', credentials=creds)


def assert_wao_channel(yt):
    """Hard gate: refuse to upload unless the token resolves to the WAO channel."""
    res = yt.channels().list(part='snippet', mine=True).execute()
    channels = res.get('items', [])
    if not channels:
        print('ABORT: token resolves to no channel.')
        sys.exit(2)
    ch = channels[0]
    if ch['id'] != EXPECTED_CHANNEL_ID:
        print(f"ABORT: token resolves to '{ch['snippet']['title']}' ({ch['id']}) — "
              f'expected WAO channel {EXPECTED_CHANNEL_ID}. Re-auth with the WAO account.')
        sys.exit(2)
    print(f"Channel confirmed: {ch['snippet']['title']} ({ch['id']})")


# ── Playlist ──────────────────────────────────────────────────────────────────

def get_or_create_playlist(yt):
    """Return the playlist ID for the website course, creating it if needed."""
    res = yt.playlists().list(part='snippet', mine=True, maxResults=50).execute()
    for item in res.get('items', []):
        if item['snippet']['title'] == PLAYLIST_TITLE:
            pid = item['id']
            print(f'Found existing playlist: {pid}')
            return pid
    # Create new
    res = yt.playlists().insert(
        part='snippet,status',
        body={
            'snippet': {'title': PLAYLIST_TITLE, 'description': PLAYLIST_DESC, 'defaultLanguage': 'iw'},
            'status': {'privacyStatus': 'public'},
        }
    ).execute()
    pid = res['id']
    print(f'Created playlist: {pid}')
    return pid


def add_to_playlist(yt, playlist_id, video_id):
    yt.playlistItems().insert(
        part='snippet',
        body={'snippet': {
            'playlistId': playlist_id,
            'resourceId': {'kind': 'youtube#video', 'videoId': video_id},
        }}
    ).execute()
    print(f'  Added {video_id} to playlist.')


# ── Upload ────────────────────────────────────────────────────────────────────

def upload_video(yt, lesson):
    path = lesson['video']
    if not os.path.exists(path):
        print(f'  ERROR: video file not found: {path}')
        return None

    print(f'  Uploading {path} …')
    body = {
        'snippet': {
            'title': lesson['title'],
            'description': lesson['description'],
            'tags': lesson['tags'],
            'categoryId': '27',        # Education
            'defaultLanguage': 'iw',
        },
        'status': {
            'privacyStatus': 'public',
            'embeddable': True,
            'selfDeclaredMadeForKids': False,
        },
    }
    media = MediaFileUpload(path, chunksize=1024 * 1024, resumable=True, mimetype='video/mp4')
    req = yt.videos().insert(part='snippet,status', body=body, media_body=media)

    response = None
    while response is None:
        status, response = req.next_chunk()
        if status:
            print(f'  {int(status.progress() * 100)}%…', end='\r')

    video_id = response['id']
    print(f'  Upload complete → videoId: {video_id}')
    return video_id


def upload_thumbnail(yt, video_id, thumb_path, thumbnail_quota_used):
    """Upload thumbnail — non-fatal if quota (~10/24h) is exceeded."""
    if thumbnail_quota_used >= 10:
        print(f'  SKIP thumbnail (quota ~10/24h reached). Manual fallback: {thumb_path}')
        return thumbnail_quota_used

    if not os.path.exists(thumb_path):
        print(f'  SKIP thumbnail — file not found: {thumb_path}')
        return thumbnail_quota_used

    mimetype = 'image/jpeg' if thumb_path.lower().endswith(('.jpg', '.jpeg')) else 'image/png'
    try:
        yt.thumbnails().set(
            videoId=video_id,
            media_body=MediaFileUpload(thumb_path, mimetype=mimetype)
        ).execute()
        print(f'  Thumbnail uploaded.')
        return thumbnail_quota_used + 1
    except HttpError as e:
        print(f'  WARNING: thumbnail upload failed ({e}). Local path: {thumb_path}')
        return thumbnail_quota_used


# ── website-course-data.ts patch ─────────────────────────────────────────────

def patch_course_data(slug, video_id):
    """Swap videoSrc → videoId for the given slug in website-course-data.ts."""
    with open(COURSE_DATA, 'r', encoding='utf-8') as f:
        src = f.read()

    # Match the lesson block for this slug and replace videoSrc with videoId
    old = re.search(
        rf'(slug:\s*"{re.escape(slug)}".*?)(videoSrc:\s*"[^"]*")',
        src, re.DOTALL
    )
    if not old:
        print(f'  WARNING: could not find videoSrc for {slug} in {COURSE_DATA} — update manually.')
        return

    new_src = src[:old.start(2)] + f'videoId: "{video_id}"' + src[old.end(2):]
    with open(COURSE_DATA, 'w', encoding='utf-8') as f:
        f.write(new_src)
    print(f'  {COURSE_DATA}: videoSrc → videoId ({video_id})')


# ── Main ──────────────────────────────────────────────────────────────────────

def already_uploaded(slug):
    """Return True if this slug already has a videoId in course data."""
    with open(COURSE_DATA, 'r', encoding='utf-8') as f:
        src = f.read()
    block = re.search(rf'slug:\s*"{re.escape(slug)}".*?(?=slug:|$)', src, re.DOTALL)
    if not block:
        return False
    return 'videoId:' in block.group(0)


def main():
    parser = argparse.ArgumentParser(description='Upload website course lessons to YouTube (WAO channel).')
    parser.add_argument('--slug', help='Upload only this slug (e.g. website-lesson-6)')
    parser.add_argument('--force', action='store_true',
                        help='Upload even if the slug already has a videoId (re-upload path)')
    parser.add_argument('--max', type=int, default=6,
                        help='Max uploads this run (YouTube quota: 1,600 units/insert of 10,000/day)')
    args = parser.parse_args()

    lessons = LESSONS
    if args.slug:
        lessons = [l for l in LESSONS if l['slug'] == args.slug]
        if not lessons:
            print(f'Error: slug "{args.slug}" not found in LESSONS list.')
            sys.exit(1)

    # Skip already-uploaded (unless --force)
    if args.force:
        pending = lessons
    else:
        pending = [l for l in lessons if not already_uploaded(l['slug'])]
    if not pending:
        print('All lessons already have a videoId — nothing to upload.')
        sys.exit(0)

    pending = pending[:args.max]
    print(f'Lessons to upload (max {args.max}/day): {[l["slug"] for l in pending]}\n')

    yt = get_youtube()
    assert_wao_channel(yt)
    playlist_id = get_or_create_playlist(yt)
    thumbnail_quota_used = 0

    for lesson in pending:
        print(f'\n── {lesson["slug"]} ──')
        video_id = upload_video(yt, lesson)
        if not video_id:
            print(f'  FAILED — skipping remaining steps for this lesson.')
            continue

        time.sleep(2)  # brief pause before thumbnail
        thumbnail_quota_used = upload_thumbnail(yt, video_id, lesson['thumbnail'], thumbnail_quota_used)
        add_to_playlist(yt, playlist_id, video_id)
        patch_course_data(lesson['slug'], video_id)
        print(f'  ✓ {lesson["slug"]} done → https://youtu.be/{video_id}')

    print('\nAll done. Run Roni to verify lesson pages now embed YouTube videoId.')


if __name__ == '__main__':
    main()
