import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source = ts.createSourceFile('operator.ts', fs.readFileSync('src/lib/sync/operator.ts', 'utf8'), ts.ScriptTarget.Latest, true);
let expression;
function visit(node) {
  if (ts.isCallExpression(node) && node.expression.getText(source) === 'Promise.race'
      && node.getText(source).includes('plugin.app.vault.read(file)')) expression = node.getText(source);
  ts.forEachChild(node, visit);
}
visit(source);
assert.ok(expression, 'exercise the actual note scan race expression');
const code = ts.transpileModule(`(${expression})`, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
function run(read) {
  const timers = [];
  const promise = vm.runInNewContext(code, {
    plugin: { app: { vault: { read } } }, file: {},
    hashContentAsync: async content => `hash:${content}`,
    window: { setTimeout: fn => timers.push(fn) }
  });
  return { promise, timers };
}
const blocked = run(() => new Promise(() => {}));
assert.equal(blocked.timers.length, 1, 'timeout must start before file read completes');
blocked.timers[0]();
await assert.rejects(blocked.promise, /Hash timeout/);
assert.equal(await run(async () => 'note').promise, 'hash:note');
await assert.rejects(run(async () => { throw new Error('read failed'); }).promise, /read failed/);
console.log('PASS: blocked read times out; successful and failed reads retain their results');
