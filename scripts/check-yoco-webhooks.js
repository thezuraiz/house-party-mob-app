const https = require('https');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env file
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  const envFile = fs.readFileSync(envPath, 'utf8');
  const envVars = {};

  envFile.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      envVars[key.trim()] = valueParts.join('=').trim();
    }
  });

  return envVars;
}

const env = loadEnv();
const YOCO_SECRET_KEY = env.YOCO_SECRET_KEY || env.YOCO_SECRET_KEY_LIVE;

if (!YOCO_SECRET_KEY) {
  console.log('❌ Error: YOCO_SECRET_KEY not found in .env file');
  process.exit(1);
}

console.log('🔍 Checking Yoco webhooks...\n');

const options = {
  hostname: 'payments.yoco.com',
  path: '/api/webhooks',
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${YOCO_SECRET_KEY}`,
    'Content-Type': 'application/json'
  }
};

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log(`Status Code: ${res.statusCode}\n`);

    if (res.statusCode === 200) {
      let response;
      try {
        response = JSON.parse(data);
      } catch (err) {
        console.log('❌ Failed to parse response:', data);
        return;
      }

      // Handle both array and object responses
      const webhooks = Array.isArray(response) ? response : (response.subscriptions || response.webhooks || []);

      console.log('Raw response:', JSON.stringify(response, null, 2));
      console.log('');

      if (webhooks.length === 0) {
        console.log('⚠️  No webhooks found');
      } else {
        console.log(`✅ Found ${webhooks.length} webhook(s):\n`);

        webhooks.forEach((webhook, index) => {
          console.log(`Webhook ${index + 1}:`);
          console.log(`  ID: ${webhook.id}`);
          console.log(`  Name: ${webhook.name}`);
          console.log(`  URL: ${webhook.url}`);
          console.log(`  Mode: ${webhook.mode}`);
          console.log(`  Status: ${webhook.status || 'active'}`);
          console.log('');
        });
      }
    } else {
      console.log('❌ Error response:');
      console.log(data);
    }
  });
});

req.on('error', (error) => {
  console.log('❌ Request failed:', error.message);
});

req.end();
