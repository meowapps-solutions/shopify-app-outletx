import { Badge, Bleed, Box, Button, Card, ChoiceList, ChoiceListProps, IndexFilters, IndexFiltersMode, IndexFiltersProps, IndexTable, Link, Page, TabProps, Text, useIndexResourceState } from '@shopify/polaris';
import { useGlobalData } from '../data/global-data-context';
import { useEffect, useMemo, useState } from 'react';
import { Rule } from '../../../functions/src/api/app/rules/types';
import { CollectionName } from '../hooks/use-firestore';
import { FirestoreQueryParams } from '../../../functions/src/api/app/firestore/types';
import { simpleDecrypt, simpleEncrypt } from '../utils/encrypt-decrypt';
import ModalDropZone from '../components/modal-drop-zone';

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
  const [sortSelected, setSortSelected] = useState(['created_at desc']);
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
  const [originalRules, setRules] = useState<Rule[]>([]);
  const rules = useMemo(() => {
    const fuzzyMatch = (pattern: string, str: string) => {
      const patternLen = pattern.length;
      const strLen = str.length;
      if (patternLen > strLen) return false;

      let patternIdx = 0;
      let strIdx = 0;

      while (patternIdx < patternLen && strIdx < strLen) {
        if (
          pattern[patternIdx].toLowerCase().trim() ===
          str[strIdx].toLowerCase().trim()
        ) {
          patternIdx++;
        }
        strIdx++;
      }

      return patternIdx === patternLen;
    };
    return originalRules.filter((rule) => {
      return queryValue === '' || fuzzyMatch(queryValue.toLowerCase(), rule.name.toLowerCase());
    });
  }, [queryValue, originalRules]);
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  useEffect(() => {
    setLoading(true);
    firestore.query<Rule>(CollectionName.ShopifyRules, {
      where: {
        ...(statusSelected[0] ? { status: { '==': statusSelected[0] } } : {}),
      },
      sortBy: sortSelected[0].split(' ')[0],
      sortDirection: sortSelected[0].split(' ')[1] as keyof FirestoreQueryParams['sortDirection'],
    })
      .then(setRules)
      .finally(() => {
        setInitialLoad(false);
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusSelected, sortSelected, refreshKey]);
  const { selectedResources, allResourcesSelected, handleSelectionChange } =
    useIndexResourceState(rules as unknown as { [key: string]: unknown; }[]);
  const rowMarkup = rules.map(
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
      secondaryActions={[{ content: 'Import', onAction: () => { shopify.modal.show('drop-zone-rule'); } }]}
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
            itemCount={rules.length}
            selectedItemsCount={allResourcesSelected ? 'All' : selectedResources.length}
            onSelectionChange={handleSelectionChange}
            promotedBulkActions={[{
              content: 'Export rules',
              onAction: () => {
                for (const rule of rules) {
                  const fileContent = simpleEncrypt(JSON.stringify(rule));
                  if (fileContent) {
                    const bb = new Blob([fileContent], { type: 'text/plain' });
                    const a = document.createElement('a');
                    a.download = `${rule.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-+|-+$/g, '')}.outletx`;
                    a.href = window.URL.createObjectURL(bb);
                    a.click();
                  }
                }
              },
            }, {
              content: 'Set as inactive',
              onAction: async () => {
                const response = await Promise.all(
                  selectedResources.map(ruleId => firestore.update<Rule>(CollectionName.ShopifyRules, ruleId, { status: 'inactive' })),
                );
                setRules((prev) => prev.map((rule) => {
                  const updatedRule = response.find((r) => r.id === rule.id);
                  return updatedRule ? { ...rule, status: updatedRule.status } : rule;
                }));
              },
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
            <Text as="p" variant='bodyMd' tone='subdued' fontWeight='medium'>Showing {rules.length} of {rules.length} rules</Text>
          </Box>
        </Bleed>
      </Card>

      <ModalDropZone id='drop-zone-rule' title='Import rule' primaryLabel='Import' actionHint='or drop .outletx files to import' contentTitle='Import the following rules:' accept='.outletx' type='file' onAction={async (files) => {
        // read content of each file
        const fileContents = await Promise.all(files.map((file) => {
          return new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = (event) => {
              const content = event.target?.result as string;
              resolve(content);
            };
            reader.readAsText(file);
          });
        }));
        // decrypt each file content
        const decryptedContents = fileContents.map((content) => {
          const decrypted = simpleDecrypt(content);
          if (decrypted) {
            const rule = JSON.parse(decrypted) as Rule;
            return rule;
          }
          return null;
        }).filter((rule) => rule !== null) as Rule[];
        // create each rule in firestore
        await Promise.all(
          decryptedContents.map((rule) => {
            return firestore.create<Rule>(CollectionName.ShopifyRules, {
              ...rule,
              status: 'inactive',
            });
          }),
        );
        // reset all states
        onClearAll();
        // refresh the list
        setRefreshKey(prev => prev + 1);
        // show success message
        shopify.toast.show(`${files.length} rules imported`);
      }} />
    </Page>
  );
}