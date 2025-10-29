import '@mantine/core/styles.css';

import { MantineProvider } from '@mantine/core';
import { shadcnCssVariableResolver } from './cssVariableResolver';
import { Router } from './Router';
import { shadcnTheme } from './theme';

import './style.css';

export default function App() {
  return (
    <MantineProvider theme={shadcnTheme} cssVariablesResolver={shadcnCssVariableResolver}>
      <Router />
    </MantineProvider>
  );
}
