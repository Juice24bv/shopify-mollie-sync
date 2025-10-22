export default async function handler(req, res) {
  console.log("✅ Webhook HIT!");
  res.status(200).json({ success: true });
}
