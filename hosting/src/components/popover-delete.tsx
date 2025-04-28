import { Button, Popover, ButtonProps, InlineStack, ButtonGroup, Banner } from '@shopify/polaris';
import { useState, useCallback } from 'react';

interface TType extends ButtonProps { onAction?: () => void };

export default function PopoverDelete(props: TType) {
  const [popoverActive, setPopoverActive] = useState(false);
  const [isLoading, setLoading] = useState(false);

  const togglePopoverActive = useCallback(() => {
    if (isLoading) { return; }
    setPopoverActive((popoverActive) => !popoverActive);
  }, [isLoading]);

  const activator = (
    <Button onClick={togglePopoverActive} variant="primary" tone="critical" {...props} />
  );

  return (
    <div style={{ height: '250px' }}>
      <Popover
        active={popoverActive}
        activator={activator}
        autofocusTarget="first-node"
        onClose={togglePopoverActive}
        preferredPosition='above'
      >
        <Banner tone="critical">
          <p>Are you sure you want to delete this item?</p>
          <InlineStack align="end">
            <ButtonGroup>
              <Button
                variant="secondary"
                disabled={isLoading}
                onClick={togglePopoverActive}
              >Cancel</Button>
              <Button
                variant="primary"
                loading={isLoading}
                tone="critical" onClick={async () => {
                  setLoading(true);
                  await props.onAction?.();
                  setLoading(false);
                  togglePopoverActive();
                }}
              >Delete</Button>
            </ButtonGroup>
          </InlineStack>
        </Banner>
      </Popover>
    </div>
  );
}