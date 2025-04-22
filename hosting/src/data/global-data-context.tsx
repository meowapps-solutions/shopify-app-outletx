import { createContext, useContext, useEffect, useMemo } from 'react';
import { ShopifyGlobal, useAppBridge } from '@shopify/app-bridge-react';
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
  const isLoading = useMemo(() => firestore.loading, [firestore.loading]);

  useEffect(() => {
    shopify.loading(isLoading);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

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