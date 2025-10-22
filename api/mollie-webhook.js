export default async function handler(req, res) {
if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

const mollie = req.body;
const { shopify_customer_id, shopify_order_id } = mollie.metadata || {};
const mollie_customer_id = mollie.customerId;
const mandate_id = mollie.mandateId;
const payment_id = mollie.id;
const sequence = mollie.sequenceType;

if (!shopify_customer_id || !shopify_order_id) {
return res.status(400).json({ error: 'Metadata ontbreekt' });
}

const shop = process.env.SHOPIFY_SHOP;
const token = process.env.SHOPIFY_ADMIN_TOKEN;

const headers = {
'X-Shopify-Access-Token': token,
'Content-Type': 'application/json'
};

const baseUrl = `https://${shop}.myshopify.com/admin/api/2023-10`;

const metafields = [
{
url: `${baseUrl}/customers/${shopify_customer_id}/metafields.json`,
value: mollie_customer_id,
key: 'customer_id'
},
{
url: `${baseUrl}/customers/${shopify_customer_id}/metafields.json`,
value: mandate_id,
key: 'mandate_id'
},
{
url: `${baseUrl}/orders/${shopify_order_id}/metafields.json`,
value: payment_id,
key: 'payment_id'
},
{
url: `${baseUrl}/orders/${shopify_order_id}/metafields.json`,
value: sequence,
key: 'sequence'
}
];

for (const field of metafields) {
await fetch(field.url, {
method: 'POST',
headers,
body: JSON.stringify({
metafield: {
namespace: 'mollie',
key: field.key,
value: field.value,
type: 'single_line_text_field'
}
})
});
}

}
