import { Stack, Text } from '@mantine/core';
import type { Meta, StoryObj } from '@storybook/react';
import { http, HttpResponse } from 'msw';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { AppLayoutProps, AppLayout } from './AppLayout';

const Placeholder = ({ title, description }: { title: string; description: string }) => (
  <Stack gap="sm" p="lg">
    <Text size="lg" fw={600}>
      {title}
    </Text>
    <Text size="sm" c="dimmed">
      {description}
    </Text>
  </Stack>
);

const ROUTES = [
  {
    path: '/',
    element: <AppLayout />,
    children: [
      {
        path: 'rollouts',
        element: <Placeholder title="Rollouts" description="Track the rollout queue and status." />,
      },
      {
        path: 'resources',
        element: <Placeholder title="Resources" description="Inspect resource snapshots and metadata." />,
      },
      {
        path: 'traces',
        element: <Placeholder title="Traces" description="Browse telemetry spans across attempts." />,
      },
      {
        path: 'settings',
        element: (
          <Placeholder
            title="Settings"
            description="Configure server connection, refresh cadence, and appearance."
          />
        ),
      },
    ],
  },
];

function renderAppLayout(args: AppLayoutProps, initialEntry = '/rollouts') {
  const router = createMemoryRouter(
    ROUTES.map((route) => ({
      ...route,
      element: <AppLayout {...args} />,
    })),
    { initialEntries: [initialEntry] },
  );

  return <RouterProvider router={router} />;
}

const meta: Meta<AppLayoutProps> = {
  title: 'Layouts/AppLayout',
  component: AppLayout,
  parameters: {
    layout: 'fullscreen',
  },
  render: (args) => renderAppLayout(args, '/rollouts'),
  args: {
    config: {
      baseUrl: 'http://localhost:8000',
      autoRefreshMs: 0,
    },
  },
};

export default meta;

type Story = StoryObj<AppLayoutProps>;

export const NoServerConfigured: Story = {
  args: {
    config: {
      baseUrl: '',
      autoRefreshMs: 0,
    },
  },
};

export const ServerOnline: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('http://localhost:8000/health', () => HttpResponse.json({ status: 'ok' }, { status: 200 })),
      ],
    },
  },
};

export const ServerOffline: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get(
          'http://localhost:8000/health',
          () => HttpResponse.json({ message: 'unavailable' }, { status: 503 }),
        ),
      ],
    },
  },
};

export const ResourcesNavActive: Story = {
  render: (args) => renderAppLayout(args, '/resources'),
};

export const TracesNavActive: Story = {
  render: (args) => renderAppLayout(args, '/traces'),
};

export const SettingsNavActive: Story = {
  render: (args) => renderAppLayout(args, '/settings'),
};

export const PollingEveryFiveSeconds: Story = {
  args: {
    config: {
      baseUrl: 'http://localhost:8000',
      autoRefreshMs: 5000,
    },
  },
  parameters: {
    msw: {
      handlers: [
        http.get('http://localhost:8000/health', () =>
          HttpResponse.json({ status: 'ok' }, { status: 200 }),
        ),
      ],
    },
  },
};
