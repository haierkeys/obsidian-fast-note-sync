// Execute actual download handlers against an in-memory vault; no network or live vault.
// The guard compares file stats only (no read before the slot); a byte change that keeps
// mtime and size identical is out of scope.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const ts=require('typescript');
const root=path.join(__dirname,'..');
const source=fs.readFileSync(path.join(root,'src/lib/sync/operator_file.ts'),'utf8')+'\nexport {handleFileChunkDownloadComplete as testComplete, captureDownloadGuard as testCapture};\n';
const transpiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const noop=()=>{};class TFile{constructor(p){this.path=p;this.stat={size:1,ctime:1,mtime:100};this.bytes=[0];}}
const errors=[];const m={exports:{}};
const helpers={dump:noop,dumpError:(...a)=>errors.push(a.map(String)),isLargeBinarySyncRisk:()=>false,isPathExcluded:()=>false,checkAndNotifyCaseConflict:()=>false,hashArrayBuffer:async b=>String(new Uint8Array(b)[0]),getPluginDir:()=>'.plugin',logMemorySnapshot:noop};
vm.runInNewContext(transpiled,{module:m,exports:m.exports,console,Uint8Array,ArrayBuffer,Map,Set,Date,window:{setTimeout:()=>1,clearTimeout:noop},require:id=>{
 if(id==='obsidian')return{TFile,normalizePath:p=>p,Platform:{isMobile:false}};
 if(id==='../utils/helpers')return helpers;
 if(id.includes('sync_log_manager'))return{SyncLogManager:{getInstance:()=>({addLog:noop,addOrUpdateLog:noop})}};
 if(id.includes('remote_path_guard'))return{blockAliasedRemoteMutation:()=>false};
 return {};
}});
function fixture(){
 const files=new Map([['example.bin',new TFile('example.bin')]]),writes=[],cache=[],meta=new Map(),reads=[];
 const plugin={progressTracker:{recordDownloadComplete:noop},settings:{syncEnabled:true,cloudPreviewEnabled:false},syncState:{activeSyncContext:'ctx',pendingFilePushPageIndex:new Map()},pendingUploadHashes:new Map(),pendingDeleteFilePaths:new Set(),pendingFileDeleteAcks:new Set(),fileDownloadSessions:new Map(),lastSyncMtime:new Map(),downloadedFilesCount:0,
  app:{vault:{getFileByPath:p=>files.get(p),getFolderByPath:()=>({}),createFolder:async()=>{},readBinary:async f=>{reads.push(f.path);return Uint8Array.from(f.bytes).buffer;},modifyBinary:async(f,b,o)=>{f.bytes=[...new Uint8Array(b)];Object.assign(f.stat,o,{size:b.byteLength});writes.push({kind:'modify',bytes:f.bytes});},createBinary:async(p,b,o)=>{const f=new TFile(p);f.bytes=[...new Uint8Array(b)];Object.assign(f.stat,o,{size:b.byteLength});files.set(p,f);writes.push({kind:'create',bytes:f.bytes});}}},
  lockManager:{withLock:async(_p,fn)=>fn()},addIgnoredFile:noop,removeIgnoredFile:noop,localStorageManager:{getMetadata:k=>meta.get(k)||0,setMetadata:(k,v)=>meta.set(k,v)},fileHashManager:{setFileHash:(...x)=>cache.push(x)},concurrencyLimiter:{releaseSlot:noop},recordSyncCompleted:noop,fileSyncTasks:{failed:0}};
 const session=async(id,byte)=>{const s={commitGuard:await m.exports.testCapture(plugin,'example.bin'),path:'example.bin',sessionId:id,contentHash:String(byte),ctime:1,mtime:50,lastTime:1000,size:1,totalChunks:1,chunks:new Map([[0,Uint8Array.from([byte]).buffer]]),pageIndex:1};plugin.fileDownloadSessions.set(id,s);return s;};
 return{plugin,files,writes,cache,reads,session,view:()=>({bytes:files.get('example.bin')?.bytes??null,mtime:files.get('example.bin')?.stat.mtime??null,exists:files.has('example.bin')})};
}
const results=[];async function run(name,setup,expect){const f=fixture();await setup(f);const actual=f.view();const normal=name.startsWith('normal')||name.startsWith('uncontested');assert.equal(f.plugin.fileSyncTasks.failed,normal?0:1,name+' failure accounting');assert.equal(f.cache.length,(normal||name.startsWith('older session'))?1:0,name+' acknowledged hash must only advance on commit');results.push({name,actual,expected:expect,protectionPassed:JSON.stringify(actual)===JSON.stringify(expect),writes:f.writes});}
(async()=>{
 await run('normal download control',async f=>m.exports.testComplete(await f.session('a',2),f.plugin),{bytes:[2],mtime:50,exists:true});
 await run('unsent local edit during download',async f=>{const s=await f.session('a',2);f.files.get('example.bin').bytes=[9];f.files.get('example.bin').stat.mtime=200;f.plugin.pendingUploadHashes.set('example.bin','9');await m.exports.testComplete(s,f.plugin);},{bytes:[9],mtime:200,exists:true});
 await run('local delete during download',async f=>{const s=await f.session('a',2);f.files.delete('example.bin');f.plugin.pendingDeleteFilePaths.add('example.bin');await m.exports.testComplete(s,f.plugin);},{bytes:null,mtime:null,exists:false});
 await run('older session finishes after newer session',async f=>{const a=await f.session('a',1),b=await f.session('b',2);b.lastTime=2000;await m.exports.testComplete(b,f.plugin);await m.exports.testComplete(a,f.plugin);},{bytes:[2],mtime:50,exists:true});
 await run('retained finalizer after session map cancelled',async f=>{const a=await f.session('a',2);f.plugin.fileDownloadSessions.clear();f.plugin.syncState.activeSyncContext=null;await m.exports.testComplete(a,f.plugin);},{bytes:[0],mtime:100,exists:true});
 await run('sync disabled while finalizer awaiting commit',async f=>{const a=await f.session('a',2);f.plugin.settings.syncEnabled=false;await m.exports.testComplete(a,f.plugin);},{bytes:[0],mtime:100,exists:true});
 await run('disconnect invalidates retained session',async f=>{const a=await f.session('a',2);m.exports.invalidateFileDownloads(f.plugin);await m.exports.testComplete(a,f.plugin);},{bytes:[0],mtime:100,exists:true});
 await run('disabled while waiting for the path lock',async f=>{const a=await f.session('a',2);f.plugin.lockManager.withLock=async(_p,fn)=>{f.plugin.settings.syncEnabled=false;return fn();};await m.exports.testComplete(a,f.plugin);},{bytes:[0],mtime:100,exists:true});
 await run('uncontested absent file downloads',async f=>{f.files.clear();await m.exports.testComplete(await f.session('a',2),f.plugin);},{bytes:[2],mtime:50,exists:true});

 {const f=fixture();await f.session('a',2);await f.session('b',3);assert.equal(f.reads.length,0,'capturing the guard must not read local files');}
 {// receiveFileSyncChunkDownload: unsolicited replies are ignored; a changed server version is accepted.
  const f=fixture();const p=f.plugin;p.app.vault.adapter={exists:async()=>true,mkdir:async()=>{}};
  await m.exports.receiveFileSyncChunkDownload({path:'example.bin',sessionId:'s1',totalChunks:1,size:1,chunkSize:1,contentHash:'7',ctime:1,mtime:60},p);
  assert.equal(p.fileDownloadSessions.size,0,'reply without a pending request must not create a session');
  p.fileDownloadSessions.set('temp_example.bin',{commitGuard:await m.exports.testCapture(p,'example.bin'),path:'example.bin',contentHash:'old',ctime:1,mtime:50,lastTime:5,sessionId:'',totalChunks:0,size:1,pageIndex:2,initialSlotKey:'download_example.bin'});
  await m.exports.receiveFileSyncChunkDownload({path:'example.bin',sessionId:'s2',totalChunks:1,size:1,chunkSize:1,contentHash:'7',ctime:1,mtime:60},p);
  const s=p.fileDownloadSessions.get('s2');assert.ok(s,'reply for a pending request with newer server metadata must proceed');
  assert.equal(s.contentHash,'7');assert.equal(s.pageIndex,2);assert.ok(s.commitGuard,'guard carried to the real session');
  assert.equal(p.fileDownloadSessions.has('temp_example.bin'),false);}
 assert.equal(results[0].protectionPassed,true,'control must work');
 for(const r of results)assert.equal(r.protectionPassed,true,r.name);
 console.log('download commit race tests passed ('+results.length+' cases)');

})().catch(e=>{console.error(e);process.exitCode=1;});
