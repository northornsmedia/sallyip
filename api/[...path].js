import artifactsHandler from './_handlers/artifacts.js'
import authHandler from './_handlers/auth.js'
import chatHandler from './_handlers/chat.js'
import claimChartsHandler from './_handlers/claim-charts.js'
import conversationsHandler from './_handlers/conversations.js'
import documentToolsHandler from './_handlers/document-tools.js'
import embeddingsHandler from './_handlers/embeddings.js'
import ftoHandler from './_handlers/fto.js'
import generatedFilesHandler from './_handlers/generated-files.js'
import inventiveStepHandler from './_handlers/inventive-step.js'
import ipGraphHandler from './_handlers/ip-graph.js'
import ipSpecialistsHandler from './_handlers/ip-specialists.js'
import litigationEvidenceHandler from './_handlers/litigation-evidence.js'
import mattersHandler from './_handlers/matters.js'
import noveltyHandler from './_handlers/novelty.js'
import officialSearchHandler from './_handlers/official-search.js'
import patentFamiliesHandler from './_handlers/patent-families.js'
import priorArtHandler from './_handlers/prior-art.js'
import rerankHandler from './_handlers/rerank.js'
import sourcesHandler from './_handlers/sources.js'
import trademarkClearanceHandler from './_handlers/trademark-clearance.js'
import trademarkIntelligenceHandler from './_handlers/trademark-intelligence.js'
import transparencyMetricsHandler from './_handlers/transparency-metrics.js'
import verificationDeskHandler from './_handlers/verification-desk.js'
import workflowsHandler from './_handlers/workflows.js'

const handlers = {
  'artifacts': artifactsHandler,
  'auth': authHandler,
  'chat': chatHandler,
  'claim-charts': claimChartsHandler,
  'conversations': conversationsHandler,
  'document-tools': documentToolsHandler,
  'embeddings': embeddingsHandler,
  'fto': ftoHandler,
  'generated-files': generatedFilesHandler,
  'inventive-step': inventiveStepHandler,
  'ip-graph': ipGraphHandler,
  'ip-specialists': ipSpecialistsHandler,
  'litigation-evidence': litigationEvidenceHandler,
  'matters': mattersHandler,
  'novelty': noveltyHandler,
  'official-search': officialSearchHandler,
  'patent-families': patentFamiliesHandler,
  'prior-art': priorArtHandler,
  'rerank': rerankHandler,
  'sources': sourcesHandler,
  'trademark-clearance': trademarkClearanceHandler,
  'trademark-intelligence': trademarkIntelligenceHandler,
  'transparency-metrics': transparencyMetricsHandler,
  'verification-desk': verificationDeskHandler,
  'workflows': workflowsHandler,
}

export default async function handler(req, res) {
  let segment = ''
  if (Array.isArray(req.query?.path)) {
    segment = req.query.path.join('/')
  } else if (typeof req.query?.path === 'string') {
    segment = req.query.path
  } else {
    const url = new URL(req.url || '/', 'http://localhost')
    segment = url.pathname.replace(/^\/api\//, '').replace(/^\//, '')
  }
  segment = segment.split('?')[0].replace(/\/+$/, '')

  // Fallback for query extraction if not populated
  if (!req.query) {
    const url = new URL(req.url || '/', 'http://localhost')
    req.query = Object.fromEntries(url.searchParams.entries())
  }

  const routeHandler = handlers[segment]
  if (!routeHandler) {
    return res.status(404).json({ error: { message: `API route not found: /api/${segment}` } })
  }

  return routeHandler(req, res)
}
