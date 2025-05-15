import { BlockStack, Box, Button, Card, ChoiceList, Divider, InlineGrid, Page, Text, TextField, useBreakpoints } from '@shopify/polaris'; import FormSyncStatus from '../components/form-sync-status';
import ResourcePicker from '../components/resource-picker';
import { useAppState } from '../data/app-state-context';
import { Setting } from '../../../functions/src/api/app/firestore/types';
import useSyncedState from '../hooks/use-synced-state';
import { useAppNavigate } from '../hooks/app-navigate';

export default function SettingsPage() {
  const { smUp } = useBreakpoints();
  const navigate = useAppNavigate();
  const { rules, settings, shop } = useAppState();
  const initialized = shop in settings;
  const [email, setEmail] = useSyncedState(settings[shop]?.notifications?.email);

  if (!initialized) { return null; }
  return (
    <Page>
      <BlockStack gap={{ xs: '800', sm: '400' }}>
        <FormSyncStatus />
        {smUp ? <Divider /> : null}
        <InlineGrid columns={{ xs: '1fr', md: '2fr 5fr' }} gap="400">
          <Box
            as="section"
            paddingInlineStart={{ xs: '400', sm: '0' }}
            paddingInlineEnd={{ xs: '400', sm: '0' }}
          >
            <BlockStack gap="400">
              <Text as="h3" variant="headingMd">
                General
              </Text>
              <Text as="p" variant="bodyMd">
                Configure general application settings here.
              </Text>
            </BlockStack>
          </Box>
          <Card roundedAbove="sm">
            <BlockStack gap="400">

              <BlockStack gap='100'>
                <Text as="p">Move to collection</Text>
                <ResourcePicker label='Search collections' type='collection' multiple={false} items={settings[shop]?.default_outlet_collection_id ? [{ id: settings[shop]?.default_outlet_collection_id }] : []} onChange={items => settings[shop] = { ...settings[shop], default_outlet_collection_id: items[0]?.id }} />
              </BlockStack>

              <Box>
                <TextField
                  label="Notifications"
                  type="email"
                  value={email}
                  onChange={setEmail}
                  onBlur={() => { settings[shop] = { ...settings[shop], notifications: { ...settings[shop]?.notifications, email } }; }}
                  autoComplete="email"
                  helpText="This feature is coming soon"
                />

                <ChoiceList
                  allowMultiple
                  titleHidden
                  title="Notifications"
                  disabled={!email}
                  choices={(() => {
                    type EventType = NonNullable<Setting['notifications']>['subscribed_events'] extends (infer E)[] ? E : never;
                    const labels: Record<EventType, string> = {
                      'rule-triggered': 'Email me when a rule is triggered',
                      'weekly-summary': 'Email me weekly outlet performance summary',
                    };
                    return Object.entries(labels).map(([value, label]) => ({ label: label as string, value }));
                  })()}
                  selected={settings[shop]?.notifications?.subscribed_events || []}
                  onChange={(selected) => {
                    settings[shop] = { ...settings[shop], notifications: { ...settings[shop]?.notifications, subscribed_events: selected as NonNullable<Setting['notifications']>['subscribed_events'] } };
                  }}
                />
              </Box>
            </BlockStack>
          </Card>
        </InlineGrid>
        {smUp ? <Divider /> : null}
        <InlineGrid columns={{ xs: '1fr', md: '2fr 5fr' }} gap="400">
          <Box
            as="section"
            paddingInlineStart={{ xs: '400', sm: '0' }}
            paddingInlineEnd={{ xs: '400', sm: '0' }}
          >
            <BlockStack gap="400">
              <Text as="h3" variant="headingMd">
                Excluded collections
              </Text>
              <Text as="p" variant="bodyMd">
                Hide collections to prevent accidental selection and exclude them from system operations.
              </Text>
            </BlockStack>
          </Box>
          <Card roundedAbove="sm">
            <ResourcePicker label='Search collections' type='collection' ignoreExcluded={true} onChange={items => settings[shop] = { ...settings[shop], excluded_collections: items }} items={settings[shop]?.excluded_collections || []} />
          </Card>
        </InlineGrid>
        {smUp ? <Divider /> : null}
        <InlineGrid columns={{ xs: '1fr', md: '2fr 5fr' }} gap="400">
          <Box
            as="section"
            paddingInlineStart={{ xs: '400', sm: '0' }}
            paddingInlineEnd={{ xs: '400', sm: '0' }}
          >
            <BlockStack gap="400">
              <Text as="h3" variant="headingMd">
                Excluded products
              </Text>
              <Text as="p" variant="bodyMd">
                Hide products to prevent accidental selection and exclude them from system operations.
              </Text>
            </BlockStack>
          </Box>
          <Card roundedAbove="sm">
            <BlockStack gap='400'>
              <BlockStack gap='100'>
                <Text as="p">For all rules</Text>
                <ResourcePicker label='Search products' type='product' ignoreExcluded={true} onChange={items => settings[shop] = { ...settings[shop], excluded_products: items }} items={settings[shop]?.excluded_products || []} />
                <Text as="p" tone='subdued' variant='bodySm'>
                  These products apply to all rules by default. Some may still appear here if reverted or explicitly excluded in the rule settings.
                </Text>
              </BlockStack>

              {Object.entries(rules).filter(([, rule]) => rule?.excluded_products?.length).map(([ruleId, rule]) => (
                <BlockStack gap='100'>
                  <Text as="p">For <Button variant='plain' onClick={() => navigate(`/app/rule/${ruleId}`)}>{rule?.name}</Button></Text>
                  <ResourcePicker label='Search products' type='product' ignoreExcluded={true} removeOnly={true} onChange={items => { if (rules[ruleId]) { rules[ruleId] = { ...rules[ruleId], excluded_products: items }; } }} items={rule?.excluded_products || []} />
                </BlockStack>
              ))}
            </BlockStack>
          </Card>
        </InlineGrid>
        {smUp ? <Divider /> : null}
        <InlineGrid columns={{ xs: '1fr', md: '2fr 5fr' }} gap="400">
          <Box
            as="section"
            paddingInlineStart={{ xs: '400', sm: '0' }}
            paddingInlineEnd={{ xs: '400', sm: '0' }}
          >
            <Text as="h3" variant="headingMd">
              Support
            </Text>
          </Box>
          <BlockStack gap="400">
            <Button textAlign="left" variant="plain">Contact Support</Button>
            <Button textAlign="left" variant="plain">Documentation/FAQ</Button>
          </BlockStack>
        </InlineGrid>
      </BlockStack>
    </Page>
  );
}
