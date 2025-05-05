import { useLocation, useNavigate } from 'react-router';

export function useAppNavigate() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentSearchParams = new URLSearchParams(location.search);

  return async (to: string) => {
    await shopify.saveBar.leaveConfirmation();

    const [pathnamePart, searchPart] = to.split('?');
    const toSearchParams = new URLSearchParams(searchPart);
    const mergedSearchParams = new URLSearchParams();

    for (const [key, value] of toSearchParams.entries()) {
      mergedSearchParams.set(key, value);
    }
    for (const [key, value] of currentSearchParams.entries()) {
      if (!mergedSearchParams.has(key)) {
        mergedSearchParams.set(key, value);
      }
    }

    navigate(`${pathnamePart}?${mergedSearchParams.toString()}`);
  };
}