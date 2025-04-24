import { Badge, Bleed, Box, Button, Card, ChoiceList, ChoiceListProps, IndexFilters, IndexFiltersMode, IndexFiltersProps, IndexTable, Link, Page, TabProps, Text, useIndexResourceState } from '@shopify/polaris';
import { useGlobalData } from '../data/global-data-context';
import { useEffect, useMemo, useState } from 'react';
import { Rule } from '../../../functions/src/api/app/rules/types';
import { CollectionName } from '../hooks/use-firestore';
import { FirestoreQueryParams } from '../../../functions/src/api/app/firestore/types';

export default function RuleListPage() {
  const { navigate } = useGlobalData();

  // State for IndexFilters
  const [mode, setMode] = useState(IndexFiltersMode.Default);
  const sortOptions: Partial<Record<keyof Rule, IndexFiltersProps['sortOptions']>> = {
    name: [
      { label: 'Name', value: 'name asc', directionLabel: 'A-Z' },
      { label: 'Name', value: 'name desc', directionLabel: 'Z-A' },
    ],
    created_at: [
      { label: 'Created At', value: 'created_at asc', directionLabel: 'Ascending' },
      { label: 'Created At', value: 'created_at desc', directionLabel: 'Descending' },
    ],
    updated_at: [
      { label: 'Updated At', value: 'updated_at asc', directionLabel: 'Ascending' },
      { label: 'Updated At', value: 'updated_at desc', directionLabel: 'Descending' },
    ],
  };
  const [sortSelected, setSortSelected] = useState(['updated_at desc']);
  const statusOptions: Record<Rule['status'], ChoiceListProps['choices'][0]> = {
    active: { label: 'Active', value: 'active' },
    inactive: { label: 'Inactive', value: 'inactive' },
  };
  const [statusSelected, setStatusSelected] = useState<string[]>([]);
  const appliedFilters = useMemo(() => {
    if (statusSelected[0]) {
      return [{
        key: 'activationStatus',
        label: (statusSelected[0] as Rule['status']) === 'active' ? 'Active rules' : 'Inactive rules',
        onRemove: () => setStatusSelected([]),
      }];
    }
    return [];
  }, [statusSelected]);
  const [queryValue, setQueryValue] = useState<string>('');
  const onClearAll = () => {
    setQueryValue('');
    appliedFilters.forEach((filter) => { filter.onRemove(); });
  };
  const tabs: TabProps[] = [{
    id: 'all',
    content: 'All',
    onAction: () => { setStatusSelected([]); },
  }, {
    id: 'active',
    content: 'Active',
    onAction: () => { setStatusSelected(['active']); },
  }, {
    id: 'inactive',
    content: 'Inactive',
    onAction: () => { setStatusSelected(['inactive']); },
  }];
  const selected = useMemo(() => {
    return {
      'active': 1,
      'inactive': 2,
    }[statusSelected[0] as Rule['status']] || 0;
  }, [statusSelected]);

  // State for IndexTable
  const { firestore } = useGlobalData();
  const [orders, setOrders] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  useEffect(() => {
    setLoading(true);
    firestore.query<Rule>(CollectionName.ShopifyRules, {
      where: {
        ...(statusSelected[0] ? { status: { '==': statusSelected[0] } } : {}),
      },
      sortBy: sortSelected[0].split(' ')[0],
      sortDirection: sortSelected[0].split(' ')[1] as keyof FirestoreQueryParams['sortDirection'],
    })
      .then(setOrders)
      .finally(() => {
        setInitialLoad(false);
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusSelected, sortSelected]);
  const { selectedResources, allResourcesSelected, handleSelectionChange } =
    useIndexResourceState(orders as unknown as { [key: string]: unknown; }[]);
  const rowMarkup = orders.map(
    (
      { id, name, status },
      index,
    ) => (
      <IndexTable.Row
        id={id}
        key={id}
        selected={selectedResources.includes(id)}
        position={index}
      >
        <IndexTable.Cell>
          <Text variant='bodyMd' fontWeight='medium' as='h3'>
            <Link monochrome removeUnderline dataPrimaryLink onClick={() => navigate('/app/rules/' + id)}>
              {name}
            </Link>
          </Text>
        </IndexTable.Cell>
        <IndexTable.Cell>TBD</IndexTable.Cell>
        <IndexTable.Cell>TBD</IndexTable.Cell>
        <IndexTable.Cell>{{
          'active': <Badge tone='success'>Active</Badge>,
          'inactive': <Badge>Inactive</Badge>,
        }[status]}</IndexTable.Cell>
      </IndexTable.Row>
    ),
  );

  if (initialLoad) { return null; }
  return (
    <Page
      primaryAction={<Button onClick={() => navigate('/app/rules/new')} variant='primary'>Create rule</Button>}
      secondaryActions={[{ content: 'Import', onAction: () => { } }]}
    >
      <Card>
        <Bleed marginBlockStart='400' marginInline='400'>
          <IndexFilters
            mode={mode}
            setMode={setMode}
            filters={[{
              key: 'activationStatus',
              label: 'Activation status',
              filter: (
                <ChoiceList
                  titleHidden
                  title="Activation status"
                  choices={Object.values(statusOptions)}
                  selected={statusSelected}
                  onChange={setStatusSelected}
                />
              ),
              pinned: true,
            }]}
            appliedFilters={appliedFilters}
            queryPlaceholder='Search by rule name'
            queryValue={queryValue}
            onQueryChange={setQueryValue}
            onQueryClear={() => { setQueryValue(''); }}
            onClearAll={onClearAll}
            cancelAction={{ onAction: onClearAll }}
            tabs={tabs}
            selected={selected}
            sortOptions={Object.values(sortOptions).flat()}
            sortSelected={sortSelected}
            onSort={setSortSelected}
            canCreateNewView={false}
            loading={loading}
          />
          <IndexTable
            resourceName={{ singular: 'rule', plural: 'rules' }}
            itemCount={orders.length}
            selectedItemsCount={allResourcesSelected ? 'All' : selectedResources.length}
            onSelectionChange={handleSelectionChange}
            promotedBulkActions={[{
              content: 'Export rules',
              onAction: () => { },
            }, {
              content: 'Set as inactive',
              onAction: () => { },
            }]}
            headings={[
              { title: 'Rule' },
              { title: 'Trigger' },
              { title: 'Last run' },
              { title: 'Status' },
            ]}
          >
            {rowMarkup}
          </IndexTable>

          <Box paddingInline="400" paddingBlockStart="400" borderBlockStartWidth="025" borderColor="border-secondary">
            <Text as="p" variant='bodyMd' tone='subdued' fontWeight='medium'>Showing {orders.length} of {orders.length} rules</Text>
          </Box>
        </Bleed>
      </Card>
    </Page>
  );
}