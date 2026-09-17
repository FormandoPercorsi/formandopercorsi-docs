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
 * product. Add a new backend tag to a group below when it shows up; one that
 * nobody has filed yet lands in the "Altro" group rather than breaking the
 * build, so everything else keeps working unchanged.
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

/** Where tags no group claims end up, so a new backend tag never breaks the build. */
const FALLBACK_GROUP_LABEL = 'Altro';

const TOPIC_GROUPS: Array<{label: string; tags: string[]}> = [
  {label: 'Autenticazione', tags: ['Auth']},
  {
    label: 'Famiglia, Lezioni & Prenotazioni',
    tags: [
      'Family',
      'Family Students',
      'Family Student Subjects',
      'Family Favourite Teachers',
      'Family Addresses',
      'Family Referral',
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
  {label: 'Anagrafiche geografiche', tags: ['City', 'Province', 'School', 'Headquarter']},
  {
    label: 'Amministrazione',
    tags: [
      'Admin - Availability',
      'Admin - Band Changes',
      'Admin - Bands',
      'Admin - External Schools',
      'Admin - Finance',
      'Admin - Job Runs',
      'Admin - Lessons',
      'Admin - Monitoring',
      'Admin - Price Changes',
      'Admin - Provisioning',
      'Admin - Settlements',
      'Admin - Tracking Metrics',
      'Admin - Users',
      'Metric Options',
    ],
  },
];

function buildApiSidebar(generatedSidebar: unknown, infoDocId: string, envLabel: string): SidebarsConfig[string] {
  const byLabel = categoriesByLabel(generatedSidebar);
  const coveredTags = new Set(TOPIC_GROUPS.flatMap((group) => group.tags));
  const uncovered = [...byLabel.keys()].filter((tag) => !coveredTags.has(tag));
  if (uncovered.length > 0) {
    // A tag no group claims used to throw, which meant a backend shipping a
    // brand-new tag broke the docs build until someone edited this file. The
    // endpoints still have to reach the sidebar, so they are collected into a
    // fallback group instead; the warning is the reminder to file them under a
    // real topic above.
    console.warn(
      `[sidebars] OpenAPI tag(s) ${uncovered.map((t) => `"${t}"`).join(', ')} in the ${envLabel} spec are not ` +
        `assigned to any group in TOPIC_GROUPS: they are shown under "${FALLBACK_GROUP_LABEL}". Add them to an ` +
        `existing group (or a new one) in sidebars.ts.`,
    );
  }

  // A tag configured in a group but absent from *this* generated sidebar is
  // tolerated, not an error: fetch-openapi.js's live endpoint can be ahead of
  // its git-based fallback (a brand-new tag not yet reflected in the
  // committed web/doc/openapi.yaml), so a build using the fallback would
  // otherwise fail on content that simply isn't in that particular spec yet.
  const groups = TOPIC_GROUPS.map(({label, tags}) => {
    const items = tags.map((tag) => byLabel.get(tag)).filter((category): category is SidebarItem => Boolean(category));
    return {type: 'category', label, items, collapsed: true} as SidebarItem;
  }).filter((group) => (group.items as unknown[]).length > 0);

  if (uncovered.length > 0) {
    groups.push({
      type: 'category',
      label: FALLBACK_GROUP_LABEL,
      items: uncovered.map((tag) => byLabel.get(tag) as SidebarItem),
      collapsed: true,
    } as SidebarItem);
  }

  return [{type: 'doc', id: infoDocId}, ...groups] as unknown as SidebarsConfig[string];
}

const apiSidebar = buildApiSidebar(generatedApiSidebar, 'api/formando-percorsi-api', 'production');
const apiDevSidebar = buildApiSidebar(generatedApiDevSidebar, 'api-develop/formando-percorsi-api', 'develop');

const sidebars: SidebarsConfig = {
  guidesSidebar: [
    'intro',
    {
      type: 'category',
      label: 'Panoramica',
      collapsed: false,
      items: ['guides/piattaforma', 'guides/architettura'],
    },
    {
      type: 'category',
      label: 'Accesso al sistema',
      items: ['guides/autenticazione'],
    },
    {
      type: 'category',
      label: 'Prenotazione delle lezioni',
      items: ['guides/disponibilita', 'guides/ranking-insegnanti', 'guides/percorsi-formativi'],
    },
    {
      type: 'category',
      label: 'Flussi economici',
      items: ['guides/pagamenti', 'guides/referral-crediti', 'guides/assicurazione'],
    },
    {
      type: 'category',
      label: 'Comunicazioni',
      items: ['guides/notifiche'],
    },
    {
      type: 'category',
      label: 'Applicazioni client',
      items: ['guides/guida-frontend'],
    },
    {
      type: 'category',
      label: 'Sviluppo',
      items: ['guides/setup-locale'],
    },
  ],
  apiSidebar,
  apiDevSidebar,
};

export default sidebars;
