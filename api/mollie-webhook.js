
const fetch = require('node-fetch');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    console.log('❌ Webhook: Method not allowed');
    return res.status(405).send('Method Not Allowed');
  }

  const body = req.body;
  console.log('✅ Webhook HIT');
  console.log('📦 Body:', JSON.stringify(body, null, 2));

  const {
    id: payment_id,
    customerId: mollie_customer_id,
    mandateId: mandate_id,
    sequenceType,
    metadata,
    description
  } = body;

  const shopifyToken = process.env.SHOPIFY_ADMIN_API_TOKEN;
  const shopifyStore = process.env.SHOPIFY_STORE_DOMAIN;
  const apiVersion = '2023-10';

  const headers = {
    'Content-Type': 'application/json',
    'X-Shopify-Access-Token': shopifyToken
  };

  let shopify_customer_id = metadata?.shopify_customer_id || null;
  let shopify_order_id = metadata?.shopify_order_id || null;
  let customer_email = body?.customer?.email || 'no-email@example.com';

  try {
    // ✅ 1. Zoek bestaande klant of maak nieuwe klant
    if (!shopify_customer_id) {
      const searchRes = await fetch(
        `https://${shopifyStore}/admin/api/${apiVersion}/customers/search.json?query=email:${customer_email}`,
        { method: 'GET', headers }
      );
      const searchData = await searchRes.json();
      if (searchData.customers?.length > 0) {
        shopify_customer_id = searchData.customers[0].id;
        console.log('✅ Bestaande klant gevonden:', shopify_customer_id);
      } else {
        const createCustomerRes = await fetch(
          `https://${shopifyStore}/admin/api/${apiVersion}/customers.json`,
          {
            method: 'POST',
            headers,
            body: JSON.stringify({
              customer: {
                first_name: 'Mollie',
                last_name: 'Auto',
                email: customer_email,
                verified_email: true
              }
            })
          }
        );
        const customerData = await createCustomerRes.json();
        shopify_customer_id = customerData.customer.id;
        console.log('✅ Nieuwe klant aangemaakt:', shopify_customer_id);
      }
    }

    // ✅ 2. Maak Shopify-order aan
    const createOrderRes = await fetch(
      `https://${shopifyStore}/admin/api/${apiVersion}/orders.json`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          order: {
            line_items: [
              {
                title: description || 'Mollie Subscription',
                price: body.amount?.value || '9.99',
                quantity: 1
              }
            ],
            customer: {
              id: shopify_customer_id
            },
            financial_status: 'paid'
          }
        })
      }
    );
    const orderData = await createOrderRes.json();
    shopify_order_id = orderData.order.id;
    console.log('✅ Order aangemaakt:', shopify_order_id);

    // ✅ 3. Voeg metafields toe

    const metafields = [
      {
        target: 'customers',
        id: shopify_customer_id,
        namespace: 'mollie',
        key: 'customer_id',
        value: mollie_customer_id
      },
      {
        target: 'customers',
        id: shopify_customer_id,
        namespace: 'mollie',
        key: 'mandate_id',
        value: mandate_id || ''
      },
      {
        target: 'orders',
        id: shopify_order_id,
        namespace: 'mollie',
        key: 'payment_id',
        value: payment_id
      },
      {
        target: 'orders',
        id: shopify_order_id,
        namespace: 'mollie',
        key: 'sequence',
        value: sequenceType
      }
    ];

    for (const mf of metafields) {
      const url = `https://${shopifyStore}/admin/api/${apiVersion}/${mf.target}/${mf.id}/metafields.json`;
      await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          metafield: {
            namespace: mf.namespace,
            key: mf.key,
            value: mf.value,
            type: 'single_line_text_field'
          }
        })
      });
    }

    console.log('✅ Metafields toegevoegd');
    return res.status(200).json({ success: true, shopify_customer_id, shopify_order_id });
  } catch (error) {
    console.error('❌ Fout in webhook:', error);
    return res.status(500).json({ error: 'Webhook failure' });
  }
}
