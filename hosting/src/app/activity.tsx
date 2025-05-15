import { useEffect, useMemo, useState } from 'react';
import { Button, Page, IndexTable, Card, useIndexResourceState, Text, BlockStack, Bleed, Badge, IndexFilters, IndexFiltersMode, ChoiceList, Box, TextField, Link } from '@shopify/polaris';
import moment from 'moment';
import { useAppNavigate } from '../hooks/app-navigate';
import { SyncData } from '../../../functions/src/api/app/firestore/types';
import { useAppState } from '../data/app-state-context';

export default function ActivityPage() {
  const navigate = useAppNavigate();
  const { rules, getProductVariant, getSyncData } = useAppState();
  const [loading, setLoading] = useState(false);
  const [initiated, setInitiated] = useState(false);

  const [compareResources, setCompareResources] = useState<{ id: string, rule_id: string; productVariant: { id: string; title: string; product: { title: string } }, created_at: string, reports: NonNullable<SyncData['triggered_rules']>[0]['reports'] }[]>([]);
  useEffect(() => {
    setLoading(true);
    getSyncData().then(async data => {
      await Promise.all(data.map(async item => {
        return await Promise.all(item.triggered_rules?.map(async (rule) => {
          const { id, variant_id } = item;
          const { created_at, reports, id: rule_id } = rule;
          const productVariant = await getProductVariant(variant_id);
          return { id, rule_id, productVariant, created_at, reports };
        }) || []);
      })).then((results) => { setCompareResources(results.flat().sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())); })
        .finally(() => { setLoading(false); setInitiated(true); });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [filters, setFilters] = useState<{ error: string[], rules: string[], startTime: string, endTime: string }>({ error: [], rules: [], startTime: '', endTime: '' });
  const appliedFilters = useMemo(() => {
    const _appliedFilters = [];
    if (filters.error[0] === 'error') {
      _appliedFilters.push({
        key: 'ErrorsFilter',
        label: 'Has errors',
        onRemove: () => setFilters(prev => ({ ...prev, error: [] })),
      });
    }
    if (filters.rules.length > 0) {
      _appliedFilters.push({
        key: 'RulesFilter',
        label: filters.rules.length === 1 && rules[filters.rules[0]]?.name || 'Rules',
        onRemove: () => setFilters(prev => ({ ...prev, rules: [] })),
      });
    }
    if (filters.startTime && filters.endTime) {
      _appliedFilters.push({
        key: 'TimeFilter',
        label: `${moment(filters.startTime).format('hh:mm A MM/DD/YYYY')} - ${moment(filters.endTime).format('hh:mm A MM/DD/YYYY')}`,
        onRemove: () => setFilters(prev => ({ ...prev, startTime: '', endTime: '' })),
      });
    }
    return _appliedFilters;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const filteredResources = useMemo(() => {
    return compareResources
      // .filter(item => rules[item.rule_id])
      .filter(resource => filters.error[0] === 'error' ? resource.reports.some(report => report.error_message) : true)
      .filter(resource => filters.rules.length > 0 ? filters.rules.includes(resource.rule_id) : true)
      .filter(resource => filters.startTime && filters.endTime ? moment(resource.created_at).isBetween(filters.startTime, filters.endTime) : true);
  }, [compareResources, filters]);

  const { selectedResources, allResourcesSelected, handleSelectionChange } =
    useIndexResourceState(filteredResources as unknown as { [key: string]: unknown; }[]);

  const rowMarkup = filteredResources.map(
    ({ id, rule_id, productVariant: { title, product }, created_at, reports }, index) => (
      <IndexTable.Row
        id={id}
        selected={selectedResources.includes(id)}
        position={index}
      >
        <IndexTable.Cell>
          <Link monochrome removeUnderline dataPrimaryLink onClick={() => navigate('/app/activity/' + id)}>
            {rule_id in rules && (rules[rule_id]?.name ? (
              <Text variant='bodyMd' fontWeight='medium' as='span'>{rules[rule_id].name}</Text>
            ) : (
              <Text variant='bodyMd' tone='subdued' as='span'>[deleted]</Text>
            ))}
          </Link>
        </IndexTable.Cell>
        <IndexTable.Cell>{product.title.concat(`: ${title}`).replace(': Default Title', '')}</IndexTable.Cell>
        <IndexTable.Cell>{moment(created_at).calendar()}</IndexTable.Cell>
        <IndexTable.Cell>{reports.some(report => report.error_message) ? (
          <Badge tone='critical'>Error</Badge>
        ) : (
          <Badge tone='info'>Success</Badge>
        )}</IndexTable.Cell>
      </IndexTable.Row>
    ),
  );

  if (!initiated) { return null; }
  return (
    <Page
      title='Recent runs'
      subtitle='A log of all recent automation rule executions'
      primaryAction={<Button onClick={() => navigate('/app/rule/new')} variant='primary'>Create rule</Button>}
    >
      <Card>
        <Bleed marginBlockStart='400' marginInline='400'>
          {compareResources.length === 0 && !loading && (
            <div style={{ maxWidth: '450px', textAlign: 'center', margin: '0 auto', paddingBottom: 'var(--p-space-800)' }}>
              <img src='https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png' alt='Recent runs will appear here' />
              <BlockStack gap='200'>
                <Text as='p' variant='headingLg' fontWeight='semibold'>Recent runs will appear here</Text>
                <Text as='p' variant='bodyMd' tone='subdued'>No recent runs have been recorded yet. Once your first rule runs, it will be logged here.</Text>
              </BlockStack>
            </div>
          ) || (
            <Box paddingBlockStart='200'>
              <IndexFilters
                mode={IndexFiltersMode.Filtering}
                setMode={() => { }}
                tabs={[]}
                selected={0}
                filters={[{
                  key: 'RulesFilter',
                  label: 'Rules',
                  filter: (
                    <ChoiceList
                      titleHidden
                      title="Rules"
                      choices={compareResources.map((resource) => ({ label: rules[resource.rule_id]?.name, value: resource.rule_id })).filter((item, index, self) => index === self.findIndex((t) => t.value === item.value))}
                      selected={filters.rules}
                      onChange={selected => setFilters(prev => ({ ...prev, rules: selected }))}
                      allowMultiple
                    />
                  ),
                }, {
                  key: 'ErrorsFilter',
                  label: 'Errors',
                  filter: (
                    <ChoiceList
                      titleHidden
                      title="Errors"
                      choices={[{ label: 'Has errors', value: 'error' }]}
                      selected={filters.error}
                      onChange={selected => setFilters(prev => ({ ...prev, error: selected }))}
                      allowMultiple
                    />
                  ),
                }, {
                  key: 'TimeFilter',
                  label: 'Start time',
                  filter: (
                    <>
                      <TextField type='datetime-local' label='From' autoComplete='off' value={filters.startTime} onChange={value => setFilters(prev => ({ ...prev, startTime: value }))} />
                      <TextField type='datetime-local' label='To' autoComplete='off' value={filters.endTime} onChange={value => setFilters(prev => ({ ...prev, endTime: value }))} />
                    </>
                  ),
                }]}
                appliedFilters={appliedFilters}
                onQueryChange={() => { }}
                onQueryClear={() => { }}
                onClearAll={() => { appliedFilters.forEach((filter) => { filter.onRemove(); }); }}
                hideQueryField
              />
              <IndexTable
                resourceName={{ singular: 'resource', plural: 'resources' }}
                itemCount={filteredResources.length}
                selectedItemsCount={
                  allResourcesSelected ? 'All' : selectedResources.length
                }
                onSelectionChange={handleSelectionChange}
                headings={[
                  { title: 'Rule' },
                  { title: 'Product' },
                  { title: 'Start time' },
                  { title: 'Run status' },
                ]}
                selectable={false}
                loading={loading}
              >
                {rowMarkup}
              </IndexTable>
            </Box>
          )}
        </Bleed>
      </Card>
    </Page>
  );
}