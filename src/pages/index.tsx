import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';

import styles from './index.module.css';

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx('hero', styles.heroBanner)}>
      <div className="container">
        <Heading as="h1" className="hero__title">
          {siteConfig.title}
        </Heading>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
        <div className={styles.buttons}>
          <Link className="button button--secondary button--lg" to="/intro">
            Leggi le guide
          </Link>
          <Link
            className={clsx('button button--outline button--secondary button--lg', styles.secondaryButton)}
            to="/api/formando-percorsi-api">
            Vai alla API Reference
          </Link>
        </div>
      </div>
    </header>
  );
}

type CardItem = {
  title: string;
  emoji: string;
  description: ReactNode;
  to: string;
  linkLabel: string;
};

const cards: CardItem[] = [
  {
    title: 'Guide',
    emoji: '📖',
    description: (
      <>
        I processi e le regole che governano la piattaforma: disponibilità e prenotazioni,
        ripartizione dei compensi fra insegnanti, scuole partner e piattaforma, fatturazione,
        autenticazione e comunicazioni verso gli utenti.
      </>
    ),
    to: '/intro',
    linkLabel: 'Consulta le guide →',
  },
  {
    title: 'API Reference',
    emoji: '🔌',
    description: (
      <>
        Il contratto REST completo, organizzato per area funzionale: parametri, struttura di
        richiesta e risposta, codici di errore ed esempi eseguibili direttamente dal browser, per
        l'ambiente di produzione e per quello di sviluppo.
      </>
    ),
    to: '/api/formando-percorsi-api',
    linkLabel: 'Sfoglia gli endpoint →',
  },
];

function HomepageCards() {
  return (
    <section className={styles.cards}>
      <div className="container">
        <div className="row">
          {cards.map((card) => (
            <div key={card.title} className={clsx('col col--6', styles.cardCol)}>
              <Link to={card.to} className={styles.card}>
                <span className={styles.cardEmoji} aria-hidden="true">
                  {card.emoji}
                </span>
                <Heading as="h2">{card.title}</Heading>
                <p>{card.description}</p>
                <span className={styles.cardLink}>{card.linkLabel}</span>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function Home(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title={siteConfig.title}
      description="Documentazione tecnica e API reference di Formando PerCorsi">
      <HomepageHeader />
      <main>
        <HomepageCards />
      </main>
    </Layout>
  );
}
