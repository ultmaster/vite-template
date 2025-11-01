import { ActionIcon, Badge, CopyButton, Drawer, Group, ScrollArea, Stack, Text, Tooltip } from '@mantine/core';
import { CodeHighlight } from '@mantine/code-highlight';
import { IconCheck, IconCopy } from '@tabler/icons-react';
import { closeDrawer, selectDrawerContent, selectDrawerIsOpen } from '@/features/ui/drawer';
import { formatStatusLabel } from '@/utils/format';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import type { AttemptStatus, RolloutStatus } from '@/types';

const ATTEMPT_STATUS_COLORS: Record<AttemptStatus, string> = {
  failed: 'red',
  preparing: 'violet',
  running: 'blue',
  succeeded: 'teal',
  timeout: 'orange',
  unresponsive: 'orange',
};

const ROLLOUT_STATUS_COLORS: Record<RolloutStatus, string> = {
  cancelled: 'gray',
  failed: 'red',
  preparing: 'violet',
  queuing: 'blue',
  requeuing: 'cyan',
  running: 'blue',
  succeeded: 'teal',
};

function getStatusBadgeColor(status: RolloutStatus | AttemptStatus, isAttempt: boolean) {
  if (isAttempt) {
    return ATTEMPT_STATUS_COLORS[status as AttemptStatus] ?? 'gray';
  }

  return ROLLOUT_STATUS_COLORS[status as RolloutStatus] ?? 'gray';
}

function formatJson(value: unknown) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function RolloutDrawer() {
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector(selectDrawerIsOpen);
  const content = useAppSelector(selectDrawerContent);

  const rolloutId = content?.rollout.rolloutId ?? '';
  const attemptId = content?.attempt?.attemptId ?? null;
  const heading = rolloutId;
  const defaultStatus = content?.attempt?.status ?? content?.rollout.status ?? null;
  const isAttemptStatus = Boolean(content?.attempt?.status);
  const statusBadgeColor = defaultStatus
    ? getStatusBadgeColor(defaultStatus, isAttemptStatus)
    : undefined;
  const statusLabel = defaultStatus ? formatStatusLabel(defaultStatus) : null;

  const titleContent =
    rolloutId.length > 0 ? (
      <Stack gap={3}>
        <Group gap={6}>
          <Text fw={600}>{rolloutId}</Text>
          <CopyButton value={rolloutId}>
            {({ copied, copy }) => (
              <Tooltip label={copied ? 'Copied' : 'Copy'} withArrow>
                <ActionIcon
                  aria-label={`Copy rollout ID ${rolloutId}`}
                  variant="subtle"
                  color={copied ? 'teal' : 'gray'}
                  size="sm"
                  onClick={(event) => {
                    event.stopPropagation();
                    copy();
                  }}
                >
                  {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                </ActionIcon>
              </Tooltip>
            )}
          </CopyButton>
        </Group>
        <Group gap="xs">
          {attemptId && (
            <Group gap={3}>
              <Text size="sm" c="dimmed" fw={500}>Attempt</Text>
              <Text size="sm" c="dimmed">{attemptId}</Text>
            </Group>
          )}
          {statusLabel && (
            <Badge size="sm" variant="light" color={statusBadgeColor}>{statusLabel}</Badge>
          )}
        </Group>
      </Stack>
    ) : null;

  const jsonValue =
    content?.type === 'rollout-json'
      ? content.isNested && content.attempt
        ? content.attempt
        : content?.rollout
      : null;

  const handleClose = () => {
    dispatch(closeDrawer());
  };

  return (
    <Drawer
      position="right"
      size="lg"
      opened={isOpen}
      onClose={handleClose}
      overlayProps={{ opacity: 0.5, blur: 4 }}
      withinPortal
      title={titleContent ?? heading}
    >
      {content ? (
        <Stack gap="md" h="100%">
          {content.type === 'rollout-json' && jsonValue ? (
            <ScrollArea h="100%" type="always">
              <CodeHighlight code={formatJson(jsonValue)} language="json" withCopyButton />
            </ScrollArea>
          ) : null}
        </Stack>
      ) : null}
    </Drawer>
  );
}
