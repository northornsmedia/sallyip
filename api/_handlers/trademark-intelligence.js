import { neon } from "@neondatabase/serverless";
import { getSessionUser } from "../../src/lib/auth.js";
import {
  addTrademarkGoodsTerm,
  addTrademarkVariant,
  createTrademarkIntelligenceProject,
  finalizeTrademarkIntelligence,
  getTrademarkIntelligenceProject,
  listTrademarkIntelligenceInputs,
  reviewTrademarkGoodsTerm,
  reviewTrademarkVariant,
  syncTrademarkIntelligenceToClearance,
  updateTrademarkLanguageCoverage,
} from "../../src/lib/trademark-intelligence-service.js";
export default async function handler(req, res) {
  const sql = neon(process.env.DATABASE_URL);
  try {
    const user = await getSessionUser(sql, req.headers.cookie);
    if (!user)
      return res.status(401).json({ error: { message: "Not authenticated" } });
    if (req.method === "GET")
      return res
        .status(200)
        .json(
          req.query?.project_id
            ? await getTrademarkIntelligenceProject(
                sql,
                user.id,
                req.query.project_id,
              )
            : await listTrademarkIntelligenceInputs(
                sql,
                user.id,
                req.query?.matter_id,
              ),
        );
    if (req.method !== "POST")
      return res.status(405).json({ error: { message: "Method not allowed" } });
    const body = req.body || {},
      actions = {
        create: createTrademarkIntelligenceProject,
        add_variant: addTrademarkVariant,
        review_variant: reviewTrademarkVariant,
        update_coverage: updateTrademarkLanguageCoverage,
        add_goods: addTrademarkGoodsTerm,
        review_goods: reviewTrademarkGoodsTerm,
        finalize: finalizeTrademarkIntelligence,
        sync_clearance: syncTrademarkIntelligenceToClearance,
      },
      action = actions[body.action];
    if (!action)
      return res
        .status(400)
        .json({ error: { message: "Unknown trademark intelligence action" } });
    return res.status(201).json(await action(sql, user.id, body));
  } catch (error) {
    return res
      .status(400)
      .json({
        error: {
          message: error.message || "Trademark intelligence operation failed",
        },
      });
  }
}
