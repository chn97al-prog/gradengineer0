// netlify/functions/submit-order.js
// يستقبل بيانات التصميم (نص، لون، خط، بيانات الزبون، صورة PNG)
// ويرسلها إلى تيليكرام + يسجلها بصف جديد بكوكل شيتس.
// المتغيرات البيئية المطلوبة (تنضاف من Netlify > Site settings > Environment variables):
//   TELEGRAM_BOT_TOKEN        توكن البوت
//   TELEGRAM_CHAT_ID          آيدي الشات/القروب المستلم للطلبات
//   GOOGLE_SERVICE_ACCOUNT_JSON  محتوى ملف حساب خدمة كوكل بصيغة JSON (سطر واحد)
//   GOOGLE_SHEET_ID           آيدي ملف الشيت

const { google } = require('googleapis');

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const SHEET_ID = process.env.GOOGLE_SHEET_ID;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let payload;
  try {
    payload = JSON.parse(event.body);
  } catch (e) {
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  const { model, modelLabel, sashText, capText, color, font, customer, imageBase64 } = payload;

  if (!customer || !customer.name || !customer.phone) {
    return { statusCode: 400, body: 'Missing customer info' };
  }

  const caption =
    `<b>طلب جديد — تجهيزات المهندس</b>\n` +
    `الموديل: ${modelLabel || model}\n` +
    `نص الوشاح: ${escapeHtml(sashText || '-')}\n` +
    `نص القبعة: ${escapeHtml(capText || '-')}\n` +
    `اللون: ${color}\n` +
    `الخط: ${font}\n` +
    `— — —\n` +
    `الاسم: ${escapeHtml(customer.name)}\n` +
    `الهاتف: ${escapeHtml(customer.phone)}\n` +
    `الكلية/القسم: ${escapeHtml(customer.college || '-')}`;

  const results = await Promise.allSettled([
    sendTelegramPhoto(imageBase64, caption),
    appendToSheet([
      new Date().toISOString(),
      modelLabel || model,
      sashText || '',
      capText || '',
      color || '',
      font || '',
      customer.name,
      customer.phone,
      customer.college || '',
    ]),
  ]);

  const telegramFailed = results[0].status === 'rejected';
  const sheetFailed = results[1].status === 'rejected';

  if (telegramFailed) console.error('Telegram error:', results[0].reason);
  if (sheetFailed) console.error('Sheets error:', results[1].reason);

  if (telegramFailed && sheetFailed) {
    return { statusCode: 500, body: JSON.stringify({ error: 'both_failed' }) };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ ok: true, telegramFailed, sheetFailed }),
  };
};

async function sendTelegramPhoto(base64Image, caption) {
  if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT_ID) throw new Error('Telegram env vars missing');
  const base64Data = (base64Image || '').split(',')[1];
  if (!base64Data) throw new Error('No image data');
  const buffer = Buffer.from(base64Data, 'base64');

  const form = new FormData();
  form.append('chat_id', TELEGRAM_CHAT_ID);
  form.append('caption', caption);
  form.append('parse_mode', 'HTML');
  form.append('photo', new Blob([buffer], { type: 'image/png' }), 'design.png');

  const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendPhoto`, {
    method: 'POST',
    body: form,
  });
  const data = await res.json();
  if (!data.ok) throw new Error('Telegram API error: ' + JSON.stringify(data));
  return data;
}

async function appendToSheet(row) {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON || !SHEET_ID) {
    throw new Error('Google Sheets env vars missing');
  }
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  const sheets = google.sheets({ version: 'v4', auth });
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: 'Orders!A:I',
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [row] },
  });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
