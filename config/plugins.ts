import type { Core } from '@strapi/strapi';

const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Plugin => ({
    'linked-select': {
        enabled: true,
        resolve: './src/plugins/linked-select',
    },
});

export default config;
