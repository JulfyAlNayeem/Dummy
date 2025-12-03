import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { Provider } from 'react-redux';
import { UserAuthProvider } from "./context-reducer/UserAuthContext.jsx";
import { store, persistor } from "./redux/store.js";
import { PersistGate } from 'redux-persist/integration/react';
import { Toaster } from "./components/ui/toaster.jsx";
import Loading from "./pages/Loading.jsx";


ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Provider store={store}>
      <PersistGate loading={<Loading/>} persistor={persistor}>
        <UserAuthProvider>
            {/* MessageProvider removed */}
              {/* ChatProvider removed */}
                <App />
                <Toaster/>
              {/* ChatProvider removed */}
            {/* MessageProvider removed */}
        </UserAuthProvider>
      </PersistGate>
    </Provider>
  </React.StrictMode>
);
