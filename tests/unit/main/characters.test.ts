// M-ART MA-09/10/11: manifest schema + fallbacks, registry, app://characters host, stage:characters contract, lineup key.
import { mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { encodePng } from '../../../tools/lib/png.ts';
import { loadRegistry, pngSize } from '../../../src/main/characters/registry.ts';
import { selectCharacters } from '../../../src/main/characters/selection.ts';
import { formatKey, parseKey, shuffle } from '../../../src/main/dev/lineup.ts';
import { handleAppProtocol, readContainedFile, resolveCharacterFile } from '../../../src/main/windows/app-protocol.ts';
import { stageAnimation } from '../../../src/main/stage/controller.ts';
import { IPC } from '../../../src/shared/ipc.ts';
import {
  builtinPackId,
  checkStrips,
  facingOf,
  fxManifestSchema,
  isBuiltinPackId,
  manifestSchema,
  resolveAnim,
} from '../../../src/shared/pack.ts';

const anim = (y: number, frames = 2) => ({
  file: 'sprites/atlas.png',
  frames,
  fps: 8,
  loop: true,
  origin: { x: 0, y },
});
const makeManifest = (over: Record<string, unknown> = {}) => ({
  id: 'spike-test',
  name: 'Test',
  version: '0.0.1',
  frameSize: { w: 16, h: 16 },
  anchor: { x: 0.5, y: 1 },
  animations: { idle_a: anim(0), walk: anim(16) },
  fallbacks: { run: 'walk', '*': 'idle_a' },
  ...over,
});

describe('manifest schema (MA-09)', () => {
  it('accepts a valid built-in manifest with origin strips', () => {
    expect(manifestSchema.safeParse(makeManifest()).success).toBe(true);
  });
  it('requires walk and an idle', () => {
    expect(manifestSchema.safeParse(makeManifest({ animations: { idle_a: anim(0) } })).success).toBe(false);
    expect(manifestSchema.safeParse(makeManifest({ animations: { walk: anim(0) }, fallbacks: {} })).success).toBe(
      false,
    );
  });
  it('rejects unknown fields, bad files and fallbacks to nowhere', () => {
    expect(manifestSchema.safeParse(makeManifest({ script: 'x' })).success).toBe(false);
    const bad = makeManifest({ animations: { idle_a: { ...anim(0), file: '../x.png' }, walk: anim(16) } });
    expect(manifestSchema.safeParse(bad).success).toBe(false);
  });
  it('flags strips outside the texture and textures that are too big', () => {
    const m = manifestSchema.parse(makeManifest());
    expect(checkStrips(m, new Map([['sprites/atlas.png', { width: 32, height: 32 }]]))).toEqual([]);
    expect(checkStrips(m, new Map([['sprites/atlas.png', { width: 31, height: 32 }]]))).toHaveLength(2);
    expect(checkStrips(m, new Map([['sprites/atlas.png', { width: 4097, height: 32 }]]))[0]).toMatch(/exceeds/);
  });
  it('resolves fallbacks: direct, exact, namespace, star, chains, cycles → idle', () => {
    const m = {
      animations: { idle_a: {}, walk: {}, wave: {} },
      fallbacks: { run: 'walk', 'react:*': 'wave', climb: 'run', a: 'b', b: 'a' },
    };
    expect(resolveAnim('walk', m)).toBe('walk');
    expect(resolveAnim('run', m)).toBe('walk');
    expect(resolveAnim('climb', m)).toBe('walk');
    expect(resolveAnim('react:poke', m)).toBe('wave');
    expect(resolveAnim('a', m)).toBe('idle_a');
    expect(resolveAnim('nothing', m)).toBe('idle_a');
  });
});

function packDir(root: string, id: string, manifest: object, atlas = { width: 32, height: 32 }): void {
  mkdirSync(join(root, id, 'sprites'), { recursive: true });
  writeFileSync(join(root, id, 'manifest.json'), JSON.stringify(manifest));
  const data = new Uint8Array(atlas.width * atlas.height * 4);
  writeFileSync(join(root, id, 'sprites', 'atlas.png'), encodePng({ ...atlas, data }));
}

describe('character registry (MA-10)', () => {
  const root = mkdtempSync(join(tmpdir(), 'pixmates-chars-'));
  packDir(root, 'spike-test', makeManifest());
  packDir(root, 'pixmates.maid', makeManifest({ id: 'pixmates.maid' }));
  packDir(root, 'wrong-id', makeManifest({ id: 'other' }));
  packDir(root, 'tiny', makeManifest({ id: 'tiny' }), { width: 8, height: 8 });

  it('keeps valid packs, reports broken ones, hides spike packs when packaged', () => {
    const dev = loadRegistry(root, { includeSpike: true });
    expect([...dev.packs.keys()].sort()).toEqual(['pixmates.maid', 'spike-test']);
    expect(dev.errors.join('\n')).toMatch(/wrong-id: manifest id/);
    expect(dev.errors.join('\n')).toMatch(/tiny: .*leaves/);
    expect([...loadRegistry(root, { includeSpike: false }).packs.keys()]).toEqual(['pixmates.maid']);
    expect(loadRegistry(join(root, 'missing'), { includeSpike: true }).packs.size).toBe(0);
  });
  it('reads PNG sizes from the header only', () => {
    expect(pngSize(encodePng({ width: 3, height: 2, data: new Uint8Array(24) }))).toEqual({ width: 3, height: 2 });
    expect(pngSize(Buffer.from('not a png at all, really'))).toBeUndefined();
  });
  it('selects the requested pack, else the default, and labels the lineup A–D', () => {
    const { packs } = loadRegistry(root, { includeSpike: true });
    const keys = (s: ReturnType<typeof selectCharacters>) => s.characters.map((c) => c.key);
    const requested = selectCharacters({ packs, requested: 'spike-test' });
    expect(keys(requested)).toEqual(['spike-test']);
    expect(requested.warning ?? requested.error).toBeUndefined();
    expect(keys(selectCharacters({ packs }))).toEqual(['pixmates.maid']);
    const lineup = selectCharacters({ packs, lineup: ['spike-test', 'pixmates.maid'] });
    expect(lineup.characters.map((c) => c.label)).toEqual(['A', 'B']);
  });
  it('falls back to the default with a warning when --character names no valid pack (MA-30)', () => {
    const { packs } = loadRegistry(root, { includeSpike: true });
    const unknown = selectCharacters({ packs, requested: 'pixmates.nope' });
    expect(unknown.characters.map((c) => c.pack.id)).toEqual(['pixmates.maid']);
    expect(unknown.warning).toMatch(/pixmates\.nope.*pixmates\.maid/);
    expect(unknown.error).toBeUndefined();
  });
  it('reports an error and puts nobody on stage when no valid pack is left (MA-30)', () => {
    const none = selectCharacters({ packs: new Map() });
    expect(none.characters).toEqual([]);
    expect(none.error).toMatch(/no valid character pack/);
    const { packs } = loadRegistry(root, { includeSpike: true });
    const onlySpike = new Map([...packs].filter(([id]) => id !== 'pixmates.maid'));
    expect(selectCharacters({ packs: onlySpike, requested: 'pixmates.nope' }).error).toMatch(/pixmates\.maid/);
    expect(selectCharacters({ packs, lineup: ['spike-none'] }).error).toMatch(/no valid character pack/);
  });
});

describe('app://characters host (MA-10)', () => {
  const root = 'C:\\res\\characters';
  // Same rule as main/index.ts: only the registered atlas of a known pack (security review L2).
  const atlases = new Map([['maid', 'sprites/atlas.png']]);
  const known = (id: string, file: string) => atlases.get(id) === `sprites/${file}`;
  it('serves only sprites of known packs', () => {
    expect(resolveCharacterFile('app://characters/maid/sprites/atlas.png', root, known)?.mime).toBe('image/png');
    for (const url of [
      'app://characters/other/sprites/atlas.png',
      'app://characters/maid/manifest.json',
      'app://characters/maid/sprites/../manifest.json',
      'app://characters/maid/sprites/%2e%2e%2fmanifest.png',
      'app://characters/maid/sprites/a%5cb.png',
      'app://characters/maid/sprites/atlas.png?x=1',
      'app://characters/maid/sprites/con.png',
      'app://characters/maid/sprites/atlas.js',
      'app://renderer/maid/sprites/atlas.png',
      'app://characters/maid/sprites/x/atlas.png',
      'app://characters/maid/sprites/other.png',
      'app://characters/maid/sprites/atlas.webp',
    ]) {
      expect(resolveCharacterFile(url, root, known), url).toBeUndefined();
    }
  });
  it('answers CORS only for allowed page origins, and only GET', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'pixmates-host-'));
    packDir(dir, 'maid', makeManifest({ id: 'maid' }));
    let handler: ((r: Request) => Promise<Response>) | undefined;
    handleAppProtocol({ handle: (_s, h) => (handler = h) }, join(dir, 'renderer'), {
      root: dir,
      known,
      allowedOrigins: ['app://renderer'],
    });
    const get = (origin: string, method = 'GET') =>
      (handler as (r: Request) => Promise<Response>)(
        new Request('app://characters/maid/sprites/atlas.png', { method, headers: { origin } }),
      );
    const ok = await get('app://renderer');
    expect(ok.status).toBe(200);
    expect(ok.headers.get('access-control-allow-origin')).toBe('app://renderer');
    expect(ok.headers.get('content-type')).toBe('image/png');
    expect((await get('https://evil.example')).headers.get('access-control-allow-origin')).toBeNull();
    expect((await get('app://renderer', 'POST')).status).toBe(405);
  });
});

describe('stage:characters contract (MA-11)', () => {
  const schema = IPC['stage:characters'].payload;
  const entry = {
    key: 'A',
    label: 'A',
    frameSize: { w: 48, h: 48 },
    anchor: { x: 0.5, y: 1 },
    animations: { idle_a: { frames: 8, fps: 6, loop: true, origin: { x: 0, y: 0 } } },
    fallbacks: { '*': 'idle_a' },
    atlasUrl: 'app://characters/spike-maid-48soft/sprites/atlas.png',
    scale: 4,
  };
  it('accepts up to four entries from app://characters', () => {
    expect(schema.safeParse({ entries: [entry], animCycle: true }).success).toBe(true);
    const seat = (anchor: unknown) => ({
      ...entry,
      animations: { ...entry.animations, sit_edge: { frames: 6, fps: 6, loop: true, origin: { x: 0, y: 56 }, anchor } },
    });
    expect(schema.safeParse({ entries: [seat({ x: 0.5, y: 0.8 })], animCycle: false }).success).toBe(true);
    expect(schema.safeParse({ entries: [seat({ x: 0.5, y: 1.1 })], animCycle: false }).success).toBe(false);
    expect(schema.safeParse({ entries: [seat({ x: -0.1, y: 0.5 })], animCycle: false }).success).toBe(false);
    expect(schema.safeParse({ entries: [], animCycle: false }).success).toBe(true);
  });
  it('carries the manifest facing from main to the renderer and rejects unknown facings (MA-27a)', () => {
    const manifest = manifestSchema.parse(
      makeManifest({ animations: { idle_a: anim(0), walk: { ...anim(16), facing: 'right' } } }),
    );
    const animations = Object.fromEntries(
      Object.entries(manifest.animations).map(([name, a]) => [name, stageAnimation(a)]),
    );
    expect(animations.walk?.facing).toBe('right');
    expect(animations.idle_a && 'facing' in animations.idle_a).toBe(false);
    const parsed = schema.parse({ entries: [{ ...entry, animations }], animCycle: false });
    expect(parsed.entries[0]?.animations.walk?.facing).toBe('right');
    const bad = { ...entry, animations: { walk: { ...entry.animations.idle_a, facing: 'up' } } };
    expect(schema.safeParse({ entries: [bad], animCycle: false }).success).toBe(false);
  });
  it('rejects foreign atlas URLs, five entries, bad scale and extra fields', () => {
    const bad = (e: object) => schema.safeParse({ entries: [{ ...entry, ...e }], animCycle: false });
    expect(bad({ atlasUrl: 'https://evil.example/a.png' }).success).toBe(false);
    expect(bad({ atlasUrl: 'app://renderer/stage/a.png' }).success).toBe(false);
    expect(bad({ atlasUrl: 'app://characters/../x/sprites/a.png' }).success).toBe(false);
    expect(bad({ scale: 0 }).success).toBe(false);
    expect(bad({ label: 'E' }).success).toBe(false);
    expect(bad({ extra: 1 }).success).toBe(false);
    // MA-30: the M0 placeholder field is gone from the contract.
    expect(schema.safeParse({ entries: [], placeholderScale: 4, animCycle: false }).success).toBe(false);
    expect(schema.safeParse({ entries: Array(5).fill(entry), animCycle: false }).success).toBe(false);
  });
});

describe('blind lineup key (dev)', () => {
  const ids = ['spike-maid-48cel', 'spike-maid-48soft', 'spike-maid-64cel', 'spike-maid-64soft'];
  it('round-trips and rejects keys that do not match the packs', () => {
    const order = shuffle(ids, (max) => max - 1);
    expect([...order].sort()).toEqual([...ids].sort());
    expect(parseKey(formatKey(order, new Date(0)), ids)).toEqual(order);
    expect(parseKey('A = spike-maid-48soft\n', ids)).toBeUndefined();
    expect(parseKey(formatKey(order, new Date(0)).replace('A =', 'B ='), ids)).toBeUndefined();
  });
});

/** Junctions need no admin rights on Windows (symlinks may); returns false where links cannot be made at all. */
function tryLink(target: string, path: string): boolean {
  try {
    symlinkSync(target, path, 'junction');
    return true;
  } catch {
    return false;
  }
}

describe('links and junctions (security review L3)', () => {
  const base = mkdtempSync(join(tmpdir(), 'pixmates-links-'));
  const root = join(base, 'characters');
  const outside = join(base, 'outside');
  mkdirSync(root, { recursive: true });
  packDir(root, 'maid', makeManifest({ id: 'maid' }));
  packDir(outside, 'evil', makeManifest({ id: 'evil' }));
  const linked = tryLink(join(outside, 'evil'), join(root, 'evil'));
  mkdirSync(join(root, 'sneaky'), { recursive: true });
  const linkedSprites = tryLink(join(outside, 'evil', 'sprites'), join(root, 'sneaky', 'sprites'));
  writeFileSync(join(root, 'sneaky', 'manifest.json'), JSON.stringify(makeManifest({ id: 'sneaky' })));

  it.runIf(linked && linkedSprites)('the registry skips a linked pack folder and a pack whose atlas escapes', () => {
    const { packs, errors } = loadRegistry(root, { includeSpike: true });
    expect([...packs.keys()]).toEqual(['maid']);
    expect(errors.join(' | ')).toMatch(/sneaky: .*outside the pack root/);
  });
  it.runIf(linkedSprites)('the host does not read through a junction out of the root', async () => {
    expect(await readContainedFile(root, join(root, 'sneaky', 'sprites', 'atlas.png'), 1 << 20)).toBeUndefined();
    const real = await readContainedFile(root, join(root, 'maid', 'sprites', 'atlas.png'), 1 << 20);
    expect(real?.subarray(1, 4).toString('latin1')).toBe('PNG');
  });
  it('the host refuses files over the size cap and missing files', async () => {
    expect(await readContainedFile(root, join(root, 'maid', 'sprites', 'atlas.png'), 10)).toBeUndefined();
    expect(await readContainedFile(root, join(root, 'maid', 'sprites', 'none.png'), 1 << 20)).toBeUndefined();
  });
});

describe('M-ART phase 2 manifest fields (MA-21)', () => {
  it('accepts scaleRef within 8…frameSize.h and rejects it outside', () => {
    expect(manifestSchema.safeParse(makeManifest({ scaleRef: 12 })).success).toBe(true);
    expect(manifestSchema.safeParse(makeManifest({ scaleRef: 16 })).success).toBe(true);
    expect(manifestSchema.safeParse(makeManifest({ scaleRef: 17 })).success).toBe(false);
    expect(manifestSchema.safeParse(makeManifest({ scaleRef: 7 })).success).toBe(false);
    expect(manifestSchema.safeParse(makeManifest({ scaleRef: 12.5 })).success).toBe(false);
  });
  it('rejects scaleRef below 3/4 of the frame height (S3)', () => {
    const tall = (scaleRef: number) =>
      makeManifest({ frameSize: { w: 16, h: 56 }, scaleRef, animations: { idle_a: anim(0), walk: anim(56) } });
    expect(manifestSchema.safeParse(tall(42)).success).toBe(true);
    expect(manifestSchema.safeParse(tall(41)).success).toBe(false);
  });
  it('accepts a per-animation anchor in 0…1 only', () => {
    const withAnchor = (anchor: unknown) =>
      makeManifest({ animations: { idle_a: anim(0), walk: anim(16), sit_edge: { ...anim(0), anchor } } });
    expect(manifestSchema.safeParse(withAnchor({ x: 0.5, y: 0.7 })).success).toBe(true);
    expect(manifestSchema.safeParse(withAnchor({ x: 0.5, y: 1.2 })).success).toBe(false);
    expect(manifestSchema.safeParse(withAnchor({ x: 0.5 })).success).toBe(false);
  });
  it('accepts an optional per-animation facing front|right|left, default front (ADR 010)', () => {
    const withFacing = (facing: unknown) =>
      makeManifest({ animations: { idle_a: anim(0), walk: { ...anim(16), facing } } });
    for (const facing of ['front', 'right', 'left']) {
      const parsed = manifestSchema.safeParse(withFacing(facing));
      expect(parsed.success).toBe(true);
      expect(facingOf(parsed.data?.animations.walk ?? {})).toBe(facing);
    }
    for (const facing of ['back', 'Right', 1, null])
      expect(manifestSchema.safeParse(withFacing(facing)).success).toBe(false);
    const plain = manifestSchema.parse(makeManifest());
    expect(facingOf(plain.animations.idle_a ?? { facing: 'left' })).toBe('front');
  });
  it('maps roster ids to reserved built-in pack ids', () => {
    expect(builtinPackId('maid')).toBe('pixmates.maid');
    expect(isBuiltinPackId('pixmates.maid')).toBe(true);
    expect(isBuiltinPackId('maid')).toBe(false);
    expect(isBuiltinPackId('com.example.pixmates.maid')).toBe(false);
    expect(() => builtinPackId('Bad Id')).toThrow();
  });
  it('validates the FX manifest (marks ≤ 16², ≤ 6 frames, one atlas)', () => {
    const fx = {
      version: '0.0.1',
      frameSize: { w: 16, h: 16 },
      marks: { sweat: { frames: 4, fps: 8, loop: false, origin: { x: 0, y: 0 } } },
      files: { 'sprites/fx.png': 'a'.repeat(64) },
    };
    expect(fxManifestSchema.safeParse(fx).success).toBe(true);
    expect(fxManifestSchema.safeParse({ ...fx, frameSize: { w: 17, h: 16 } }).success).toBe(false);
    const long = { ...fx, marks: { sweat: { frames: 7, fps: 8, loop: false, origin: { x: 0, y: 0 } } } };
    expect(fxManifestSchema.safeParse(long).success).toBe(false);
    expect(fxManifestSchema.safeParse({ ...fx, script: 'x' }).success).toBe(false);
  });
});

describe('registry: packaged builds accept built-ins only (MA-21)', () => {
  const root = mkdtempSync(join(tmpdir(), 'pixmates-builtin-'));
  packDir(root, 'pixmates.maid', makeManifest({ id: 'pixmates.maid' }));
  packDir(root, 'maid', makeManifest({ id: 'maid' }));
  packDir(root, 'spike-test', makeManifest());
  it('lists only pixmates.* when builtinOnly, everything valid otherwise', () => {
    expect([...loadRegistry(root, { includeSpike: false, builtinOnly: true }).packs.keys()]).toEqual(['pixmates.maid']);
    expect([...loadRegistry(root, { includeSpike: true, builtinOnly: true }).packs.keys()].sort()).toEqual([
      'pixmates.maid',
      'spike-test',
    ]);
    expect([...loadRegistry(root, { includeSpike: false, builtinOnly: false }).packs.keys()].sort()).toEqual([
      'maid',
      'pixmates.maid',
    ]);
  });
  it('drops a pixmates.* folder whose manifest id differs, and spike packs when includeSpike is false', () => {
    const dir = mkdtempSync(join(tmpdir(), 'pixmates-builtin-'));
    packDir(dir, 'pixmates.maid', makeManifest({ id: 'pixmates.maid' }));
    packDir(dir, 'pixmates.x', makeManifest({ id: 'pixmates.y' }));
    packDir(dir, 'spike-test', makeManifest());
    const result = loadRegistry(dir, { includeSpike: false, builtinOnly: true });
    expect([...result.packs.keys()]).toEqual(['pixmates.maid']);
    expect(result.errors.join(' | ')).toMatch(/pixmates\.x: manifest id/);
  });
});
