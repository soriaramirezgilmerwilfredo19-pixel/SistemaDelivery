import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Error de la aplicacion:', error, info);
  }

  handleReload = () => {
    window.location.href = '/';
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="error-boundary">
        <span className="eb-icon">😵</span>
        <h2>Algo salio mal</h2>
        <p>
          La pagina encontro un error inesperado. Puedes recargar para volver
          a intentarlo, tu sesion y tu carrito se conservan.
        </p>
        <pre className="eb-detail">{String(this.state.error?.message || this.state.error)}</pre>
        <div className="eb-actions">
          <button className="btn btn-primary" onClick={() => window.location.reload()}>
            Recargar pagina
          </button>
          <button className="btn btn-outline" onClick={this.handleReload}>
            Ir al inicio
          </button>
        </div>
      </div>
    );
  }
}
