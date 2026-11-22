// Settings window stub (React). Real settings land in M5.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Placeholder } from '../shared/Placeholder.tsx';

const root = document.getElementById('root');
if (root)
  createRoot(root).render(
    <StrictMode>
      <Placeholder title="Settings" />
    </StrictMode>,
  );
