import { getFetchClient } from '@strapi/strapi/admin';

import ChildContentTypeSelect from './components/ChildContentTypeSelect';
import { PluginIcon } from './components/PluginIcon';
import { PLUGIN_ID } from './pluginId';

type ContentTypeSummary = {
  uid: string;
  displayName: string;
  labelField?: string;
};

type SelectOption = {
  key: string;
  value: string;
  metadatas: {
    intlLabel: { id: string; defaultMessage: string };
  };
};

/**
 * The Content-Type Builder options form only supports *static* select options,
 * so we hand it a mutable array reference and fill it in during `bootstrap`
 * (which runs at admin load, well before the user opens the CTB form).
 *
 * The child content-type field uses a custom CTB input instead, so it can
 * filter dynamically based on the selected parent.
 */
const parentContentTypeOptions: SelectOption[] = [];

const toSelectOption = (ct: ContentTypeSummary): SelectOption => ({
  key: ct.uid,
  value: ct.uid,
  metadatas: {
    intlLabel: {
      id: `${PLUGIN_ID}.contentType.${ct.uid}`,
      defaultMessage: `${ct.displayName} (${ct.uid})`,
    },
  },
});

const CHILD_CONTENT_TYPE_INPUT_ID = 'linked-select-child-content-type';

export default {
  register(app: any) {
    app.customFields.register({
      name: 'linked-select',
      pluginId: PLUGIN_ID,
      type: 'json',
      icon: PluginIcon,
      intlLabel: {
        id: `${PLUGIN_ID}.label`,
        defaultMessage: 'Linked Select',
      },
      intlDescription: {
        id: `${PLUGIN_ID}.description`,
        defaultMessage: 'Pick a parent entry, then a related child entry (cascading dropdowns).',
      },
      components: {
        Input: async () => import('./components/LinkedSelectInput'),
      },
      options: {
        base: [
          {
            sectionTitle: {
              id: `${PLUGIN_ID}.settings.section`,
              defaultMessage: 'Linked Select settings',
            },
            items: [
              {
                name: 'options.parentContentType',
                type: 'select',
                intlLabel: {
                  id: `${PLUGIN_ID}.options.parentContentType`,
                  defaultMessage: 'Parent content type',
                },
                description: {
                  id: `${PLUGIN_ID}.options.parentContentType.description`,
                  defaultMessage: 'The content type shown in the first (parent) dropdown.',
                },
                options: parentContentTypeOptions,
              },
              {
                name: 'options.childContentType',
                type: CHILD_CONTENT_TYPE_INPUT_ID,
                intlLabel: {
                  id: `${PLUGIN_ID}.options.childContentType`,
                  defaultMessage: 'Child content type',
                },
                description: {
                  id: `${PLUGIN_ID}.options.childContentType.description`,
                  defaultMessage:
                    'Content types already listed as relations on the selected parent.',
                },
              },
            ],
          },
          {
            sectionTitle: {
              id: `${PLUGIN_ID}.settings.advanced`,
              defaultMessage: 'Optional overrides',
            },
            items: [
              {
                name: 'options.relationField',
                type: 'string',
                intlLabel: {
                  id: `${PLUGIN_ID}.options.relationField`,
                  defaultMessage: 'Relation field on the child (optional)',
                },
                description: {
                  id: `${PLUGIN_ID}.options.relationField.description`,
                  defaultMessage:
                    'The relation field on the child pointing to the parent. Auto-detected when left empty.',
                },
              },
              {
                name: 'options.labelField',
                type: 'string',
                intlLabel: {
                  id: `${PLUGIN_ID}.options.labelField`,
                  defaultMessage: 'Label field (optional)',
                },
                description: {
                  id: `${PLUGIN_ID}.options.labelField.description`,
                  defaultMessage:
                    'Field used as the option label (e.g. name, title). Auto-detected when left empty.',
                },
              },
            ],
          },
        ],
        advanced: [],
        validator: () => ({}),
      },
    });
  },
  async bootstrap(app: any) {
    // Register a dynamic CTB input so the child dropdown can react to parent.
    const ctb = app.getPlugin('content-type-builder');
    ctb?.apis?.forms?.components?.add({
      id: CHILD_CONTENT_TYPE_INPUT_ID,
      component: ChildContentTypeSelect,
    });

    try {
      const { get } = getFetchClient();
      const { data } = await get(`/${PLUGIN_ID}/content-types`);
      const contentTypes: ContentTypeSummary[] = Array.isArray(data?.data) ? data.data : [];

      // Mutate the shared array in place so the already-registered CTB options
      // pick up the values without needing a re-registration.
      parentContentTypeOptions.length = 0;
      contentTypes.forEach((ct) => parentContentTypeOptions.push(toSelectOption(ct)));
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[linked-select] Failed to load content types for the field settings:', error);
    }
  },
  async registerTrads({ locales }: { locales: string[] }) {
    const importedTrads = await Promise.all(
      locales.map((locale) => {
        return import(`./translations/${locale}.json`)
          .then(({ default: data }) => ({ data, locale }))
          .catch(() => ({ data: {}, locale }));
      })
    );

    return importedTrads.map((trad) => ({
      data: Object.keys(trad.data).reduce((acc: Record<string, string>, key) => {
        acc[`${PLUGIN_ID}.${key}`] = trad.data[key];
        return acc;
      }, {}),
      locale: trad.locale,
    }));
  },
};
