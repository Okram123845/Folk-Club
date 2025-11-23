// SERVICES/INTEGRATIONS.TS
// This file contains the ACTUAL logic to connect to real-world APIs.
// To make this work, you need to register for services and get API keys.

// --- EMAIL CONFIGURATION (EmailJS) ---
// 1. Go to https://www.emailjs.com/ and create a free account.
// 2. Create a 'Service' (e.g., Gmail).
// 3. Create a 'Template' (with variables {{name}}, {{email}}, {{message}}).
// 4. Get your Public Key, Service ID, and Template ID.

const EMAILJS_CONFIG = {
  SERVICE_ID: 'YOUR_SERVICE_ID',   // e.g., 'service_x82js9a'
  TEMPLATE_ID: 'YOUR_TEMPLATE_ID', // e.g., 'template_9s83k2s'
  PUBLIC_KEY: 'YOUR_PUBLIC_KEY'    // e.g., 'user_92ks82...'
};

export const sendRealEmail = async (data: { name: string; email: string; message: string }) => {
  // If keys are not set, log and return (Development Mode)
  if (EMAILJS_CONFIG.PUBLIC_KEY === 'YOUR_PUBLIC_KEY') {
    console.warn('[EMAIL SERVICE] Missing API Keys. Logged to console instead:', data);
    return { status: 200, text: 'Mock Success' };
  }

  // Actual API Call to EmailJS
  const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
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


// --- INSTAGRAM CONFIGURATION (Instagram Basic Display API) ---
// 1. Go to https://developers.facebook.com/
// 2. Create an App > Select "Consumer" or "Something Else" > "Basic Display".
// 3. Add a Test User (your instagram account).
// 4. Generate a "Long-Lived Access Token" in the User Token Generator.

const INSTAGRAM_CONFIG = {
  ACCESS_TOKEN: 'YOUR_IG_ACCESS_TOKEN' // Very long string starting with IG...
};

export const fetchRealInstagramPosts = async () => {
  // If key is not set, throw error to trigger mock fallback
  if (INSTAGRAM_CONFIG.ACCESS_TOKEN === 'YOUR_IG_ACCESS_TOKEN') {
    console.warn('[INSTAGRAM SERVICE] Missing Access Token. Using mock data.');
    throw new Error('No Access Token');
  }

  // Actual API Call to Instagram
  // Fields: id, caption, media_type, media_url, permalink, thumbnail_url
  const response = await fetch(
    `https://graph.instagram.com/me/media?fields=id,caption,media_type,media_url,permalink,thumbnail_url&access_token=${INSTAGRAM_CONFIG.ACCESS_TOKEN}`
  );

  if (!response.ok) {
    throw new Error('Failed to fetch from Instagram');
  }

  const data = await response.json();
  return data.data; // Array of posts
};
