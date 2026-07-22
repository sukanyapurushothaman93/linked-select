import * as React from 'react';
import { Field, SingleSelect, SingleSelectOption, Typography } from '@strapi/design-system';
import { getFetchClient } from '@strapi/strapi/admin';
import { useIntl } from 'react-intl';

import { PLUGIN_ID } from '../../pluginId';

type ContentTypeSummary = {
  uid: string;
  displayName: string;
};

type ChildContentTypeSelectProps = {
  intlLabel: { id: string; defaultMessage: string; values?: Record<string, unknown> };
  name: string;
  onChange: (event: { target: { name: string; value: string | null; type?: string } }) => void;
  value?: string | null;
  error?: string;
  description?: { id: string; defaultMessage: string; values?: Record<string, unknown> };
  modifiedData?: {
    options?: {
      parentContentType?: string;
    };
  };
  disabled?: boolean;
};

/**
 * CTB custom input: child content-type options are limited to relation targets
 * declared on the currently selected parent content type.
 */
const ChildContentTypeSelect = ({
  intlLabel,
  name,
  onChange,
  value,
  error,
  description,
  modifiedData,
  disabled,
}: ChildContentTypeSelectProps) => {
  const { formatMessage } = useIntl();
  const parentUid = modifiedData?.options?.parentContentType || '';

  const [options, setOptions] = React.useState<ContentTypeSummary[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [loadedForParent, setLoadedForParent] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!parentUid) {
      setOptions([]);
      setLoadedForParent(null);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const { get } = getFetchClient();
    get(`/${PLUGIN_ID}/content-types?parentUid=${encodeURIComponent(parentUid)}`)
      .then((res) => {
        if (cancelled) return;
        setOptions(Array.isArray(res.data?.data) ? res.data.data : []);
        setLoadedForParent(parentUid);
      })
      .catch(() => {
        if (cancelled) return;
        setOptions([]);
        setLoadedForParent(parentUid);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [parentUid]);

  // Clear an invalid child selection once options for the current parent have loaded.
  React.useEffect(() => {
    if (!value) return;
    if (!parentUid) {
      onChange({ target: { name, value: null, type: 'select' } });
      return;
    }
    if (loadedForParent !== parentUid || loading) return;
    if (!options.some((ct) => ct.uid === value)) {
      onChange({ target: { name, value: null, type: 'select' } });
    }
  }, [parentUid, loadedForParent, loading, options, value, name, onChange]);

  const label = formatMessage(intlLabel);
  const hint = description ? formatMessage(description) : undefined;

  const placeholder = !parentUid
    ? formatMessage({
        id: `${PLUGIN_ID}.options.childContentType.selectParentFirst`,
        defaultMessage: 'Select a parent content type first…',
      })
    : loading
      ? formatMessage({
          id: `${PLUGIN_ID}.input.loading`,
          defaultMessage: 'Loading…',
        })
      : options.length === 0
        ? formatMessage({
            id: `${PLUGIN_ID}.options.childContentType.noRelations`,
            defaultMessage: 'No relation targets found on the parent…',
          })
        : formatMessage({
            id: `${PLUGIN_ID}.options.childContentType.placeholder`,
            defaultMessage: 'Select a child content type…',
          });

  return (
    <Field.Root name={name} error={error || undefined} hint={hint}>
      <Field.Label>{label}</Field.Label>
      <SingleSelect
        disabled={disabled || !parentUid || loading || options.length === 0}
        placeholder={placeholder}
        value={value || ''}
        onChange={(next) => {
          onChange({
            target: {
              name,
              value: next ? String(next) : null,
              type: 'select',
            },
          });
        }}
        onClear={() => onChange({ target: { name, value: null, type: 'select' } })}
      >
        {options.map((ct) => (
          <SingleSelectOption key={ct.uid} value={ct.uid}>
            {`${ct.displayName} (${ct.uid})`}
          </SingleSelectOption>
        ))}
      </SingleSelect>
      {parentUid && !loading && options.length === 0 ? (
        <Typography variant="pi" textColor="warning600">
          {formatMessage({
            id: `${PLUGIN_ID}.options.childContentType.noRelationsHint`,
            defaultMessage:
              'Add a relation on the parent content type that targets the child, then try again.',
          })}
        </Typography>
      ) : null}
      <Field.Hint />
      <Field.Error />
    </Field.Root>
  );
};

export default ChildContentTypeSelect;
