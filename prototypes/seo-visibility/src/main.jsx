import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.jsx";
import "./styles.css";
import "./dashboard.css";

class ErrorBoundary extends React.Component {
 state={failed:false};
 static getDerivedStateFromError(){return {failed:true}}
 render(){return this.state.failed?<main style={{padding:40,maxWidth:650,margin:'auto'}}><h1>Demo ekranı yüklenemedi</h1><p>Sayfayı yenileyin. Yerel kayıtlarda sorun varsa yalnız bu prototipin verilerini sıfırlayabilirsiniz.</p><button onClick={()=>location.reload()}>Yenile</button> <button onClick={()=>{localStorage.removeItem('ototr-seo-demo-v1');location.reload()}}>Demo kayıtlarını sıfırla</button></main>:this.props.children}
}
createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary><App /></ErrorBoundary>
  </React.StrictMode>,
);

import './mobile.css';
