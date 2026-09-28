import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const timers = new Map(); let nextId = 1;
const window = {
  setTimeout: (fn) => { const id = nextId++; timers.set(id, fn); return id; },
  clearTimeout: (id) => timers.delete(id),
};
const module = { exports: {} };
const code = ts.transpileModule(fs.readFileSync('src/lib/sync/sync_progress_tracker.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
}).outputText;
vm.runInNewContext(code, { module, exports: module.exports, console, window,
  require: id => id.includes('helpers') ? { dump: () => {} } : {} });
const { SyncProgressTracker } = module.exports;
const fireAll = () => { const fns = [...timers.values()]; timers.clear(); fns.forEach(f => f()); };

const acks = [];
const t = new SyncProgressTracker();
t.onPageComplete = (type, page) => acks.push(page);
t.reset(['file']);
t.recordPageProgress('file', 0, 1, false);
t.recordPageProgress('file', 1, 2, false);
t.recordCompleted('file', 0);            // page 0 done -> ack 0, watermark -> 1
assert.deepEqual(acks, [0]);
t.recordCompleted('file', 1);            // page 1 half done, still processing

// Page 1 has arrived and is still being processed: no retransmitted ack
fireAll();
assert.deepEqual(acks, [0], 'must not resend ack while the next page is still being processed');
assert.equal(timers.size, 1, 'keeps rechecking');

// Page 1 completes -> ack 1, watermark -> 2; page 2 never arrives: nudge with highest ack
t.recordCompleted('file', 1);
assert.deepEqual(acks, [0, 1]);
fireAll();
assert.deepEqual(acks, [0, 1, 1], 'resends highest ack when the next page has not arrived');
console.log('stagnation ack tests passed');
