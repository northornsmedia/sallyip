import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import { spawn } from 'node:child_process'
import { neon } from '@neondatabase/serverless'
import { orchestrateSally } from './src/lib/sally-orchestrator.js'
import { readSallyTelemetry, recordSallyTelemetry } from './src/lib/sally-telemetry.js'
import { clearSessionCookie, createSession, destroySession, getSessionUser, hashPassword, sessionCookie, verifyPassword } from './src/lib/auth.js'

function sallyChatApi(apiKey, databaseUrl, model, embeddingKey, embeddingModel, lfmChatKey, lfmChatModel, dotsKey, dotsModel, gemmaKey, gemmaModel, rerankKey, rerankModel, oxKey, oxModel) {
  return {
    name: 'sally-chat-api',
    configureServer(server) {
      server.middlewares.use('/api/generated-files',async(req,res)=>{const sql=neon(databaseUrl||'');try{const user=await getSessionUser(sql,req.headers.cookie);if(!user){res.statusCode=401;return res.end('Not authenticated')}const id=new URL(req.url,'http://localhost').searchParams.get('id');const [file]=await sql`SELECT filename,mime_type,size_bytes,content FROM generated_files WHERE id=${id} AND user_id=${user.id} LIMIT 1`;if(!file){res.statusCode=404;return res.end('File not found')}res.setHeader('Content-Type',file.mime_type);res.setHeader('Content-Length',String(file.size_bytes));res.setHeader('Content-Disposition',`attachment; filename="${file.filename.replace(/["\r\n]/g,'_')}"`);return res.end(Buffer.from(file.content))}catch(error){res.statusCode=500;return res.end('Could not download file')}})
      server.middlewares.use('/api/generate-file',async(req,res)=>{res.setHeader('Content-Type','application/json');if(req.method!=='POST'){res.statusCode=405;return res.end(JSON.stringify({error:{message:'Method not allowed'}}))}try{const sql=neon(databaseUrl||'');const user=await getSessionUser(sql,req.headers.cookie);if(!user){res.statusCode=401;return res.end(JSON.stringify({error:{message:'Not authenticated'}}))}let raw='';for await(const chunk of req)raw+=chunk;const payload=JSON.parse(raw||'{}');if(raw.length>200000)throw new Error('Request is too large');const result=await new Promise((resolve,reject)=>{const child=spawn('python',['scripts/create_chat_file.py'],{cwd:process.cwd(),windowsHide:true});let output='',errors='';child.stdout.on('data',chunk=>output+=chunk);child.stderr.on('data',chunk=>errors+=chunk);child.on('error',reject);child.on('close',code=>code===0?resolve(JSON.parse(output)):reject(new Error(errors||'File generator failed')));child.stdin.end(JSON.stringify(payload))});const [conversation]=payload.conversation_id?await sql`SELECT id FROM conversations WHERE id=${payload.conversation_id} AND user_id=${user.id}`:[];const bytes=Buffer.from(result.data,'base64');const [saved]=await sql`INSERT INTO generated_files(user_id,conversation_id,filename,mime_type,format,size_bytes,content) VALUES(${user.id},${conversation?.id||null},${result.filename},${result.mime_type},${payload.format},${bytes.length},decode(${result.data},'base64')) RETURNING id`;return res.end(JSON.stringify({file:{id:saved.id,name:result.filename,mime_type:result.mime_type,format:payload.format,size:bytes.length,url:`/api/generated-files?id=${saved.id}`}}))}catch(error){res.statusCode=500;return res.end(JSON.stringify({error:{message:error.message||'Sally could not create the file'}}))}})
      server.middlewares.use('/api/auth', async (req, res) => {
        res.setHeader('Content-Type','application/json')
        const sql=neon(databaseUrl||'')
        try{
          if(req.method==='GET'){const user=await getSessionUser(sql,req.headers.cookie);if(!user){res.statusCode=401;return res.end(JSON.stringify({error:{message:'Not authenticated'}}))}return res.end(JSON.stringify({user:{id:user.id,email:user.email,name:user.full_name,initials:user.initials,role:user.role}}))}
          if(req.method!=='POST'){res.statusCode=405;return res.end(JSON.stringify({error:{message:'Method not allowed'}}))}
          let raw='';for await(const chunk of req)raw+=chunk;const {action,email='',password='',name=''}=JSON.parse(raw||'{}')
          if(action==='logout'){await destroySession(sql,req.headers.cookie);res.setHeader('Set-Cookie',clearSessionCookie(false));return res.end(JSON.stringify({ok:true}))}
          const normalized=email.trim().toLowerCase();if(!/^\S+@\S+\.\S+$/.test(normalized)){res.statusCode=400;return res.end(JSON.stringify({error:{message:'Enter a valid email address'}}))}if(password.length<8){res.statusCode=400;return res.end(JSON.stringify({error:{message:'Password must contain at least 8 characters'}}))}
          let user
          if(action==='signup'){const fullName=name.trim();if(fullName.length<2){res.statusCode=400;return res.end(JSON.stringify({error:{message:'Enter your name'}}))}const initials=fullName.split(/\s+/).slice(0,2).map(part=>part[0]).join('').toUpperCase();const passwordHash=await hashPassword(password);try{[user]=await sql`INSERT INTO users(email,full_name,initials,password_hash) VALUES(${normalized},${fullName},${initials},${passwordHash}) RETURNING id,email,full_name,initials,role`}catch(error){if(error.code==='23505'){res.statusCode=409;return res.end(JSON.stringify({error:{message:'An account with this email already exists'}}))}throw error}await sql`INSERT INTO subscriptions(user_id,plan_id,status) VALUES(${user.id},'basic','active')`}
          else if(action==='login'){[user]=await sql`SELECT id,email,full_name,initials,role,password_hash FROM users WHERE email=${normalized} LIMIT 1`;if(!user||!await verifyPassword(password,user.password_hash)){res.statusCode=401;return res.end(JSON.stringify({error:{message:'Incorrect email or password'}}))}}
          else{res.statusCode=400;return res.end(JSON.stringify({error:{message:'Unknown authentication action'}}))}
          const token=await createSession(sql,user.id);res.setHeader('Set-Cookie',sessionCookie(token,false));return res.end(JSON.stringify({user:{id:user.id,email:user.email,name:user.full_name,initials:user.initials,role:user.role}}))
        }catch(error){res.statusCode=500;return res.end(JSON.stringify({error:{message:'Authentication is temporarily unavailable'}}))}
      })
      server.middlewares.use('/api/transparency-metrics', async (req, res) => {
        res.setHeader('Content-Type','application/json')
        if(req.method!=='GET'){res.statusCode=405;return res.end(JSON.stringify({error:{message:'Method not allowed'}}))}
        try{return res.end(JSON.stringify(await readSallyTelemetry(databaseUrl)))}catch(error){res.statusCode=500;return res.end(JSON.stringify({error:{message:error.message}}))}
      })
      server.middlewares.use('/api/rerank', async (req, res) => {
        res.setHeader('Content-Type', 'application/json')
        if (req.method !== 'POST') { res.statusCode = 405; return res.end(JSON.stringify({error:{message:'Method not allowed'}})) }
        try {
          let raw = ''; for await (const chunk of req) raw += chunk
          const { query, documents, top_n } = JSON.parse(raw || '{}')
          if (typeof query !== 'string' || !query.trim()) { res.statusCode = 400; return res.end(JSON.stringify({error:{message:'Query is required'}})) }
          if (!Array.isArray(documents) || !documents.length) { res.statusCode = 400; return res.end(JSON.stringify({error:{message:'Documents must be a non-empty array'}})) }
          const safeDocuments = documents.filter(document => document && ((typeof document.text === 'string' && document.text) || (typeof document.image === 'string' && document.image))).slice(0,100)
          if (!safeDocuments.length) { res.statusCode = 400; return res.end(JSON.stringify({error:{message:'Each document must contain text or image'}})) }
          const response = await fetch('https://openrouter.ai/api/v1/rerank', { method:'POST', headers:{Authorization:`Bearer ${rerankKey}`,'Content-Type':'application/json','HTTP-Referer':'https://sallyip.com','X-Title':'SallyIP Labs'}, body:JSON.stringify({model:rerankModel || 'nvidia/llama-nemotron-rerank-vl-1b-v2:free',query,documents:safeDocuments,top_n:Math.min(Math.max(Number(top_n)||safeDocuments.length,1),safeDocuments.length)}) })
          const data = await response.json(); res.statusCode = response.status; return res.end(JSON.stringify(data))
        } catch (error) { res.statusCode = 500; return res.end(JSON.stringify({error:{message:error.message}})) }
      })
      server.middlewares.use('/api/embeddings', async (req, res) => {
        res.setHeader('Content-Type', 'application/json')
        if (req.method !== 'POST') { res.statusCode = 405; return res.end(JSON.stringify({error:{message:'Method not allowed'}})) }
        try {
          let raw = ''; for await (const chunk of req) raw += chunk
          const { input } = JSON.parse(raw || '{}')
          if (!(typeof input === 'string' || Array.isArray(input))) { res.statusCode = 400; return res.end(JSON.stringify({error:{message:'Input must be a string or an array of strings'}})) }
          const response = await fetch('https://openrouter.ai/api/v1/embeddings', { method:'POST', headers:{Authorization:`Bearer ${embeddingKey}`,'Content-Type':'application/json','HTTP-Referer':'https://sallyip.com','X-Title':'SallyIP Labs'}, body:JSON.stringify({model:embeddingModel || 'liquid/lfm-2.5-embedding-350m:free',input,encoding_format:'float'}) })
          const data = await response.json(); res.statusCode = response.status; return res.end(JSON.stringify(data))
        } catch (error) { res.statusCode = 500; return res.end(JSON.stringify({error:{message:error.message}})) }
      })
      server.middlewares.use('/api/conversations', async (req, res) => {
        res.setHeader('Content-Type', 'application/json')
        try {
          const sql = neon(databaseUrl || '')
          const user = await getSessionUser(sql,req.headers.cookie)
          if (!user) { res.statusCode=401; return res.end(JSON.stringify({error:{message:'Not authenticated'}})) }
          if (req.method === 'GET') {
            const conversations = await sql`SELECT id,title,model,created_at,updated_at FROM conversations WHERE user_id=${user.id} ORDER BY updated_at DESC`
            const messages = conversations.length ? await sql`SELECT id,conversation_id,role,content,attachments,artifact,created_at FROM messages WHERE conversation_id = ANY(${conversations.map(item => item.id)}::uuid[]) ORDER BY created_at ASC` : []
            return res.end(JSON.stringify(conversations.map(conversation => ({...conversation,messages:messages.filter(message => message.conversation_id === conversation.id)}))))
          }
          if (req.method === 'POST') {
            let raw = ''; for await (const chunk of req) raw += chunk
            const { id, title = 'New conversation', messages = [] } = JSON.parse(raw || '{}')
            const existing=await sql`SELECT id FROM conversations WHERE id=${id} AND user_id=${user.id}`
            if(!existing.length)await sql`INSERT INTO conversations (id,user_id,title) VALUES (${id},${user.id},${title})`
            else await sql`UPDATE conversations SET title=${title},updated_at=now() WHERE id=${id} AND user_id=${user.id}`
            await sql`DELETE FROM messages WHERE conversation_id=${id}`
            for (const message of messages) if (['user','assistant','system'].includes(message.role) && message.content) await sql`INSERT INTO messages (conversation_id,role,content,attachments,artifact) VALUES (${id},${message.role},${message.content},${JSON.stringify(Array.isArray(message.attachments)?message.attachments:[])}::jsonb,${message.artifact?JSON.stringify(message.artifact):null}::jsonb)`
            return res.end(JSON.stringify({ok:true}))
          }
          if(req.method==='DELETE'){
            const id=new URL(req.url,'http://localhost').searchParams.get('id')
            if(!id){res.statusCode=400;return res.end(JSON.stringify({error:{message:'Conversation id is required'}}))}
            await sql`DELETE FROM conversations WHERE id=${id} AND user_id=${user.id}`
            return res.end(JSON.stringify({ok:true}))
          }
          res.statusCode = 405; res.end(JSON.stringify({error:{message:'Method not allowed'}}))
        } catch (error) { res.statusCode = 500; res.end(JSON.stringify({error:{message:error.message}})) }
      })
      server.middlewares.use('/api/chat', async (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; return res.end('Method not allowed') }
        try {
          const sql=neon(databaseUrl||'');const user=await getSessionUser(sql,req.headers.cookie);if(!user){res.statusCode=401;res.setHeader('Content-Type','application/json');return res.end(JSON.stringify({error:{message:'Not authenticated'}}))}
          let raw = ''
          for await (const chunk of req) raw += chunk
          const { messages = [] } = JSON.parse(raw || '{}')
          const result = await orchestrateSally(messages,{OPENROUTER_API_KEY:apiKey,SALLYIP_MODEL:model,OPENROUTER_EMBEDDING_API_KEY:embeddingKey,SALLYIP_EMBEDDING_MODEL:embeddingModel,OPENROUTER_LFM_CHAT_API_KEY:lfmChatKey,SALLYIP_LFM_CHAT_MODEL:lfmChatModel,OPENROUTER_DOTS_API_KEY:dotsKey,SALLYIP_DOTS_MODEL:dotsModel,OPENROUTER_GEMMA_API_KEY:gemmaKey,SALLYIP_GEMMA_MODEL:gemmaModel,OPENROUTER_RERANK_API_KEY:rerankKey,SALLYIP_RERANK_MODEL:rerankModel,OPENROUTER_OX_API_KEY:oxKey,SALLYIP_OX_MODEL:oxModel},'http://localhost:3000')
          await recordSallyTelemetry(databaseUrl,result.meta).catch(()=>{})
          const data = {id:`sally-${Date.now()}`,object:'chat.completion',model:'sallyip/4.1-pro',choices:[{index:0,message:{role:'assistant',content:result.answer},finish_reason:'stop'}],sally_meta:result.meta}
          res.statusCode = 200
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
  plugins: [react(), sallyChatApi(env.OPENROUTER_API_KEY, env.DATABASE_URL, env.SALLYIP_MODEL, env.OPENROUTER_EMBEDDING_API_KEY, env.SALLYIP_EMBEDDING_MODEL, env.OPENROUTER_LFM_CHAT_API_KEY, env.SALLYIP_LFM_CHAT_MODEL, env.OPENROUTER_DOTS_API_KEY, env.SALLYIP_DOTS_MODEL, env.OPENROUTER_GEMMA_API_KEY, env.SALLYIP_GEMMA_MODEL, env.OPENROUTER_RERANK_API_KEY, env.SALLYIP_RERANK_MODEL, env.OPENROUTER_OX_API_KEY, env.SALLYIP_OX_MODEL)],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
}})
