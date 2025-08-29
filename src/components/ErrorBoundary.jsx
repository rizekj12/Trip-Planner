import React from 'react';
import { Component } from "react";

export default class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, err: null };
    }
    static getDerivedStateFromError(err) { return { hasError: true, err }; }
    componentDidCatch(err, info) { console.error("ErrorBoundary", err, info); }
    render() {
        if (this.state.hasError) {
            return (
                <div className="m-4 rounded-xl bg-rose-100 p-4 text-rose-800">
                    <div className="font-semibold">Something went wrong.</div>
                    <div className="text-xs mt-1">{String(this.state.err?.message || this.state.err)}</div>
                </div>
            );
        }
        return this.props.children;
    }
}
