from http.server import BaseHTTPRequestHandler
from http.cookies import SimpleCookie
import hashlib, json, os, pathlib, sys
import psycopg

sys.path.insert(0,str(pathlib.Path(__file__).resolve().parents[1] / 'scripts'))
from create_chat_file import build_file, FORMATS

class handler(BaseHTTPRequestHandler):
    def reply(self,status,payload):
        body=json.dumps(payload).encode();self.send_response(status);self.send_header('Content-Type','application/json');self.send_header('Content-Length',str(len(body)));self.end_headers();self.wfile.write(body)

    def do_POST(self):
        try:
            cookie=SimpleCookie(self.headers.get('Cookie',''));token=cookie.get('sally_session')
            if not token:return self.reply(401,{'error':{'message':'Not authenticated'}})
            length=int(self.headers.get('Content-Length','0'))
            if length<=0 or length>200000:return self.reply(413,{'error':{'message':'Invalid request size'}})
            payload=json.loads(self.rfile.read(length));fmt=str(payload.get('format','')).lower();title=str(payload.get('title','SallyIP document'));content=str(payload.get('content',''));conversation_id=payload.get('conversation_id')
            if fmt not in FORMATS:return self.reply(400,{'error':{'message':'Unsupported file format'}})
            filename,mime,data=build_file(fmt,title,content)
            with psycopg.connect(os.environ['DATABASE_URL']) as conn:
                with conn.cursor() as cur:
                    cur.execute('SELECT u.id FROM auth_sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=%s AND s.expires_at>now() LIMIT 1',(hashlib.sha256(token.value.encode()).hexdigest(),));user=cur.fetchone()
                    if not user:return self.reply(401,{'error':{'message':'Session expired'}})
                    valid_conversation=None
                    if conversation_id:
                        cur.execute('SELECT id FROM conversations WHERE id=%s AND user_id=%s',(conversation_id,user[0]));row=cur.fetchone();valid_conversation=row[0] if row else None
                    cur.execute('INSERT INTO generated_files(user_id,conversation_id,filename,mime_type,format,size_bytes,content) VALUES(%s,%s,%s,%s,%s,%s,%s) RETURNING id',(user[0],valid_conversation,filename,mime,fmt,len(data),data));file_id=cur.fetchone()[0]
            return self.reply(200,{'file':{'id':str(file_id),'name':filename,'mime_type':mime,'format':fmt,'size':len(data),'url':f'/api/generated-files?id={file_id}'}})
        except ValueError as error:return self.reply(400,{'error':{'message':str(error)}})
        except Exception:return self.reply(500,{'error':{'message':'Sally could not create the file'}})

