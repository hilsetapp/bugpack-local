#!/usr/bin/env node
import { readdir, readFile, lstat } from 'node:fs/promises';
import { resolve, join, basename } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { readBugpack } from './zip-reader.js';

function expandHome(value) {
  if (value === '~') return homedir();
  if (value.startsWith('~/')) return join(homedir(), value.slice(2));
  return value;
}

function idFromFilename(name) {
  return name.endsWith('.bugpack') ? name.slice(0, -8) : '';
}

async function readReportInDir(root, id) {
  if (!/^[a-zA-Z0-9._-]{1,120}$/.test(id) || id.includes('..')) throw new Error('Invalid bugpack id.');
  const path = resolve(root, `${id}.bugpack`);
  if (resolve(path, '..') !== resolve(root)) throw new Error('Bugpack path is outside the selected folder.');
  const info = await lstat(path);
  if (!info.isFile() || info.isSymbolicLink()) throw new Error('Bugpack is not a regular file.');
  return readBugpack(await readFile(path));
}

async function listReports(root) {
  const resolved = resolve(root);
  const names = await readdir(resolved);
  const reports = [];
  for (const name of names.filter((entry) => entry.endsWith('.bugpack')).sort().reverse().slice(0, 100)) {
    try {
      const parsed = await readReportInDir(resolved, idFromFilename(name));
      const report = parsed.report;
      reports.push({ id: report.id, title: report.title || 'Untitled bug', createdAt: report.createdAt, url: report.page?.url || '' });
    } catch (error) {
      reports.push({ id: idFromFilename(name), invalid: error.message });
    }
  }
  return reports;
}

function textResult(text, isError = false) {
  return { content: [{ type: 'text', text }], ...(isError ? { isError: true } : {}) };
}

async function startMcp(rootArg) {
  const root = resolve(expandHome(rootArg));
  const server = new McpServer({ name: 'bugpack-local', version: '0.1.1' });

  server.registerTool('list_bugpacks', {
    title: 'List local bug reports',
    description: 'List .bugpack files in the configured local folder. No other paths are read.',
    inputSchema: {},
  }, async () => {
    try { return textResult(JSON.stringify(await listReports(root), null, 2)); }
    catch (error) { return textResult(`Could not list bugpacks: ${error.message}`, true); }
  });

  server.registerTool('get_bug_context', {
    title: 'Read bug report context',
    description: 'Read the human report, generated coding prompt, event timeline, console, network, and redacted storage from one selected bugpack.',
    inputSchema: { id: z.string().min(1).max(120), section: z.enum(['all', 'summary', 'events', 'network', 'storage']).optional() },
  }, async ({ id, section = 'all' }) => {
    try {
      const { report, files } = await readReportInDir(root, id);
      const include = (name) => files.get(name)?.toString('utf8') ?? '';
      const sections = {
        summary: ['report.md', 'prompt.md'],
        events: ['events.json'],
        network: ['network.har'],
        storage: ['storage.json'],
        all: ['report.md', 'prompt.md', 'events.json', 'network.har', 'storage.json'],
      }[section];
      const text = sections.map((name) => {
        const value = include(name);
        return value ? `## ${name}\n${value}` : '';
      }).filter(Boolean).join('\n\n');
      if (!text) return textResult(`No ${section} data was included in ${report.title || id}.`);
      const filesList = [...files.keys()].filter((name) => name.startsWith('video/')).map((name) => `- ${name} (video segment; available in the local package)`);
      const suffix = filesList.length ? `\n\n## Video files\n${filesList.join('\n')}` : '';
      const limit = 90_000;
      return textResult(`${text}${suffix}`.slice(0, limit));
    } catch (error) { return textResult(`Could not read bugpack: ${error.message}`, true); }
  });

  server.registerTool('get_bugpack_file', {
    title: 'Read a text file from a bugpack',
    description: 'Read a named text file from a selected package. Video and other binary files are not returned as text.',
    inputSchema: { id: z.string().min(1).max(120), path: z.string().min(1).max(160) },
  }, async ({ id, path }) => {
    try {
      if (path.startsWith('/') || path.includes('..') || path.includes('\\')) throw new Error('Invalid package path.');
      const { files } = await readReportInDir(root, id);
      if (/\.(?:webm|mp4|png|jpg|jpeg|gif|webp)$/i.test(path)) throw new Error('This is a binary attachment. Ask for its filename and use the local report viewer.');
      const data = files.get(path);
      if (!data) throw new Error('File not found in this bugpack.');
      if (data.length > 1_000_000) throw new Error('Text file exceeds the 1 MB limit.');
      return textResult(data.toString('utf8'));
    } catch (error) { return textResult(`Could not read package file: ${error.message}`, true); }
  });

  await server.connect(new StdioServerTransport());
}

async function run() {
  const [command, ...args] = process.argv.slice(2);
  if (command === 'mcp') {
    const directory = args[0] || '~/Downloads/Bugpack';
    await startMcp(directory);
    return;
  }
  if (command === 'list') {
    const directory = resolve(expandHome(args[0] || '~/Downloads/Bugpack'));
    console.log(JSON.stringify(await listReports(directory), null, 2));
    return;
  }
  if (command === 'inspect') {
    if (!args[0]) throw new Error('Usage: bugpack inspect <file.bugpack>');
    const path = resolve(expandHome(args[0]));
    const { report } = readBugpack(await readFile(path));
    console.log(JSON.stringify(report, null, 2));
    return;
  }
  if (command === '--version' || command === '-v') {
    console.log('bugpack-local 0.1.1');
    return;
  }
  console.log('Usage: bugpack <mcp [directory] | list [directory] | inspect <file.bugpack>');
}

run().catch((error) => {
  console.error(error.message || String(error));
  process.exitCode = 1;
});
