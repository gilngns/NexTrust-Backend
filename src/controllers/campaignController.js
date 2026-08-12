import contractService from "../services/contractService.js";
import campaignService from "../services/campaignService.js";
import donationService from "../services/donationService.js";
import milestoneService from "../services/milestoneService.js";
import config from "../config/index.js";
import prisma from "../config/prisma.js";
import AppError from "../utils/AppError.js";
import { getCampaignList } from "../services/campaignListService.js";



export async function listCampaigns(req, res, next) {
  try {
    const { status, page, limit } = req.query;
    res.json({
      ok: true,
      ...(await campaignService.list(status, page, limit)),
    });
  } catch (error) {
    next(error);
  }
}

export async function list(req, res, next) {
  try {
    const result = await getCampaignList(req.query);
    res.set("Cache-Control", "public, max-age=30, stale-while-revalidate=60");
    res.json(result);
  } catch (err) {
    next(err);
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

export async function planMilestones(req, res, next) {
  try {
    const result = await campaignService.planMilestones(req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function validateMilestoneStructure(req, res, next) {
  try {
    const result = await campaignService.validateMilestoneStructure(req.body);
    res.json(result);
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



export async function simulateReleaseAdvance(req, res, next) {
  try {
    const { id: campaignId } = req.params;

    if (config.midtrans.isProduction) {
      throw AppError.forbidden("Endpoint simulasi tidak tersedia di environment production.");
    }

    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
    });
    if (!campaign) throw AppError.notFound("Campaign tidak ditemukan.");

    
    if (["ADVANCE_PAID", "COMPLETED"].includes(campaign.status)) {
      return res.json({ ok: true, message: "Dana awal sudah dicairkan sebelumnya." });
    }

    
    const donations = await prisma.donation.findMany({
      where: { campaignId, status: { in: ["PAID", "DEPOSITED"] } },
    });
    const collectedAmount = donations.reduce((sum, d) => sum + d.amount, 0n);
    if (collectedAmount < campaign.targetAmount) {
      throw AppError.badRequest("Target donasi belum tercapai. Tidak dapat mencairkan dana awal.");
    }

    
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: "ADVANCE_PAID" },
    });

    
    let payout = null;
    let payoutWarning = null;
    try {
      const payoutService = (await import("../services/payoutService.js")).default;
      payout = await payoutService.autoDisburse({
        campaignId,
        amountUnits: campaign.advanceAmount,
        label: "Uang Muka (DP)",
      });
    } catch (err) {
      payoutWarning = err.message;
      console.warn(`[simulateReleaseAdvance] autoDisburse gagal:`, err.message);
    }

    res.json({
      ok: true,
      payout,
      payoutWarning,
      message: "Dana awal (DP) berhasil dicairkan!",
    });
  } catch (error) {
    console.error("[simulateReleaseAdvance] Error:", error);
    if (error.statusCode) return next(error);
    res.status(500).json({ ok: false, message: error.message || "Terjadi kesalahan." });
  }
}


export async function simulateMilestoneFlow(req, res, next) {
  try {
    const { id: campaignId, index: indexStr } = req.params;
    const index = Number(indexStr);

    if (config.midtrans.isProduction) {
      throw AppError.forbidden("Endpoint simulasi tidak tersedia di environment production.");
    }

    
    const { evidenceImage, evidenceImage2 } = req.body;
    if (!evidenceImage || !evidenceImage2) {
      throw AppError.badRequest("Dua bukti foto progres wajib diunggah untuk mencairkan milestone.");
    }

    
    const aiUrl = process.env.AI_SERVICE_URL || "http://localhost:8000";
    const aiToken = process.env.AI_INTERNAL_TOKEN || "";
    try {
      let detailLog = [];
      const checkReceipt = async (base64Img, idx) => {
        const b64Data = base64Img.replace(/^data:image\/\w+;base64,/, "");
        try {
          const res = await fetch(`${aiUrl}/api/v1/ocr-assist`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Internal-Token": aiToken
            },
            body: JSON.stringify({ image_base64: b64Data })
          });
          if (!res.ok) {
            console.warn(`[AI Validation] HTTP ${res.status} from ocr-assist for image ${idx}`);
            return true; 
          }
          const data = await res.json();
          
          const textLength = data.raw_text ? data.raw_text.trim().length : 0;
          console.log(`[AI Validation] Image ${idx} extracted text length: ${textLength}`);
          
          let rawTextPreview = data.raw_text ? data.raw_text.trim().replace(/\n/g, " ").substring(0, 30) : "";
          if (rawTextPreview.length === 30) rawTextPreview += "...";
          detailLog.push(`Foto ${idx}: terdeteksi ${textLength} huruf ${rawTextPreview ? `(${rawTextPreview})` : ''}`);
          
          return textLength >= 3; // Sangat longgar, asalkan ada teks yang terbaca
        } catch (e) {
          console.warn(`[AI Validation] Fetch failed for image ${idx}:`, e.message);
          return true; // Jika koneksi ke AI gagal, biarkan lolos
        }
      };

      const hasReceipt1 = await checkReceipt(evidenceImage, 1);
      const hasReceipt2 = await checkReceipt(evidenceImage2, 2);

      if (!hasReceipt1 && !hasReceipt2) {
        throw AppError.badRequest(`Validasi AI Gagal: Tidak ditemukan nota/struk belanja pada foto yang diunggah.\n\nDetail:\n- ${detailLog.join('\n- ')}`);
      }
    } catch (err) {
      if (err instanceof AppError) throw err;
      console.warn("AI Microservice unreachable during simulateMilestoneFlow, skipping receipt validation.");
    }

    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { milestones: { orderBy: { index: "asc" } } },
    });
    if (!campaign) throw AppError.notFound("Campaign tidak ditemukan.");

    
    if (!["ADVANCE_PAID", "COMPLETED"].includes(campaign.status)) {
      throw AppError.badRequest("Dana awal (DP) harus dicairkan terlebih dahulu.");
    }

    
    const donations = await prisma.donation.findMany({
      where: { campaignId, status: { in: ["PAID", "DEPOSITED"] } },
    });
    const collectedAmount = donations.reduce((sum, d) => sum + d.amount, 0n);
    if (collectedAmount < campaign.targetAmount) {
      throw AppError.badRequest("Target donasi belum tercapai penuh.");
    }

    
    if (index > 0) {
      const prevMilestone = campaign.milestones.find((m) => m.index === index - 1);
      if (!prevMilestone || prevMilestone.status !== "RELEASED") {
        throw AppError.badRequest(`Milestone ${index} harus dicairkan terlebih dahulu sebelum Milestone ${index + 1}.`);
      }
    }

    const existingMilestone = await prisma.milestone.findUnique({
      where: { campaignId_index: { campaignId, index } },
    });
    if (!existingMilestone) throw AppError.notFound("Milestone tidak ditemukan.");
    if (existingMilestone.status === "RELEASED") {
      return res.json({ ok: true, milestone: existingMilestone, message: "Milestone ini sudah dicairkan sebelumnya." });
    }

    
    const { saveBase64File } = await import("../utils/fileUpload.js");
    const evidenceUrl = saveBase64File(evidenceImage);
    const evidenceUrl2 = saveBase64File(evidenceImage2);
    const evidenceCID = "QmEvidence_" + Date.now() + "_ms" + index;

    const mockTxHash = "0xSIM" + Date.now().toString(16) + index.toString(16).padStart(4, "0");

    
    const updatedMilestone = await prisma.milestone.update({
      where: { campaignId_index: { campaignId, index } },
      data: {
        status: "RELEASED",
        aiScore: 95,
        evidenceCID,
        evidenceUrl,
        evidenceUrl2,
        txHashSubmit: mockTxHash,
        txHashRelease: mockTxHash,
      },
    });

    
    let payout = null;
    let payoutWarning = null;
    try {
      const payoutService = (await import("../services/payoutService.js")).default;
      payout = await payoutService.autoDisburse({
        campaignId,
        amountUnits: existingMilestone.amount,
        label: `Milestone #${index + 1}`,
      });
    } catch (err) {
      payoutWarning = err.message;
      console.warn(`[simulateMilestoneFlow] autoDisburse gagal:`, err.message);
    }

    
    const allMilestones = await prisma.milestone.findMany({ where: { campaignId } });
    const allReleased = allMilestones.every((m) => m.status === "RELEASED");
    if (allReleased) {
      await prisma.campaign.update({
        where: { id: campaignId },
        data: { status: "COMPLETED" },
      });
    }

    res.json({
      ok: true,
      milestone: updatedMilestone,
      payout,
      payoutWarning,
      message: `Milestone ${index + 1} berhasil dicairkan! (Platform Fee 3% telah dipotong)`,
    });
  } catch (error) {
    console.error("[simulateMilestoneFlow] Error:", error);
    if (error.statusCode) return next(error);
    res.status(500).json({ ok: false, message: error.message || "Terjadi kesalahan." });
  }
}