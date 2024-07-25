import './App.css';
import { RedocStandalone } from 'redoc';
import { Routes, Route, Link } from 'react-router-dom';

function App() {

  return (
    <div>
      <nav>
        <ul>
          {/* <li><Link to="/">Production</Link></li> */}
          <li><Link to="/">Pre-Production</Link></li>
          <li><Link to="/develop">Develop</Link></li>
        </ul>
      </nav>
      <Routes>
        <Route path="/develop" element={<DocPage specUrl="https://dev.api.formandopercorsi.com/doc/openapi.json" />} />
        <Route path="/" element={<DocPage specUrl="https://preprod.api.formandopercorsi.com/doc/openapi.json" />} />
        {/* <Route path="/" element={<DocPage specUrl="https://api.formandopercorsi.com/doc/openapi.json" />} /> */}
      </Routes>
    </div>
  );
}

interface DocPageProps {
  specUrl: string;
}

function DocPage({ specUrl }: DocPageProps) {
  return (
    <RedocStandalone
      specUrl={specUrl}
      options={{
        nativeScrollbars: true,
        theme: {
          colors: {
            primary: {
              main: '#D10C33'
            }
          },
          sidebar: {
            width: '260px',
            backgroundColor: '#F3E8E8'
          },
          logo: {},
          typography: {
            fontSize: '16px',
            lineHeight: '1.4'
          },
          rightPanel: {},
        },
        hideHostname: false,
        hideDownloadButton: true,
        hideLoading: true,
      }}
    />
  );
};

export default App;