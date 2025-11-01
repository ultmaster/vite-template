import type { Meta, StoryObj } from '@storybook/react';
import { Box, Stack, Title } from '@mantine/core';
import { ResourcesTree } from './ResourcesTree.component';
import type { Resources } from '@/types';

const meta: Meta<typeof ResourcesTree> = {
  title: 'Components/ResourcesTree',
  component: ResourcesTree,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

type Story = StoryObj<typeof ResourcesTree>;

const simpleResources: Resources = {
  resourcesId: 'rs-simple-001',
  resources: {
    apiKey: 'sk-test-key-123',
    maxRetries: 3,
    timeout: 30000,
    enabled: true,
  },
};

const nestedResources: Resources = {
  resourcesId: 'rs-nested-001',
  resources: {
    model: {
      name: 'gpt-4',
      version: '2024-01-01',
      temperature: 0.7,
      maxTokens: 2048,
      topP: 0.9,
    },
    database: {
      host: 'db.example.com',
      port: 5432,
      name: 'production',
      pool: {
        min: 2,
        max: 10,
        idle: 30000,
      },
    },
    cache: {
      type: 'redis',
      host: 'cache.example.com',
      port: 6379,
      ttl: 3600,
    },
  },
};

const arrayResources: Resources = {
  resourcesId: 'rs-array-001',
  resources: {
    compute: {
      instances: [
        { id: 'i-001', type: 't3.large', zone: 'us-east-1a', status: 'running' },
        { id: 'i-002', type: 't3.large', zone: 'us-east-1b', status: 'running' },
        { id: 'i-003', type: 't3.xlarge', zone: 'us-east-1c', status: 'stopped' },
      ],
      autoScaling: {
        min: 2,
        max: 10,
        targetCpu: 70,
      },
    },
    tags: ['production', 'ml-training', 'auto-scale'],
    ports: [80, 443, 8080],
  },
};

const complexResources: Resources = {
  resourcesId: 'rs-complex-001',
  resources: {
    model: {
      name: 'claude-3-opus',
      version: '2024-02-01',
      temperature: 0.5,
      maxTokens: 4096,
      providers: [
        { name: 'anthropic', priority: 1, enabled: true },
        { name: 'aws-bedrock', priority: 2, enabled: false },
      ],
    },
    storage: {
      type: 's3',
      bucket: 'training-data',
      region: 'us-east-1',
      credentials: {
        accessKeyId: 'AKIA***',
        encrypted: true,
      },
      lifecycle: {
        transitionToIA: 30,
        transitionToGlacier: 90,
        expiration: 365,
      },
    },
    monitoring: {
      enabled: true,
      interval: 60,
      metrics: ['cpu', 'memory', 'disk', 'network'],
      alerts: {
        email: 'ops@example.com',
        slack: '#alerts',
        pagerduty: true,
        thresholds: {
          cpu: { warning: 70, critical: 90 },
          memory: { warning: 80, critical: 95 },
          disk: { warning: 75, critical: 90 },
        },
      },
    },
    apiKeys: {
      openai: 'sk-***',
      anthropic: 'sk-ant-***',
      replicate: 'r8-***',
    },
    rateLimits: {
      requestsPerMinute: 100,
      tokensPerDay: 1000000,
      concurrent: 5,
      burstMultiplier: 1.5,
    },
  },
};

const emptyResources: Resources = {
  resourcesId: 'rs-empty-001',
  resources: {},
};

type WrapperProps = {
  resources: Resources;
  maxWidth?: number;
};

function ResourcesTreeStoryWrapper({ resources, maxWidth = 800 }: WrapperProps) {
  return (
    <Box mx="auto" style={{ maxWidth, width: '100%', padding: 16 }}>
      <Stack gap="md">
        <Title order={2}>Resources: {resources.resourcesId}</Title>
        <ResourcesTree resources={resources} />
      </Stack>
    </Box>
  );
}

export const SimpleValues: Story = {
  render: () => <ResourcesTreeStoryWrapper resources={simpleResources} />,
};

export const NestedObjects: Story = {
  render: () => <ResourcesTreeStoryWrapper resources={nestedResources} />,
};

export const WithArrays: Story = {
  render: () => <ResourcesTreeStoryWrapper resources={arrayResources} />,
};

export const ComplexStructure: Story = {
  render: () => <ResourcesTreeStoryWrapper resources={complexResources} maxWidth={1000} />,
};

export const EmptyResources: Story = {
  render: () => <ResourcesTreeStoryWrapper resources={emptyResources} />,
};

export const NarrowContainer: Story = {
  render: () => <ResourcesTreeStoryWrapper resources={complexResources} maxWidth={500} />,
};

export const WideContainer: Story = {
  render: () => <ResourcesTreeStoryWrapper resources={complexResources} maxWidth={1400} />,
};
