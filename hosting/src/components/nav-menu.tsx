import { NavMenu } from '@shopify/app-bridge-react';
import { useAppNavigate } from '../hooks/app-navigate';

export function AppNavMenu({ tabs = [] }: { tabs: { content: string, url: string }[] }) {
  const navigate = useAppNavigate();

  const url = new URL(location.href);
  if (!url.searchParams.get('shop')) {
    return null;
  }

  const sortedMatchingTabs = tabs.filter(tab => {
    return url.pathname.startsWith(tab.url);
  }).sort((a, b) => b.url.split('/').length - a.url.split('/').length);

  const tabMarkup = tabs.map((tab, index) => {
    const href = sortedMatchingTabs.length > 0 && sortedMatchingTabs[0].url === tab.url ? url.pathname : tab.url;
    return <a href={href} rel={index === 0 ? 'home' : ''} onClick={(e) => { e.preventDefault(); navigate(tab.url); }}>{tab.content}</a>;
  });

  return (
    <NavMenu>
      {tabMarkup}
    </NavMenu>
  );
}