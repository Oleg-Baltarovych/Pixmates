// Developer-only stub screen until the real UI lands (no user-facing copy yet, so no i18n keys).
import { useEffect, useState } from 'react';
import { pingMain } from './ping.ts';

export function Placeholder({ title }: { readonly title: string }) {
  const [status, setStatus] = useState('…');
  useEffect(() => {
    pingMain().then(
      (result) => {
        setStatus(result);
        console.info(`[${title}] main: ${result}`); // same dev-console line as the stage (load + IPC check)
      },
      () => {
        setStatus('error: ipc');
      },
    );
  }, [title]);
  return (
    <main>
      <h1>{title}</h1>
      <p>Pixmates M0 stub · main: {status}</p>
    </main>
  );
}
