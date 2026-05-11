#!/usr/bin/env node

/**
 * Register YOCO Webhooks
 *
 * This script registers the required webhooks with YOCO's API.
 * Run this once to set up your webhooks.
 *
 * Usage:
 *   node scripts/register-yoco-webhooks.js YOUR_YOCO_SECRET_KEY
 */

const SUPABASE_URL = 'https://qqeccmwtvjjysypahgkn.supabase.co';

async function registerWebhook(name, url, yocoSecretKey) {
  console.log(`\nRegistering webhook: ${name}`);
  console.log(`URL: ${url}`);

  try {
    const response = await fetch('https://payments.yoco.com/api/webhooks', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${yocoSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        url,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.log(`❌ Failed to register ${name}:`, data);
      return null;
    }

    console.log(`✅ Successfully registered ${name}`);
    console.log(`   Webhook ID: ${data.id}`);
    console.log(`   Secret: ${data.secret}`);
    console.log(`   ⚠️  IMPORTANT: Save this secret - it's only shown once!`);

    return data;
  } catch (error) {
    console.log(`❌ Error registering ${name}:`, error.message);
    return null;
  }
}

async function listWebhooks(yocoSecretKey) {
  console.log('\nFetching existing webhooks...');

  try {
    const response = await fetch('https://payments.yoco.com/api/webhooks', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${yocoSecretKey}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.log('❌ Failed to fetch webhooks:', data);
      return;
    }

    console.log('\nExisting webhooks:');
    if (data.length === 0) {
      console.log('  No webhooks registered');
    } else {
      data.forEach((webhook) => {
        console.log(`  - ${webhook.name} (${webhook.id})`);
        console.log(`    URL: ${webhook.url}`);
        console.log(`    Status: ${webhook.status}`);
      });
    }
  } catch (error) {
    console.log('❌ Error fetching webhooks:', error.message);
  }
}

async function main() {
  const yocoSecretKey = process.argv[2];

  if (!yocoSecretKey) {
    console.log('❌ Error: YOCO secret key is required');
    console.log('\nUsage:');
    console.log('  node scripts/register-yoco-webhooks.js YOUR_YOCO_SECRET_KEY');
    console.log('\nExample:');
    console.log('  node scripts/register-yoco-webhooks.js sk_live_xxxxxxxxxxxxx');
    process.exit(1);
  }

  if (!yocoSecretKey.startsWith('sk_live_') && !yocoSecretKey.startsWith('sk_test_')) {
    console.log('❌ Error: Invalid YOCO secret key format');
    console.log('   Secret key should start with sk_live_ or sk_test_');
    process.exit(1);
  }

  console.log('='.repeat(60));
  console.log('YOCO Webhook Registration');
  console.log('='.repeat(60));

  // List existing webhooks first
  await listWebhooks(yocoSecretKey);

  console.log('\n' + '='.repeat(60));
  console.log('Registering new webhooks...');
  console.log('='.repeat(60));

  // Register webhooks
  const webhooks = [
    {
      name: 'houseparty-premium-callback',
      url: `${SUPABASE_URL}/functions/v1/yoco-premium-callback`,
    },
    {
      name: 'houseparty-kit-callback',
      url: `${SUPABASE_URL}/functions/v1/yoco-kit-callback`,
    },
  ];

  const results = [];
  for (const webhook of webhooks) {
    const result = await registerWebhook(webhook.name, webhook.url, yocoSecretKey);
    if (result) {
      results.push(result);
    }
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n' + '='.repeat(60));
  console.log('Registration Complete');
  console.log('='.repeat(60));

  if (results.length > 0) {
    console.log('\n⚠️  IMPORTANT: Save these webhook secrets securely!');
    console.log('You will need them to verify webhook signatures.');
    console.log('\nWebhook Secrets:');
    results.forEach((result, index) => {
      console.log(`\n${webhooks[index].name}:`);
      console.log(`  Secret: ${result.secret}`);
    });
  }

  console.log('\n✅ All done! Your webhooks are now registered with YOCO.');
  console.log('\nNext steps:');
  console.log('1. Save the webhook secrets shown above');
  console.log('2. Test a payment to verify the webhooks are working');
  console.log('3. Check the Edge Function logs to see webhook events');
}

main().catch((error) => {
  console.log('❌ Unexpected error:', error);
  process.exit(1);
});
