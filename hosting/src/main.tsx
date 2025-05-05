import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router';
import { AppProvider as PolarisAppProvider } from '@shopify/polaris';
import '@shopify/polaris/build/esm/styles.css';

import enPolarisTranslations from '@shopify/polaris/locales/en.json';

import { AppNavMenu } from './components/nav-menu';

import Index from './index';
import NotFound from './404';
import AppLayout from './app/_layout';
import App from './app/index';
import RuleDetailPage from './app/rules.id';
import RuleListPage from './app/rules';

// https://reactrouter.com/start/library/routing
createRoot(document.getElementById('root')!).render(
  <PolarisAppProvider i18n={enPolarisTranslations}>
    <BrowserRouter>
      <Routes>
        <Route index element={<Index />} />

        <Route path="app" element={<AppLayout />}>
          <Route index element={<App />} />
          <Route path="rules/:ruleId" element={<RuleDetailPage />} />
          <Route path="rules" element={<RuleListPage />} />
        </Route>

        <Route path='*' element={<NotFound />} />
      </Routes>

      <AppNavMenu
        tabs={[
          { content: 'Home', url: '/app' },
          { url: '/app', content: 'Dashboard' },
          { url: '/app/rules', content: 'Manage Rules' },
        ]}
      />
    </BrowserRouter>
  </PolarisAppProvider>,
);
