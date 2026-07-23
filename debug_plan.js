// use native fetch

async function run() {
  const payload = {
    campaign_id: "draft",
    campaign_type: "PEMBANGUNAN",
    campaign_title: "Test",
    campaign_description: "Test",
    location: "Unknown",
    items: [
      { id: "item-0", name: "Semen", quantity: 1, unit: "sak", unit_price: 520000, subtotal: 520000 },
      { id: "item-1", name: "Genteng", quantity: 1, unit: "biji", unit_price: 400000, subtotal: 400000 },
      { id: "item-2", name: "Kayu Reng", quantity: 1, unit: "batang", unit_price: 300000, subtotal: 300000 },
      { id: "item-3", name: "Paku", quantity: 1, unit: "kg", unit_price: 80000, subtotal: 80000 },
      { id: "item-4", name: "Upah Tukang", quantity: 1, unit: "hari", unit_price: 200000, subtotal: 200000 }
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
