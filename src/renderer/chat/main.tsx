// Chat window stub (React). The real chat lands in M2.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Placeholder } from '../shared/Placeholder.tsx';

const root = document.getElementById('root');
if (root)
  createRoot(root).render(
    <StrictMode>
      <Placeholder title="Chat" />
    </StrictMode>,
  );
