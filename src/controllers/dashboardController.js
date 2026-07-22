import dashboardService from "../services/dashboardService.js";

export async function getFoundationDashboard(req, res, next) {
  try {
    const data = await dashboardService.getFoundationDashboard(req.user.userId);
    res.json({ ok: true, data });
  } catch (error) {
    next(error);
  }
}
