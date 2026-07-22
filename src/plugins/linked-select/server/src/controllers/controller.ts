import type { Core } from "@strapi/strapi";

const getService = (strapi: Core.Strapi) =>
  strapi.plugin("linked-select").service("service") as any;

const controller = ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * GET /linked-select/content-types
   * Lists API content types that can be used as a parent/child source.
   *
   * Query params:
   *  - parentUid: when set, only return content types listed as relation
   *               targets on that parent schema
   */
  async getContentTypes(ctx: any) {
    const { parentUid } = ctx.query;
    const svc = getService(strapi);

    if (parentUid) {
      try {
        ctx.body = { data: svc.getRelatedContentTypes(parentUid) };
      } catch (error: any) {
        ctx.badRequest(error?.message || "Failed to load related content types.");
      }
      return;
    }

    ctx.body = { data: svc.getContentTypes() };
  },

  /**
   * GET /linked-select/entries/:uid
   * Lists entries for a content type, optionally filtered by a related parent.
   *
   * Query params:
   *  - labelField:    field to display as the option label
   *  - parentValue:   documentId of the selected parent (enables filtering)
   *  - parentUid:     UID of the parent content type (for relation auto-detection)
   *  - relationField: explicit relation field on the child pointing to the parent
   */
  async getEntries(ctx: any) {
    const { uid } = ctx.params;
    const { labelField, parentValue, parentUid, relationField } = ctx.query;

    if (!uid) {
      return ctx.badRequest('Missing "uid" parameter.');
    }

    try {
      const svc = getService(strapi);

      if (parentValue) {
        ctx.body = {
          data: await svc.getRelatedEntries(uid, parentValue, {
            relationField,
            parentUid,
            labelField,
          }),
        };
        return;
      }

      ctx.body = { data: await svc.getEntries(uid, labelField) };
    } catch (error: any) {
      ctx.badRequest(error?.message || "Failed to load entries.");
    }
  },
});

export default controller;
