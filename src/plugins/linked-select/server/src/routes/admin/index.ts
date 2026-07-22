export default () => ({
  type: "admin",
  routes: [
    {
      method: "GET",
      path: "/content-types",
      handler: "controller.getContentTypes",
      config: {
        policies: [],
      },
    },
    {
      method: "GET",
      path: "/entries/:uid",
      handler: "controller.getEntries",
      config: {
        policies: [],
      },
    },
  ],
});
