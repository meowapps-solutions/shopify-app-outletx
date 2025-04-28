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
import { useState } from 'react';
import { useGlobalData } from '../data/global-data-context';

export default function SettingsSyncStatus() {
  const { shop, firestore } = useGlobalData();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncError, setSyncError] = useState(false);
  const [actionRequired, setActionRequired] = useState(false);

  return (
    <InlineGrid columns={{ xs: '1fr', md: '2fr 5fr' }} gap='400'>
      <Box paddingInline='400'>
        <BlockStack gap='200'>
          <Text as='h3' variant='headingMd'>Data Synchronization</Text>
          <Text as='p' variant='bodyMd'>Keep your product data up-to-date. View the current sync status or initiate a new sync.</Text>
        </BlockStack>
      </Box>

      <Card background={actionRequired ? 'bg-surface-caution' : undefined}>
        {isSyncing ? (
          <BlockStack gap='200'>
            <Text variant='bodyMd' as='p'>Synchronization in progress...</Text>
            <Text variant='bodyXs' as='p' tone='subdued'>Please do not close or reload this page to avoid interruption.</Text>
            <ProgressBar progress={syncProgress} size='small' />
            <Text variant='bodySm' as='p' tone='subdued'>{`${Math.floor(syncProgress)}% complete`}</Text>
          </BlockStack>
        ) : (
          // Display last sync time and Sync button when not syncing
          <InlineStack align='space-between' wrap={false} gap='200'>
            {actionRequired ? (
              <Text variant='bodyMd' as='p' tone='critical'>Synchronization required. Please sync your data.</Text>
            ) : syncError ? (
              <Text variant='bodyMd' as='p' tone='critical'>The last synchronization failed. Please try again. If the problem persists, contact support.</Text>
            ) : (
              <Text variant='bodyMd' as='p'>{formatLastSyncTime(lastSyncTime)}</Text>
            )}
            <div style={{ whiteSpace: 'nowrap' }}>
              <Button variant={actionRequired || lastSyncTime === null ? 'primary' : 'secondary'} onClick={onSyncClick} loading={isSyncing || loading}>Sync Now</Button>
            </div>
          </InlineStack>
        )}
      </Card>
    </InlineGrid>
  );

  function formatLastSyncTime(time: Date | string | null | undefined) {
    if (loading) { return 'Fetching last sync time...'; }
    if (!time) { return 'Never synced.'; }
    try {
      const date = typeof time === 'string' ? new Date(time) : time;
      // Check if date is valid before formatting
      if (isNaN(date.getTime())) {
        return 'Invalid date.';
      }
      return `Last synced: ${date.toLocaleString()}`;
    } catch (e) {
      console.error('Error formatting date:', e); // Added error logging
      return 'Error formatting date.';
    }
  };

  async function onSyncClick() {
    setIsSyncing(true);
    setSyncError(false);
    setActionRequired(false);
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
          fetch('/api/app/sync?job_id=' + jobid, { method: 'POST' })
            .then((res) => {
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

    const lastSyncTime = new Date();
    setIsSyncing(false);
    setSyncError(hasError);
    setLastSyncTime(lastSyncTime);

    // firestore.update
    
    if (shop) {
      // updateSettings({
      //   shop_id: shop,
      //   last_sync_time: lastSyncTime.toISOString(),
      //   sync_status: hasError ? 'error' : 'success',
      // });
    }
  }
}
