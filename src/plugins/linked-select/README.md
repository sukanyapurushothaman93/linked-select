# Linked Select

A Strapi 5 **custom field** that renders two cascading dropdowns inside the Content Manager:

1. A **parent** dropdown listing entries of one content type.
2. A **child** dropdown listing entries of a related content type, filtered by the selected parent.

It is reusable on any content type — you only configure which content types act as the parent and child when you add the field.

## How it works

- The field stores a JSON value: `{ "parent": "<parentDocumentId>", "child": "<childDocumentId>" }`.
- Options are fetched through the plugin's own **admin API** (using the Document Service), so you do **not** need to make your content types public.
- The relation between child and parent is **auto-detected**, so minimal configuration is required.

## Setup

The plugin is a local plugin, already enabled in `config/plugins.ts`:

```ts
export default () => ({
  'linked-select': {
    enabled: true,
    resolve: './src/plugins/linked-select',
  },
});
```

Build the plugin and start Strapi:

```bash
cd src/plugins/linked-select && npm install && npm run build
cd ../../.. && npm run develop
```

## Usage

1. In **Content-Type Builder**, add a field and pick **Linked Select** from the **Custom** tab.
2. Configure the field settings:
   - **Parent content type** — pick from the dropdown (all of your API content types).
   - **Child content type** — pick from the dropdown. Options are limited to content types already listed as **relations on the selected parent**.
   - **Relation field** (optional) — the relation on the child that points to the parent. Auto-detected when empty.
   - **Label field** (optional) — the field shown as the option label (e.g. `name`, `title`). Auto-detected when empty.
3. Save. In the **Content Manager**, choose a parent; the child dropdown loads the related entries.

> **Note on the parent content-type dropdown:** Strapi's Content-Type Builder only renders *static* option lists for built-in select settings, so the parent list is fetched once when the admin panel loads (via `GET /linked-select/content-types`). If it appears empty, refresh the admin panel and reopen the field settings. The child dropdown is a custom input and reloads whenever the parent selection changes.

> **Prerequisite:** the parent content type must declare a **relation** whose target is the child (e.g. a `category` with an `articles` relation to `article`). The inverse relation on the child is what powers entry filtering in the Content Manager.

## Finding a content type UID

A UID follows the pattern `api::<singularName>.<singularName>`. For a `Category` collection it is `api::category.category`.

## Admin API (used internally)

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/linked-select/content-types` | Lists API content types (`uid`, `displayName`, `labelField`, `relationTargets`). |
| `GET` | `/linked-select/content-types?parentUid=<uid>` | Lists content types that are relation targets of the given parent. |
| `GET` | `/linked-select/entries/:uid` | Lists entries as `{ id, documentId, label }`. |
| `GET` | `/linked-select/entries/:uid?parentValue=<id>&parentUid=<uid>` | Lists child entries related to the given parent. |

Optional query params: `labelField`, `relationField`.
