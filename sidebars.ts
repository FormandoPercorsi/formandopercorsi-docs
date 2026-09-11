import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';
import generatedApiSidebar from './docs/api/sidebar';
import generatedApiDevSidebar from './docs/api-develop/sidebar';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

type SidebarItem = {label?: string; type?: string; [key: string]: unknown};

/**
 * docusaurus-plugin-openapi-docs regenerates docs/api/sidebar.ts (and
 * docs/api-develop/sidebar.ts) on every `npm run gen-api-docs` run: one flat
 * category per OpenAPI tag, in spec order. That's ~30 categories, which is
 * functional but not a great reading experience on its own. Rather than
 * hand-copying the (large, ID-heavy) generated items into a hand-maintained
 * sidebar -- which would silently go stale on the next regeneration -- we
 * re-group the *generated* category objects by their tag label into a
 * handful of topic groups that mirror how someone actually thinks about the
 * product. Add a new backend tag to a group below when it shows up;
 * everything else keeps working unchanged.
 *
 * The same grouping is applied to both the production and develop API trees
 * (see docusaurus.config.ts) since they share the same tag structure -- only
 * which endpoints/fields exist under each tag can differ between the two.
 */
function categoriesByLabel(generatedSidebar: unknown): Map<string, SidebarItem> {
  return new Map(
    (generatedSidebar as SidebarItem[])
      .filter((item) => item.type === 'category' && typeof item.label === 'string')
      .map((item) => [item.label as string, item]),
  );
}

const TOPIC_GROUPS: Array<{label: string; tags: string[]}> = [
  {label: 'Autenticazione', tags: ['Auth']},
  {
    label: 'Famiglia, Lezioni & Prenotazioni',
    tags: [
      'Family',
      'Family Students',
      'Family Student Subjects',
      'Family Favourite Teachers',
      'Lesson',
      'Availability',
      'Availability Group',
      'Promotion',
      'Contract',
    ],
  },
  {label: 'Insegnanti', tags: ['Teacher', 'Teacher Application']},
  {
    label: 'Contenuti didattici',
    tags: ['Subject', 'Topic', 'Subtopic', 'StudentExercise', 'Exercise', 'Track', 'Video'],
  },
  {label: 'Pagamenti & Fatturazione', tags: ['Invoice', 'InvoiceLegislation', 'CreditNote']},
  {label: 'Notifiche', tags: ['Notification']},
  {label: 'Anagrafiche geografiche', tags: ['City', 'Province', 'School']},
  {
    label: 'Amministrazione',
    tags: [
      'Admin - Availability',
      'Admin - Finance',
      'Admin - Lessons',
      'Admin - Users',
      'Admin - Tracking Metrics',
      'Metric Options',
    ],
  },
];

function buildApiSidebar(generatedSidebar: unknown, infoDocId: string, envLabel: string): SidebarsConfig[string] {
  const byLabel = categoriesByLabel(generatedSidebar);
  const coveredTags = new Set(TOPIC_GROUPS.flatMap((group) => group.tags));
  const uncovered = [...byLabel.keys()].filter((tag) => !coveredTags.has(tag));
  if (uncovered.length > 0) {
    throw new Error(
      `sidebars.ts: OpenAPI tag(s) ${uncovered.map((t) => `"${t}"`).join(', ')} in the ${envLabel} spec are not ` +
        `assigned to any group in TOPIC_GROUPS, so their endpoints would be missing from the sidebar. Add them ` +
        `to an existing group (or a new one) above.`,
    );
  }

  const groups = TOPIC_GROUPS.map(({label, tags}) => {
    const items = tags.map((tag) => {
      const category = byLabel.get(tag);
      if (!category) {
        throw new Error(
          `sidebars.ts: OpenAPI tag "${tag}" referenced in group "${label}" (${envLabel}) was not found in the ` +
            `generated sidebar. Run "npm run gen-api-docs" again, or update the grouping in sidebars.ts if the ` +
            `tag was renamed/removed in the ${envLabel} spec.`,
        );
      }
      return category;
    });
    return {type: 'category', label, items, collapsed: true} as SidebarItem;
  });

  return [{type: 'doc', id: infoDocId}, ...groups] as unknown as SidebarsConfig[string];
}

const apiSidebar = buildApiSidebar(generatedApiSidebar, 'api/formando-percorsi-api', 'production');
const apiDevSidebar = buildApiSidebar(generatedApiDevSidebar, 'api-develop/formando-percorsi-api', 'develop');

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
  apiDevSidebar,
};

export default sidebars;
