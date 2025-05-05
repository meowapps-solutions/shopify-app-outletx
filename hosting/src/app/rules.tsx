import { Badge, Bleed, Box, Button, Card, ChoiceList, ChoiceListProps, IndexFilters, IndexFiltersMode, IndexFiltersProps, IndexTable, Link, Page, TabProps, Text, useIndexResourceState } from '@shopify/polaris';
import { useMemo, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { simpleDecrypt, simpleEncrypt } from '../utils/encrypt-decrypt';
import ModalDropZone from '../components/modal-drop-zone';
import { useAppNavigate } from '../hooks/app-navigate';
import { Collection, Rule } from '../../../functions/src/api/app/firestore/types';
import { useAppState } from '../data/app-state-context';

export default function RuleListPage() {
  const navigate = useAppNavigate();

  // State for IndexFilters
  const [mode, setMode] = useState(IndexFiltersMode.Default);
  const sortOptions: Partial<Record<keyof Collection['shopify-rules'], IndexFiltersProps['sortOptions']>> = {
    name: [
      { label: 'Name', value: 'name asc', directionLabel: 'A-Z' },
      { label: 'Name', value: 'name desc', directionLabel: 'Z-A' },
    ],
    updated_at: [
      { label: 'Updated At', value: 'updated_at asc', directionLabel: 'Ascending' },
      { label: 'Updated At', value: 'updated_at desc', directionLabel: 'Descending' },
    ],
  };
  const [sortSelected, setSortSelected] = useState(['name asc']);
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
  const { rules } = useAppState();
  const compareRules = Object.entries(rules).map(([id, rule]) => rule ? { ...rule, id } : null).filter((rule) => rule !== null) as ({ id: string } & Rule)[];
  const resources = useMemo(() => {
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
    return compareRules.filter((rule) => {
      return queryValue === '' || fuzzyMatch(queryValue.toLowerCase(), rule.name.toLowerCase());
    }).filter((rule) => {
      if (statusSelected[0] === undefined) return true;
      return rule.status === statusSelected[0];
    }).sort((a, b) => {
      const [sortField, sortDirection] = sortSelected[0].split(' ');
      const aValue = a[sortField as keyof Rule] || a['name'];
      const bValue = b[sortField as keyof Rule] || b['name'];
      if (aValue === bValue) return 0;
      if (sortDirection === 'asc') {
        return aValue < bValue ? -1 : 1;
      }
      return aValue > bValue ? -1 : 1;
    });
  }, [compareRules, queryValue, statusSelected, sortSelected]);
  const initialized = compareRules.length;

  const { selectedResources, allResourcesSelected, handleSelectionChange, clearSelection } =
    useIndexResourceState(resources as unknown as { [key: string]: unknown; }[]);
  const rowMarkup = resources.map(
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

  if (!initialized) { return null; }
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
          />
          <IndexTable
            resourceName={{ singular: 'rule', plural: 'rules' }}
            itemCount={resources.length}
            selectedItemsCount={allResourcesSelected ? 'All' : selectedResources.length}
            onSelectionChange={handleSelectionChange}
            promotedBulkActions={[{
              content: 'Export rules',
              onAction: () => {
                for (const rule of selectedResources.map((ruleId) => rules[ruleId]).filter((rule) => rule !== undefined)) {
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
              content: selectedResources.filter((ruleId) => rules[ruleId]?.status !== 'inactive').length > 0 ? 'Set as inactive' : 'Delete inactive rules',
              onAction: async () => {
                const action = selectedResources.filter((ruleId) => rules[ruleId]?.status !== 'inactive').length > 0 ? 'inactive' : 'deleted';
                selectedResources.forEach((ruleId) => {
                  if (rules[ruleId]) {
                    if (action === 'deleted') {
                      delete rules[ruleId];
                    } else {
                      rules[ruleId] = { ...rules[ruleId], status: 'inactive' };
                    }
                  }
                });
                clearSelection();
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
            <Text as="p" variant='bodyMd' tone='subdued' fontWeight='medium'>Showing {resources.length} of {resources.length} rules</Text>
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
            const rule = JSON.parse(decrypted) as Collection['shopify-rules'];
            return rule;
          }
          return null;
        }).filter((rule) => rule !== null) as Collection['shopify-rules'][];
        // create each rule in firestore
        decryptedContents.forEach((rule) => {
          const id = uuidv4();
          rules[id] = { ...rule, status: 'inactive' };
        });
        // reset all states
        onClearAll();
        // show success message
        shopify.toast.show(`${files.length} rules imported`);
      }} />
    </Page >
  );
}