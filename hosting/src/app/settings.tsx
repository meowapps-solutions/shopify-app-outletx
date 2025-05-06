import {
  BlockStack,
  Box,
  Button,
  Card,
  ChoiceList,
  Divider,
  Icon,
  InlineGrid,
  Page,
  Text,
  TextField,
  useBreakpoints,
} from '@shopify/polaris';
import {
  SearchIcon,
} from '@shopify/polaris-icons';
import FormSyncStatus from '../components/form-sync-status';

export default function SettingsPage() {
  const { smUp } = useBreakpoints();

  return (
    <Page primaryAction={{ content: 'Save', disabled: true }}>
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
              <BlockStack gap="200">
                <TextField
                  label="Default outlet collection"
                  placeholder="Search collections"
                  prefix={<Icon source={SearchIcon} tone="base" />}
                  onChange={value => {
                    shopify.resourcePicker({
                      type: 'collection',
                      action: 'select',
                      multiple: false,
                      query: value,
                    }).then(result => {
                      if (result?.length) {
                        // updateSettings({
                        //   shop_id: shopify.config.shop || '',
                        //   default_outlet_collection_id: result[0] as Collection,
                        // });
                      }
                    });
                  }}
                  autoComplete="off"
                  connectedRight={
                    <Button onClick={() => {
                      shopify.resourcePicker({
                        type: 'collection',
                        action: 'select',
                        multiple: false,
                      }).then(result => {
                        if (result?.length) {
                          // updateSettings({
                          //   shop_id: shopify.config.shop || '',
                          //   default_outlet_collection_id: result[0] as Collection,
                          // });
                        }
                      });
                    }}>Browse</Button>
                  }
                />
                {/* {settings?.default_outlet_collection_id && (
                  <ResourceList
                    items={[{
                      id: settings.default_outlet_collection_id.id,
                      name: settings.default_outlet_collection_id.title,
                      image: settings.default_outlet_collection_id.image?.originalSrc,
                    }]}
                  />
                )} */}
              </BlockStack>

              <Box>
                <TextField
                  label="Notifications (Comming soon)"
                  type="email"
                  value="nht@nguyenhoatien.com"
                  onChange={() => { }}
                  autoComplete="email"
                  disabled
                />

                <ChoiceList
                  allowMultiple
                  titleHidden
                  title="Notifications"
                  disabled
                  choices={[
                    {
                      label: 'Email me when a rule is triggered',
                      value: 'rule-triggered',
                    },
                    {
                      label: 'Email me weekly outlet performance summary',
                      value: 'weekly-summary',
                    },
                  ]}
                  selected={[]}
                  onChange={() => { }}
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
            <BlockStack gap="400">
              <TextField
                labelHidden
                label="Select collections to exclude"
                placeholder="Search collections"
                helpText="(Comming soon)"
                prefix={<Icon source={SearchIcon} tone="base" />}
                onChange={value => {
                  shopify.resourcePicker({
                    type: 'collection',
                    action: 'select',
                    multiple: true,
                    // selectionIds: settings?.excluded_collections?.map(item => ({ id: item.id })) || [],
                    query: value,
                  }).then(result => {
                    if (result?.length) {
                      // updateSettings({
                      //   shop_id: shopify.config.shop || '',
                      //   excluded_collections: result as Collection[],
                      // });
                    }
                  });
                }}
                autoComplete="off"
                connectedRight={
                  <Button onClick={() => {
                    shopify.resourcePicker({
                      type: 'collection',
                      action: 'select',
                      multiple: true,
                      // selectionIds: settings?.excluded_collections?.map(item => ({ id: item.id })) || [],
                    }).then(result => {
                      if (result?.length) {
                        // updateSettings({
                        //   shop_id: shopify.config.shop || '',
                        //   excluded_collections: result as Collection[],
                        // });
                      }
                    });
                  }}>Browse</Button>
                }
              />

              {/* <ResourceList
                items={settings?.excluded_collections?.map(collection => ({
                  id: collection.id,
                  name: collection.title,
                  image: collection.image?.originalSrc,
                })) || []}
                onDelete={async (id) => {
                  const newExcludedCollections = settings?.excluded_collections?.filter(item => item.id !== id);
                  await updateSettings({
                    shop_id: shopify.config.shop || '',
                    excluded_collections: newExcludedCollections,
                  });
                }}
              /> */}
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
                Excluded products
              </Text>
              <Text as="p" variant="bodyMd">
                Hide products (including reverted ones) to prevent accidental selection and exclude them from system operations.
              </Text>
            </BlockStack>
          </Box>
          <Card roundedAbove="sm">
            <BlockStack gap="400">
              <TextField
                labelHidden
                label="Select products to exclude"
                placeholder="Search collections"
                helpText="(Comming soon)"
                prefix={<Icon source={SearchIcon} tone="base" />}
                onChange={value => {
                  shopify.resourcePicker({
                    type: 'product',
                    action: 'select',
                    multiple: true,
                    // selectionIds: settings?.excluded_products?.map(product => ({
                    //   id: product.id,
                    //   variants: product.variants?.map(variant => ({ id: variant.id as string })),
                    // })) || [],
                    query: value,
                  }).then(result => {
                    if (result?.length) {
                      // updateSettings({
                      //   shop_id: shopify.config.shop || '',
                      //   excluded_products: result as Product[],
                      // });
                    }
                  });
                }}
                autoComplete="off"
                connectedRight={
                  <Button onClick={() => {
                    shopify.resourcePicker({
                      type: 'product',
                      action: 'select',
                      multiple: true,
                      // selectionIds: settings?.excluded_products?.map(product => ({
                      //   id: product.id,
                      //   variants: product.variants?.map(variant => ({ id: variant.id as string })),
                      // })) || [],
                    }).then(result => {
                      if (result?.length) {
                        // updateSettings({
                        //   shop_id: shopify.config.shop || '',
                        //   excluded_products: result as Product[],
                        // });
                      }
                    });
                  }}>Browse</Button>
                }
              />

              {/* <ResourceList
                items={settings?.excluded_products?.map(product => ({
                  id: product.id,
                  name: product.title,
                  image: product.images?.[0]?.originalSrc,
                  product,
                })) || []}
                onEdit={async (id, selected) => {
                  const newExcludedProducts = settings?.excluded_products?.map(item => {
                    if (item.id === id) {
                      return selected;
                    }
                    return item;
                  }).filter(item => item !== undefined);
                  await updateSettings({
                    shop_id: shopify.config.shop || '',
                    excluded_products: newExcludedProducts,
                  });
                }}
                onDelete={async (id) => {
                  const newExcludedProducts = settings?.excluded_products?.filter(item => item.id !== id);
                  await updateSettings({
                    shop_id: shopify.config.shop || '',
                    excluded_products: newExcludedProducts,
                  });
                }}
              /> */}
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

      <Box paddingBlockStart="500" />
    </Page>
  );
}
