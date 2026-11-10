import test from 'node:test';
import assert from 'node:assert/strict';
import { createZip } from '../src/shared/zip-write.js';
import { readBugpack } from '../cli/zip-reader.js';
import { redactText, redactUrl, sanitizeStorage } from '../src/shared/redact.js';

async function zipBuffer(entries) {
  return Buffer.from(await (await createZip(entries)).arrayBuffer());
}

test('creates and reads a .bugpack with a validated report', async () => {
  const report = { schemaVersion: 1, id: 'case-123', title: 'Button fails' };
  const archive = await zipBuffer([
    { name: 'report.json', data: JSON.stringify(report) },
    { name: 'report.md', data: '# Button fails' },
    { name: 'video/part-01.webm', data: new Uint8Array([1, 2, 3]) },
  ]);
  const parsed = readBugpack(archive);
  assert.equal(parsed.report.id, 'case-123');
  assert.equal(parsed.files.get('report.md').toString(), '# Button fails');
  assert.deepEqual([...parsed.files.get('video/part-01.webm')], [1, 2, 3]);
});

test('rejects path traversal and malformed reports', async () => {
  await assert.rejects(() => createZip([{ name: '../outside.txt', data: 'no' }]), /Unsafe ZIP path/);
  const archive = await zipBuffer([{ name: 'report.json', data: JSON.stringify({ schemaVersion: 2, id: 'x' }) }]);
  assert.throws(() => readBugpack(archive), /Unsupported bugpack schema/);
});

test('masks common credentials in storage and text', () => {
  const storage = sanitizeStorage({ access_token: 'a-secret', theme: 'dark', preferences: '{"apiKey":"secret-value"}' });
  assert.equal(storage.access_token, '[REDACTED: sensitive key]');
  assert.match(storage.preferences, /apiKey.*\[REDACTED\]/);
  assert.doesNotMatch(storage.preferences, /secret-value/);
  assert.equal(redactText('Authorization: Bearer abcdEFGH1234567890'), 'Authorization: [REDACTED]');
  assert.match(redactUrl('https://example.com/api?token=abcd&view=1'), /token=%5BREDACTED%5D/);
});
