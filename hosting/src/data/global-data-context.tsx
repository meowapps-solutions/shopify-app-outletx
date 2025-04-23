import { createContext, useContext, useEffect } from 'react';
import { ShopifyGlobal, useAppBridge } from '@shopify/app-bridge-react';
import { Box, Icon, InlineStack } from '@shopify/polaris';
import { RefreshIcon } from '@shopify/polaris-icons';
import { useAppNavigate } from '../hooks/app-navigate';
import useFirestore from '../hooks/use-firestore';

type TContext = {
  shop: string,
  shopify: ShopifyGlobal,
  firestore: ReturnType<typeof useFirestore>,
  navigate: (to: string) => void,
}

const GlobalDataContext = createContext<TContext | undefined>(undefined);

export const GlobalDataProvider = ({ children }: { children: React.ReactNode }) => {
  const shopify = useAppBridge();
  const navigate = useAppNavigate();
  const shop = shopify.config.shop;
  if (!shop) { throw new Error('shop is not defined'); }

  const firestore = useFirestore();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { shopify.loading(firestore.isLoading); }, [firestore.isLoading]);

  return (
    <GlobalDataContext.Provider
      value={{
        shop,
        shopify,
        firestore,
        navigate,
      }}
    >
      {children}

      {firestore.isSyncing && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1000 }}>
          <InlineStack gap='200'><div style={{ marginLeft: 'auto' }}><Icon source={RefreshIcon} tone='base' /></div>Syncing...</InlineStack>
        </div>
      )}

      <Box paddingBlockStart="500" />
    </GlobalDataContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useGlobalData = () => {
  const context = useContext(GlobalDataContext);

  if (context === undefined) {
    throw new Error('useGlobalData must be used within a GlobalDataProvider');
  }

  return context;
};