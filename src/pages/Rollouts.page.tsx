import { Stack, TextInput, Title } from '@mantine/core';
import { useState } from 'react';

export function RolloutsPage() {
  const [searchInput, setSearchInput] = useState('');
  return (
    <Stack gap="md">
      <Title order={1}>Rollouts</Title>

      <TextInput
        placeholder="Type Rollout ID to search (e.g., ro-7fa3b6e2)"
        value={searchInput}
        onChange={(event) => setSearchInput(event.currentTarget.value)}
        data-testid="rollouts-search-input"
      />


    </Stack>
  );
}
