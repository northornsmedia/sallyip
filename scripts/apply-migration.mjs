import {readFile} from 'node:fs/promises'
import {neon} from '@neondatabase/serverless'

const filename=process.argv[2]
if(!filename)throw new Error('Usage: node scripts/apply-migration.mjs <migration.sql>')
if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL is required')

function splitStatements(source){const statements=[];let current='',quote=null,dollar=null;for(let i=0;i<source.length;i++){const char=source[i],next=source[i+1];if(dollar){current+=char;if(source.startsWith(dollar,i)){current+=dollar.slice(1);i+=dollar.length-1;dollar=null}continue}if(quote){current+=char;if(char===quote){if(next===quote){current+=next;i++}else quote=null}continue}if(char==='\''||char==='"'){quote=char;current+=char;continue}if(char==='$'){const match=source.slice(i).match(/^\$[A-Za-z0-9_]*\$/);if(match){dollar=match[0];current+=dollar;i+=dollar.length-1;continue}}if(char==='-'&&next==='-'){const end=source.indexOf('\n',i);if(end===-1)break;current+=source.slice(i,end+1);i=end;continue}if(char===';'){if(current.trim())statements.push(current.trim());current='';continue}current+=char}if(current.trim())statements.push(current.trim());return statements}

const sql=neon(process.env.DATABASE_URL),source=await readFile(filename,'utf8'),statements=splitStatements(source)
for(const statement of statements)await sql.query(statement)
console.log(`Applied ${filename} (${statements.length} statements)`)
