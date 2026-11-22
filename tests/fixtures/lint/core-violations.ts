// Lint fixture: linted by tests/unit/lint/core-purity.test.ts under a virtual `src/core/...` path.
// Every line tagged `expect: <rule>` must produce exactly that core-purity error; untagged lines must be clean.
// Rule ids mirror the checks in .claude/hooks/core-purity.mjs. Excluded from `pnpm lint` and `pnpm typecheck`.
import { app } from 'electron'; // expect: platform-package
import { Application } from 'pixi.js'; // expect: platform-package
import { useState } from 'react'; // expect: platform-package
import { createRoot } from 'react-dom/client'; // expect: platform-package
import { create } from 'zustand'; // expect: platform-package
import si from 'systeminformation'; // expect: platform-package
import { generateText } from 'ai'; // expect: platform-package
import { anthropic } from '@ai-sdk/anthropic'; // expect: platform-package
import { McpServer } from '@modelcontextprotocol/server'; // expect: platform-package
import Store from 'electron-store'; // expect: platform-package
import { readFileSync } from 'node:fs'; // expect: node-builtin
import path from 'path'; // expect: node-builtin
import { EventEmitter } from 'events'; // expect: node-builtin
import { windows } from '../main/windows/manager.ts'; // expect: outer-layer
import { api } from '../../renderer/stage/main.ts'; // expect: outer-layer
import { bridge } from '../preload/stage.ts'; // expect: outer-layer
import { CHANNEL } from '../shared/ipc-channels.ts';

export const used = [app, Application, useState, createRoot, create, si, generateText, anthropic, McpServer, Store];
export const used2 = [readFileSync, path, EventEmitter, windows, api, bridge, CHANNEL];

export const a = Date.now(); // expect: clock
export const b = new Date(); // expect: clock
export const c = performance.now(); // expect: clock
export const d = Math.random(); // expect: random
export const e = window.innerWidth; // expect: browser-global
export const f = document.title; // expect: browser-global
export const g = navigator.language; // expect: browser-global
export const h = localStorage.getItem('k'); // expect: browser-global
export const i = process.env; // expect: browser-global
setTimeout(() => undefined, 1); // expect: timer
setInterval(() => undefined, 1); // expect: timer
requestAnimationFrame(() => undefined); // expect: timer
queueMicrotask(() => undefined); // expect: timer
export const j = require('fs'); // expect: require
