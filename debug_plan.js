// use native fetch

async function run() {
  const payload = {
    campaign_id: "draft",
    campaign_type: "PEMBANGUNAN",
    campaign_title: "Test",
    campaign_description: "Test",
    location: "Unknown",
    items: [
      { id: "item-0", name: "Semen", quantity: 10, unit: "sak", unit_price: 50000, subtotal: 500000 }
    ]
  };
  try {
    const res = await fetch("https://nextrust.my.id/ai/api/v1/validate-rab", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    console.log("Status:", res.status);
    const text = await res.text();
    console.log("Response:", text);
  } catch(e) {
    console.error(e);
  }
}
run();
