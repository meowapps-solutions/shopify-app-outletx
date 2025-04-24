import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { ActionList, Badge, Bleed, BlockStack, Box, Button, Card, ChoiceList, Icon, InlineError, InlineStack, Layout, Page, PageActions, Popover, Text, TextField } from '@shopify/polaris';
import { AlertCircleIcon, ArrowDownIcon, DuplicateIcon, PlusIcon, SettingsIcon, StatusActiveIcon, TextFontIcon, XIcon } from '@shopify/polaris-icons';
import { useGlobalData } from '../data/global-data-context';
import { DocumentSnapshot } from '../../../functions/src/api/app/firestore/types';
import { Rule } from '../../../functions/src/api/app/rules/types';
import ResourcePicker from '../components/resource-picker';
import deepCompare from '../utils/deep-compare';
import FormCondition from '../components/form-condition';
import FormTrigger from '../components/form-trigger';
import NotFound from '../404';
import { CollectionName } from '../hooks/use-firestore';
import PopoverDelete from '../components/popover-delete';

export default function RuleDetailPage() {
  const { ruleId } = useParams() as { ruleId: string };
  const { shopify, firestore, navigate } = useGlobalData();
  const [rule, setRule] = useState<Omit<Rule, keyof DocumentSnapshot>>({
    name: '',
    status: 'active',
    condition_logic: 'all',
    conditions: [{ type: 'inventory', operator: '<', value: 0 }],
    trigger: [],
    apply_scope: 'all',
    scope_targets: undefined,
  });
  const [originalRule, setOriginalRule] = useState(rule);
  const hasChanges = !deepCompare(originalRule, rule);
  const [initialLoad, setInitialLoad] = useState(true);
  const [ruleNotFound, setRuleNotFound] = useState(false);
  const [loadingDuplicate, setLoadingDuplicate] = useState(false);

  useEffect(() => {
    if (ruleId !== 'new') {
      firestore.read<Rule>(CollectionName.ShopifyRules, ruleId)
        .then((response) => {
          setRule(response);
          setOriginalRule(response);
        })
        .catch(() => { setRuleNotFound(true); })
        .finally(() => { setInitialLoad(false); });
    } else {
      setInitialLoad(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ruleId]);

  useEffect(() => {
    if (initialLoad) { return; }
    if (hasChanges) { shopify.saveBar.show('my-save-bar'); }
    else { shopify.saveBar.hide('my-save-bar'); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasChanges]);

  // for Popover trigger
  const [activeTriggerPopover, setActiveTriggerPopover] = useState(false);

  // for validation
  const [validationErrors, setValidationErrors] = useState({
    name: '',
    trigger: '',
    apply_scope: '',
  });

  if (initialLoad) { return null; }
  if (ruleNotFound) { return <NotFound />; }
  return (
    <Page
      title={rule.name || 'Add rule'}
      titleMetadata={rule.name && rule.status && {
        'active': <Badge tone='success'>Active</Badge>,
        'inactive': <Badge tone='info'>Inactive</Badge>,
      }[rule.status]}
      backAction={{ content: 'Rules', onAction: () => navigate('/app/rules') }}
      secondaryActions={ruleId === 'new' ? undefined : [
        {
          icon: DuplicateIcon,
          content: 'Duplicate',
          loading: loadingDuplicate,
          onAction: () => onSubmit('duplicate'),
        },
        {
          content: rule.status === 'active' ? 'Deactivate' : 'Activate',
          onAction: () => onSubmit(rule.status === 'active' ? 'deactivate' : 'activate'),
        },
      ]}
    >
      <Layout>
        <Layout.Section>
          <BlockStack gap='500'>
            {Object.values(validationErrors).some(e => !!e) && (
              <Card padding="0">
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
              </Card>
            )}

            <Card>
              <BlockStack gap='300'>
                <InlineStack gap='200'>
                  <span><Icon source={TextFontIcon} tone='subdued' /></span>
                  <Text as='p' variant='headingMd'>Rule title</Text>
                </InlineStack>

                <TextField
                  labelHidden
                  label='Rule name'
                  placeholder='Enter a title for this rule'
                  value={rule.name}
                  onChange={(value) => {
                    setRule(prev => ({ ...prev, name: value }));
                    setValidationErrors(prev => ({ ...prev, name: '' }));
                  }}
                  maxLength={69}
                  autoComplete='off'
                  showCharacterCount
                  error={validationErrors.name}
                />

                <ChoiceList
                  title='Apply to'
                  choices={[
                    { label: 'All products', value: 'all' },
                    { label: 'Specific products', value: 'products' },
                    { label: 'Specific collections', value: 'collections' },
                  ]}
                  selected={[rule.apply_scope]}
                  onChange={selected => {
                    setRule(prev => ({ ...prev, apply_scope: selected[0] as Rule['apply_scope'], scope_targets: undefined }));
                    setValidationErrors(prev => ({ ...prev, apply_scope: '' }));
                  }}
                  error={validationErrors.apply_scope}
                />

                {(rule.apply_scope === 'products' || rule.apply_scope === 'collections') && (
                  <ResourcePicker
                    label={rule.apply_scope === 'products' ? 'Search products' : 'Search collections'}
                    type={rule.apply_scope === 'products' ? 'product' : 'collection'}
                    items={rule.scope_targets || []}
                    onChange={items => {
                      setRule(prev => ({ ...prev, scope_targets: items }));
                      setValidationErrors(prev => ({ ...prev, apply_scope: '' }));
                    }}
                  />
                )}
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap='300'>
                <InlineStack gap='200'>
                  <span><Icon source={SettingsIcon} tone='subdued' /></span>
                  <Text as='p' variant='headingMd'>Conditions</Text>
                </InlineStack>

                {rule.conditions.length > 1 && (
                  <InlineStack gap='200' blockAlign='center'>
                    <Text as='p'>Should be applied when</Text>
                    <Box padding='100' borderWidth='025' borderRadius='200' borderColor='border-secondary' background='bg-surface-secondary'>
                      <InlineStack gap='100'>
                        <Button size='large' variant={rule.condition_logic === 'all' ? 'secondary' : 'tertiary'} onClick={() => {
                          setRule(prev => ({ ...prev, condition_logic: 'all' }));
                        }}>All rules passed</Button>
                        <Button size='large' variant={rule.condition_logic === 'any' ? 'secondary' : 'tertiary'} onClick={() => {
                          setRule(prev => ({ ...prev, condition_logic: 'any' }));
                        }}>Any rules passed</Button>
                      </InlineStack>
                    </Box>
                  </InlineStack>
                )}

                <Box padding='400' borderWidth='025' borderRadius='200' borderColor='border-secondary' background='bg-surface-secondary'>
                  <BlockStack gap='300'>
                    {rule.conditions.map((condition, index) => (
                      <>
                        {index > 0 && (
                          <Bleed marginInline='400'><Box borderBlockStartWidth='025' borderColor='border-secondary' /></Bleed>
                        )}
                        <InlineStack gap='300' blockAlign='start'>
                          <div style={{ flex: 1 }}>
                            <FormCondition condition={condition} onChange={condition => {
                              setRule(prev => ({ ...prev, conditions: prev.conditions.map((c, i) => i === index ? condition : c) }));
                            }} />
                          </div>
                          {rule.conditions.length > 1 && (
                            <div style={{ transform: 'translateY(28px)' }}>
                              <Button icon={XIcon} variant='tertiary' accessibilityLabel='Remove rule' onClick={() => {
                                setRule(prev => ({ ...prev, conditions: prev.conditions.filter((_, i) => i !== index) }));
                              }} />
                            </div>
                          )}
                        </InlineStack>
                      </>
                    ))}
                  </BlockStack>
                </Box>

                <Bleed marginInline='400'>
                  <Box paddingInline='400' paddingBlockStart='200' borderBlockStartWidth='025' borderColor='border-secondary'>
                    <Button icon={PlusIcon} onClick={() => {
                      setRule(prev => ({ ...prev, conditions: prev.conditions.concat({ type: 'inventory', operator: '<', value: 0 }) }));
                    }}>Add rule</Button>
                  </Box>
                </Bleed>
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap='300'>
                <InlineStack gap='200'>
                  <span><Icon source={StatusActiveIcon} tone='subdued' /></span>
                  <Text as='p' variant='headingMd'>Trigger</Text>
                </InlineStack>

                <BlockStack gap='100'>
                  <Box padding='400' borderWidth='025' borderRadius='200' borderColor='border-secondary' background='bg-surface-secondary'>
                    <BlockStack gap='300'>
                      {rule.trigger.length ? rule.trigger.map((item, index) => (
                        <>
                          <InlineStack gap='300' blockAlign='start'>
                            <div style={{ flex: 1 }}>
                              <FormTrigger trigger={item} onChange={trigger => {
                                setRule(prev => ({ ...prev, trigger: prev.trigger.map((t, i) => i === index ? trigger : t) }));
                              }} />
                            </div>
                            <div style={{ transform: 'translateY(30px)' }}>
                              <Button icon={XIcon} variant='tertiary' accessibilityLabel='Remove rule' onClick={() => {
                                setRule(prev => ({ ...prev, trigger: prev.trigger.filter((_, i) => i !== index) }));
                              }} />
                            </div>
                          </InlineStack>
                          {index < rule.trigger.length - 1 && (
                            <Icon source={ArrowDownIcon} tone='subdued' />
                          )}
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
                      active={activeTriggerPopover}
                      activator={<Button icon={PlusIcon} onClick={() => setActiveTriggerPopover((active) => !active)} >Add trigger</Button>}
                      autofocusTarget='first-node'
                      onClose={() => setActiveTriggerPopover(false)}
                    >
                      <ActionList
                        actionRole='menuitem'
                        items={[
                          {
                            content: 'Move to collection',
                            onAction: () => {
                              setActiveTriggerPopover(false);
                              setRule(prev => ({ ...prev, trigger: prev.trigger.concat({ type: 'move_to_collection', config: { value: '' } }) }));
                            },
                            disabled: rule.trigger.some(trigger => trigger.type === 'move_to_collection'),
                          },
                          {
                            content: 'Discount',
                            onAction: () => {
                              setActiveTriggerPopover(false);
                              setRule(prev => ({ ...prev, trigger: prev.trigger.concat({ type: 'discount', config: { value: 0, options: { min_price: 0 } } }) }));
                            },
                            disabled: rule.trigger.some(trigger => trigger.type === 'discount' || trigger.type === 'discount_fixed_amount'),
                          },
                        ]}
                      />
                    </Popover>
                  </Box>
                </Bleed>
              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>

        <Layout.Section variant="oneThird">
          <BlockStack gap="500">
            <Card>
              <Text as="p" variant='headingMd'>Helpful tips</Text>

              <Box paddingBlockStart="200">
                <Text as="p">Use a descriptive name to help you identify this rule later.</Text>
              </Box>
            </Card>
          </BlockStack>
        </Layout.Section>
      </Layout>

      {ruleId !== 'new' && (
        <PageActions
          primaryAction={{ content: 'Save', disabled: !hasChanges, onAction: () => onSubmit() }}
          secondaryActions={
            <PopoverDelete children='Delete rule' onAction={() => onSubmit('delete')} />
          }
        />
      )}

      <ui-save-bar id='my-save-bar'>
        <button variant='primary' id='save-button' onClick={() => onSubmit()}></button>
        <button id='discard-button' onClick={() => {
          shopify.saveBar.hide('my-save-bar');
          if (ruleId === 'new') { navigate('/app/rules'); }
          else { setRule(originalRule); }
        }}></button>
      </ui-save-bar>
    </Page>
  );

  function validate() {
    const errors = {
      name: (() => {
        if (!rule.name) { return 'Rule name is required'; }
        if (rule.name.length < 3) { return 'Rule name must be at least 3 characters'; }
        return '';
      })(),
      trigger: (() => {
        if (rule.trigger.length === 0) { return 'At least one trigger is required'; }
        return '';
      })(),
      apply_scope: (() => {
        if (rule.apply_scope === 'products' && rule.scope_targets?.length === 0) { return 'At least one product is required'; }
        if (rule.apply_scope === 'collections' && rule.scope_targets?.length === 0) { return 'At least one collection is required'; }
        return '';
      })(),
    };

    setValidationErrors(errors);
    return Object.values(errors).every(e => !e);
  }

  async function onSubmit(action: 'default' | 'duplicate' | 'deactivate' | 'activate' | 'delete' = 'default') {
    if (validate()) {
      if (action === 'delete') {
        await firestore.delete(CollectionName.ShopifyRules, ruleId);
        shopify.saveBar.hide('my-save-bar');
        navigate('/app/rules');
      } else if (action === 'duplicate') {
        const newRule: Omit<Rule, keyof DocumentSnapshot> = { ...rule, name: rule.name + ' (copy)', status: 'inactive' };
        await shopify.saveBar.leaveConfirmation();
        setLoadingDuplicate(true);
        const response = await firestore.create<Rule>(CollectionName.ShopifyRules, newRule);
        setLoadingDuplicate(false);
        navigate('/app/rules/' + response.id);
      } else if (action === 'deactivate' || action === 'activate') {
        const newStatus = action === 'deactivate' ? 'inactive' : 'active';
        await firestore.update(CollectionName.ShopifyRules, ruleId, { status: newStatus });
        setRule(prev => ({ ...prev, status: newStatus }));
        setOriginalRule(prev => ({ ...prev, status: newStatus }));
      } else if (ruleId === 'new') {
        const response = await firestore.create(CollectionName.ShopifyRules, rule);
        shopify.saveBar.hide('my-save-bar');
        navigate('/app/rules/' + response.id);
      } else {
        const response = await firestore.update(CollectionName.ShopifyRules, ruleId, rule);
        setRule(response);
        setOriginalRule(response);
      }
    }
  }
}
