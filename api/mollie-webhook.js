export default function handler(req, res) {
  console.log("✅ Mollie test webhook HIT");
  res.status(200).json({ success: true });
}
