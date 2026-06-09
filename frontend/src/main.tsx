import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { Provider } from 'react-redux';
import { UserAuthProvider } from "./context-reducer/UserAuthContext";
import  CallProvider from "./components/Call/CallProvider";
import { store, persistor } from "./redux/store";
import { PersistGate } from 'redux-persist/integration/react';
import Loading from "./pages/Loading";
// Import and initialize reminder scheduler
import reminderScheduler from "../reminderScheduler";

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
