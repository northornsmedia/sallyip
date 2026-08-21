import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

function sallyChatApi(apiKey) {
  return {
    name: 'sally-chat-api',
    configureServer(server) {
      server.middlewares.use('/api/chat', async (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; return res.end('Method not allowed') }
        try {
          let raw = ''
          for await (const chunk of req) raw += chunk
          const { messages = [] } = JSON.parse(raw || '{}')
          const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'HTTP-Referer': 'http://localhost:3000', 'X-Title': 'SallyIP Labs' },
            body: JSON.stringify({ model: 'openrouter/free', messages: [{ role: 'system', content: 'You are SallyIP 4.1 Pro, a precise, helpful AI research assistant for intellectual property. Be clear and practical. State that you are not a lawyer when legal advice is requested.' }, ...messages] })
          })
          const data = await response.json()
          res.statusCode = response.status
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(data))
        } catch (error) {
          res.statusCode = 500; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ error: { message: error.message } }))
        }
      })
    }
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
  plugins: [react(), sallyChatApi(env.OPENROUTER_API_KEY)],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
}})
