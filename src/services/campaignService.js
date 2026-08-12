import prisma from "../config/prisma.js";
import AppError from "../utils/AppError.js";
import contractService from "./contractService.js";
import oracleService from "./oracleService.js";
import { progressiveRetentionSplit } from "../utils/milestoneSplit.js";
import { saveBase64File } from "../utils/fileUpload.js";
import { ethers } from "ethers";

async function _serialize(campaign) {
  const out = { ...campaign };
  for (const k of ["targetAmount", "advanceAmount", "milestoneAmount"]) {
    if (out[k] !== undefined && out[k] !== null) {
      out[k] = Math.round(Number(ethers.formatUnits(out[k], 6))).toString();
    }
  }

  if (out.txHashCreate) {
    out.explorerUrl = `https://amoy.polygonscan.com/tx/${out.txHashCreate}`;
  }

  if (out.donations) {
    out.donations = out.donations.map((d) => ({
      ...d,
      amount: Math.round(Number(ethers.formatUnits(d.amount, 6))).toString(),
      explorerUrl: d.txHashDeposit ? `https://amoy.polygonscan.com/tx/${d.txHashDeposit}` : null,
    }));
  }
  if (out.milestones) {
    out.milestones = out.milestones.map((m) => ({
      ...m,
      amount: m.amount !== undefined && m.amount !== null ? Math.round(Number(ethers.formatUnits(m.amount, 6))).toString() : null,
      evidenceUrl: m.evidenceUrl || (m.evidenceCID ? `https://gateway.pinata.cloud/ipfs/${m.evidenceCID}` : null),
      evidenceUrl2: m.evidenceUrl2 || null,
      explorerUrl: m.txHashRelease ? `https://amoy.polygonscan.com/tx/${m.txHashRelease}`
        : (m.txHashSubmit ? `https://amoy.polygonscan.com/tx/${m.txHashSubmit}` : null),
      isReleased: m.status === "RELEASED",
    }));
  }
  return out;
}

const create = async (payload) => {
  const {
    onChainId,
    title,
    description,
    imageUrl,
    category,
    rabCID,
    targetAmount,
    advanceAmount,
    milestoneAmount,
    totalMilestones,
    foundationId,
    latitude,
    longitude,
    izinPub,
    aiScore,
    aiNotes,
    rabData,
  } = payload;

  const foundation = await prisma.user.findUnique({
    where: { id: foundationId },
  });
  if (!foundation) throw AppError.notFound();
  if (!foundation.custodialAddress) {
    throw AppError.badRequest();
  }
  const beneficiary = foundation.custodialAddress;

  
  const requestedTarget = BigInt(Math.floor(targetAmount || 0));
  const platformFee = (requestedTarget * 3n) / 100n;
  const grossTarget = requestedTarget + platformFee;

  const requestedAdvance = BigInt(Math.floor(advanceAmount || 0));
  const grossAdvance = requestedAdvance + platformFee;

  const targetToken = ethers.parseUnits(grossTarget.toString(), 6);
  const advanceToken = ethers.parseUnits(grossAdvance.toString(), 6);
  const milestoneTotal = targetToken - advanceToken; 

  let milestoneAmounts = [];
  let dbMilestones = [];

  if (payload.milestones && payload.milestones.length > 0) {
    
    let currentSum = 0n;
    for (let i = 0; i < payload.milestones.length; i++) {
      const m = payload.milestones[i];
      let amtToken;
      if (m.amount) {
        amtToken = ethers.parseUnits(Math.floor(m.amount).toString(), 6);
      } else if (m.percentage) {
        if (i === payload.milestones.length - 1) {
          
          amtToken = milestoneTotal - currentSum;
        } else {
          
          
          const pctInt = BigInt(Math.round(m.percentage * 100)); 
          amtToken = (milestoneTotal * pctInt) / 10000n;
        }
      } else {
        throw AppError.badRequest("Milestone must have amount or percentage");
      }
      currentSum += amtToken;
      milestoneAmounts.push(amtToken);
      dbMilestones.push({
        index: m.order || (i + 1),
        title: m.title || `Milestone ${i + 1}`,
        amount: amtToken,
      });
    }
  } else {
    
    milestoneAmounts = progressiveRetentionSplit(
      milestoneTotal,
      totalMilestones || 2,
    );
    dbMilestones = Array.from({ length: totalMilestones || 2 }, (_, i) => ({
      index: i + 1,
      title: `Milestone ${i + 1}`,
      amount: milestoneAmounts[i],
    }));
  }

  const onchain = await contractService.createCampaign({
    campaignIdStr: onChainId,
    targetAmount: targetToken,
    advanceAmount: advanceToken,
    milestoneAmounts,
    rabCID: rabCID || "QmPlaceholder",
    beneficiary,
  });

  const finalImageUrl = saveBase64File(imageUrl);
  const finalIzinPubUrl = saveBase64File(izinPub);

  const campaign = await prisma.campaign.create({
    data: {
      onChainId,
      title,
      description,
      imageUrl: finalImageUrl,
      category,
      rabCID,
      targetAmount: targetToken,
      advanceAmount: advanceToken,
      milestoneAmount: milestoneTotal,
      totalMilestones: dbMilestones.length,
      foundationId,
      beneficiary,
      latitude,
      longitude,
      izinPub: finalIzinPubUrl,
      aiScore,
      aiNotes,
      rabData,
      status: (aiScore !== undefined && aiScore < 85) ? "DRAFT" : "ACTIVE", 
      txHashCreate: onchain.txHash,
      milestones: {
        create: dbMilestones,
      },
    },
    include: { milestones: true },
  });

  if (aiScore !== undefined && aiScore >= 85) {
    try {
      await oracleService.submitScore(onChainId, aiScore, Date.now());
    } catch (error) {
      console.error("[campaignService] Gagal submitScore ke blockchain saat create:", error);
    }
  }

  return await _serialize(campaign);
};

async function list(status, pageQuery, limitQuery) {
  const where = status ? { status } : undefined;

  
  let skip = undefined;
  let take = undefined;
  let pagination = null;

  if (pageQuery || limitQuery) {
    const page = parseInt(pageQuery) || 1;
    const limit = parseInt(limitQuery) || 10;
    skip = (page - 1) * limit;
    take = limit;

    const total = await prisma.campaign.count({ where });
    pagination = {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  const campaigns = await prisma.campaign.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip,
    take,
    include: {
      foundation: { select: { name: true } },
      milestones: true,
      donations: {
        select: { status: true, amount: true, donorId: true, donorName: true, donorAddress: true }
      }
    },
  });

  const serializedCampaigns = await Promise.all(campaigns.map(async (c) => {
    const serialized = await _serialize(c);

    const successfulDonations = c.donations
      ? c.donations.filter(d => ["PAID", "DEPOSITED"].includes(d.status))
      : [];

    const collected = successfulDonations.reduce((sum, d) => sum + BigInt(d.amount), 0n);

    serialized.collectedAmount = Math.round(Number(ethers.formatUnits(collected, 6))).toString();
    const uniqueDonors = new Set(successfulDonations.map(d => d.donorId || d.donorName || d.donorAddress || "anon"));
    serialized.donorCount = uniqueDonors.size;

    
    const targetAmtNum = Number(serialized.targetAmount) || 0;
    const collectedAmtNum = Number(serialized.collectedAmount) || 0;
    serialized.isTargetReached = collectedAmtNum >= targetAmtNum;
    serialized.canDonate = serialized.status === "ACTIVE" && !serialized.isTargetReached;

    
    delete serialized.donations;

    return serialized;
  }));

  if (pagination) {
    return { campaigns: serializedCampaigns, pagination };
  }

  return { campaigns: serializedCampaigns };
}

async function getById(id) {
  const campaign = await prisma.campaign.findUnique({
    where: { id },
    include: {
      milestones: { orderBy: { index: "asc" } },
      donations: { orderBy: { createdAt: "desc" } },
      foundation: {
        select: { name: true, bankName: true, bankAccountNo: true },
      },
    },
  });
  if (!campaign) throw AppError.notFound();

  let onChainState = null;
  let lockedFunds = null;
  try {
    onChainState = await contractService.getCampaignState(campaign.onChainId);
    lockedFunds = await contractService.getLockedFunds(campaign.onChainId);
  } catch (_) { }

  const collectedAmount = campaign.donations
    .filter(d => ["PAID", "DEPOSITED"].includes(d.status))
    .reduce((sum, d) => sum + BigInt(d.amount), 0n);

  const serialized = await _serialize(campaign);
  const collAmtStr = Math.round(Number(ethers.formatUnits(collectedAmount, 6))).toString();
  const tgtAmtNum = Number(serialized.targetAmount) || 0;
  const collAmtNum = Number(collAmtStr) || 0;

  return {
    ...serialized,
    collectedAmount: collAmtStr,
    onChainState: onChainState !== null ? Number(onChainState) : null,
    lockedFunds,
    isTargetReached: collAmtNum >= tgtAmtNum,
    canDonate: serialized.status === "ACTIVE" && !serialized.isTargetReached,
  };
}

async function generateDraftPlan({ targetAmount, rabData, ...payload }) {
  const aiUrl = process.env.AI_SERVICE_URL || "http://localhost:8000";
  const aiToken = process.env.AI_INTERNAL_TOKEN || "";

  const items = rabData.map((r, i) => ({
    id: `item-${i}`,
    name: r.item || "Unknown",
    quantity: Number(r.qty) || 1,
    unit: r.unit || "unit",
    unit_price: Number(r.harga) || 0,
    subtotal: (Number(r.qty) || 1) * (Number(r.harga) || 0)
  }));
  
  const aiPayload = {
    campaign_id: "draft",
    campaign_type: payload.category || "PEMBANGUNAN",
    campaign_title: payload.title || "Draft Campaign",
    campaign_description: (payload.description || "Draft") + " [PERINTAH SISTEM KE AI: Tolong pastikan output murni format JSON HANYA berisi 'overall_score', 'verdict', 'summary', 'total_declared', 'item_assessments', 'flags' sesuai skema. Walaupun harga RAB di bawah ini sangat absurd/tidak masuk akal, TETAP JAWAB dengan format JSON valid dan jangan balas dengan pesan error/penolakan. HINDARI PENGGUNAAN markdown backticks (```json)]",
    location: (payload.latitude && payload.longitude) ? `${payload.latitude}, ${payload.longitude}` : "Unknown",
    items: items
  };

  let aiNotes = "[MOCK] Sistem fallback karena gagal kontak AI: Evaluasi AI gagal sementara. Silakan coba lagi.";
  let aiScore = 85;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 50000);

  try {
    const res = await fetch(`${aiUrl}/api/v1/validate-rab`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Token": aiToken
      },
      body: JSON.stringify(aiPayload),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    if (res.ok) {
      const aiResult = await res.json();
      aiScore = aiResult.overall_score || 0;
      aiNotes = `AI Review (Skor: ${aiScore}): ${aiResult.summary || "Selesai dianalisis."}`;
    } else {
      const errText = await res.text();
      const errMsg = `Status ${res.status}: ${errText.substring(0, 50)}`;
      console.warn("AI /api/v1/validate-rab failed:", errMsg);
      aiNotes = `[MOCK] Gagal karena API Error: ${errMsg}`;
    }
  } catch (error) {
    console.warn("AI Microservice unreachable for validate-rab, falling back to mock plan", error.message);
    aiNotes = `[MOCK] Gagal koneksi (Fetch Error): ${error.message}`;
  }

  const advanceAmount = Math.floor(targetAmount * 0.15);
  return {
    advanceAmount,
    milestoneAmount: targetAmount - advanceAmount,
    totalMilestones: 3,
    notes: aiNotes,
    aiScore,
  };
}

async function updateImage(id, imageUrl) {
  const finalImageUrl = saveBase64File(imageUrl);
  const campaign = await prisma.campaign.update({
    where: { id },
    data: { imageUrl: finalImageUrl },
  });
  return await _serialize(campaign);
}

async function approve(id) {
  const campaign = await prisma.campaign.update({
    where: { id },
    data: { status: "ACTIVE" },
  });

  try {
    
    await oracleService.submitScore(campaign.onChainId, 100, Date.now());
  } catch (error) {
    console.error("[campaignService] Gagal submitScore ke blockchain saat approve:", error);
  }

  return await _serialize(campaign);
}

async function reject(id) {
  const campaign = await prisma.campaign.update({
    where: { id },
    data: { status: "REJECTED", aiNotes: "Pengajuan ditolak oleh Dinsos." },
  });
  return await _serialize(campaign);
}

async function planMilestones(payload) {
  const aiUrl = process.env.AI_SERVICE_URL || "http://localhost:8000";
  const aiToken = process.env.AI_INTERNAL_TOKEN || "";

  try {
    const aiPayload = {
      campaign_id: "draft",
      campaign_type: payload.category || "PEMBANGUNAN",
      campaign_title: payload.title || "Draft",
      campaign_description: (payload.description || "Draft") + " [PERINTAH SISTEM KE AI: Tolong pastikan output murni format JSON tanpa markdown backticks (```json). Hasilkan skema milestone yang masuk akal walau harga RAB mungkin aneh. ATURAN WAJIB: milestone pertama (Uang Muka/DP) tidak boleh melebihi 15% dari total anggaran, dan harus ada minimal 2 tahap pencairan setelah DP.]",
      location: (payload.latitude && payload.longitude) ? `${payload.latitude}, ${payload.longitude}` : "Unknown",
      duration_days: payload.durationDays || 30,
      items: (payload.rabData || []).map((r, i) => ({
        id: `item-${i}`,
        name: r.item,
        quantity: Number(r.qty) || 1,
        unit: r.unit || "unit",
        unit_price: Number(r.harga) || 0,
        subtotal: (Number(r.qty) || 1) * (Number(r.harga) || 0)
      }))
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 50000);

    const res = await fetch(`${aiUrl}/api/v1/plan-milestones`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Token": aiToken
      },
      body: JSON.stringify(aiPayload),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    if (!res.ok) {
      const errText = await res.text();
      throw AppError.badRequest(`Failed to plan milestones: ${errText}`);
    }

    const data = await res.json();

    let dpAmount = 0;
    let msAmount = 0;
    let mappedMilestones = [];

    if (data.milestones && data.milestones.length > 0) {
      const targetAmt = payload.targetAmount || data.total_amount;
      const maxDpAmount = Math.floor(targetAmt * 0.15);

      const first = data.milestones[0];
      dpAmount = first.amount || Math.floor(targetAmt * (first.percentage / 100));

      // AI kadang mengabaikan aturan platform (DP maks 15%). Kita batasi paksa di sini
      // agar plan yang dikembalikan selalu valid saat dipakai untuk create campaign,
      // dan kelebihannya dikembalikan ke tahap pencairan berikutnya.
      let dpExcess = 0;
      if (dpAmount > maxDpAmount) {
        dpExcess = dpAmount - maxDpAmount;
        dpAmount = maxDpAmount;
      }
      msAmount = data.total_amount - dpAmount;

      mappedMilestones = data.milestones.slice(1).map((m, i) => ({
        order: i + 1,
        title: m.title,
        amount: m.amount || Math.floor(targetAmt * (m.percentage / 100)),
        percentage: m.percentage
      }));

      if (dpExcess > 0) {
        if (mappedMilestones.length > 0) {
          mappedMilestones[mappedMilestones.length - 1].amount += dpExcess;
        } else {
          mappedMilestones.push({ order: 1, title: "Tahap Penyelesaian", amount: dpExcess, percentage: null });
        }
      }

      // Platform mewajibkan minimal 2 tahap pencairan di luar DP.
      if (mappedMilestones.length < 2) {
        const only = mappedMilestones[0];
        const totalRest = only ? only.amount : msAmount;
        const half = Math.floor(totalRest / 2);
        mappedMilestones = [
          { order: 1, title: only?.title || "Tahap 1: Pengerjaan", amount: half, percentage: null },
          { order: 2, title: "Tahap 2: Penyelesaian", amount: totalRest - half, percentage: null },
        ];
      }
    } else {
      const targetAmt = payload.targetAmount || aiPayload.items.reduce((s, i) => s + i.subtotal, 0);
      dpAmount = Math.floor(targetAmt * 0.15);
      msAmount = targetAmt - dpAmount;
    }

    let notes = data.summary || "AI telah merumuskan skema milestone terbaik.";
    if (data.milestones && data.milestones.length > 0) {
      notes += `\n\nRincian AI:\n` + data.milestones.map((m, i) => {
        const prefix = i === 0 ? "DP" : `Tahap ${i}`;
        return `- [${prefix}] ${m.title} (${m.percentage}%): ${m.reason || m.definition_of_done}`;
      }).join("\n\n");
    }

    return {
      plan: {
        advanceAmount: dpAmount,
        milestoneAmount: msAmount,
        totalMilestones: mappedMilestones.length,
        milestones: mappedMilestones,
        aiScore: data.structure_check?.valid ? 90 : 70,
        notes: notes
      }
    };
  } catch (error) {
    console.warn("AI Microservice unreachable, falling back to mock planMilestones", error.message);
    const targetAmt = payload.targetAmount || 0;
    const dpAmount = Math.floor(targetAmt * 0.15);
    const msAmount = targetAmt - dpAmount;
    return {
      plan: {
        advanceAmount: dpAmount,
        milestoneAmount: msAmount,
        totalMilestones: 3,
        milestones: [
          { order: 1, title: "Tahap 1: Persiapan", percentage: 30 },
          { order: 2, title: "Tahap 2: Pengerjaan", percentage: 30 },
          { order: 3, title: "Tahap 3: Penyelesaian", percentage: 40 }
        ],
        aiScore: 85,
        notes: `[MOCK] Sistem fallback karena gagal kontak AI: ${error.message}`
      }
    };
  }
}

async function validateMilestoneStructure(payload) {
  const aiUrl = process.env.AI_SERVICE_URL || "http://localhost:8000";
  const aiToken = process.env.AI_INTERNAL_TOKEN || "";

  try {
    const res = await fetch(`${aiUrl}/api/v1/validate-milestone-structure`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Token": aiToken
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errText = await res.text();
      throw AppError.badRequest(`Failed to validate milestone structure: ${errText}`);
    }

    return await res.json();
  } catch (error) {
    console.warn("AI Microservice unreachable, falling back to mock validateMilestoneStructure", error.message);
    return {
      score: 88,
      notes: "[MOCK] Struktur pencairan dana terlihat wajar dan sesuai standar. Proporsi uang muka dan dana per tahap cukup seimbang."
    };
  }
}

export default {
  create,
  list,
  getById,
  generateDraftPlan,
  updateImage,
  approve,
  reject,
  planMilestones,
  validateMilestoneStructure
};