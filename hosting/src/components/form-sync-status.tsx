import {
  BlockStack,
  Box,
  Button,
  Card,
  InlineGrid,
  InlineStack,
  ProgressBar,
  Text,
} from '@shopify/polaris';
import { useEffect, useState } from 'react';
import { useAppState } from '../data/app-state-context';
import moment from 'moment';

export default function FormSyncStatus() {
  const { settings, shop } = useAppState();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const loading = !(shop in settings);
  const needSync = settings[shop]?.sync_status === 'need_sync' || !settings[shop]?.last_sync_time;

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (isSyncing) {
        event.preventDefault();
        event.returnValue = '';
        return 'Synchronization is in progress. Are you sure you want to leave? This may interrupt the process.';
      }
    };

    if (isSyncing) { window.addEventListener('beforeunload', handleBeforeUnload); }
    else { window.removeEventListener('beforeunload', handleBeforeUnload); }

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isSyncing]);

  return (
    <InlineGrid columns={{ xs: '1fr', md: '2fr 5fr' }} gap="400">
      <Box
        as="section"
        paddingInlineStart={{ xs: '400', sm: '0' }}
        paddingInlineEnd={{ xs: '400', sm: '0' }}
      >
        <BlockStack gap="400">
          <Text as="h3" variant="headingMd">Data Synchronization</Text>
          <Text as="p" variant="bodyMd">Keep your product data up-to-date. View the current sync status or initiate a new sync.</Text>
        </BlockStack>
      </Box>
      <Card roundedAbove="sm" background={!isSyncing && needSync ? 'bg-surface-caution' : undefined}>
        <BlockStack gap="400">
          {isSyncing ? (
            // Display progress bar when syncing
            <BlockStack gap="200">
              <Text variant="bodyMd" as="p">Synchronization in progress...</Text>
              <Text variant="bodyXs" as="p" tone="subdued">Please do not close or reload this page to avoid interruption.</Text>
              <ProgressBar progress={syncProgress} size="small" />
              <Text variant="bodySm" as="p" tone="subdued">{`${Math.floor(syncProgress)}% complete`}</Text>
            </BlockStack>
          ) : (
            // Display last sync time and Sync button when not syncing
            <InlineStack align="space-between" wrap={false} gap='200'>
              {
                {
                  'error': <Text variant="bodyMd" as="p" tone="critical">The last synchronization failed. Please try again. If the problem persists, contact support.</Text>,
                  'need_sync': <Text variant="bodyMd" as="p" tone="critical">Synchronization required. Please sync your data.</Text>,
                  'success': <Text variant="bodyMd" as="p">{formatLastSyncTime(settings[shop]?.last_sync_time)}</Text>,
                }[settings[shop]?.sync_status || 'need_sync']
              }
              <div style={{ whiteSpace: 'nowrap' }}>
                <Button variant={needSync || !settings[shop]?.last_sync_time ? 'primary' : 'secondary'} onClick={onSyncClick} loading={isSyncing || loading}>Sync Now</Button>
              </div>
            </InlineStack>
          )}
        </BlockStack>
      </Card>
    </InlineGrid>
  );

  async function onSyncClick() {
    setIsSyncing(true);
    setSyncProgress(0);
    let hasError = false;

    try {
      const response = await fetch('/api/app/sync/start', {
        method: 'POST',
      });
      const statusData = await response.json();
      console.log('Sync started:', statusData);

      await Promise.all(
        statusData.data.map(async (jobid: string) =>
          fetch('/api/app/sync?job_id=' + jobid, {
            method: 'POST',
          }).then((res) => {
            if (res.ok) {
              setSyncProgress(prev => prev += 100 / statusData.data.length);
            } else {
              throw new Error('Sync error');
            }
          }),
        ),
      );

      await fetch('/api/app/schedule?shop=' + shop, { method: 'POST' });
    } catch (error) {
      console.error(error);
      hasError = true;
    }

    setIsSyncing(false);
    settings[shop] = { ...settings[shop], last_sync_time: new Date().toISOString(), sync_status: hasError ? 'error' : 'success' };
  };

  function formatLastSyncTime(time: Date | string | null | undefined) {
    if (loading) { return 'Fetching last sync time...'; }
    if (!time) { return 'Never synced.'; }
    try {
      const date = typeof time === 'string' ? new Date(time) : time;
      // Check if date is valid before formatting
      if (isNaN(date.getTime())) {
        return 'Invalid date.';
      }
      return `Last synced: ${moment(date).calendar()}`;
    } catch (e) {
      console.error('Error formatting date:', e); // Added error logging
      return 'Error formatting date.';
    }
  };
}
