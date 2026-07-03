import contractService from "../services/contractService.js";
import oracleService from "../services/oracleService.js";

export async function health(req, res, next) {
  try {
    const status = await contractService.status();
    res.json({
      ok: true,
      oracleAddress: await oracleService.getOracleAddress(),
      ...status,
    });
  } catch (error) {
    next(error);
  }
}
