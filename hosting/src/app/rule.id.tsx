import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router';
import { ActionList, ActionListItemDescriptor, Badge, Bleed, BlockStack, Box, Button, ChoiceList, Icon, InlineStack, Layout, Page, PageActions, Popover, Text, TextField, Card as PolarisCard, InlineError, SkeletonBodyText } from '@shopify/polaris';
import { AlertCircleIcon, ArrowDownIcon, DuplicateIcon, ExternalSmallIcon, PlusIcon, SettingsIcon, StatusActiveIcon, TextFontIcon, XIcon } from '@shopify/polaris-icons';
import { v4 as uuidv4 } from 'uuid';
import Card from '../components/card';
import { useAppNavigate } from '../hooks/app-navigate';
import ResourcePicker from '../components/resource-picker';
import FormCondition from '../components/form-condition';
import FormTrigger from '../components/form-trigger';
import deepCompare from '../utils/deep-compare';
import { Rule } from '../../../functions/src/api/app/firestore/types';
import { useAppState } from '../data/app-state-context';
import NotFound from '../404';
import moment from 'moment';

export default function RuleDetailPage() {
  const { ruleId } = useParams() as { ruleId: 'new' | string };
  const navigate = useAppNavigate();
  const { rules, shop, getLastTriggered } = useAppState();
  const [rule, setRule] = useState<Rule>({
    name: '',
    status: 'active',
    apply_scope: 'all',
    conditions: [{ type: 'inventory', operator: '<', value: 0 }],
    condition_logic: 'all',
    trigger: [],
  });
  const [compareRule, setCompareRule] = useState<Rule>(rule);
  const [initialized, setInitialized] = useState(ruleId === 'new');
  const [ruleNotFound, setRuleNotFound] = useState(false);
  const [popover, setPopover] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const validationErrors = useMemo(() => ({
    name: !hasSubmitted ? '' : (() => {
      if (!rule.name) { return 'Rule name is required'; }
      if (rule.name.length < 3) { return 'Rule name must be at least 3 characters'; }
      return '';
    })(),
    trigger: !hasSubmitted ? '' : (() => {
      if (rule.trigger.length === 0) { return 'At least one trigger is required'; }
      return '';
    })(),
    apply_scope: !hasSubmitted ? '' : (() => {
      if (rule.apply_scope === 'products' && !rule.scope_targets?.length) { return 'At least one product is required'; }
      if (rule.apply_scope === 'collections' && !rule.scope_targets?.length) { return 'At least one collection is required'; }
      return '';
    })(),
  }), [rule, hasSubmitted]);
  const hasChanges = !deepCompare(compareRule, rule);

  useEffect(() => {
    if (!initialized) { return; }
    if (hasChanges) { shopify.saveBar.show('save-bar'); }
    else { shopify.saveBar.hide('save-bar'); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasChanges]);

  useEffect(() => {
    if (ruleId !== 'new' && ruleId in rules) {
      setInitialized(true);
      if (rules[ruleId] === undefined) {
        setRuleNotFound(true);
        return;
      }
      setRule(rules[ruleId] as Rule);
      setCompareRule(rules[ruleId] as Rule);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ruleId, ruleId in rules, deepCompare(rules[ruleId], compareRule)]);

  const [lastTriggered, setLastTriggered] = useState<Awaited<ReturnType<typeof getLastTriggered>>>([]);
  const [loadingLastTriggered, setLoadingLastTriggered] = useState(false);

  useEffect(() => {
    setLoadingLastTriggered(true);
    getLastTriggered(ruleId).then(setLastTriggered).finally(() => { setLoadingLastTriggered(false); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ruleId]);

  if (!initialized) { return null; }
  if (ruleNotFound) { return <NotFound />; }
  return (
    <Page
      title={ruleId !== 'new' && rule.name || 'Add rule'}
      titleMetadata={ruleId !== 'new' && {
        'active': <Badge tone='success'>Active</Badge>,
        'inactive': <Badge>Inactive</Badge>,
      }[rule.status]}
      backAction={{ content: 'Rules', onAction: () => navigate('/app/rule') }}
      secondaryActions={ruleId !== 'new' && [
        { icon: DuplicateIcon, content: 'Duplicate', onAction: () => onDuplicateHandler() },
        ...(rule.status === 'active' && [{ content: 'Deactivate', onAction: () => setRule(prev => ({ ...prev, status: 'inactive' })) }]) || [],
        ...(rule.status === 'inactive' && [{ content: 'Activate', onAction: () => setRule(prev => ({ ...prev, status: 'active' })) }]) || [],
      ]}
    >
      <Layout>
        <Layout.Section>
          <BlockStack gap='500'>
            {Object.values(validationErrors).some(e => !!e) && (
              <PolarisCard padding="0">
                <Bleed marginInline="400">
                  <Box paddingInline="800" padding="400" background="bg-fill-critical" color="text-critical-on-bg-fill">
                    <InlineStack gap="200">
                      <div><Icon source={AlertCircleIcon} /></div>
                      <Text as="span" variant="headingSm">
                        There {Object.values(validationErrors).filter(Boolean).length > 1 ? `are ${Object.values(validationErrors).filter(Boolean).length}` : 'is 1'} error with this product:
                      </Text>
                    </InlineStack>
                  </Box>
                </Bleed>
                <Box padding="400">
                  {Object.values(validationErrors).filter(Boolean).map(e => (
                    <Text as="p">{e}</Text>
                  ))}
                </Box>
              </PolarisCard>
            )}

            <Card title='Rule title' source={TextFontIcon}>
              <TextField labelHidden label='Rule name' placeholder='Enter a title for this rule' autoComplete='off' maxLength={69} showCharacterCount value={rule.name} onChange={value => { setRule(prev => ({ ...prev, name: value })); }} error={validationErrors.name} />

              <ChoiceList title='Apply to' selected={[rule.apply_scope]} onChange={selected => { setRule(prev => ({ ...prev, apply_scope: selected[0] as Rule['apply_scope'], scope_targets: undefined })); }} error={validationErrors.apply_scope}
                choices={(() => {
                  const labels: Record<Rule['apply_scope'], string> = {
                    'all': 'All products',
                    'products': 'Specific products',
                    'collections': 'Specific collections',
                  };
                  return Object.entries(labels).map(([value, label]) => ({ label, value }));
                })()}
              />

              {rule.apply_scope === 'products' && (<ResourcePicker label='Search products' type='product' items={rule.scope_targets || []} onChange={items => { setRule(prev => ({ ...prev, scope_targets: items })); }} />)}
              {rule.apply_scope === 'collections' && (<ResourcePicker label='Search collections' type='collection' items={rule.scope_targets || []} onChange={items => { setRule(prev => ({ ...prev, scope_targets: items })); }} />)}

            </Card>

            <Card title='Conditions' source={SettingsIcon}>
              {rule.conditions.length > 1 && (
                <InlineStack gap='200' blockAlign='center'>
                  <Text as='p'>Should be applied when</Text>
                  <Box padding='100' borderWidth='025' borderRadius='200' borderColor='border-secondary' background='bg-surface-secondary'>
                    <InlineStack gap='100'>
                      <Button size='large' variant={rule.condition_logic === 'all' ? 'secondary' : 'tertiary'} onClick={() => setRule(prev => ({ ...prev, condition_logic: 'all' }))}>All rules passed</Button>
                      <Button size='large' variant={rule.condition_logic === 'any' ? 'secondary' : 'tertiary'} onClick={() => setRule(prev => ({ ...prev, condition_logic: 'any' }))}>Any rules passed</Button>
                    </InlineStack>
                  </Box>
                </InlineStack>
              )}

              <Box padding='400' borderWidth='025' borderRadius='200' borderColor='border-secondary' background='bg-surface-secondary'>
                <BlockStack gap='300'>
                  {rule.conditions.map((condition, index) => (
                    <>
                      {index > 0 && (<Bleed marginInline='400'><Box borderBlockStartWidth='025' borderColor='border-secondary' /></Bleed>)}
                      <InlineStack gap='300' blockAlign='start'>
                        <div style={{ flex: 1 }}>
                          <FormCondition condition={condition} onChange={condition => setRule(prev => ({ ...prev, conditions: prev.conditions.map((c, i) => i === index ? condition : c) }))} />
                        </div>
                        {rule.conditions.length > 1 && (
                          <div style={{ transform: 'translateY(28px)' }}>
                            <Button icon={XIcon} variant='tertiary' accessibilityLabel='Remove rule' onClick={() => setRule(prev => ({ ...prev, conditions: prev.conditions.filter((_, i) => i !== index) }))} />
                          </div>
                        )}
                      </InlineStack>
                    </>
                  ))}
                </BlockStack>
              </Box>

              <Bleed marginInline='400'>
                <Box paddingInline='400' paddingBlockStart='200' borderBlockStartWidth='025' borderColor='border-secondary'>
                  <Button icon={PlusIcon} onClick={() => setRule(prev => ({ ...prev, conditions: prev.conditions.concat({ type: 'inventory', operator: '<', value: 0 }) }))}>Add rule</Button>
                </Box>
              </Bleed>
            </Card>

            <Card title='Trigger' source={StatusActiveIcon}>
              <BlockStack gap='100'>
                <Box padding='400' borderWidth='025' borderRadius='200' borderColor='border-secondary' background='bg-surface-secondary'>
                  <BlockStack gap='300'>
                    {rule.trigger.length ? rule.trigger.map((item, index) => (
                      <>
                        <InlineStack gap='300' blockAlign='start'>
                          <div style={{ flex: 1 }}>
                            <FormTrigger trigger={item} onChange={trigger => setRule(prev => ({ ...prev, trigger: prev.trigger.map((t, i) => i === index ? trigger : t) }))} />
                          </div>
                          <div style={{ transform: 'translateY(30px)' }}>
                            <Button icon={XIcon} variant='tertiary' accessibilityLabel='Remove rule' onClick={() => {
                              setRule(prev => ({ ...prev, trigger: prev.trigger.filter((_, i) => i !== index) }));
                            }} />
                          </div>
                        </InlineStack>
                        {index < rule.trigger.length - 1 && (<Icon source={ArrowDownIcon} tone='subdued' />)}
                      </>
                    )) : (
                      <Text as='p' tone='subdued'>Specify the action(s) to execute when this rule's conditions are met. For example, move the product to a specific collection or apply a discount. Click 'Add trigger' below to choose an action.</Text>
                    )}
                  </BlockStack>
                </Box>
                {!!validationErrors.trigger && <InlineError message={validationErrors.trigger} fieldID="trigger" />}
              </BlockStack>

              <Bleed marginInline='400'>
                <Box paddingInline='400' paddingBlockStart='200' borderBlockStartWidth='025' borderColor='border-secondary'>
                  <Popover
                    active={popover}
                    activator={<Button icon={PlusIcon} onClick={() => setPopover((active) => !active)}>Add trigger</Button>}
                    autofocusTarget='first-node'
                    onClose={() => setPopover(false)}
                  >
                    <ActionList
                      actionRole='menuitem'
                      items={(() => {
                        const labels: Record<Rule['trigger'][0]['type'], ActionListItemDescriptor | undefined> = {
                          'move_to_collection': {
                            content: 'Move to collection',
                            onAction: () => (setPopover(false), setRule(prev => ({ ...prev, trigger: prev.trigger.concat({ type: 'move_to_collection', config: { value: '' } }) }))),
                            disabled: rule.trigger.some(trigger => trigger.type === 'move_to_collection'),
                          },
                          'discount': {
                            content: 'Discount',
                            onAction: () => (setPopover(false), setRule(prev => ({ ...prev, trigger: prev.trigger.concat({ type: 'discount', config: { value: 0, options: { min_price: 0 } } }) }))),
                            disabled: rule.trigger.some(trigger => trigger.type === 'discount' || trigger.type === 'discount_fixed_amount'),
                          },
                          'discount_fixed_amount': undefined,
                          'add_tag': {
                            content: 'Add tag',
                            onAction: () => (setPopover(false), setRule(prev => ({ ...prev, trigger: prev.trigger.concat({ type: 'add_tag', config: { value: '' } }) }))),
                            disabled: rule.trigger.some(trigger => trigger.type === 'add_tag'),
                          },
                        };
                        return Object.values(labels).filter(Boolean) as ActionListItemDescriptor[];
                      })()}
                    />
                  </Popover>
                </Box>
              </Bleed>
            </Card>
          </BlockStack>
        </Layout.Section>
        <Layout.Section variant='oneThird'>
          <BlockStack gap='500'>
            <Card title='Other settings'>
              <BlockStack gap='100'>
                <Text as="p">Excluded products</Text>
                <ResourcePicker label='Search products' type='product' size='small' items={rule.excluded_products || []} onChange={items => { setRule(prev => ({ ...prev, excluded_products: items })); }} />
              </BlockStack>
            </Card>

            <Card title='Helpful tips'>
              Use a descriptive name to help you identify this rule later.

              <Text as='p' variant='headingMd'>Last triggered</Text>

              <BlockStack gap='200'>
                {loadingLastTriggered ? (
                  <InlineStack gap='100' blockAlign='center'>
                    <div style={{ width: '50px' }}><SkeletonBodyText /></div>
                    <SkeletonBodyText />
                  </InlineStack>
                ) : lastTriggered.length ? lastTriggered.map(item => (
                  <InlineStack gap='100' blockAlign='center'>
                    <Text as='p' variant='bodySm' tone='subdued'>{moment(item.triggered_rules?.filter(rule => rule.id === ruleId).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]?.created_at).calendar()}</Text>
                    <Button variant="plain" url={`https://admin.shopify.com/store/${shop.replace('.myshopify.com', '')}/apps/${import.meta.env.VITE_SHOPIFY_APP_HANDLE}/app/activity/${item.id}`} target="_blank" icon={ExternalSmallIcon}>{item.productVariant.product.title.concat(`: ${item.productVariant.title}`).replace(': Default Title', '')}</Button>
                  </InlineStack>
                )) : (
                  <Text as='p' tone='subdued'>This rule has not been triggered yet.</Text>
                )}
              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>
      </Layout>

      <PageActions
        primaryAction={{ content: 'Save', disabled: !hasChanges, onAction: () => onSubmitHandler() }}
        secondaryActions={[{ content: 'Delete rule', destructive: true, onAction: () => { shopify.modal.show('delete-rule-modal'); } }]}
      />

      <ui-modal id="delete-rule-modal">
        <Box padding="400">
          <p>Deleting <strong>{rule.name}</strong> is permanent and cannot be undone. Are you sure you want to proceed?</p>
        </Box>
        <ui-title-bar title={`Delete ${rule.name}?`}>
          <button variant="primary" tone="critical" onClick={async () => {
            shopify.modal.hide('delete-rule-modal');
            onDeleteHandler();
          }}>Delete rule</button>
          <button onClick={() => shopify.modal.hide('delete-rule-modal')}>Cancel</button>
        </ui-title-bar>
      </ui-modal>

      <ui-save-bar id='save-bar'>
        <button variant='primary' id='save-button' onClick={onSubmitHandler}></button>
        <button id='discard-button' onClick={() => {
          shopify.saveBar.hide('save-bar');
          if (ruleId === 'new') { navigate('/app/rule'); }
          else { setRule(compareRule); }
        }}></button>
      </ui-save-bar>
    </Page>
  );

  function onSubmitHandler() {
    setHasSubmitted(true);
    if (Object.values(validationErrors).every(e => !e)) {
      const id = ruleId === 'new' && uuidv4() || ruleId;
      rules[id] = rule;
      if (ruleId === 'new') {
        shopify.saveBar.hide('save-bar');
        navigate(`/app/rule/${id}`);
      }
    }
  }

  async function onDuplicateHandler() {
    await shopify.saveBar.leaveConfirmation();
    const id = uuidv4();
    rules[id] = { ...rule, name: rule.name.endsWith('(Copy)') ? rule.name : `${rule.name} (Copy)`, status: 'inactive' };
    navigate(`/app/rule/${id}`);
  }

  function onDeleteHandler() {
    delete rules[ruleId];
    shopify.saveBar.hide('save-bar');
    navigate('/app/rule');
  }
}