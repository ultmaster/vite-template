import { ActionIcon, AppShell, Badge, Group, NavLink as MantineNavLink, Stack, Text } from '@mantine/core';
import { useEffect, useMemo, useState } from 'react';
import { NavLink as RouterNavLink, Outlet, useLocation } from 'react-router-dom';

type ConnectionStatus = 'online' | 'offline' | 'unknown';

type NavItem = {
  label: string;
  to: string;
  matchPath?: string;
};

const NAV_ITEMS: NavItem[] = [
  { label: 'Rollouts', to: '/rollouts' },
  { label: 'Resources', to: '/resources' },
  { label: 'Traces', to: '/traces' },
  { label: 'Settings', to: '/settings' },
];

const CONNECTION_STATUS_META: Record<ConnectionStatus, { color: string; label: string }> = {
  offline: { color: 'red', label: 'Offline' },
  online: { color: 'teal', label: 'Online' },
  unknown: { color: 'gray', label: 'Unknown' },
};

const DEFAULT_AUTO_REFRESH_MS = 30_000;

type ConnectionOptions = {
  baseUrl?: string;
  autoRefreshMs?: number;
};

function getSameOriginUrl() {
  return window.location.origin;
}

function buildHealthUrl(baseUrl: string) {
  if (baseUrl.startsWith('http://') || baseUrl.startsWith('https://')) {
    const normalized = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
    return new URL('health', normalized).toString();
  }

  const normalizedBase = baseUrl.startsWith('/') ? baseUrl : `/${baseUrl}`;
  const trimmed = normalizedBase.replace(/\/+$/, '');
  return `${trimmed}/health`;
}

function useServerConnection({ baseUrl, autoRefreshMs }: ConnectionOptions) {
  const [status, setStatus] = useState<ConnectionStatus>('unknown');

  useEffect(() => {
    if (!baseUrl) {
      setStatus('unknown');
      return;
    }

    let disposed = false;
    let intervalId: number | undefined;
    let activeController: AbortController | undefined;
    const healthUrl = buildHealthUrl(baseUrl);

    const check = async () => {
      activeController?.abort();
      const controller = new AbortController();
      activeController = controller;

      try {
        const response = await fetch(healthUrl, { signal: controller.signal });
        if (!disposed && activeController === controller) {
          setStatus(response.ok ? 'online' : 'offline');
        }
      } catch (error) {
        if (disposed || (error instanceof DOMException && error.name === 'AbortError')) {
          return;
        }

        if (!disposed && activeController === controller) {
          setStatus('offline');
        }
      }
    };

    check();

    if (autoRefreshMs && autoRefreshMs > 0) {
      intervalId = window.setInterval(check, autoRefreshMs);
    }

    return () => {
      disposed = true;
      activeController?.abort();
      if (intervalId) {
        window.clearInterval(intervalId);
      }
    };
  }, [autoRefreshMs, baseUrl]);

  return { status };
}

function ConnectionIndicator({
  baseUrl,
  status = 'unknown',
}: {
  baseUrl?: string;
  status?: ConnectionStatus;
}) {
  const { color, label } = CONNECTION_STATUS_META[status ?? 'unknown'];
  const connectionTarget = baseUrl && baseUrl.length > 0 ? baseUrl : 'No server configured';

  return (
    <Stack gap={4} data-testid="connection-indicator">
      <Text size="xs" fw={600} c="dimmed">
        Server connection
      </Text>
      <Group gap="xs">
        <Badge color={color} variant="light" radius="xl">
          {label}
        </Badge>
        <Text size="xs" c="dimmed">
          {connectionTarget}
        </Text>
      </Group>
    </Stack>
  );
}

export type AppLayoutProps = {
  serverConfig?: ConnectionOptions;
};

export function AppLayout({ serverConfig }: AppLayoutProps = {}) {
  const location = useLocation();
  const resolvedBaseUrl = serverConfig?.baseUrl ?? getSameOriginUrl() ?? '';
  const autoRefreshMs =
    serverConfig?.autoRefreshMs !== undefined ? serverConfig.autoRefreshMs : DEFAULT_AUTO_REFRESH_MS;
  const connectionState = useServerConnection({
    baseUrl: resolvedBaseUrl || undefined,
    autoRefreshMs,
  });
  const navItems = useMemo(
    () =>
      NAV_ITEMS.map((item) => ({
        ...item,
        active: location.pathname === item.to || location.pathname.startsWith(`${item.to}/`),
      })),
    [location.pathname],
  );

  return (
    <AppShell padding="md" navbar={{ width: 280, breakpoint: 'sm' }}>
      <AppShell.Navbar>
        <AppShell.Section p="md">
          <Group gap="sm">
            <ActionIcon size="lg" radius="md" variant="filled">
              AL
            </ActionIcon>
            <Text fw={600} size="sm">
              Agent-lightning Dashboard
            </Text>
          </Group>
        </AppShell.Section>
        <AppShell.Section grow p="md" pt={0}>
          <Stack gap="xs">
            {navItems.map((item) => (
              <MantineNavLink
                key={item.to}
                component={RouterNavLink}
                to={item.to}
                label={item.label}
                active={item.active}
                variant="light"
              />
            ))}
          </Stack>
        </AppShell.Section>
        <AppShell.Section p="md">
          <ConnectionIndicator baseUrl={resolvedBaseUrl || undefined} status={connectionState.status} />
        </AppShell.Section>
      </AppShell.Navbar>
      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}
