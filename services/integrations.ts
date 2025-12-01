
// SERVICES/INTEGRATIONS.TS
// This file contains the logic to connect to real-world APIs.

// ------------------------------------------------------------------
// 1. EMAIL CONFIGURATION (Get these from https://www.emailjs.com/)
// ------------------------------------------------------------------
const EMAILJS_CONFIG = {
  SERVICE_ID: 'YOUR_SERVICE_ID',      // e.g. "service_x90s8s"
  TEMPLATE_ID: 'YOUR_TEMPLATE_ID',    // e.g. "template_39s8s" (General Contact)
  RSVP_TEMPLATE_ID: 'YOUR_RSVP_ID',   // e.g. "template_rsvp" (Create a template with {{event_name}}, {{event_date}})
  PUBLIC_KEY: 'YOUR_PUBLIC_KEY'       // e.g. "user_9s8d7f98s7df"
};

// ------------------------------------------------------------------
// 2. SMS CONFIGURATION (Get these from https://www.twilio.com/)
// ------------------------------------------------------------------
const TWILIO_CONFIG = {
  ACCOUNT_SID: 'YOUR_TWILIO_SID',     // e.g. "ACb...123"
  AUTH_TOKEN: 'YOUR_TWILIO_TOKEN',    // e.g. "382...abc"
  FROM_NUMBER: 'YOUR_TWILIO_NUMBER'   // e.g. "+15551234567"
};

// --- EMAIL LOGIC ---
export const sendRealEmail = async (data: { name: string; email: string; message: string }) => {
  if (EMAILJS_CONFIG.PUBLIC_KEY === 'YOUR_PUBLIC_KEY') {
    console.warn('⚠️ EMAIL NOT SENT: Missing EmailJS Keys in services/integrations.ts');
    return;
  }

  const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      service_id: EMAILJS_CONFIG.SERVICE_ID,
      template_id: EMAILJS_CONFIG.TEMPLATE_ID,
      user_id: EMAILJS_CONFIG.PUBLIC_KEY,
      template_params: {
        from_name: data.name,
        reply_to: data.email,
        message: data.message,
      },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error("EmailJS Error:", err);
    throw new Error('Failed to send email');
  }
  return response;
};

// --- SMS LOGIC ---
const sendRealSms = async (to: string, body: string) => {
  if (TWILIO_CONFIG.ACCOUNT_SID === 'YOUR_TWILIO_SID') {
    console.warn('⚠️ SMS NOT SENT: Missing Twilio Keys in services/integrations.ts');
    return;
  }

  // Basic validation
  if (!to || to.length < 10) return;

  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_CONFIG.ACCOUNT_SID}/Messages.json`;
  const auth = btoa(`${TWILIO_CONFIG.ACCOUNT_SID}:${TWILIO_CONFIG.AUTH_TOKEN}`);
  
  const formData = new URLSearchParams();
  formData.append('To', to);
  formData.append('From', TWILIO_CONFIG.FROM_NUMBER);
  formData.append('Body', body);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData
    });
    
    if (!response.ok) {
       console.error("Twilio SMS Failed:", await response.text());
    }
  } catch (e) {
    console.error("SMS Network Error:", e);
  }
};

// --- COMBINED NOTIFICATION ---
export const sendRSVPConfirmation = async (
  user: { name: string; email: string; phone?: string }, 
  event: { title: string; date: string; time: string; location: string }
) => {
  console.log(`[NOTIFICATION] Sending RSVP confirmation to ${user.name}`);

  // 1. Send Email via EmailJS
  if (EMAILJS_CONFIG.PUBLIC_KEY !== 'YOUR_PUBLIC_KEY') {
    await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id: EMAILJS_CONFIG.SERVICE_ID,
        template_id: EMAILJS_CONFIG.RSVP_TEMPLATE_ID,
        user_id: EMAILJS_CONFIG.PUBLIC_KEY,
        template_params: {
          to_name: user.name,
          to_email: user.email,
          event_name: event.title,
          event_date: event.date,
          event_time: event.time,
          event_location: event.location
        },
      }),
    });
  }

  // 2. Send SMS via Twilio (if phone exists)
  if (user.phone && TWILIO_CONFIG.ACCOUNT_SID !== 'YOUR_TWILIO_SID') {
      const message = `Confirmation: You are booked for ${event.title} on ${event.date} at ${event.time}. Location: ${event.location}. - RK Folk Club`;
      await sendRealSms(user.phone, message);
  }
};

// --- INSTAGRAM CONFIGURATION ---
const INSTAGRAM_CONFIG = {
  ACCESS_TOKEN: 'YOUR_IG_ACCESS_TOKEN' 
};

export const fetchRealInstagramPosts = async () => {
  if (INSTAGRAM_CONFIG.ACCESS_TOKEN === 'YOUR_IG_ACCESS_TOKEN') {
    return []; // Return empty if not configured
  }

  const response = await fetch(
    `https://graph.instagram.com/me/media?fields=id,caption,media_type,media_url,permalink,thumbnail_url&access_token=${INSTAGRAM_CONFIG.ACCESS_TOKEN}`
  );

  if (!response.ok) throw new Error('Failed to fetch from Instagram');
  const data = await response.json();
  return data.data; 
};

// --- TRANSLATION SERVICE (FREE API) ---
export const translateText = async (text: string, targetLang: string): Promise<string> => {
  if (!text) return '';
  const sourceLang = 'en'; 
  const langPair = `${sourceLang}|${targetLang}`;
  
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${langPair}`;
    const response = await fetch(url);
    const data = await response.json();
    if (data.responseStatus === 200) return data.responseData.translatedText;
    return text;
  } catch (e) {
    return text;
  }
};
