const contractService = require("../services/contractService");
const oracleService = require("../services/oracleService");
const campaignService = require("../services/campaignService");
const donationService = require("../services/donationService");
const milestoneService = require("../services/milestoneService");

exports.health = async (req, res) => {
  const status = await contractService.status();
  res.json({ ok: true, oracleAddress: oracleService.oracleAddress, ...status });
};

exports.listCampaigns = async (req, res) => {
  res.json({ ok: true, campaigns: await campaignService.list() });
};

exports.getCampaignById = async (req, res) => {
  res.json({ ok: true, campaign: await campaignService.getById(req.params.id) });
};

exports.createCampaign = async (req, res) => {
  const campaign = await campaignService.create({
    ...req.body,
    foundationId: req.user.userId,
  });
  res.json({ ok: true, campaign });
};

exports.donate = async (req, res) => {
  const result = await donationService.initiate({
    campaignId: req.params.id,
    ...req.body,
  });
  res.json({ ok: true, ...result });
};

exports.listDonations = async (req, res) => {
  res.json({
    ok: true,
    donations: await donationService.listByCampaign(req.params.id),
  });
};

exports.submitMilestone = async (req, res) => {
  const result = await milestoneService.submit({
    campaignId: req.params.id,
    index: Number(req.params.index),
    ...req.body,
  });
  res.json({ ok: true, milestone: result });
};

exports.scoreMilestone = async (req, res) => {
  const result = await milestoneService.submitScore({
    campaignId: req.params.id,
    index: Number(req.params.index),
    score: req.body.score,
    nonce: req.body.nonce,
  });
  res.json({ ok: true, milestone: result });
};

exports.releaseAdvance = async (req, res) => {
  res.json({
    ok: true,
    ...(await milestoneService.releaseAdvance(req.params.id)),
  });
};

exports.releaseMilestone = async (req, res) => {
  const result = await milestoneService.release({
    campaignId: req.params.id,
    index: Number(req.params.index),
  });
  res.json({ ok: true, milestone: result });
};

exports.resolveFrozen = async (req, res) => {
  const campaign = await campaignService.getById(req.params.id);
  const result = await contractService.resolveFrozen({
    campaignIdStr: campaign.onChainId,
    approve: req.body.approve === true,
  });
  res.json({ ok: true, ...result });
};
