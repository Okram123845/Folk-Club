
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
// 2. FREE SMS GATEWAYS (Canadian Carriers)
// Instead of paying for SMS, we email the carrier's gateway.
// ------------------------------------------------------------------
const CARRIER_GATEWAYS: { [key: string]: string } = {
  'rogers': 'pcs.rogers.com',
  'bell': 'txt.bell.ca',
  'telus': 'msg.telus.com',
  'fido': 'fido.ca',
  'virgin': 'vmobile.ca',
  'koodo': 'msg.koodomobile.com',
  'freedom': 'txt.freedommobile.ca',
  'chatr': 'pcs.chatrwireless.com'
};

// --- BROWSER NOTIFICATIONS (Free SMS Alternative) ---
export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) return false;
  
  if (Notification.permission === 'granted') return true;
  
  const permission = await Notification.requestPermission();
  return permission === 'granted';
};

export const sendLocalNotification = (title: string, body: string) => {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  try {
    // Mobile devices often require a service worker for "push", 
    // but the Notification API works for local alerts while the app is open/backgrounded in many browsers.
    new Notification(title, {
      body: body,
      icon: '/vite.svg', // Default icon
      badge: '/vite.svg',
      vibrate: [200, 100, 200]
    } as any);
  } catch (e) {
    console.error("Notification Error:", e);
  }
};

// --- EMAIL LOGIC ---
export const sendRealEmail = async (data: { name: string; email: string; message: string }, toEmail?: string) => {
  if (EMAILJS_CONFIG.PUBLIC_KEY === 'YOUR_PUBLIC_KEY') {
    console.warn('⚠️ EMAIL NOT SENT: Missing EmailJS Keys in services/integrations.ts');
    return;
  }

  // If 'toEmail' is provided, we override who it goes to (e.g., sending to SMS gateway)
  const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      service_id: EMAILJS_CONFIG.SERVICE_ID,
      template_id: EMAILJS_CONFIG.TEMPLATE_ID,
      user_id: EMAILJS_CONFIG.PUBLIC_KEY,
      template_params: {
        to_email: toEmail || data.email, // Use this variable in EmailJS template
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

// --- COMBINED NOTIFICATION ---
export const sendRSVPConfirmation = async (
  user: { name: string; email: string; phone?: string; carrier?: string }, 
  event: { title: string; date: string; time: string; location: string }
) => {
  console.log(`[NOTIFICATION] Sending RSVP confirmation to ${user.name}`);

  // 1. Send Browser Notification (Instant, Free, No Setup)
  sendLocalNotification(
    "RSVP Confirmed! ✅", 
    `You are going to ${event.title} on ${event.date}. See you there!`
  );

  if (EMAILJS_CONFIG.PUBLIC_KEY === 'YOUR_PUBLIC_KEY') return;

  // 2. Send Email via EmailJS (Standard Email)
  await fetch('https://api.emailjs.com/api/v1.0/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      service_id: EMAILJS_CONFIG.SERVICE_ID,
      template_id: EMAILJS_CONFIG.RSVP_TEMPLATE_ID,
      user_id: EMAILJS_CONFIG.PUBLIC_KEY,
      template_params: {
        to_email: user.email,
        to_name: user.name,
        event_name: event.title,
        event_date: event.date,
        event_time: event.time,
        event_location: event.location
      },
    }),
  }).catch(e => console.error("Email Failed", e));

  // 3. Send SMS via FREE Email Gateway (If carrier is selected)
  if (user.phone && user.carrier && CARRIER_GATEWAYS[user.carrier]) {
      // Format number: remove dashes/spaces
      const cleanNumber = user.phone.replace(/\D/g, '');
      if (cleanNumber.length >= 10) {
          const smsEmail = `${cleanNumber}@${CARRIER_GATEWAYS[user.carrier]}`;
          const message = `RSVP Confirmed: ${event.title} on ${event.date} @ ${event.time}. - RK Folk Club`;
          
          // We reuse EmailJS to send this "text"
          await fetch('https://api.emailjs.com/api/v1.0/email/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              service_id: EMAILJS_CONFIG.SERVICE_ID,
              template_id: EMAILJS_CONFIG.TEMPLATE_ID, // Use a simple template for SMS
              user_id: EMAILJS_CONFIG.PUBLIC_KEY,
              template_params: {
                to_email: smsEmail, // Sending to 1234567890@msg.telus.com
                from_name: "RK Folk Club",
                message: message
              },
            }),
          }).then(() => console.log(`SMS sent to ${smsEmail}`))
            .catch(e => console.error("SMS Gateway Failed", e));
      }
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
export const translateText = async (text: string, targetLang: string, sourceLang: string = 'en'): Promise<string> => {
  if (!text) return '';
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

// --- CALENDAR INTEGRATION ---

export const getGoogleCalendarUrl = (event: any, description: string) => {
  const formatDate = (dateStr: string, timeStr: string) => {
    if (!dateStr || !timeStr) return '';
    return `${dateStr.replace(/-/g, '')}T${timeStr.replace(/:/g, '')}00`;
  };

  const startDateTime = formatDate(event.date, event.time);
  let endDateTime = '';
  
  if (event.endTime) {
      endDateTime = formatDate(event.date, event.endTime);
  } else {
      // Default duration: 2 hours
      try {
        const d = new Date(`${event.date}T${event.time}`);
        d.setHours(d.getHours() + 2);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        endDateTime = `${year}${month}${day}T${hours}${minutes}00`;
      } catch (e) {
        endDateTime = startDateTime; 
      }
  }

  const details = encodeURIComponent(description || '');
  const location = encodeURIComponent(event.location || '');
  const text = encodeURIComponent(event.title || 'Event');
  
  // ctz=America/Toronto enforces EST/EDT
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${startDateTime}/${endDateTime}&details=${details}&location=${location}&ctz=America/Toronto`;
};

// Legacy ICS generator (can still be used if needed)
export const generateEventICS = (event: any, description: string) => {
  const formatDate = (dateStr: string, timeStr: string) => {
    if (!dateStr || !timeStr) return '';
    const cleanDate = dateStr.replace(/-/g, '');
    const cleanTime = timeStr.replace(/:/g, '') + '00';
    return `${cleanDate}T${cleanTime}`;
  };

  const startDateTime = formatDate(event.date, event.time);
  let endDateTime = '';
  if (event.endTime) {
      endDateTime = formatDate(event.date, event.endTime);
  } else {
      try {
        const d = new Date(`${event.date}T${event.time}`);
        d.setHours(d.getHours() + 2);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        endDateTime = `${year}${month}${day}T${hours}${minutes}00`;
      } catch (e) {
        endDateTime = startDateTime; 
      }
  }

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Romanian Kitchener Folk Club//Events//EN',
    'BEGIN:VEVENT',
    `UID:${Date.now()}@rkfolkclub.com`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
    `DTSTART:${startDateTime}`,
    `DTEND:${endDateTime}`,
    `SUMMARY:${event.title}`,
    `DESCRIPTION:${description ? description.replace(/\\n/g, '\\n') : ''}`,
    `LOCATION:${event.location}`,
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  link.href = window.URL.createObjectURL(blob);
  link.setAttribute('download', `${event.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
