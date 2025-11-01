import { Alert } from '@mantine/core';
import { IconAlertCircle, IconAlertTriangle, IconInfoCircle } from '@tabler/icons-react';
import { hideAlert, selectHighestPriorityAlert } from '@/features/ui/alert';
import { useAppDispatch, useAppSelector } from '@/store/hooks';

const ALERT_META = {
  info: {
    color: 'blue',
    icon: IconInfoCircle,
  },
  warning: {
    color: 'yellow',
    icon: IconAlertTriangle,
  },
  error: {
    color: 'red',
    icon: IconAlertCircle,
  },
} as const;

export function AppAlertBanner() {
  const dispatch = useAppDispatch();
  const alert = useAppSelector(selectHighestPriorityAlert);

  if (!alert) {
    return null;
  }

  const meta = ALERT_META[alert.tone];
  const IconComponent = meta.icon;

  return (
    <Alert
      color={meta.color}
      icon={<IconComponent size={18} />}
      variant="light"
      withCloseButton
      onClose={() => dispatch(hideAlert({ id: alert.id }))}
      style={{ marginBottom: 'var(--mantine-spacing-md)' }}
    >
      {alert.message}
    </Alert>
  );
}
