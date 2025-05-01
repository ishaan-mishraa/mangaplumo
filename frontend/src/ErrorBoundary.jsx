// ErrorBoundary.jsx
import React from 'react';
export class ErrorBoundary extends React.Component {
  state = { error: null };
  static getDerivedStateFromError(e) { return { error: e }; }
  render() {
    if (this.state.error) return <div className="p-4 text-red-400">Error: {this.state.error.message}</div>;
    return this.props.children;
  }
}
