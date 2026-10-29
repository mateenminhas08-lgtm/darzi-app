import React from 'react';
import {createRoot} from 'react-dom/client';
import {ShopProvider} from './store.jsx';
import App from './App.jsx';
import './styles.css';
createRoot(document.getElementById('root')).render(<ShopProvider><App/></ShopProvider>);
if ('serviceWorker' in navigator && import.meta.env.PROD) window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(()=>{}));
