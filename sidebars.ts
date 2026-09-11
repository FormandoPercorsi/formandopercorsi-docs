import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';
import generatedApiSidebar from './docs/api/sidebar';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

type SidebarItem = {label?: string; type?: string; [key: string]: unknown};

/**
 * docusaurus-plugin-openapi-docs regenerates docs/api/sidebar.js on every
 * `npm run gen-api-docs` run: one flat category per OpenAPI tag, in spec
 * order. That's ~30 categories, which is functional but not a great reading
 * experience on its own. Rather than hand-copying the (large, ID-heavy)
 * generated items into a hand-maintained sidebar -- which would silently go
 * stale on the next regeneration -- we re-group the *generated* category
 * objects by their tag label into a handful of topic groups that mirror how
 * someone actually thinks about the product. Add a new backend tag to a
 * group below when it shows up; everything else keeps working unchanged.
 */
const apiCategoriesByLabel = new Map<string, SidebarItem>(
  (generatedApiSidebar as SidebarItem[])
    .filter((item) => item.type === 'category' && typeof item.label === 'string')
    .map((item) => [item.label as string, item]),
);

function group(label: string, tagLabels: string[]): SidebarItem {
  const items = tagLabels
    .map((tagLabel) => {
      const category = apiCategoriesByLabel.get(tagLabel);
      if (!category) {
        throw new Error(
          `sidebars.ts: OpenAPI tag "${tagLabel}" referenced in group "${label}" was not found in the ` +
            `generated docs/api/sidebar.js. Run "npm run gen-api-docs" again, or update the grouping below ` +
            `if the tag was renamed/removed in openapi/formandopercorsi.yaml.`,
        );
      }
      return category;
    });
  return {type: 'category', label, items, collapsed: true} as SidebarItem;
}

const apiSidebar: SidebarsConfig['apiSidebar'] = [
  {type: 'doc', id: 'api/formando-percorsi-api'},
  group('Autenticazione', ['Auth']),
  group('Famiglia, Lezioni & Prenotazioni', [
    'Family',
    'Family Students',
    'Family Student Subjects',
    'Family Favourite Teachers',
    'Lesson',
    'Availability',
    'Availability Group',
    'Promotion',
    'Contract',
  ]),
  group('Insegnanti', ['Teacher', 'Teacher Application']),
  group('Contenuti didattici', ['Subject', 'Topic', 'Subtopic', 'StudentExercise', 'Track']),
  group('Pagamenti & Fatturazione', ['Invoice', 'InvoiceLegislation']),
  group('Notifiche', ['Notification']),
  group('Anagrafiche geografiche', ['City', 'Province', 'School']),
  group('Amministrazione', [
    'Admin - Availability',
    'Admin - Finance',
    'Admin - Lessons',
    'Admin - Users',
    'Admin - Tracking Metrics',
    'Metric Options',
  ]),
] as unknown as SidebarsConfig['apiSidebar'];

const sidebars: SidebarsConfig = {
  guidesSidebar: [
    'intro',
    {
      type: 'category',
      label: 'Iniziare',
      collapsed: false,
      items: ['guides/setup-locale', 'guides/architettura'],
    },
    {
      type: 'category',
      label: 'Autenticazione',
      items: ['guides/autenticazione'],
    },
    {
      type: 'category',
      label: 'Prenotazioni & Disponibilità',
      items: ['guides/disponibilita', 'guides/percorsi-formativi', 'guides/ranking-insegnanti'],
    },
    {
      type: 'category',
      label: 'Denaro',
      items: ['guides/pagamenti', 'guides/assicurazione', 'guides/referral-crediti'],
    },
    {
      type: 'category',
      label: 'Notifiche',
      items: ['guides/notifiche'],
    },
    {
      type: 'category',
      label: 'Frontend',
      items: ['guides/guida-frontend'],
    },
  ],
  apiSidebar,
};

export default sidebars;
