import { ActionIcon, AppShell, Badge, Group, NavLink as MantineNavLink, Stack, Text } from '@mantine/core';
import { useMemo } from 'react';
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

export function AppLayout() {
  const location = useLocation();
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
          <ConnectionIndicator status="unknown" />
        </AppShell.Section>
      </AppShell.Navbar>
      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}
