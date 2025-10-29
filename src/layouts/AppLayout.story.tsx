import { Stack, Text } from '@mantine/core';
import type { Meta, StoryObj } from '@storybook/react';
import { http, HttpResponse } from 'msw';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { AppLayoutProps, AppLayout } from './AppLayout';

const meta: Meta<AppLayoutProps> = {
  title: 'Layouts/AppLayout',
  component: AppLayout,
  parameters: {
    layout: 'fullscreen',
  },
  render: (args) => {
    const router = createMemoryRouter(
      [
        {
          path: '/',
          element: <AppLayout {...args} />,
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
      ],
      { initialEntries: ['/rollouts'] },
    );

    return <RouterProvider router={router} />;
  },
  args: {
    serverConfig: {
      baseUrl: 'http://localhost:8000',
      autoRefreshMs: 0,
    },
  },
};

export default meta;

type Story = StoryObj<AppLayoutProps>;

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

export const NoServerConfigured: Story = {
  args: {
    serverConfig: {
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
