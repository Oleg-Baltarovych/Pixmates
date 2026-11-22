// Packaged builds refuse debugger switches (review fix B7). The EnableNodeCliInspectArguments fuse already ignores
// `--inspect*`; `--remote-debugging-port` is a Chromium switch no fuse covers, so a packaged app quits on either.

/** Chromium switches that expose a debugger endpoint (names without the leading `--`). */
const DEBUG_SWITCHES = ['remote-debugging-port', 'remote-debugging-pipe'] as const;

export function isDebugLaunch(argv: readonly string[], hasSwitch: (name: string) => boolean): boolean {
  if (DEBUG_SWITCHES.some((name) => hasSwitch(name))) return true;
  return argv.some(
    (arg) =>
      arg.startsWith('--inspect') || DEBUG_SWITCHES.some((name) => arg === `--${name}` || arg.startsWith(`--${name}=`)),
  );
}
