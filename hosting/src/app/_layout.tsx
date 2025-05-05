import { Outlet } from 'react-router';
import Index from '..';
import { AppStateProvider } from '../data/app-state-context';
import { Box } from '@shopify/polaris';

export default function AppLayout() {
  const url = new URL(location.href);
  if (url.searchParams.get('shop')) {
    return (
      <AppStateProvider>
        <Outlet />

        <Box paddingBlockStart='600' />
      </AppStateProvider>
    );
  }

  return (<Index />);
}