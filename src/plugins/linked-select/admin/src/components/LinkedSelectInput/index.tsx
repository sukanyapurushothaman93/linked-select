import * as React from 'react';
import {
  Field,
  Flex,
  SingleSelect,
  SingleSelectOption,
  Typography,
} from '@strapi/design-system';
import { useFetchClient } from '@strapi/admin/strapi-admin';
import { useIntl } from 'react-intl';

import { PLUGIN_ID } from '../../pluginId';

type LinkedSelectValue = {
  parent: string | null;
  child: string | null;
};

type EntryOption = {
  id: number | string;
  documentId: string;
  label: string;
};

type FieldOptions = {
  parentContentType?: string;
  childContentType?: string;
  relationField?: string;
  labelField?: string;
};

type LinkedSelectInputProps = {
  name: string;
  value?: string | LinkedSelectValue | null;
  onChange: (event: {
    target: { name: string; value: LinkedSelectValue | null; type: string };
  }) => void;
  attribute: { options?: FieldOptions };
  disabled?: boolean;
  required?: boolean;
  error?: string;
  hint?: string;
  label?: string;
};

const EMPTY_VALUE: LinkedSelectValue = { parent: null, child: null };

const parseValue = (value: LinkedSelectInputProps['value']): LinkedSelectValue => {
  if (!value) {
    return { ...EMPTY_VALUE };
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return { parent: parsed?.parent ?? null, child: parsed?.child ?? null };
    } catch {
      return { ...EMPTY_VALUE };
    }
  }
  return { parent: value.parent ?? null, child: value.child ?? null };
};

const LinkedSelectInput = React.forwardRef<HTMLDivElement, LinkedSelectInputProps>(
  ({ name, value, onChange, attribute, disabled, required, error, hint, label }, ref) => {
    const { get } = useFetchClient();
    const { formatMessage } = useIntl();

    const options = attribute?.options ?? {};
    const { parentContentType, childContentType, relationField, labelField } = options;

    const parsed = parseValue(value);

    const [parents, setParents] = React.useState<EntryOption[]>([]);
    const [children, setChildren] = React.useState<EntryOption[]>([]);
    const [loadingParents, setLoadingParents] = React.useState(false);
    const [loadingChildren, setLoadingChildren] = React.useState(false);
    const [fetchError, setFetchError] = React.useState<string | null>(null);

    const emitChange = React.useCallback(
      (next: LinkedSelectValue) => {
        const isEmpty = next.parent === null && next.child === null;
        onChange({
          target: { name, value: isEmpty ? null : next, type: 'json' },
        });
      },
      [name, onChange]
    );

    // Load parent options.
    React.useEffect(() => {
      if (!parentContentType) {
        setParents([]);
        return;
      }

      let cancelled = false;
      setLoadingParents(true);
      setFetchError(null);

      const query = new URLSearchParams();
      if (labelField) query.set('labelField', labelField);

      get(`/${PLUGIN_ID}/entries/${parentContentType}?${query.toString()}`)
        .then((res) => {
          if (cancelled) return;
          setParents(Array.isArray(res.data?.data) ? res.data.data : []);
        })
        .catch((err) => {
          if (cancelled) return;
          setFetchError(err?.response?.data?.error?.message || 'Failed to load parent options.');
          setParents([]);
        })
        .finally(() => {
          if (!cancelled) setLoadingParents(false);
        });

      return () => {
        cancelled = true;
      };
    }, [parentContentType, labelField, get]);

    // Load child options whenever a parent is selected.
    React.useEffect(() => {
      if (!childContentType || !parsed.parent) {
        setChildren([]);
        return;
      }

      let cancelled = false;
      setLoadingChildren(true);
      setFetchError(null);

      const query = new URLSearchParams();
      query.set('parentValue', String(parsed.parent));
      if (parentContentType) query.set('parentUid', parentContentType);
      if (relationField) query.set('relationField', relationField);
      if (labelField) query.set('labelField', labelField);

      get(`/${PLUGIN_ID}/entries/${childContentType}?${query.toString()}`)
        .then((res) => {
          if (cancelled) return;
          setChildren(Array.isArray(res.data?.data) ? res.data.data : []);
        })
        .catch((err) => {
          if (cancelled) return;
          setFetchError(err?.response?.data?.error?.message || 'Failed to load child options.');
          setChildren([]);
        })
        .finally(() => {
          if (!cancelled) setLoadingChildren(false);
        });

      return () => {
        cancelled = true;
      };
    }, [childContentType, parentContentType, relationField, labelField, parsed.parent, get]);

    const handleParentChange = (val: string | number) => {
      emitChange({ parent: val ? String(val) : null, child: null });
    };

    const handleChildChange = (val: string | number) => {
      emitChange({ parent: parsed.parent, child: val ? String(val) : null });
    };

    const isMisconfigured = !parentContentType || !childContentType;

    return (
      <Field.Root name={name} id={name} error={error || fetchError || undefined} hint={hint} required={required}>
        <Field.Label>{label}</Field.Label>
        <Flex direction="column" alignItems="stretch" gap={2} ref={ref}>
          {isMisconfigured ? (
            <Typography variant="pi" textColor="danger600">
              {formatMessage({
                id: `${PLUGIN_ID}.input.misconfigured`,
                defaultMessage:
                  'Set both a parent and a child content type in the field settings.',
              })}
            </Typography>
          ) : (
            <>
              <SingleSelect
                aria-label={formatMessage({
                  id: `${PLUGIN_ID}.input.parent`,
                  defaultMessage: 'Parent',
                })}
                placeholder={
                  loadingParents
                    ? formatMessage({ id: `${PLUGIN_ID}.input.loading`, defaultMessage: 'Loading…' })
                    : formatMessage({
                        id: `${PLUGIN_ID}.input.selectParent`,
                        defaultMessage: 'Select a parent…',
                      })
                }
                value={parsed.parent ?? ''}
                onChange={handleParentChange}
                onClear={() => emitChange({ ...EMPTY_VALUE })}
                disabled={disabled || loadingParents}
              >
                {parents.map((p) => (
                  <SingleSelectOption key={p.documentId} value={p.documentId}>
                    {p.label}
                  </SingleSelectOption>
                ))}
              </SingleSelect>

              <SingleSelect
                aria-label={formatMessage({
                  id: `${PLUGIN_ID}.input.child`,
                  defaultMessage: 'Child',
                })}
                placeholder={
                  loadingChildren
                    ? formatMessage({ id: `${PLUGIN_ID}.input.loading`, defaultMessage: 'Loading…' })
                    : formatMessage({
                        id: `${PLUGIN_ID}.input.selectChild`,
                        defaultMessage: 'Select a child…',
                      })
                }
                value={parsed.child ?? ''}
                onChange={handleChildChange}
                onClear={() => emitChange({ parent: parsed.parent, child: null })}
                disabled={disabled || !parsed.parent || loadingChildren}
              >
                {children.map((c) => (
                  <SingleSelectOption key={c.documentId} value={c.documentId}>
                    {c.label}
                  </SingleSelectOption>
                ))}
              </SingleSelect>
            </>
          )}
        </Flex>
        <Field.Hint />
        <Field.Error />
      </Field.Root>
    );
  }
);

export default LinkedSelectInput;
