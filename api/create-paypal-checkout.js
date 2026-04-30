/*
 * ═══════════════════════════════════════════════════════════════
 *  ByteStack Labs — Create PayPal Checkout Order
 *  /api/create-paypal-checkout.js
 *  Called by: payment-method.html when user selects PayPal
 * ═══════════════════════════════════════════════════════════════
 */

const PAYPAL_CLIENT_ID     = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;
const APP_URL              = process.env.APP_URL || 'https://stormflowpro.vercel.app';

// Use sandbox for testing, live for production
const PAYPAL_BASE = process.env.PAYPAL_ENV === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

/* ── Package prices in USD ───────────────────────────────────── */
const PRICES = {
  monthly: { amount: '15.00', label: 'Monthly Plan — Tank MTO Estimator'    },
  yearly:  { amount: '120.00',label: 'Yearly Basic — Tank MTO Estimator'    },
  premium: { amount: '180.00',label: 'Yearly Premium — Tank MTO Estimator'  }
};

/* ── Get PayPal access token ─────────────────────────────────── */
async function getAccessToken() {
  const credentials = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64');
  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type':  'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });
  const data = await res.json();
  if (!data.access_token) throw new Error('Failed to get PayPal access token');
  return data.access_token;
}

/* ── Handler ─────────────────────────────────────────────────── */
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  const { package: pkg } = req.body || {};

  if (!pkg || !PRICES[pkg]) {
    return res.status(400).json({ error: `Unknown package: ${pkg}` });
  }

  try {
    const accessToken = await getAccessToken();
    const price       = PRICES[pkg];

    const orderRes = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type':  'application/json'
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          amount: {
            currency_code: 'USD',
            value: price.amount
          },
          description: price.label
        }],
        application_context: {
          brand_name:          'Tank MTO Estimator',
          landing_page:        'BILLING',
          user_action:         'PAY_NOW',
          return_url:          `${APP_URL}/payment-success`,
          cancel_url:          `${APP_URL}/payment?cancelled=1`
        }
      })
    });

    const order = await orderRes.json();

    if (!order.id) {
      console.error('[PayPal] Order creation failed:', order);
      return res.status(500).json({ error: 'Failed to create PayPal order' });
    }

    // Find the approval URL
    const approvalUrl = order.links?.find(l => l.rel === 'approve')?.href;
    if (!approvalUrl) {
      return res.status(500).json({ error: 'No approval URL in PayPal response' });
    }

    console.log(`[PayPal] Order created: ${order.id} for package: ${pkg}`);
    return res.status(200).json({ orderId: order.id, approvalUrl });

  } catch(err) {
    console.error('[PayPal] create-checkout error:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
