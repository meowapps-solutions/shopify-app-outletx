import { useEffect, useState } from 'react';
import { Bleed, BlockStack, Box, Button, Icon, InlineStack, SkeletonBodyText, SkeletonThumbnail, Text, TextField, Thumbnail } from '@shopify/polaris';
import { ImageIcon, SearchIcon, XIcon } from '@shopify/polaris-icons';
import moneyFormat from '../utils/money-format';
import deepCompare from '../utils/deep-compare';
import useSyncedState from '../hooks/use-synced-state';

export default function ResourcePicker({ label, type, multiple, items, onChange }: { label: string, type: 'product' | 'collection', multiple?: boolean, items: { id: string, variants?: string[] }[], onChange?: (items: { id: string, variants?: string[] }[]) => void }) {
  const [state, setState] = useSyncedState(items);
  const [resourceOptions, setResourceOptions] = useState<{ id: string, name: string, image?: string, product?: { totalVariants: number, hasOnlyDefaultVariant: boolean, variants: { price: string }[], totalSelectedVariants: number } }[] | undefined>(undefined);

  useEffect(() => {
    if (deepCompare(state, items) === false && onChange) {
      onChange(state);
    }

    Promise.all(state.map(({ id }) =>
      resourcePickerQuery({ id }).then((data) => {
        if (type === 'product') {
          setResourceOptions(prev => (prev?.filter(item => item.id !== id) || [])
            .concat({
              id: data.id,
              name: data.title,
              image: data.media.edges[0]?.node.originalSource.url,
              product: {
                totalVariants: data.variantsCount.count,
                hasOnlyDefaultVariant: data.hasOnlyDefaultVariant,
                variants: data.variants.edges.map(({ node }: { node: { price: string } }) => ({ price: node.price })),
                totalSelectedVariants: state.find(item => item.id === data.id)?.variants?.length || 0,
              },
            }));
        } else {
          setResourceOptions(prev => (prev?.filter(item => item.id !== id) || [])
            .concat({
              id: data.id,
              name: data.title,
              image: data.image?.url,
            }));
        }
      }),
    ));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <>
      <TextField
        labelHidden
        label={label}
        placeholder={label}
        prefix={<Icon source={SearchIcon} tone='base' />}
        onChange={resourcePicker}
        autoComplete='off'
        connectedRight={
          <Button onClick={() => resourcePicker()}>Browse</Button>
        }
      />

      {state.length > 0 && (
        <Box padding='400' borderWidth='025' borderRadius='200' borderColor='border-secondary' background='bg-surface'>
          <BlockStack gap='300'>
            {state.map(({ id }, index) => {
              const resourceOption = resourceOptions?.find(item => item.id === id);
              if (resourceOption === undefined) {
                return (
                  <>
                    {index > 0 && (
                      <Bleed marginInline='400'><Box borderBlockStartWidth='025' borderColor='border-secondary' /></Bleed>
                    )}

                    <InlineStack gap='400' blockAlign='center'>
                      <SkeletonThumbnail size='small' />
                      <div style={{ width: '30%' }}><SkeletonBodyText lines={1} /></div>
                    </InlineStack>
                  </>
                );
              }

              const { name, image, product } = resourceOption;
              return (
                <>
                  {index > 0 && (
                    <Bleed marginInline='400'><Box borderBlockStartWidth='025' borderColor='border-secondary' /></Bleed>
                  )}

                  <InlineStack gap='400' blockAlign='center'>
                    <Thumbnail source={image || ImageIcon} alt={name} size='small' />
                    <Text as='p'>
                      {name}
                      {
                        product && product.totalVariants > 1 && (
                          <>
                            <br></br>
                            <Text as='span' tone='subdued'>({product.totalSelectedVariants} of {product.totalVariants} variants selected)</Text>
                          </>
                        ) ||
                        product && product.totalSelectedVariants === 1 && product.hasOnlyDefaultVariant === false && (
                          <>
                            <br></br>
                            <Text as='span' tone='subdued'>{moneyFormat(Number(product.variants[0].price))}</Text>
                          </>
                        )
                      }
                    </Text>

                    <div style={{ marginLeft: 'auto' }}>
                      <InlineStack gap='500'>
                        {product && product.totalVariants > 1 && (
                          <Button variant='plain' onClick={() => {
                            resourcePicker(undefined, { query: `id:${id.replace('gid://shopify/Product/', '')}` });
                          }}>Edit</Button>
                        )}

                        <Button icon={XIcon} variant='tertiary' accessibilityLabel='Remove item' onClick={() => {
                          setState(prev => prev.filter(item => item.id !== id));
                        }} />
                      </InlineStack>
                    </div>
                  </InlineStack>
                </>
              );
            })}
          </BlockStack>
        </Box>
      )}
    </>
  );

  async function resourcePicker(query?: string, filter?: { query?: string }) {
    const result = await shopify.resourcePicker({
      type: type,
      selectionIds: state?.map(item => ({ id: item.id, variants: item.variants?.map(variant => ({ id: variant })) })) || undefined,
      action: 'select',
      multiple: multiple ?? true,
      query: query,
      filter: filter,
    }) as { id: string, variants?: { id: string }[] }[] | undefined;

    if (result === undefined) {
      return;
    }

    setState(result.map(({ id, variants }) => {
      if (variants === undefined) {
        return { id };
      }
      return { id, variants: variants.map(variant => variant.id) };
    }));
  }

  function resourcePickerQuery(variables: { id: string }) {
    const cached = {
      window: window as { __resourcePickerQuery?: Record<string, unknown> },
      set(data: unknown) {
        if (this.window.__resourcePickerQuery === undefined) {
          this.window.__resourcePickerQuery = {};
        }
        this.window.__resourcePickerQuery[variables.id] = data;
      },
      get() {
        return this.window.__resourcePickerQuery?.[variables.id];
      },
    };

    if (cached.get() !== undefined) {
      return Promise.resolve(cached.get());
    }

    const query = {
      'product': `
        query ResourcePickerQuery($id: ID!) {
          product(id: $id) {
            id
            title
            hasOnlyDefaultVariant
            variantsCount {
              count
            }
            variants(first: 1) {
              edges {
                node {
                  price
                }
              }
            }
            media(first: 1, query: "media_type:IMAGE") {
              edges {
                node {
                  ... on MediaImage {
                    id
                    originalSource {
                      url
                    }
                  }
                }
              }
            }
          }
        }
      `,
      'collection': `
        query ResourcePickerQuery($id: ID!) {
          collection(id: $id) {
            id
            title
            image {
              url
            }
          }
        }
      `,
    }[type];

    return fetch('shopify:admin/api/2025-01/graphql.json', {
      method: 'POST',
      body: JSON.stringify({ query: query, variables: variables }),
    }).then((response) => response.json())
      .then((data) => ({
        'product': data.data.product,
        'collection': data.data.collection,
      }[type]))
      .then((data) => {
        cached.set(data);
        return data;
      });
  }
}