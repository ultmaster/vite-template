import { useMemo } from 'react';
import { ActionIcon, Badge, Box, CopyButton, Drawer, Group, Stack, Text, Tooltip, useMantineColorScheme } from '@mantine/core';
import { IconCheck, IconCopy } from '@tabler/icons-react';
import { Editor } from '@monaco-editor/react';
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
  const { colorScheme } = useMantineColorScheme();

  const rolloutId = content?.rollout.rolloutId ?? '';
  const attemptId = content?.attempt?.attemptId ?? null;
  const heading = rolloutId;
  const rolloutStatus = content?.rollout.status ?? null;
  const attemptStatus = content?.attempt?.status ?? null;
  const rolloutStatusLabel = rolloutStatus ? formatStatusLabel(rolloutStatus) : null;
  const attemptStatusLabel = attemptStatus ? formatStatusLabel(attemptStatus) : null;
  const hasStatusMismatch =
    rolloutStatus !== null && attemptStatus !== null && rolloutStatus !== attemptStatus;
  const rolloutBadgeColor = rolloutStatus ? getStatusBadgeColor(rolloutStatus, false) : undefined;
  const attemptBadgeColor = attemptStatus ? getStatusBadgeColor(attemptStatus, true) : undefined;
  const showRolloutBadgeInHeading = Boolean(rolloutStatusLabel && (!attemptStatus || hasStatusMismatch));
  const showAttemptBadge = Boolean(attemptStatusLabel && attemptStatus);

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
          {showRolloutBadgeInHeading && rolloutStatusLabel ? (
            <Badge size="sm" variant="light" color={rolloutBadgeColor}>
              {rolloutStatusLabel}
            </Badge>
          ) : null}
        </Group>
        <Group gap="xs">
          {attemptId && (
            <Group gap={3}>
              <Text size="sm" c="dimmed" fw={500}>Attempt</Text>
              <Text size="sm" c="dimmed">{attemptId}</Text>
            </Group>
          )}
          {showAttemptBadge && attemptStatusLabel ? (
            <Badge size="sm" variant="light" color={attemptBadgeColor}>
              {attemptStatusLabel}
            </Badge>
          ) : null}
          {!showRolloutBadgeInHeading && !attemptStatus && rolloutStatusLabel ? (
            <Badge size="sm" variant="light" color={rolloutBadgeColor}>
              {rolloutStatusLabel}
            </Badge>
          ) : null}
        </Group>
      </Stack>
    ) : null;

  const jsonValue =
    content?.type === 'rollout-json'
      ? content.isNested && content.attempt
        ? content.attempt
        : content?.rollout
      : null;
  const formattedJson = useMemo(() => (jsonValue ? formatJson(jsonValue) : ''), [jsonValue]);
  const editorTheme = colorScheme === 'dark' ? 'vs-dark' : 'vs-light';

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
      styles={{
        content: {
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '100vh',
        },
        body: {
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          padding: 'var(--mantine-spacing-md)',
          minHeight: 0,
          overflow: 'hidden',
        },
      }}
      title={titleContent ?? heading}
    >
      {content ? (
        <Stack gap="md" h="100%" style={{ flex: 1, minHeight: 0 }}>
          {content.type === 'rollout-json' && jsonValue ? (
            <Box style={{ flex: 1, minHeight: 0 }}>
              <Editor
                height="100%"
                language="json"
                value={formattedJson}
                theme={editorTheme}
                options={{
                  readOnly: true,
                  domReadOnly: true,
                  minimap: { enabled: false },
                  automaticLayout: true,
                  scrollBeyondLastLine: false,
                  fontSize: 13,
                }}
              />
            </Box>
          ) : null}
        </Stack>
      ) : null}
    </Drawer>
  );
}
