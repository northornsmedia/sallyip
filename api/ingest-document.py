from http.server import BaseHTTPRequestHandler
from http.cookies import SimpleCookie
import base64, hashlib, json, os, pathlib, re, sys, time, urllib.request
import psycopg

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / "scripts"))
from parse_legal_document import parse_document, SUPPORTED_EXTENSIONS

MAX_BYTES = 12 * 1024 * 1024


def embed_source(source_id):
    key=os.environ.get("OPENROUTER_EMBEDDING_API_KEY")
    if not key:return {"embedded":0,"status":"not_configured"}
    model=os.environ.get("SALLYIP_EMBEDDING_MODEL","liquid/lfm-2.5-embedding-350m:free")
    with psycopg.connect(os.environ["DATABASE_URL"]) as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id,content FROM knowledge_chunks WHERE source_id=%s AND embedding IS NULL ORDER BY chunk_index LIMIT 128",(source_id,));chunks=cur.fetchall()
            embedded=0
            for offset in range(0,len(chunks),16):
                batch=chunks[offset:offset+16];body=json.dumps({"model":model,"input":[item[1][:7000] for item in batch],"encoding_format":"float"}).encode()
                request=urllib.request.Request("https://openrouter.ai/api/v1/embeddings",data=body,method="POST",headers={"Authorization":f"Bearer {key}","Content-Type":"application/json","HTTP-Referer":"https://sallyip.com","X-Title":"SallyIP Labs"})
                with urllib.request.urlopen(request,timeout=8) as response:vectors=json.loads(response.read()).get("data",[])
                for index,item in enumerate(batch):
                    vector=vectors[index].get("embedding") if index<len(vectors) else None
                    if not isinstance(vector,list) or len(vector)!=1024:continue
                    cur.execute("UPDATE knowledge_chunks SET embedding=%s::vector,embedding_model=%s WHERE id=%s",("["+",".join(str(float(value)) for value in vector)+"]",model,item[0]));embedded+=1
    return {"embedded":embedded,"status":"complete" if embedded==len(chunks) else "partial"}


class handler(BaseHTTPRequestHandler):
    def reply(self, status, payload):
        body=json.dumps(payload).encode();self.send_response(status);self.send_header("Content-Type","application/json");self.send_header("Content-Length",str(len(body)));self.end_headers();self.wfile.write(body)

    def do_POST(self):
        started=time.monotonic();source_id=None
        try:
            cookie=SimpleCookie(self.headers.get("Cookie",""));token=cookie.get("sally_session")
            if not token:return self.reply(401,{"error":{"message":"Not authenticated"}})
            length=int(self.headers.get("Content-Length","0"))
            if length<=0 or length>MAX_BYTES*1.5:return self.reply(413,{"error":{"message":"Document is too large"}})
            payload=json.loads(self.rfile.read(length));filename=str(payload.get("filename","")).strip();matter_id=payload.get("matter_id")
            if payload.get("rights_confirmed") is not True:return self.reply(400,{"error":{"message":"Confirm that you are authorised to use this document"}})
            extension=pathlib.Path(filename).suffix.lower().lstrip(".")
            if extension not in SUPPORTED_EXTENSIONS:return self.reply(400,{"error":{"message":"Supported formats: PDF, DOCX, TXT, Markdown, CSV and XLSX"}})
            safe_filename=re.sub(r"[^A-Za-z0-9._ -]+","_",pathlib.Path(filename).name)[:180]
            data=base64.b64decode(payload.get("data","") or "",validate=True)
            if not data or len(data)>MAX_BYTES:return self.reply(413,{"error":{"message":"Document is empty or too large"}})
            checksum=hashlib.sha256(data).hexdigest();parsed=parse_document(data,extension)
            with psycopg.connect(os.environ["DATABASE_URL"]) as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT u.id FROM auth_sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=%s AND s.expires_at>now() LIMIT 1",(hashlib.sha256(token.value.encode()).hexdigest(),));user=cur.fetchone()
                    if not user:return self.reply(401,{"error":{"message":"Session expired"}})
                    cur.execute("SELECT id FROM matters WHERE id=%s AND user_id=%s",(matter_id,user[0]));matter=cur.fetchone()
                    if not matter:return self.reply(404,{"error":{"message":"Select a valid matter before uploading"}})
                    cur.execute("SELECT id,legal_source_id FROM knowledge_sources WHERE user_id=%s AND matter_id=%s AND checksum_sha256=%s",(user[0],matter[0],checksum));duplicate=cur.fetchone()
                    if duplicate:return self.reply(200,{"success":True,"duplicate":True,"source":{"id":str(duplicate[0]),"legal_source_id":str(duplicate[1]),"name":safe_filename,"passage_count":parsed["passage_count"]}})
                    authority_tier=min(5,max(1,int(payload.get("authority_tier",5))));source_type=str(payload.get("source_type","uploaded_document"))[:80]
                    cur.execute("INSERT INTO legal_sources(user_id,matter_id,title,source_type,authority_tier,jurisdiction,citation,official_url,authority_status,retrieval_method) VALUES(%s,%s,%s,%s,%s,%s,%s,%s,'unknown','uploaded') RETURNING id",(user[0],matter[0],payload.get("title") or safe_filename,source_type,authority_tier,payload.get("jurisdiction"),payload.get("citation"),payload.get("official_url")));legal_source_id=cur.fetchone()[0]
                    mime={"pdf":"application/pdf","docx":"application/vnd.openxmlformats-officedocument.wordprocessingml.document","xlsx":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet","csv":"text/csv","md":"text/markdown","txt":"text/plain"}[extension]
                    cur.execute("INSERT INTO knowledge_sources(user_id,matter_id,legal_source_id,name,original_filename,mime_type,size_bytes,checksum_sha256,rights_confirmed,status,page_count,passage_count,access_scope) VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s,'ready',%s,%s,'matter') RETURNING id",(user[0],matter[0],legal_source_id,safe_filename,safe_filename,mime,len(data),checksum,bool(payload.get("rights_confirmed")),parsed["page_count"],parsed["passage_count"]));source_id=cur.fetchone()[0]
                    cur.execute("INSERT INTO knowledge_source_files(source_id,content) VALUES(%s,%s)",(source_id,data))
                    for index,item in enumerate(parsed["passages"]):
                        passage_checksum=hashlib.sha256(item["content"].encode()).hexdigest()
                        cur.execute("INSERT INTO source_passages(source_id,locator_type,locator,content,checksum_sha256) VALUES(%s,%s,%s,%s,%s)",(legal_source_id,item["locator_type"],item["locator"],item["content"],passage_checksum))
                        cur.execute("INSERT INTO knowledge_chunks(source_id,chunk_index,page_from,page_to,content,token_estimate) VALUES(%s,%s,%s,%s,%s,%s)",(source_id,index,item.get("page_from"),item.get("page_to"),item["content"],max(1,len(item["content"])//4)))
            try:embedding=embed_source(source_id)
            except Exception as embedding_error:
                embedding={"embedded":0,"status":"failed"};print(json.dumps({"event":"document_embedding","source_id":str(source_id),"success":False,"error":type(embedding_error).__name__}),file=sys.stderr)
            print(json.dumps({"event":"document_ingestion","source_id":str(source_id),"format":extension,"size":len(data),"passages":parsed["passage_count"],"embeddings":embedding["embedded"],"latency_ms":round((time.monotonic()-started)*1000),"success":True}),file=sys.stderr)
            return self.reply(201,{"success":True,"source":{"id":str(source_id),"legal_source_id":str(legal_source_id),"name":safe_filename,"format":extension,"size":len(data),"page_count":parsed["page_count"],"passage_count":parsed["passage_count"],"status":"ready"},"embedding":embedding})
        except ValueError as error:return self.reply(400,{"error":{"message":str(error)}})
        except Exception as error:
            print(json.dumps({"event":"document_ingestion","source_id":str(source_id) if source_id else None,"success":False,"error":type(error).__name__}),file=sys.stderr);return self.reply(500,{"error":{"message":"Sally could not ingest this document"}})
