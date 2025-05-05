import { BlockStack, Icon, IconSource, InlineStack, Card as PolarisCard, Text } from '@shopify/polaris';

export default function Card({ title, source, children }: { title: string, source?: IconSource, children?: React.ReactNode }) {
  return (
    <PolarisCard>
      <BlockStack gap='300'>
        <InlineStack gap='200'>
          {source && <span><Icon source={source} tone='subdued' /></span>}
          <Text as='p' variant='headingMd'>{title}</Text>
        </InlineStack>

        {children}
      </BlockStack>
    </PolarisCard>
  );

}