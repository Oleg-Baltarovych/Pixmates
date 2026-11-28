import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  expectedPageUrl,
  pageSource,
  preloadPath,
  rendererRoot,
  trustedDevServerUrl,
  type PathContext,
} from '../../../src/main/windows/paths.ts';

const mainDir = join('C:', 'app', 'out', 'main');
const prod: PathContext = { mainDir, dev: false, devServerUrl: undefined };
const dev: PathContext = { mainDir, dev: true, devServerUrl: 'http://localhost:5173' };

describe('trustedDevServerUrl', () => {
  it('accepts loopback http only in a dev run', () => {
    expect(trustedDevServerUrl(dev)).toBe('http://localhost:5173');
    expect(trustedDevServerUrl({ ...dev, devServerUrl: 'http://127.0.0.1:5174/' })).toBe('http://127.0.0.1:5174');
  });

  it.each([
    'https://localhost:5173',
    'http://evil.example:5173',
    'http://localhost.evil.example',
    'http://localhost:5173/x',
    'file:///C:/x',
    'not a url',
  ])('rejects %s', (url) => {
    expect(trustedDevServerUrl({ ...dev, devServerUrl: url })).toBeUndefined();
  });

  it('ignores the variable outside a dev run', () => {
    expect(trustedDevServerUrl({ ...dev, dev: false })).toBeUndefined();
  });
});

describe('pageSource / expectedPageUrl / preloadPath', () => {
  it('loads the app:// scheme in production and the dev server in dev', () => {
    expect(pageSource('stage', prod)).toEqual({ url: 'app://renderer/stage/index.html' });
    expect(pageSource('stage', { ...dev, devServerUrl: undefined })).toEqual({
      url: 'app://renderer/stage/index.html',
    });
    expect(pageSource('chat', dev)).toEqual({ url: 'http://localhost:5173/chat/index.html' });
    expect(rendererRoot(prod)).toBe(join(mainDir, '..', 'renderer'));
  });

  it('expects the sender frame at the exact page URL', () => {
    expect(expectedPageUrl('settings', prod)).toBe('app://renderer/settings/index.html');
    expect(expectedPageUrl('stage', dev)).toBe('http://localhost:5173/stage/index.html');
  });

  it('uses the CommonJS preload bundle of the role', () => {
    expect(preloadPath('chat', prod)).toBe(join(mainDir, '..', 'preload', 'chat.cjs'));
  });
});
