import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { AppProvider as PolarisAppProvider } from '@shopify/polaris';
import '@shopify/polaris/build/esm/styles.css';

import enPolarisTranslations from '@shopify/polaris/locales/en.json';

import { AppNavMenu } from './components/nav-menu';

import Index from './index';
import NotFound from './404';
import AppLayout from './app/_layout';
import RuleListPage from './app/rule';
import RuleDetailPage from './app/rule.id';
import SettingsPage from './app/settings';
import ActivityPage from './app/activity';

// https://reactrouter.com/start/library/routing
createRoot(document.getElementById('root')!).render(
  <PolarisAppProvider i18n={enPolarisTranslations}>
    <BrowserRouter>
      <Routes>
        <Route index element={<Index />} />

        <Route path="app" element={<AppLayout />}>
          <Route index element={<RuleListPage />} />
          <Route path="rule" element={<Navigate to={`/app${location.search}`} />} />
          <Route path="rule/:ruleId" element={<RuleDetailPage />} />
          <Route path="activity" element={<ActivityPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>

        <Route path='*' element={<NotFound />} />
      </Routes>

      <AppNavMenu
        tabs={[
          { content: 'Home', url: '/app' },
          { url: '/app/activity', content: 'Recent runs' },
          { url: '/app/settings', content: 'Settings' },
        ]}
      />
    </BrowserRouter>
  </PolarisAppProvider>,
);
