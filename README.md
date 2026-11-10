# Bugpack Local

I built Bugpack Local to save a browser bug as one file that a person or a local coding agent can inspect. The extension records a short screen buffer and browser events, then lets me review the report before downloading it.

**English** | [Русский](README.ru.md)

## What I collect

- A rolling screen buffer of up to 30 seconds. I save it as short, playable WebM parts inside the package.
- Clicks, form actions without typed values, console output, uncaught errors, and fetch or XHR request status and timing.
- Local Storage and Session Storage at the moment I create the report. Common secret fields and token-shaped strings are masked.
- A readable report, a prompt in English and Russian, a basic HAR file, and the raw event timeline.

The browser asks me to choose a tab, window, or screen. Page events come from the active tab when I start, so I choose that same tab, its browser window, or the screen. The extension has no access to sites until I start a capture. I can stop, review, and remove a draft before sharing it.

## What I do not collect

I do not upload reports or run a server. I do not capture audio. I do not record field values from page events. The video itself is not blurred, and pattern-based redaction cannot catch every secret, so I review a package before sharing it.

The HAR contains fetch and XHR method, URL, status, and duration. I do not capture request or response bodies, headers, images, or every browser resource. I cannot read a framework's Redux store in a reliable, general way. Storage means Local Storage and Session Storage only.

## Install the extension

I target Chrome and Chromium-based browsers with Manifest V3. I have not verified this build in every Chromium browser.

1. Download `bugpack-local-extension.zip` from the [GitHub preview download](https://github.com/hilsetapp/bugpack-local/releases/download/v0.1.0/bugpack-local-extension.zip).
2. Unzip it to a folder.
3. Open `chrome://extensions`, turn on Developer mode, and choose **Load unpacked**.
4. Select the extracted folder and pin the extension.
5. Open the site to test, choose the Bugpack icon, and select the tab, window, or screen to record.
6. Reproduce the issue. Press `Alt+Shift+B` or choose **Save bug report**.
7. Review the draft and download the `.bugpack` file.

The screen capture uses the browser's own source picker. The selected source can include private information, so do not record passwords or personal data.

## Read a report with MCP

The MCP server reads only the folder I pass to it. It does not make network requests and cannot browse arbitrary paths on the computer.

```sh
npm ci
node cli/index.js mcp ~/Downloads/Bugpack
```

For Claude Code, from the repository folder:

```sh
claude mcp add bugpack-local -- node /absolute/path/to/bugpack-local/cli/index.js mcp ~/Downloads/Bugpack
```

The server provides three tools:

- `list_bugpacks` lists reports in the selected folder.
- `get_bug_context` reads the report, prompt, timeline, HAR, or storage section.
- `get_bugpack_file` reads a text file from one selected package. It will not return video as text.

I can also inspect a package without MCP:

```sh
node cli/index.js list ~/Downloads/Bugpack
node cli/index.js inspect ~/Downloads/Bugpack/report-id.bugpack
```

## Build and test

```sh
npm ci
npm test
npm run test:syntax
npm run pack:extension
```

`npm run pack:extension` creates `bugpack-local-extension.zip` in the project folder.

## Package layout

```text
report.json       structured source of record
report.md         readable report
prompt.md         English prompt for a coding agent
prompt.ru.md      Russian prompt for a coding agent
events.json       timestamped browser events
network.har       basic fetch/XHR entries
storage.json      reviewed Local Storage and Session Storage
video/            short WebM parts, when included
replay.html       local player for the video parts
```

I use `.bugpack` as a ZIP file extension. I keep the browser capture and MCP reader in this repository so the bundle can move between them as a plain file.
