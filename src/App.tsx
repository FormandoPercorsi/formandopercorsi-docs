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
        theme: { colors: { primary: { main: '#dd5522' } } },
      }}
    />
  );
}

export default App;
