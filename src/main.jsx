import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(e) { return { error: e }; }
  componentDidCatch(e, info) { console.error('Error:', e, info); }
  render() {
    if (this.state.error) {
      const e = this.state.error;
      return (
        <div style={{background:'#0F0F0F',color:'#E8E4DC',padding:40,fontFamily:'monospace',minHeight:'100vh',lineHeight:1.6}}>
          <div style={{color:'#C8A96E',fontSize:20,marginBottom:16}}>⚠ Blue Forest — Error</div>
          <div style={{color:'#E05C5C',fontSize:13,marginBottom:20}}>{e.message}</div>
          <div style={{color:'#666',fontSize:11,whiteSpace:'pre-wrap'}}>{e.stack?.split('\n').slice(0,8).join('\n')}</div>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <ErrorBoundary><App /></ErrorBoundary>
)
