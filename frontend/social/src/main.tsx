import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { store } from './redux/store';
import './index.css';

const basePath = import.meta.env.VITE_BASE_PATH || '/';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter basename={basePath}>
        <App />
      </BrowserRouter>
    </Provider>
  </React.StrictMode>
);
