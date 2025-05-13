import { Bleed, BlockStack, Box, Button, Card, DataTable, Divider, InlineGrid, Page, Text, useBreakpoints } from '@shopify/polaris';
import { ExternalSmallIcon } from '@shopify/polaris-icons';
import { useParams } from 'react-router';
import { useAppNavigate } from '../hooks/app-navigate';
import { useAppState } from '../data/app-state-context';
import { useEffect, useState } from 'react';
import moment from 'moment';
import moneyFormat from '../utils/money-format';

export default function ActivityDetailPage() {
  const { syncId } = useParams() as { syncId: string };
  const { smUp } = useBreakpoints();
  const navigate = useAppNavigate();
  const { rules, syncData, shop, getProductVariant, getShopifyCollection } = useAppState();
  const compareData = syncData[syncId];
  const [productVariant, setProductVariant] = useState<{ id: string; title: string; product: { title: string } } | null>(null);
  const [collection, setCollection] = useState<Record<string, { id: string; title: string; image: { url: string } } | null>>({});

  useEffect(() => {
    if (compareData) {
      getProductVariant(compareData.variant_id).then(setProductVariant);

      compareData.triggered_rules?.forEach((rule) => {
        rule.reports.forEach((report) => {
          if (report.type === 'move_to_collection') {
            const collectionId = report.new_value as string;
            getShopifyCollection(collectionId).then((data) => {
              setCollection((prev) => ({ ...prev, [collectionId]: data }));
            });
          }
        });
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compareData]);

  if (!compareData || !productVariant) { return null; }
  return (
    <Page
      title={'Run details'}
      additionalMetadata={<Text as='p' tone='subdued' variant='bodySm'>Product: <Button variant="plain" url={`shopify:admin/products/${compareData?.product_id?.replace('gid://shopify/Product/', '')}/variants/${compareData?.variant_id?.replace('gid://shopify/ProductVariant/', '')}`} target="_blank">{productVariant?.product.title.concat(`: ${productVariant.title}`).replace(': Default Title', '')}</Button></Text>}
      backAction={{ content: 'Activity', onAction: () => navigate('/app/activity') }}
    >
      <Box paddingInlineStart={{ xs: '0', md: '800' }}>
        <BlockStack gap={{ xs: '800', sm: '400' }}>
          {compareData.triggered_rules?.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())?.map((rule, index) => (
            <>
              {smUp && index !== 0 ? <Divider /> : null}
              <InlineGrid columns={{ xs: '1fr', md: '3fr 4fr' }} gap="400">
                <Box
                  as="section"
                  paddingInlineStart={{ xs: '400', sm: '0' }}
                  paddingInlineEnd={{ xs: '400', sm: '0' }}
                >
                  <BlockStack gap="050">
                    <Text as="h2" variant='headingMd'>Started at {moment(rule.created_at).format('MMMM D, YYYY [at] h:mm A')}</Text>
                    <Text as='p' tone='subdued' variant='bodySm'>Rule: <Button variant="plain" url={`https://admin.shopify.com/store/${shop.replace('.myshopify.com', '')}/apps/${import.meta.env.VITE_SHOPIFY_APP_HANDLE}/app/rule/${rule.id}`} target="_blank">{rules[rule.id]?.name}</Button></Text>
                  </BlockStack>
                </Box>
                <Card roundedAbove="sm">
                  <Bleed marginInline='400' marginBlock='400'>
                    <DataTable
                      columnContentTypes={[
                        'text',
                        'numeric',
                        'numeric',
                      ]}
                      headings={[
                        'Trigger type',
                        'New value',
                        'Old value',
                      ]}
                      rows={rule.reports.map(report => [
                        <Text as='p' fontWeight='semibold'>{{
                          'discount': 'Discount',
                          'discount_fixed_amount': 'Discount',
                          'move_to_collection': 'Move to collection',
                          'add_tag': 'Add tag',
                        }[report.type]}</Text>,
                        (report.type === 'discount' || report.type === 'discount_fixed_amount') ?
                          moneyFormat(Number(report.new_value) as number) :
                          (report.type === 'move_to_collection') ?
                            <Button variant="plain" url={`shopify:admin/collections/${(report.new_value as string)?.replace('gid://shopify/Collection/', '')}`} target="_blank" icon={ExternalSmallIcon}>{collection[report.new_value as string]?.title}</Button>
                            : report.new_value as string,
                        <Text as='p' textDecorationLine='line-through'>{(report.type === 'discount' || report.type === 'discount_fixed_amount') ? moneyFormat(Number(report.backup_value) as number) : report.backup_value as string}</Text>,
                      ])}
                      footerContent={<div style={{ textAlign: 'right' }}><Button variant="primary" tone="critical" disabled={index != 0}>Revert</Button></div>}
                    />
                  </Bleed>
                </Card>
              </InlineGrid>
            </>
          ))}
        </BlockStack>
      </Box>
    </Page>
  );
}