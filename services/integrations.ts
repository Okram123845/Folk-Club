
// SERVICES/INTEGRATIONS.TS
// This file contains the logic to connect to real-world APIs.

// --- EMAIL CONFIGURATION (EmailJS) ---
const EMAILJS_CONFIG = {
  SERVICE_ID: 'YOUR_SERVICE_ID',   
  TEMPLATE_ID: 'YOUR_TEMPLATE_ID', 
  RSVP_TEMPLATE_ID: 'YOUR_RSVP_TEMPLATE_ID', 
  PUBLIC_KEY: 'YOUR_PUBLIC_KEY'    
};

// --- SMS CONFIGURATION (Twilio) ---
const TWILIO_CONFIG = {
  ACCOUNT_SID: 'YOUR_SID',
  AUTH_TOKEN: 'YOUR_TOKEN',
  FROM_NUMBER: '+15550000000'
};

export const sendRealEmail = async (data: { name: string; email: string; message: string }) => {
  if (EMAILJS_CONFIG.PUBLIC_KEY === 'YOUR_PUBLIC_KEY') {
    console.warn('[EMAIL SERVICE] Missing API Keys. Logged to console instead:', data);
    return { status: 200, text: 'Mock Success' };
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
    throw new Error('Failed to send email');
  }
  return response;
};

export const sendRSVPConfirmation = async (
  user: { name: string; email: string; phone?: string }, 
  event: { title: string; date: string; time: string; location: string }
) => {
  console.log(`[NOTIFICATION SYSTEM] Processing RSVP for ${user.name}...`);

  // 1. Send Email
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
  } else {
    console.log(`📧 [MOCK EMAIL] To: ${user.email} | Subject: Confirmation for ${event.title}`);
  }

  // 2. Send SMS (if phone number exists)
  if (user.phone) {
      console.log(`📱 [MOCK SMS] To: ${user.phone} | Message: "RFC Confirmation: You are booked for ${event.title}."`);
  }
};

// --- INSTAGRAM CONFIGURATION ---
const INSTAGRAM_CONFIG = {
  ACCESS_TOKEN: 'YOUR_IG_ACCESS_TOKEN' 
};

export const fetchRealInstagramPosts = async () => {
  if (INSTAGRAM_CONFIG.ACCESS_TOKEN === 'YOUR_IG_ACCESS_TOKEN') {
    console.warn('[INSTAGRAM SERVICE] Missing Access Token. Using mock data.');
    throw new Error('No Access Token');
  }

  const response = await fetch(
    `https://graph.instagram.com/me/media?fields=id,caption,media_type,media_url,permalink,thumbnail_url&access_token=${INSTAGRAM_CONFIG.ACCESS_TOKEN}`
  );

  if (!response.ok) {
    throw new Error('Failed to fetch from Instagram');
  }

  const data = await response.json();
  return data.data; 
};

// --- TRANSLATION SERVICE (FREE API) ---
// Uses MyMemory API (Free anonymous usage up to 5000 chars/day)
export const translateText = async (text: string, targetLang: string): Promise<string> => {
  if (!text) return '';

  // MyMemory requires source language. We assume input is English ('en') or detect roughly.
  // Format: en|ro (English to Romanian)
  const sourceLang = 'en'; 
  const langPair = `${sourceLang}|${targetLang}`;
  
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${langPair}`;
    
    const response = await fetch(url);
    const data = await response.json();

    if (data.responseStatus === 200) {
        return data.responseData.translatedText;
    } else {
        console.warn("MyMemory API Warning:", data.responseDetails);
        // If API limit reached, fallback to simple copy
        return text;
    }
  } catch (e) {
    console.error("Translation API Error (MyMemory):", e);
    // Fallback: Return original text so the field isn't empty
    return text;
  }
};
