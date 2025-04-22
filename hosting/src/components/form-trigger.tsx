import { useEffect } from 'react';
import { Trigger } from '../../../functions/src/api/app/rules/types';
import useSyncedState from '../hooks/use-synced-state';
import ResourcePicker from './resource-picker';
import deepCompare from '../utils/deep-compare';
import { BlockStack, InlineGrid, Select, Text, TextField } from '@shopify/polaris';

export default function FormTrigger({ trigger, onChange }: { trigger: Trigger, onChange?: (condition: Trigger) => void }) {
  const [state, setState] = useSyncedState(trigger);

  useEffect(() => {
    if (deepCompare(state, trigger) === false && onChange) {
      onChange(state);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const children: Record<Trigger['type'], React.JSX.Element> = {
    'move_to_collection': (
      <BlockStack gap='200'>
        <BlockStack gap='100'>
          <Text as="p">Move to collection</Text>

          <ResourcePicker
            label='Search collections'
            type='collection'
            multiple={false}
            items={trigger.config.value ? [{ id: trigger.config.value as string }] : []}
            onChange={items => {
              setState({ ...state, config: { ...state.config, value: items.length > 0 ? items[0].id : '' } });
            }}
          />
        </BlockStack>
      </BlockStack>
    ),
    'discount': (
      <BlockStack gap='200'>
        <BlockStack gap='100'>
          <Text as="p">Discount value</Text>

          <InlineGrid gap='200' columns="minmax(0, 2fr) minmax(0, 1fr)">
            <Select
              labelHidden
              label="Discount type"
              options={[
                { label: 'Percentage', value: 'discount' },
                { label: 'Fixed Amount', value: 'discount_fixed_amount' },
              ]}
              onChange={value => setState(prev => ({ ...prev, type: value as Trigger['type'] }))}
              value={state.type}
            />
            <TextField
              labelHidden
              label="Discount value"
              value={state.config.value as string}
              onChange={(value) => setState(prev => ({ ...prev, config: { ...prev.config, value: value } }))}
              type="number"
              autoComplete="off"
              min={1}
              max={state.type === 'discount' ? 100 : undefined}
              prefix={state.type === 'discount_fixed_amount' ? '$' : ''}
              suffix={state.type === 'discount' ? '%' : ''}
            />
          </InlineGrid>
        </BlockStack>
      </BlockStack>
    ),
    get ['discount_fixed_amount']() {
      return this['discount'];
    },
  };

  return children[trigger.type];
}