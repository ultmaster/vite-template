import '@mantine/core/styles.css';
import 'mantine-datatable/styles.css';

import { MantineProvider } from '@mantine/core';
import { useColorScheme } from '@mantine/hooks';
import { shadcnCssVariableResolver } from './cssVariableResolver';
import { Router } from './Router';
import { selectThemePreference } from './features/config/selectors';
import { useAppSelector } from './store/hooks';
import { shadcnTheme } from './theme';

import './style.css';

export default function App() {
  const themePreference = useAppSelector(selectThemePreference);
  const systemColorScheme = useColorScheme();
  const resolvedColorScheme = themePreference === 'system' ? systemColorScheme : themePreference;

  return (
    <MantineProvider
      theme={shadcnTheme}
      cssVariablesResolver={shadcnCssVariableResolver}
      forceColorScheme={resolvedColorScheme}
    >
      <Router />
    </MantineProvider>
  );
}
