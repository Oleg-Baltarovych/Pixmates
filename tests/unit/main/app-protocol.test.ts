import { join, sep } from 'node:path';
import { describe, expect, it } from 'vitest';
import { resolveAppFile } from '../../../src/main/windows/app-protocol.ts';

const root = join('C:', 'app', 'out', 'renderer');

describe('resolveAppFile', () => {
  it.each([
    'app://renderer/stage/index.html:x.js',
    'app://renderer/assets/CON.js',
    'app://renderer/assets/nul.html',
    'app://renderer/assets/com1.js',
    'app://renderer/assets/a.js.',
    'app://renderer/assets%20/a.js',
    'app://renderer/assets/a%20.js',
    'app://renderer/assets//a.js',
    'app://renderer/.hidden/a.js',
  ])('rejects Windows-special or malformed segment %s', (url) => {
    expect(resolveAppFile(url, root)).toBeUndefined();
  });

  it('still serves real Vite asset names', () => {
    expect(resolveAppFile('app://renderer/assets/RenderTargetSystem-Cs9I6YND.js', root)?.mime).toBe(
      'text/javascript; charset=utf-8',
    );
    expect(resolveAppFile('app://renderer/assets/getTexelRangeRects-unDlTdp4.js', root)).toBeDefined();
  });
  it('serves files inside the renderer root with their MIME type', () => {
    expect(resolveAppFile('app://renderer/stage/index.html', root)).toEqual({
      path: join(root, 'stage', 'index.html'),
      mime: 'text/html; charset=utf-8',
    });
    expect(resolveAppFile('app://renderer/assets/main-abc.js?v=1#x', root)?.mime).toBe(
      'text/javascript; charset=utf-8',
    );
    expect(resolveAppFile('app://renderer/assets/a.css', root)?.path).toBe(join(root, 'assets', 'a.css'));
  });

  it.each([
    'app://renderer/../main/index.js',
    'app://renderer/%2e%2e/main/index.js',
    'app://renderer/stage/%2E%2E/%2E%2E/main/index.js',
  ])('dot segments in %s never escape the renderer root', (url) => {
    const file = resolveAppFile(url, root);
    // The URL parser folds dot segments at the root, so these land inside out/renderer (a 404), never in out/main.
    expect(file === undefined || file.path.startsWith(root + sep)).toBe(true);
    expect(file?.path).not.toBe(join(root, '..', 'main', 'index.js'));
  });

  it.each([
    'app://renderer/stage/..%2F..%2Fmain%2Findex.js',
    'app://renderer/..%5C..%5Cmain%5Cindex.js',
    'app://renderer/stage%5Cindex.html',
    'app://renderer/a%00.html',
    'app://renderer/%E0%A4%A',
    'app://renderer/',
    'app://renderer/stage/',
    'app://other/stage/index.html',
    'file:///C:/app/out/renderer/stage/index.html',
    'app://renderer/stage/secret.exe',
    'app://renderer/stage/noext',
    'not a url',
  ])('rejects %s', (url) => {
    expect(resolveAppFile(url, root)).toBeUndefined();
  });
});
