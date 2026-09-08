import { neon } from '@neondatabase/serverless'
import { clearSessionCookie, createSession, destroySession, getSessionUser, hashPassword, sessionCookie, verifyPassword } from '../../src/lib/auth.js'
import { getClientIp, logSecurityEvent, loginBlocked, recordLoginAttempt } from '../../src/lib/security.js'

const safeUser = user => ({id:user.id,email:user.email,name:user.full_name,initials:user.initials,role:user.role})

export default async function handler(req,res){
  const sql=neon(process.env.DATABASE_URL)
  const secure=process.env.NODE_ENV==='production'
  try{
    if(req.method==='GET'){
      const user=await getSessionUser(sql,req.headers.cookie)
      return user?res.status(200).json({user:safeUser(user)}):res.status(401).json({error:{message:'Not authenticated'}})
    }
    if(req.method!=='POST')return res.status(405).json({error:{message:'Method not allowed'}})
    const {action,email='',password='',name=''}=req.body||{}
    if(action==='logout'){
      const me=await getSessionUser(sql,req.headers.cookie)
      await destroySession(sql,req.headers.cookie)
      await logSecurityEvent(sql,{userId:me?.id||null,event_type:'logout',req})
      res.setHeader('Set-Cookie',clearSessionCookie(secure))
      return res.status(200).json({ok:true})
    }
    const normalized=email.trim().toLowerCase()
    if(!/^\S+@\S+\.\S+$/.test(normalized))return res.status(400).json({error:{message:'Enter a valid email address'}})
    if(password.length<8)return res.status(400).json({error:{message:'Password must contain at least 8 characters'}})
    const attemptKey=`${normalized}|${getClientIp(req)||'unknown'}`
    if(await loginBlocked(sql,attemptKey)){await logSecurityEvent(sql,{event_type:'login_rate_limited',req,metadata:{email:normalized}});return res.status(429).json({error:{message:'Too many attempts. Try again in a few minutes.'}})}
    let user
    if(action==='signup'){
      const fullName=name.trim()
      if(fullName.length<2)return res.status(400).json({error:{message:'Enter your name'}})
      const initials=fullName.split(/\s+/).slice(0,2).map(part=>part[0]).join('').toUpperCase()
      const passwordHash=await hashPassword(password)
      try{[user]=await sql`INSERT INTO users (email,full_name,initials,password_hash) VALUES (${normalized},${fullName},${initials},${passwordHash}) RETURNING id,email,full_name,initials,role`}
      catch(error){if(error.code==='23505')return res.status(409).json({error:{message:'An account with this email already exists'}});throw error}
      await sql`INSERT INTO subscriptions (user_id,plan_id,status) VALUES (${user.id},'basic','active')`
      await logSecurityEvent(sql,{userId:user.id,event_type:'signup',req})
    }else if(action==='login'){
      [user]=await sql`SELECT id,email,full_name,initials,role,password_hash FROM users WHERE email=${normalized} LIMIT 1`
      if(!user||!await verifyPassword(password,user.password_hash)){await recordLoginAttempt(sql,attemptKey);await logSecurityEvent(sql,{userId:user?.id||null,event_type:'login_failed',req,metadata:{email:normalized}});return res.status(401).json({error:{message:'Incorrect email or password'}})}
      await logSecurityEvent(sql,{userId:user.id,event_type:'login_success',req})
    }else return res.status(400).json({error:{message:'Unknown authentication action'}})
    const token=await createSession(sql,user.id)
    res.setHeader('Set-Cookie',sessionCookie(token,secure))
    return res.status(200).json({user:safeUser(user)})
  }catch(error){return res.status(500).json({error:{message:'Authentication is temporarily unavailable'}})}
}
