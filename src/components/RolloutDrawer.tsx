import { Badge, Drawer, Group, ScrollArea, Stack, Text, Title } from '@mantine/core';
import { CodeHighlight } from '@mantine/code-highlight';
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
      title={heading}
    >
      {content ? (
        <Stack gap="md" h="100%">
          <Stack gap={4}>
            <Title order={4}>{heading}</Title>
            <Group gap="xs">
              <Text size="sm" c="dimmed">
                Attempt
              </Text>
              <Text size="sm">{attemptId ?? 'N/A'}</Text>
              {statusLabel ? (
                <Badge size="sm" variant="light" color={statusBadgeColor}>
                  {statusLabel}
                </Badge>
              ) : null}
            </Group>
          </Stack>

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
