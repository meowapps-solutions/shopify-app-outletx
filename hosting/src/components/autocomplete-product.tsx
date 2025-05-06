import { Autocomplete, InlineStack, Tag } from '@shopify/polaris';
import { PlusCircleIcon } from '@shopify/polaris-icons';
import { useEffect, useMemo, useState } from 'react';
import deepCompare from '../utils/deep-compare';

export default function AutocompleteProduct({ label, type, selected, onSelect, allowMultiple }: { label?: string, type: 'productTags' | 'productTypes' | 'productVendors', selected?: string[], onSelect?: (selected: string[]) => void, allowMultiple?: boolean }) {
  const [data, setData] = useState<{ value: string, label: string }[]>([]);
  const [searchData, setSearchData] = useState<{ value: string, label: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState<string | undefined>(undefined);
  const [pageInfo, setPageInfo] = useState({
    endCursor: undefined,
    startCursor: undefined,
    hasNextPage: false,
    hasPreviousPage: false,
  });

  const fetchData = async (after?: string, query?: string) => {
    const first = 250;

    setLoading(true);
    const res = await fetch('shopify:admin/api/2025-01/graphql.json', {
      method: 'POST',
      body: JSON.stringify({
        query: `
        query GetAutocompleteData($first: Int!, $after: String) {
          ${type}(first: $first, after: $after) {
            edges {
              node
            }
            pageInfo {
              endCursor
              startCursor
              hasNextPage
              hasPreviousPage
            }
          }
        }`,
        variables: { first, after: after || null, query: query || null },
      }),
    });

    const { data } = await res.json();
    const newData = data[type].edges.map((edge: { node: string }) => ({ value: edge.node, label: edge.node }));
    setData(prev => after ? [...prev, ...newData] : newData);
    setPageInfo(data[type].pageInfo);
    setLoading(false);
  };

  const onLoadMoreResults = () => {
    if (pageInfo.hasNextPage) {
      fetchData(pageInfo.endCursor, query);
    }
  };

  useEffect(() => {
    if (!query) {
      setSearchData([]);
      if (data.length === 0) {
        fetchData(undefined, query);
      }
      return;
    }

    const filterRegex = new RegExp(query, 'i');
    const resultOptions = data.filter((option) =>
      option.label.match(filterRegex),
    );
    setSearchData(resultOptions);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const options = useMemo(() => {
    return searchData.length ? searchData : data;
  }, [searchData, data]);
  const [newOptions, setNewOptions] = useState<{ value: string, label: string }[]>([]);
  const [selectedOptions, setSelectedOptions] = useState<string[]>(selected || []);
  const selectedLabel = useMemo(() => {
    if (selectedOptions[0]) {
      const option = [...options, ...newOptions].find(option => option.value === selectedOptions[0]);
      if (option) {
        return option.label;
      }
    }
    return undefined;
  }, [options, newOptions, selectedOptions]);

  useEffect(() => {
    if (deepCompare(selectedOptions, selected) === false && onSelect) {
      onSelect(selectedOptions);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOptions]);

  useEffect(() => {
    setNewOptions((selected || []).filter(v => !data.find(o => o.value === v)).map(v => ({ value: v, label: v })));
  }, [selected, data]);

  const textField = (
    <Autocomplete.TextField
      onChange={value => {
        const newvalue = type === 'productTags' ? value.replace(/,/g, '') : value;
        setQuery(newvalue);
        if (!allowMultiple) { setSelectedOptions([newvalue]); }
      }}
      labelHidden={!label}
      label={label || 'Search'}
      value={allowMultiple ? query : (query ?? selectedLabel)}
      // prefix={query !== undefined || (query === undefined && selectedOptions.length === 0) ? <Icon source={SearchIcon} tone='base' /> : undefined}
      // placeholder='Search'
      autoComplete='off'
      verticalContent={allowMultiple && selectedOptions.length && (
        <InlineStack gap='200'>
          {selectedOptions.map((v, i) => (
            <Tag key={i} onRemove={() => {
              setSelectedOptions(selectedOptions.filter((_, j) => i !== j));
            }}>{v}</Tag>
          ))}
        </InlineStack>
      )}

    />
  );

  return (
    <Autocomplete
      options={newOptions.length ? [{ options }, { title: 'Addition options', options: newOptions }] : options}
      selected={selectedOptions}
      onSelect={(selected) => {
        setSelectedOptions(selected);
        setQuery(undefined);
      }}
      textField={textField}
      loading={loading}
      allowMultiple={allowMultiple}
      willLoadMoreResults={pageInfo.hasNextPage}
      onLoadMoreResults={onLoadMoreResults}
      actionBefore={allowMultiple && query ? {
        content: query,
        helpText: 'Press Enter to add this option',
        icon: PlusCircleIcon,
        onAction: () => {
          setNewOptions(prev => [...prev, { value: query, label: query }]);
          setSelectedOptions(prev => [...prev, query]);
          setQuery(undefined);
        },
      } : undefined}
    />
  );
}