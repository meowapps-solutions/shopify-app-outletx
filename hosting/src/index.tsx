import { useState } from 'react';
import {
  Button,
  Card,
  FormLayout,
  Page,
  Text,
  TextField,
  Form,
  BlockStack,
} from '@shopify/polaris';
import RuleListPage from './app/rule';
import shopifyLogo from '/shopify.svg';

export default function Index() {
  const [shop, setShop] = useState('');
  const [error, setError] = useState('');
  const onChange = (url: string) => {
    const shopname = (() => {
      const regex = /:\/\/([^/]+)\.myshopify\.com|\/\/([^/]+)\.myshopify\.com|([^/]+)\.myshopify\.com/;
      const match = url.match(regex);
      if (match) {
        if (match[1]) { return match[1]; }
        else if (match[2]) { return match[2]; }
        else if (match[3]) { return match[3]; }
      }
      return null;
    })();

    if (shopname) {
      setShop(`${shopname}.myshopify.com`);
      setError('');
    } else {
      setShop(url);
      setError('Shop domain is invalid');
    }
  };
  const onSubmit = () => {
    if (shop && !error) {
      window.location.href = `/api/auth/?shop=${shop}`;
    } else {
      setError('Shop domain is invalid');
    }
  };

  const url = new URL(location.href);
  if (url.searchParams.get('shop')) {
    return (<RuleListPage />);
  }

  return (
    <Page>
      <BlockStack gap={'500'}>
        <div style={{ width: 300, margin: '0 auto' }}>
          <a href="https://www.shopify.com/" target="_blank">
            <img src={shopifyLogo} className="logo" alt="Shopify logo" />
          </a>
        </div>

        <Card>
          <Form onSubmit={onSubmit}>
            <FormLayout>
              <Text variant="headingMd" as="h2">Log in</Text>
              <TextField
                type="text"
                name="shop"
                label="Shop domain"
                helpText="example.myshopify.com"
                value={shop}
                onChange={onChange}
                autoComplete="on"
                error={error}
              />
              <Button submit disabled={(shop && error || !shop) ? true : false}>Log in</Button>
            </FormLayout>
          </Form>
        </Card>
      </BlockStack>
    </Page>
  );
}
