export default async function handler(req, res) {
  if (req.method !== 'POST') {
    console.log('❌ Method not allowed');
    return res.status(405).send('Method Not Allowed');
  }

  console.log('✅ Webhook aangeroepen');
  console.log('Body ontvangen:', JSON.stringify(req.body, null, 2));

  const mollie = req.body;
  const { shopify_customer_id, shopify_order_id } = mollie.metadata || {};
  const mollie_customer_id = mollie.customerId;
  const mandate_id = mollie.mandateId;
  const payment_id = mollie.id;
  const sequence = mollie.sequenceType;

  if (!shopify_customer_id || !shopify_order_id) {
    console.log('❌ Metadata ontbreekt');
    return res.status(400).json({ error: 'Metadata ontbreekt' });
  }

  console.log('✅ Metadata OK');
  console.log('➡️ Shopify Customer ID:', shopify_customer_id);
  console.log('➡️ Shopify Order ID:', shopify_order_id);

  // Simpel einde voor test
  return res.status(200).json({
    success: true,
    received: {
      payment_id,
      customer_id: mollie_customer_id,
      mandate_id,
      sequence,
      shopify_customer_id,
      shopify_order_id
    }
  });
}
