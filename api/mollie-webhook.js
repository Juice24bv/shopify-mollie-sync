export default async function handler(req, res) {
  if (req.method !== 'POST') {
    console.log('❌ Webhook: Method not allowed');
    return res.status(405).send('Method Not Allowed');
  }

  const mollie = req.body;
  console.log('✅ Webhook HIT');
  console.log('📦 Received body:', JSON.stringify(mollie, null, 2));

  const {
    id: payment_id,
    customerId: mollie_customer_id,
    mandateId: mandate_id,
    sequenceType: sequence,
    metadata
  } = mollie;

  if (!metadata || !metadata.shopify_customer_id || !metadata.shopify_order_id) {
    console.log('❌ Webhook: Incomplete metadata');
    return res.status(400).json({ error: 'Incomplete metadata' });
  }

  const { shopify_customer_id, shopify_order_id } = metadata;

  const shopifyToken = process.env.SHOPIFY_ADMIN_API_TOKEN;
  const shopifyStore = process.env.SHOPIFY_STORE_DOMAIN;
  const apiVersion = '2023-10';

  const headers = {
    'Content-Type': 'application/json',
    'X-Shopify-Access-Token': shopifyToken
  };

  try {
    // 🧠 Write metafields to CUSTOMER
    await fetch(`https://${shopifyStore}/admin/api/${apiVersion}/customers/${shopify_customer_id}/metafields.json`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        metafield: {
          namespace: 'mollie',
          key: 'customer_id',
          value: mollie_customer_id,
          type: 'single_line_text_field'
        }
      })
    });

    await fetch(`https://${shopifyStore}/admin/api/${apiVersion}/customers/${shopify_customer_id}/metafields.json`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        metafield: {
          namespace: 'mollie',
          key: 'mandate_id',
          value: mandate_id || '',
          type: 'single_line_text_field'
        }
      })
    });

    // 🧾 Write metafields to ORDER
    await fetch(`https://${shopifyStore}/admin/api/${apiVersion}/orders/${shopify_order_id}/metafields.json`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        metafield: {
          namespace: 'mollie',
          key: 'payment_id',
          value: payment_id,
          type: 'single_line_text_field'
        }
      })
    });

    await fetch(`https://${shopifyStore}/admin/api/${apiVersion}/orders/${shopify_order_id}/metafields.json`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        metafield: {
          namespace: 'mollie',
          key: 'sequence',
          value: sequence,
          type: 'single_line_text_field'
        }
      })
    });

    console.log('✅ Metafields written to customer and order');

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('❌ Webhook Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
