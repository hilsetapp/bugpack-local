import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { createZip } from '../src/shared/zip-write.js';

const cliPath = fileURLToPath(new URL('../cli/index.js', import.meta.url));

test('local MCP server lists and reads a selected bugpack', async () => {
  const root = await mkdtemp(join(tmpdir(), 'bugpack-mcp-'));
  const report = { schemaVersion: 1, id: 'case-456', title: 'Request fails', createdAt: '2026-10-15T12:00:00.000Z', page: { url: 'https://example.test' } };
  const entries = [
    { name: 'report.json', data: JSON.stringify(report) },
    { name: 'report.md', data: '# Request fails\n' },
    { name: 'prompt.md', data: 'Inspect the request and add a regression test.' },
    { name: 'events.json', data: '[]' },
    { name: 'network.har', data: '{"log":{"entries":[]}}' },
  ];
  await writeFile(join(root, 'case-456.bugpack'), Buffer.from(await (await createZip(entries)).arrayBuffer()));
  await mkdir(join(root, 'nested'));
  const transport = new StdioClientTransport({ command: process.execPath, args: [cliPath, 'mcp', root] });
  const client = new Client({ name: 'bugpack-test', version: '1.0.0' });
  try {
    await client.connect(transport);
    const list = await client.callTool({ name: 'list_bugpacks', arguments: {} });
    assert.match(list.content[0].text, /case-456/);
    const context = await client.callTool({ name: 'get_bug_context', arguments: { id: 'case-456', section: 'summary' } });
    assert.match(context.content[0].text, /Inspect the request/);
    assert.match(context.content[0].text, /Request fails/);
  } finally {
    await client.close();
    await rm(root, { recursive: true, force: true });
  }
});
