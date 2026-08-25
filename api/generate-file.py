from http.server import BaseHTTPRequestHandler
from http.cookies import SimpleCookie
import hashlib, json, os, pathlib, sys, time
import psycopg

sys.path.insert(0,str(pathlib.Path(__file__).resolve().parents[1] / 'scripts'))
from create_chat_file import build_file, FORMATS

class handler(BaseHTTPRequestHandler):
    def reply(self,status,payload):
        body=json.dumps(payload).encode();self.send_response(status);self.send_header('Content-Type','application/json');self.send_header('Content-Length',str(len(body)));self.end_headers();self.wfile.write(body)

    def do_POST(self):
        started=time.monotonic();fmt=None;artifact_id=None;artifact_version=None
        try:
            cookie=SimpleCookie(self.headers.get('Cookie',''));token=cookie.get('sally_session')
            if not token:return self.reply(401,{'error':{'message':'Not authenticated'}})
            length=int(self.headers.get('Content-Length','0'))
            if length<=0 or length>200000:return self.reply(413,{'error':{'message':'Invalid request size'}})
            payload=json.loads(self.rfile.read(length));fmt=str(payload.get('format','')).lower();title=str(payload.get('title','SallyIP document'));content=str(payload.get('content',''));requested_filename=payload.get('filename');conversation_id=payload.get('conversation_id');artifact_id=payload.get('artifact_id');artifact_version=payload.get('artifact_version')
            if fmt not in FORMATS:return self.reply(400,{'error':{'message':'Unsupported file format'}})
            with psycopg.connect(os.environ['DATABASE_URL']) as conn:
                with conn.cursor() as cur:
                    cur.execute('SELECT u.id FROM auth_sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=%s AND s.expires_at>now() LIMIT 1',(hashlib.sha256(token.value.encode()).hexdigest(),));user=cur.fetchone()
                    if not user:return self.reply(401,{'error':{'message':'Session expired'}})
                    valid_conversation=None
                    if conversation_id:
                        cur.execute('SELECT id FROM conversations WHERE id=%s AND user_id=%s',(conversation_id,user[0]));row=cur.fetchone();valid_conversation=row[0] if row else None
                    if artifact_id:
                        cur.execute('SELECT a.title,v.version,v.content FROM artifacts a JOIN artifact_versions v ON v.artifact_id=a.id AND v.version=COALESCE(%s,a.active_version) WHERE a.id=%s AND a.user_id=%s',(artifact_version,artifact_id,user[0]));resolved=cur.fetchone()
                        if not resolved:return self.reply(404,{'success':False,'error':'ARTIFACT_NOT_FOUND'})
                        title,artifact_version,content=resolved
                    filename,mime,data=build_file(fmt,title,content,requested_filename)
                    cur.execute('INSERT INTO generated_files(user_id,conversation_id,artifact_id,artifact_version,filename,mime_type,format,size_bytes,content) VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id',(user[0],valid_conversation,artifact_id,artifact_version,filename,mime,fmt,len(data),data));file_id=cur.fetchone()[0]
            print(json.dumps({'event':'generate_file','format':fmt,'artifact_id':artifact_id,'artifact_version':artifact_version,'success':True,'latency_ms':round((time.monotonic()-started)*1000)}),file=sys.stderr)
            return self.reply(200,{'success':True,'file':{'id':str(file_id),'name':filename,'mime_type':mime,'format':fmt,'size':len(data),'artifact_id':artifact_id,'artifact_version':artifact_version,'url':f'/api/generated-files?id={file_id}'}})
        except ValueError as error:
            print(json.dumps({'event':'generate_file_validation','format':fmt,'artifact_id':artifact_id,'success':False,'error':str(error),'latency_ms':round((time.monotonic()-started)*1000)}),file=sys.stderr);return self.reply(400,{'success':False,'error':'ARTIFACT_VALIDATION_FAILED'})
        except Exception as error:
            print(json.dumps({'event':'generate_file','format':fmt,'artifact_id':artifact_id,'success':False,'error':type(error).__name__,'latency_ms':round((time.monotonic()-started)*1000)}),file=sys.stderr);return self.reply(500,{'success':False,'error':'FILE_GENERATION_FAILED'})
