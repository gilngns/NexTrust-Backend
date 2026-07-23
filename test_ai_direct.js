const payload = {
  campaign_id: "draft",
  campaign_type: "PEMBANGUNAN",
  campaign_title: "Draft",
  campaign_description: "Draft",
  location: "Unknown",
  duration_days: 30,
  items: [
    {
      id: "item-0",
      name: "Semen",
      quantity: 10,
      unit: "sak",
      unit_price: 50000,
      subtotal: 500000
    }
  ]
};

async function test() {
  const res = await fetch("https://nextrust.my.id/ai/api/v1/plan-milestones", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Internal-Token": "4dfdd2f8bd4d2765cb003ea0eb0195e2b8692392d10ea2ce0ba247fb7e318ba7"
    },
    body: JSON.stringify(payload)
  });
  console.log(res.status);
  const data = await res.text();
  console.log(data);
}
test();
