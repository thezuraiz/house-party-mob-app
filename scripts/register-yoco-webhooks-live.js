const https = require('https');
require('dotenv').config();

const YOCO_SECRET_KEY = process.env.YOCO_SECRET_KEY;

if (!YOCO_SECRET_KEY) {
  console.error('❌ YOCO_SECRET_KEY not found in environment variables.');
  console.error('   Add it to your .env file: YOCO_SECRET_KEY=sk_live_...');
  process.exit(1);
}

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://qqeccmwtvjjysypahgkn.supabase.co';

const webhooks = [
  {
    name: 'houseparty-premium',
    url: `${SUPABASE_URL}/functions/v1/yoco-premium-callback`,
  },
  {
    name: 'houseparty-kit',
    url: `${SUPABASE_URL}/functions/v1/yoco-kit-callback`,
  },
];

function registerWebhook(webhook) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      name: webhook.name,
      url: webhook.url,
    });

    const options = {
      hostname: 'payments.yoco.com',
      port: 443,
      path: '/api/webhooks',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${YOCO_SECRET_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': data.length,
      },
    };

    const req = https.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          try {
            const parsed = JSON.parse(responseData);
            resolve(parsed);
          } catch (err) {
            reject(new Error(`Failed to parse response: ${err.message}`));
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${responseData}`));
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.write(data);
    req.end();
  });
}

async function main() {
  console.log('🚀 Registering Yoco Webhooks...\n');

  for (const webhook of webhooks) {
    try {
      console.log(`📝 Registering: ${webhook.name}`);
      console.log(`   URL: ${webhook.url}`);

      const result = await registerWebhook(webhook);

      console.log(`✅ Success!`);
      console.log(`   Webhook ID: ${result.id}`);
      console.log(`   Secret: ${result.secret}`);
      console.log(`\n⚠️  IMPORTANT: Save this secret! You'll need it to verify webhooks.`);
      console.log(`   Add this to your .env file:`);
      console.log(`   YOCO_WEBHOOK_SECRET_${webhook.name.toUpperCase().replace(/-/g, '_')}=${result.secret}\n`);
    } catch (error) {
      console.log(`❌ Failed to register ${webhook.name}:`);
      console.log(`   Error: ${error.message}\n`);
    }
  }

  console.log('✨ Webhook registration complete!');
}

main().catch((err) => {
  console.log('Fatal error:', err);
  process.exit(1);
});
