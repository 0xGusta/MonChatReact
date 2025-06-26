import React, { Component } from 'react';

export default class ErrorBoundary extends Component {
    state = { hasError: false, error: null, errorInfo: null };

    static getDerivedStateFromError(error) {
        console.error("ErrorBoundary caught error:", error);
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("ErrorBoundary details:", error, errorInfo);
        this.setState({ errorInfo });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center p-4">
                    <div className="bg-darkCard rounded-lg p-8 max-w-md text-center">
                        <h1 className="text-2xl font-bold mb-4 text-danger">Algo deu errado!</h1>
                        <p className="text-gray-300 mb-4">{this.state.error?.message || "Erro desconhecido"}</p>
                        <p className="text-gray-400 mb-6 text-sm">Tente recarregar a página ou verifique o console para mais detalhes.</p>
                        <button onClick={() => window.location.reload()} className="btn btn-primary"><i className="fas fa-redo mr-2"></i> Recarregar</button>
                        {this.state.errorInfo && (
                            <details className="mt-4 text-xs text-left text-gray-500">
                                <summary className="cursor-pointer">Detalhes do erro</summary>
                                <pre className="mt-2 p-2 bg-darkBg rounded text-xs overflow-auto">{this.state.errorInfo.componentStack}</pre>
                            </details>
                        )}
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}