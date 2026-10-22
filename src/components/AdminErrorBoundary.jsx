import React from 'react';

class AdminErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    console.error('[AdminErrorBoundary] Caught render error:', error?.message);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          backgroundColor: '#f9f9f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          fontFamily: 'var(--font-sans)'
        }}>
          <div style={{
            maxWidth: '480px',
            width: '100%',
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            padding: '32px 24px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
            border: '1px solid #eaeaea',
            textAlign: 'center'
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: 'rgba(169, 27, 36, 0.1)',
              color: 'var(--frutlle-red)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto',
              fontSize: '24px',
              fontWeight: 'bold'
            }}>
              !
            </div>
            <h2 style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '1.4rem',
              color: 'var(--frutlle-dark-red)',
              marginBottom: '10px'
            }}>
              Admin Dashboard Notice
            </h2>
            <p style={{
              fontSize: '0.9rem',
              color: '#666',
              lineHeight: '1.5',
              marginBottom: '24px'
            }}>
              A rendering issue occurred while loading this view. You can reload the dashboard to restore your session.
            </p>
            <button
              onClick={this.handleReload}
              style={{
                backgroundColor: 'var(--frutlle-red)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '9999px',
                padding: '12px 28px',
                fontSize: '0.9rem',
                fontWeight: 600,
                cursor: 'pointer',
                letterSpacing: '0.05em'
              }}
            >
              Reload Dashboard
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default AdminErrorBoundary;
