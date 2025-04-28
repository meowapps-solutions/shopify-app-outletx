import { BlockStack, Page } from '@shopify/polaris';
import SettingsSyncStatus from '../components/settings-sync-status';

export default function SettingsPage() {
  return (
    <Page primaryAction={{ content: 'Save', disabled: true }}>
      <BlockStack gap='500'>
        <SettingsSyncStatus />
      </BlockStack>
    </Page>
  );
}