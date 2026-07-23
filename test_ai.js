import 'dotenv/config';
import campaignService from './src/services/campaignService.js';

const payload = {
  targetAmount: 1000000,
  durationDays: 30,
  title: "Test",
  category: "PEMBANGUNAN",
  description: "Test description",
  latitude: -6.2,
  longitude: 106.8,
  rabData: [
    { item: "Semen", qty: 10, unit: "sak", harga: 50000 }
  ]
};

async function test() {
  try {
    const res = await campaignService.planMilestones(payload);
    console.log(JSON.stringify(res, null, 2));
  } catch (err) {
    console.error("Error:", err);
  }
}

test();
