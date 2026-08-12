import { invalidate } from "../config/cache.js";

export function invalidateCampaignList() {
  invalidate("campaigns:list");
}

export function invalidateCampaign(id) {
  invalidate(`campaigns:detail:${id}`);
  invalidateCampaignList();
}