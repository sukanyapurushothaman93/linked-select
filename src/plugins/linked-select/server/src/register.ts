import type { Core } from "@strapi/strapi";

const register = ({ strapi }: { strapi: Core.Strapi }) => {
  // register phase
  strapi.customFields.register({
    name: 'linked-select',
    plugin: 'linked-select',
    type: 'json',
  });
};

export default register;