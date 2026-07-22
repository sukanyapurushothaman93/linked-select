import type { Core } from "@strapi/strapi";

type ContentTypeSummary = {
  uid: string;
  displayName: string;
  labelField: string;
  /** UIDs of content types targeted by relation attributes on this schema. */
  relationTargets: string[];
};

type EntryOption = {
  id: number | string;
  documentId: string;
  label: string;
};

/**
 * Fields we try, in order, when guessing a human-readable label for an entry.
 */
const LABEL_CANDIDATES = ["name", "title", "label", "displayName", "fullName", "slug"];

const service = ({ strapi }: { strapi: Core.Strapi }) => {
  /**
   * Returns the schema for a given content-type UID or throws a readable error.
   */
  const getSchema = (uid: string) => {
    const schema = strapi.contentTypes[uid as keyof typeof strapi.contentTypes];
    if (!schema) {
      throw new Error(`Unknown content type: "${uid}"`);
    }
    return schema as any;
  };

  /**
   * Collects unique relation target UIDs declared on a content-type schema.
   */
  const getRelationTargets = (schema: any): string[] => {
    const attributes = schema.attributes || {};
    const targets = new Set<string>();

    for (const attr of Object.values(attributes) as any[]) {
      if (attr?.type === "relation" && typeof attr.target === "string") {
        targets.add(attr.target);
      }
    }

    return Array.from(targets).sort();
  };

  /**
   * Picks the best field to use as a display label for a content type.
   */
  const resolveLabelField = (schema: any, preferred?: string): string => {
    const attributes = schema.attributes || {};

    if (preferred && attributes[preferred]) {
      return preferred;
    }

    for (const candidate of LABEL_CANDIDATES) {
      const attr = attributes[candidate];
      if (attr && (attr.type === "string" || attr.type === "text" || attr.type === "uid")) {
        return candidate;
      }
    }

    // Fall back to the first string-like attribute, otherwise documentId.
    const firstString = Object.keys(attributes).find((key) => {
      const attr = attributes[key];
      return attr && (attr.type === "string" || attr.type === "text");
    });

    return firstString || "documentId";
  };

  return {
    /**
     * Lists the API content types that can be used as parent/child sources.
     */
    getContentTypes(): ContentTypeSummary[] {
      return Object.values(strapi.contentTypes)
        .filter((ct: any) => typeof ct.uid === "string" && ct.uid.startsWith("api::"))
        .map((ct: any) => ({
          uid: ct.uid,
          displayName: ct.info?.displayName || ct.info?.singularName || ct.uid,
          labelField: resolveLabelField(ct),
          relationTargets: getRelationTargets(ct),
        }))
        .sort((a, b) => a.displayName.localeCompare(b.displayName));
    },

    /**
     * Lists API content types that appear as relation targets on `parentUid`.
     */
    getRelatedContentTypes(parentUid: string): ContentTypeSummary[] {
      getSchema(parentUid);
      const all = this.getContentTypes();
      const parent = all.find((ct) => ct.uid === parentUid);
      if (!parent) {
        return [];
      }

      const allowed = new Set(parent.relationTargets);
      return all.filter((ct) => allowed.has(ct.uid));
    },

    /**
     * Finds the relation field on `childUid` that targets `parentUid`.
     * Returns null when no such relation exists.
     */
    findRelationField(childUid: string, parentUid: string): string | null {
      const schema = getSchema(childUid);
      const attributes = schema.attributes || {};

      const match = Object.keys(attributes).find((key) => {
        const attr = attributes[key];
        return attr && attr.type === "relation" && attr.target === parentUid;
      });

      return match || null;
    },

    /**
     * Lists entries of a content type as `{ id, documentId, label }` options.
     */
    async getEntries(uid: string, labelField?: string): Promise<EntryOption[]> {
      const schema = getSchema(uid);
      const field = resolveLabelField(schema, labelField);

      const entries = await strapi.documents(uid as any).findMany({
        fields: field === "documentId" ? ["documentId"] : [field],
        sort: field === "documentId" ? undefined : (`${field}:asc` as any),
        limit: 500,
      });

      return entries.map((entry: any) => ({
        id: entry.id,
        documentId: entry.documentId,
        label: String(entry[field] ?? entry.documentId ?? entry.id),
      }));
    },

    /**
     * Lists entries of `childUid` that are related to the given parent document.
     * When `relationField` is omitted it is auto-detected from `parentUid`.
     */
    async getRelatedEntries(
      childUid: string,
      parentValue: string,
      opts: { relationField?: string; parentUid?: string; labelField?: string } = {}
    ): Promise<EntryOption[]> {
      const schema = getSchema(childUid);
      const field = resolveLabelField(schema, opts.labelField);

      let relationField = opts.relationField;
      if (!relationField && opts.parentUid) {
        relationField = this.findRelationField(childUid, opts.parentUid) || undefined;
      }

      if (!relationField) {
        throw new Error(
          `Could not determine the relation field on "${childUid}". ` +
            `Set "relationField" in the field options.`
        );
      }

      const entries = await strapi.documents(childUid as any).findMany({
        fields: field === "documentId" ? ["documentId"] : [field],
        sort: field === "documentId" ? undefined : (`${field}:asc` as any),
        filters: {
          [relationField]: { documentId: { $eq: parentValue } },
        } as any,
        limit: 500,
      });

      return entries.map((entry: any) => ({
        id: entry.id,
        documentId: entry.documentId,
        label: String(entry[field] ?? entry.documentId ?? entry.id),
      }));
    },
  };
};

export default service;
