import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.js";
import { Provider } from 'react-redux';
import { UserAuthProvider } from "./context-reducer/UserAuthContext.js";
import CallProvider from "./components/Call/CallProvider.js";
import { store, persistor } from "./redux/store.js";
import { PersistGate } from 'redux-persist/integration/react';

import Loading from "./pages/Loading.js";

// Import and initialize reminder scheduler
import reminderScheduler from "../reminderScheduler.js";


ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Provider store={store}>
      <PersistGate loading={<Loading />} persistor={persistor}>
        <UserAuthProvider>
          <CallProvider>
            <App />
          </CallProvider>
        </UserAuthProvider>
      </PersistGate>
    </Provider>
  </React.StrictMode>
);
