// M-ART MA-09/10/11: manifest schema + fallbacks, registry, app://characters host, stage:characters contract, MA-31 dev art lineup.
import { mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { encodePng } from '../../../tools/lib/png.ts';
import { loadRegistry, pngSize } from '../../../src/main/characters/registry.ts';
import { parseArtLineup, selectCharacters } from '../../../src/main/characters/selection.ts';
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
  id: 'test-pack',
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
  packDir(root, 'pixmates.maid', makeManifest({ id: 'pixmates.maid' }));
  packDir(root, 'pixmates.goth', makeManifest({ id: 'pixmates.goth' }));
  packDir(root, 'pixmates.wrong-id', makeManifest({ id: 'other' }));
  packDir(root, 'pixmates.tiny', makeManifest({ id: 'pixmates.tiny' }), { width: 8, height: 8 });

  it('keeps valid packs and reports broken ones', () => {
    const registry = loadRegistry(root);
    expect([...registry.packs.keys()].sort()).toEqual(['pixmates.goth', 'pixmates.maid']);
    expect(registry.errors.join('\n')).toMatch(/pixmates\.wrong-id: manifest id/);
    expect(registry.errors.join('\n')).toMatch(/pixmates\.tiny: .*leaves/);
    expect(loadRegistry(join(root, 'missing')).packs.size).toBe(0);
  });
  it('reads PNG sizes from the header only', () => {
    expect(pngSize(encodePng({ width: 3, height: 2, data: new Uint8Array(24) }))).toEqual({ width: 3, height: 2 });
    expect(pngSize(Buffer.from('not a png at all, really'))).toBeUndefined();
  });
  it('selects the requested pack, else the default, and labels the lineup A–D', () => {
    const { packs } = loadRegistry(root);
    const keys = (s: ReturnType<typeof selectCharacters>) => s.characters.map((c) => c.key);
    const requested = selectCharacters({ packs, requested: 'pixmates.goth' });
    expect(keys(requested)).toEqual(['pixmates.goth']);
    expect(requested.warning ?? requested.error).toBeUndefined();
    expect(keys(selectCharacters({ packs }))).toEqual(['pixmates.maid']);
    const lineup = selectCharacters({ packs, lineup: ['pixmates.goth', 'pixmates.maid'] });
    expect(lineup.characters.map((c) => c.label)).toEqual(['A', 'B']);
  });
  it('falls back to the default with a warning when --character names no valid pack (MA-30)', () => {
    const { packs } = loadRegistry(root);
    const unknown = selectCharacters({ packs, requested: 'pixmates.nope' });
    expect(unknown.characters.map((c) => c.pack.id)).toEqual(['pixmates.maid']);
    expect(unknown.warning).toMatch(/pixmates\.nope.*pixmates\.maid/);
    expect(unknown.error).toBeUndefined();
  });
  it('echoes --character into the log as printable ASCII only (security review nit)', () => {
    const { packs } = loadRegistry(root);
    const hostile = selectCharacters({ packs, requested: 'a\nb\u001b[31m‮é' });
    expect(hostile.warning).toContain('--character="a?b?[31m??":');
    expect(hostile.warning).toMatch(/^[\x20-\x7e]*$/);
  });
  it('reports an error and puts nobody on stage when no valid pack is left (MA-30)', () => {
    const none = selectCharacters({ packs: new Map() });
    expect(none.characters).toEqual([]);
    expect(none.error).toMatch(/no valid character pack/);
    const { packs } = loadRegistry(root);
    const noDefault = new Map([...packs].filter(([id]) => id !== 'pixmates.maid'));
    expect(selectCharacters({ packs: noDefault, requested: 'pixmates.nope' }).error).toMatch(/pixmates\.maid/);
    expect(selectCharacters({ packs, lineup: ['pixmates.none'] }).error).toMatch(/no valid character pack/);
  });
});

describe('--art-lineup=<ids> (dev, MA-31)', () => {
  const root = mkdtempSync(join(tmpdir(), 'pixmates-lineup-'));
  for (const id of ['maid', 'goth', 'kitsune', 'witch', 'ronin'])
    packDir(root, `pixmates.${id}`, makeManifest({ id: `pixmates.${id}` }));
  const { packs } = loadRegistry(root);
  const lineup = (value: string, packaged = false) => parseArtLineup([`--art-lineup=${value}`], packs, packaged);
  const errorOf = (result: ReturnType<typeof parseArtLineup>) => (result.kind === 'error' ? result.error : '');

  it('is absent without the flag, whatever else is on the command line', () => {
    expect(parseArtLineup(['--character=pixmates.goth', '--anim-cycle'], packs, false)).toEqual({ kind: 'none' });
    expect(parseArtLineup([], packs, true)).toEqual({ kind: 'none' });
  });
  it('takes up to 4 built-ins, by roster id or pack id, in the given order', () => {
    expect(lineup('goth,pixmates.maid,witch,kitsune')).toEqual({
      kind: 'lineup',
      ids: ['pixmates.goth', 'pixmates.maid', 'pixmates.witch', 'pixmates.kitsune'],
    });
    expect(lineup('ronin')).toEqual({ kind: 'lineup', ids: ['pixmates.ronin'] });
  });
  it('puts the parsed lineup on stage, labelled A–D in that order', () => {
    const result = lineup('witch,goth,maid,ronin');
    const ids = result.kind === 'lineup' ? result.ids : [];
    const selection = selectCharacters({ packs, lineup: ids });
    expect(selection.characters.map((c) => [c.label, c.pack.id])).toEqual([
      ['A', 'pixmates.witch'],
      ['B', 'pixmates.goth'],
      ['C', 'pixmates.maid'],
      ['D', 'pixmates.ronin'],
    ]);
  });
  it('rejects more than 4 characters', () => {
    expect(errorOf(lineup('maid,goth,kitsune,witch,ronin'))).toMatch(/at most 4.*got 5/);
  });
  it('rejects unknown, non-built-in, duplicate and empty ids', () => {
    expect(errorOf(lineup('maid,nope'))).toMatch(/"nope".*not a built-in/);
    expect(errorOf(lineup('maid,spike-maid-48soft'))).toMatch(/"spike-maid-48soft".*not a built-in/);
    expect(errorOf(lineup('maid,Maid'))).toMatch(/"Maid".*not a built-in/);
    expect(errorOf(lineup('maid,pixmates.maid'))).toMatch(/pixmates\.maid.*twice/);
    expect(errorOf(lineup(''))).toMatch(/needs 1–4/);
    expect(errorOf(lineup('maid,,goth'))).toMatch(/empty id/);
    expect(errorOf(parseArtLineup(['--art-lineup'], packs, false))).toMatch(/needs 1–4/);
  });
  it('is dev-only: a packaged build rejects it, even with valid ids', () => {
    expect(errorOf(lineup('maid,goth', true))).toMatch(/dev-only/);
    expect(errorOf(parseArtLineup(['--art-lineup'], packs, true))).toMatch(/dev-only/);
  });
  it('rejects a repeated flag instead of silently taking one of them', () => {
    const argv = ['--art-lineup=maid', '--art-lineup=goth'];
    expect(errorOf(parseArtLineup(argv, packs, false))).toMatch(/once/);
    expect(errorOf(parseArtLineup(['--art-lineup=maid', '--art-lineup'], packs, false))).toMatch(/once/);
  });
  it('echoes untrusted ids as short printable ASCII only', () => {
    const message = errorOf(lineup(`maid,a\nb\u001b[31m\u202e${'x'.repeat(200)}`));
    expect(message).toMatch(/not a built-in/);
    expect(message).toMatch(/^[\x20-\x7e]*$/);
    expect(message).toContain('x'.repeat(50));
    expect(message).not.toContain('x'.repeat(65));
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
    atlasUrl: 'app://characters/pixmates.maid/sprites/atlas.png',
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
  packDir(root, 'pixmates.maid', makeManifest({ id: 'pixmates.maid' }));
  packDir(outside, 'pixmates.evil', makeManifest({ id: 'pixmates.evil' }));
  const linked = tryLink(join(outside, 'pixmates.evil'), join(root, 'pixmates.evil'));
  mkdirSync(join(root, 'pixmates.sneaky'), { recursive: true });
  const linkedSprites = tryLink(join(outside, 'pixmates.evil', 'sprites'), join(root, 'pixmates.sneaky', 'sprites'));
  writeFileSync(
    join(root, 'pixmates.sneaky', 'manifest.json'),
    JSON.stringify(makeManifest({ id: 'pixmates.sneaky' })),
  );

  it.runIf(linked && linkedSprites)('the registry skips a linked pack folder and a pack whose atlas escapes', () => {
    const { packs, errors } = loadRegistry(root);
    expect([...packs.keys()]).toEqual(['pixmates.maid']);
    expect(errors.join(' | ')).toMatch(/pixmates\.sneaky: .*outside the pack root/);
  });
  it.runIf(linkedSprites)('the host does not read through a junction out of the root', async () => {
    expect(
      await readContainedFile(root, join(root, 'pixmates.sneaky', 'sprites', 'atlas.png'), 1 << 20),
    ).toBeUndefined();
    const real = await readContainedFile(root, join(root, 'pixmates.maid', 'sprites', 'atlas.png'), 1 << 20);
    expect(real?.subarray(1, 4).toString('latin1')).toBe('PNG');
  });
  it('the host refuses files over the size cap and missing files', async () => {
    expect(await readContainedFile(root, join(root, 'pixmates.maid', 'sprites', 'atlas.png'), 10)).toBeUndefined();
    expect(await readContainedFile(root, join(root, 'pixmates.maid', 'sprites', 'none.png'), 1 << 20)).toBeUndefined();
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

describe('registry: built-ins only, dev and packaged (MA-21, MA-31)', () => {
  const root = mkdtempSync(join(tmpdir(), 'pixmates-builtin-'));
  packDir(root, 'pixmates.maid', makeManifest({ id: 'pixmates.maid' }));
  packDir(root, 'maid', makeManifest({ id: 'maid' }));
  packDir(root, 'test-pack', makeManifest());
  packDir(root, 'spike-maid-48soft', makeManifest({ id: 'spike-maid-48soft' }));
  it('lists only pixmates.* folders, skipping valid non-built-in packs (incl. a stale art-spike folder)', () => {
    const registry = loadRegistry(root);
    expect([...registry.packs.keys()]).toEqual(['pixmates.maid']);
    expect(registry.errors).toEqual([]);
  });
  it('drops a pixmates.* folder whose manifest id differs', () => {
    const dir = mkdtempSync(join(tmpdir(), 'pixmates-builtin-'));
    packDir(dir, 'pixmates.maid', makeManifest({ id: 'pixmates.maid' }));
    packDir(dir, 'pixmates.x', makeManifest({ id: 'pixmates.y' }));
    packDir(dir, 'test-pack', makeManifest());
    const result = loadRegistry(dir);
    expect([...result.packs.keys()]).toEqual(['pixmates.maid']);
    expect(result.errors.join(' | ')).toMatch(/pixmates\.x: manifest id/);
  });
});
