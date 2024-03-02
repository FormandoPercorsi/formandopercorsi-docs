import './App.css';
import { RedocStandalone } from 'redoc';

function App() {
  return (
    // <RedocStandalone specUrl={process.env.REACT_APP_DOC_URL} />
    <RedocStandalone
      // specUrl="/doc/openapi.json"
      specUrl="https://api.formandopercorsi.com/doc/openapi.json"
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
          logo: {
          },
          typography: {
            fontSize: '16px',
            lineHeight: '1.4'
          },
          rightPanel: {
          },
        },
        hideHostname: false,
        hideDownloadButton: true,
        hideLoading: true,
      }}
    />
  );
}

export default App;
