import { useEffect, useState } from 'react';
import { BlockStack, Box, DatePicker, InlineGrid, Select, TextField } from '@shopify/polaris';
import { Condition } from '../../../functions/src/api/app/rules/types';
import ResourcePicker from './resource-picker';
import AutocompleteProduct from './autocomplete-product';
import deepCompare from '../utils/deep-compare';
import useSyncedState from '../hooks/use-synced-state';

type TAllInOneData = { type: 'number' | 'string' | 'array', label: string, defaultValue: string | number | string[], disabled?: boolean, hide?: boolean, };

export default function FormCondition({ condition, onChange }: { condition: Condition, onChange?: (condition: Condition) => void }) {
  const [state, setState] = useSyncedState(condition);
  const AllInOneDataOptions: {
    config: Record<Condition['type'], TAllInOneData>,
    toConditionOptions(): ({ label: string, value: string, disabled: boolean | undefined, })[],
    toComparisonOptions(type?: Condition['type']): ({ label: string, value: string, })[],
  } = {
    config: {
      'inventory': { type: 'number', label: 'Inventory', defaultValue: 0, hide: state.type === 'inventory_fixed_amount' },
      'inventory_fixed_amount': { type: 'number', label: 'Inventory', defaultValue: 0, hide: state.type !== 'inventory_fixed_amount' },
      'time_since_launch': { type: 'number', label: 'Time Since Launch', defaultValue: 0 },
      'sales_velocity': { type: 'number', label: 'Sales Velocity', defaultValue: 0, hide: state.type === 'sales_velocity_per_day' || state.type === 'sales_velocity_per_week' || state.type === 'sales_velocity_per_year' },
      'sales_velocity_per_day': { type: 'number', label: 'Sales Velocity', defaultValue: 0, hide: state.type !== 'sales_velocity_per_day' },
      'sales_velocity_per_week': { type: 'number', label: 'Sales Velocity', defaultValue: 0, hide: state.type !== 'sales_velocity_per_week' },
      'sales_velocity_per_year': { type: 'number', label: 'Sales Velocity', defaultValue: 0, hide: state.type !== 'sales_velocity_per_year' },
      'tag': { type: 'array', label: 'Tag', defaultValue: [] },
      'collection': { type: 'array', label: 'Collection', defaultValue: [] },
      'product_type': { type: 'array', label: 'Product Type', defaultValue: [] },
      'vendor': { type: 'array', label: 'Vendor', defaultValue: [] },
      'price': { type: 'number', label: 'Price', defaultValue: 0 },
      'time': { type: 'number', label: 'At Time', defaultValue: new Date().toISOString() },
    },
    toConditionOptions() {
      const options = Object.entries(this.config)
        .filter(([, value]) => value.hide !== true)
        .map(([key, value]) => {
          return {
            label: value.label,
            value: key,
            disabled: value.disabled,
          };
        });
      return options;
    },
    toComparisonOptions(type = state.type) {
      const options: Record<TAllInOneData['type'], { label: string, value: Condition['operator'] }[]> = {
        number: [
          { label: 'Is equal to', value: '=' },
          { label: 'Is greater than', value: '>' },
          { label: 'Is greater than or equal to', value: '>=' },
          { label: 'Is less than', value: '<' },
          { label: 'Is less than or equal to', value: '<=' }],
        string: [
          { label: 'Contains', value: 'contains' },
          { label: 'Does not contain', value: 'not_contains' },
          { label: 'Starts with', value: 'starts_with' },
          { label: 'Ends with', value: 'ends_with' }],
        array: [
          { label: 'Contains', value: 'contains' },
          { label: 'Does not contain', value: 'not_contains' }],
      };
      return options[this.config[type].type].map(option => ({ label: option.label, value: option.value }));
    },
  };

  // For date picker
  const [{ month, year }, setDate] = useState({ month: new Date().getMonth(), year: new Date().getFullYear() });
  useEffect(() => {
    if (state.type === 'time') {
      setDate({ month: new Date(state.value as string).getMonth(), year: new Date(state.value as string).getFullYear() });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.type === 'time', state.value]);

  useEffect(() => {
    if (deepCompare(state, condition) === false && onChange) {
      onChange(state);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <BlockStack gap='300'>
      <InlineGrid gap='200' columns={2}>
        <Select
          labelHidden
          label='Condition'
          options={[{ label: 'Select a rule', value: '', disabled: true }, ...AllInOneDataOptions.toConditionOptions()]}
          value={state.type}
          onChange={selected => {
            const type = selected as Condition['type'];
            const operator = AllInOneDataOptions.toComparisonOptions(type)[0].value as Condition['operator'];
            const value = AllInOneDataOptions.config[type].defaultValue;
            setState(prev => ({ ...prev, type, operator, value }));
          }}
        />

        <Select
          labelHidden
          label='Comparison'
          options={[{ label: 'Select a comparison', value: '', disabled: true }, ...AllInOneDataOptions.toComparisonOptions()]}
          value={state.operator}
          onChange={selected => {
            setState(prev => ({ ...prev, operator: selected as Condition['operator'] }));
          }}
        />
      </InlineGrid>

      {(state.type === 'inventory' || state.type === 'inventory_fixed_amount') && (
        <TextField
          labelHidden
          label='Value'
          value={state.value as string}
          onChange={(value) => {
            setState(prev => ({ ...prev, value: value }));
          }}
          autoComplete='off'
          type='number'
          min={1}
          max={state.type === 'inventory' ? 100 : undefined}
          suffix={state.type === 'inventory' ? '%' : ''}
          connectedLeft={
            <Select
              labelHidden
              label='Connected value'
              options={[
                { label: 'Percentage', value: 'inventory' },
                { label: 'Fixed Amount', value: 'inventory_fixed_amount' },
              ]}
              value={state.type}
              onChange={(selected) => {
                setState(prev => ({ ...prev, type: selected as Condition['type'] }));
              }}
            />
          }
        />
      )}

      {state.type === 'time_since_launch' && (
        <TextField
          labelHidden
          label='Value'
          value={state.value as string}
          onChange={(value) => {
            setState(prev => ({ ...prev, value: value }));
          }}
          autoComplete='off'
          type='number'
          min={1}
          suffix={'days'}
        />
      )}

      {(state.type === 'sales_velocity' || state.type === 'sales_velocity_per_day' || state.type === 'sales_velocity_per_week' || state.type === 'sales_velocity_per_year') && (
        <TextField
          labelHidden
          label='Value'
          value={state.value as string}
          onChange={(value) => {
            setState(prev => ({ ...prev, value: value }));
          }}
          autoComplete='off'
          type='number'
          min={1}
          connectedRight={
            <Select
              labelHidden
              label='Connected value'
              options={[
                { label: 'per day', value: 'sales_velocity_per_day' },
                { label: 'per week', value: 'sales_velocity_per_week' },
                { label: 'per month', value: 'sales_velocity' },
                { label: 'per year', value: 'sales_velocity_per_year' },
              ]}
              value={state.type}
              onChange={(selected) => {
                setState(prev => ({ ...prev, type: selected as Condition['type'] }));
              }}
            />
          }
        />
      )}

      {state.type === 'price' && (
        <TextField
          labelHidden
          label='Value'
          value={state.value as string}
          onChange={(value) => {
            setState(prev => ({ ...prev, value: value }));
          }}
          autoComplete='off'
          type='number'
          min={1}
          prefix='$'
        />
      )}

      {state.type === 'collection' && (
        <ResourcePicker
          label='Search collections'
          type='collection'
          items={(state.value as string[]).map(id => ({ id }))}
          onChange={items => {
            setState(prev => ({ ...prev, value: items.map(item => item.id) }));
          }}
        />
      )}

      {state.type === 'tag' && (
        <AutocompleteProduct type='productTags' allowMultiple={true} selected={state.value as string[]} onSelect={(value) =>
          setState(prev => ({ ...prev, value: value }))
        } />
      )}

      {state.type === 'product_type' && (
        <AutocompleteProduct type='productTypes' allowMultiple={true} selected={state.value as string[]} onSelect={(value) =>
          setState(prev => ({ ...prev, value: value }))
        } />
      )}

      {state.type === 'vendor' && (
        <AutocompleteProduct type='productVendors' allowMultiple={true} selected={state.value as string[]} onSelect={(value) =>
          setState(prev => ({ ...prev, value: value }))
        } />
      )}

      {state.type === 'time' && (
        <Box padding='400' borderWidth='0165' borderRadius='200' borderColor='input-border' background='input-bg-surface'>
          <DatePicker
            month={month}
            year={year}
            selected={new Date(state.value as string)}
            onMonthChange={(month: number, year: number) => setDate({ month, year })}
            onChange={({ end }) => {
              setState(prev => ({ ...prev, value: end.toISOString() }));
            }}
          />
        </Box>
      )}
    </BlockStack>
  );
}