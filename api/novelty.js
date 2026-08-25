import { neon } from "@neondatabase/serverless";
import { getSessionUser } from "../src/lib/auth.js";
import {
  createNoveltyAnalysis,
  finalizeNoveltyAnalysis,
  getNoveltyAnalysis,
  listNoveltyInputs,
  reviewNoveltyMapping,
} from "../src/lib/novelty-service.js";
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
          req.query?.analysis_id
            ? await getNoveltyAnalysis(sql, user.id, req.query.analysis_id)
            : await listNoveltyInputs(sql, user.id, req.query?.matter_id),
        );
    if (req.method !== "POST")
      return res.status(405).json({ error: { message: "Method not allowed" } });
    const body = req.body || {},
      actions = {
        create: createNoveltyAnalysis,
        review_mapping: reviewNoveltyMapping,
        finalize: finalizeNoveltyAnalysis,
      },
      action = actions[body.action];
    if (!action)
      return res
        .status(400)
        .json({ error: { message: "Unknown novelty action" } });
    return res
      .status(body.action === "create" ? 201 : 200)
      .json(await action(sql, user.id, body));
  } catch (error) {
    return res
      .status(400)
      .json({
        error: { message: error.message || "Novelty operation failed" },
      });
  }
}
