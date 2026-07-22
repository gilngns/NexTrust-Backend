import contractService from "../services/contractService.js";
import campaignService from "../services/campaignService.js";
import donationService from "../services/donationService.js";
import milestoneService from "../services/milestoneService.js";
import config from "../config/index.js";
import prisma from "../config/prisma.js";
import AppError from "../utils/AppError.js";

export async function listCampaigns(req, res, next) {
  try {
    res.json({
      ok: true,
      campaigns: await campaignService.list(req.query.status),
    });
  } catch (error) {
    next(error);
  }
}

export async function getCampaignById(req, res, next) {
  try {
    res.json({
      ok: true,
      campaign: await campaignService.getById(req.params.id),
    });
  } catch (error) {
    next(error);
  }
}

export async function createCampaign(req, res, next) {
  try {
    const campaign = await campaignService.create({
      ...req.body,
      foundationId: req.user.userId,
    });
    res.json({ ok: true, campaign });
  } catch (error) {
    next(error);
  }
}

export async function planDraft(req, res, next) {
  try {
    const plan = await campaignService.generateDraftPlan(req.body);
    res.json({ ok: true, plan });
  } catch (error) {
    next(error);
  }
}

export async function donate(req, res, next) {
  try {
    const result = await donationService.initiate({
      campaignId: req.params.id,
      donorId: req.user?.userId,
      donorName: req.body.donorName,
      amountRupiah: req.body.amount,
    });
    res.json({ ok: true, ...result });
  } catch (error) {
    next(error);
  }
}

export async function listDonations(req, res, next) {
  try {
    res.json({
      ok: true,
      donations: await donationService.listByCampaign(req.params.id),
    });
  } catch (error) {
    next(error);
  }
}

export async function getDonorGraph(req, res, next) {
  try {
    const graphData = await donationService.getDonorGraph(req.params.id, req.user?.userId);
    // Directly send the graphData without `ok: true` wrapper, since the user 
    // asked for a specific JSON response format, or I can just send graphData directly.
    // However, consistency is nice, let's just return the format exactly as requested.
    res.json(graphData);
  } catch (error) {
    next(error);
  }
}

export async function submitMilestone(req, res, next) {
  try {
    const result = await milestoneService.submit({
      campaignId: req.params.id,
      index: Number(req.params.index),
      ...req.body,
    });
    res.json({ ok: true, milestone: result });
  } catch (error) {
    next(error);
  }
}

export async function scoreMilestone(req, res, next) {
  try {
    const result = await milestoneService.submitScore({
      campaignId: req.params.id,
      index: Number(req.params.index),
      score: req.body.score,
      nonce: req.body.nonce,
    });
    res.json({ ok: true, milestone: result });
  } catch (error) {
    next(error);
  }
}

export async function releaseAdvance(req, res, next) {
  try {
    res.json({
      ok: true,
      ...(await milestoneService.releaseAdvance(req.params.id)),
    });
  } catch (error) {
    next(error);
  }
}

export async function releaseMilestone(req, res, next) {
  try {
    const result = await milestoneService.release({
      campaignId: req.params.id,
      index: Number(req.params.index),
    });
    res.json({ ok: true, milestone: result });
  } catch (error) {
    next(error);
  }
}

export async function resolveFrozen(req, res, next) {
  try {
    const campaign = await campaignService.getById(req.params.id);
    const result = await contractService.resolveFrozen({
      campaignIdStr: campaign.onChainId,
      approve: req.body.approve === true,
    });
    res.json({ ok: true, ...result });
  } catch (error) {
    next(error);
  }
}

export async function updateImage(req, res, next) {
  try {
    const campaign = await campaignService.updateImage(req.params.id, req.body.imageUrl);
    res.json({ ok: true, campaign });
  } catch (error) {
    next(error);
  }
}

export async function approve(req, res, next) {
  try {
    const campaign = await campaignService.approve(req.params.id);
    res.json({ ok: true, campaign });
  } catch (error) {
    next(error);
  }
}

export async function reject(req, res, next) {
  try {
    const campaign = await campaignService.reject(req.params.id);
    res.json({ ok: true, campaign });
  } catch (error) {
    next(error);
  }
}

export async function simulateDonation(req, res, next) {
  try {
    if (config.midtrans.isProduction) {
      throw AppError.forbidden("Endpoint simulasi tidak tersedia di environment production.");
    }

    const { id: campaignId, donationId } = req.params;

    const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign) throw AppError.notFound("Campaign tidak ditemukan.");

    const donation = await prisma.donation.findUnique({ where: { id: donationId } });
    if (!donation) throw AppError.notFound("Donasi tidak ditemukan.");

    if (donation.campaignId !== campaignId) {
      throw AppError.badRequest("Donasi tidak sesuai dengan campaign.");
    }

    const result = await donationService.settleDonation(donationId);
    
    res.json({ ok: true, donation: result.donation });
  } catch (error) {
    next(error);
  }
}