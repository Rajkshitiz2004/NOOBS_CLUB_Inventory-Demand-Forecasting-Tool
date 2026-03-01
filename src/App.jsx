import React, { useState, useEffect } from 'react';
import Upload from './Upload';
import Dashboard from './Dashboard';

const LoadingScreen = () => {
    const [step, setStep] = useState(0);
    const messages = [
        "Initializing Intelligence Engine...",
        "Running Holt-Winters Seasonal Model...",
        "Calculating Confidence Intervals...",
        "Synthesizing Restock Recommendations..."
    ];

    useEffect(() => {
        const interval = setInterval(() => {
            setStep(s => (s + 1) % messages.length);
        }, 700);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="loading-overlay fade-in">
            <div className="loader-icon">🧠</div>
            <div className="loader-text">Analyzing Inventory Dynamics</div>
            <div className="loader-subtext">{messages[step]}</div>
        </div>
    );
};

export default function App() {
    const [theme, setTheme] = useState('light');
    const [view, setView] = useState('upload');
    const [skus, setSkus] = useState([]);
    const [globalStats, setGlobalStats] = useState(null);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [isThinking, setIsThinking] = useState(false);

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
    }, [theme]);

    const handleDataReceived = (res) => {
        setIsThinking(true);
        setTimeout(() => {
            setData(res);
            setIsThinking(false);
            setView('dashboard');
        }, 2500);
    };

    const handleUploadComplete = (res) => {
        setSkus(res.skus);
        setGlobalStats(res.global_stats);
    };

    return (
        <div className="app-root">
            {isThinking && <LoadingScreen />}

            <nav className="navbar">
                <div className="nav-brand">
                    <span style={{ fontSize: '1.5rem' }}>📊</span> InventoryIQ
                </div>
                <div className="nav-links">
                    <a className={`nav-link ${view === 'upload' ? 'active' : ''}`} onClick={() => setView('upload')}>Upload Data</a>
                    <a className={`nav-link ${view === 'dashboard' ? 'active' : ''}`} onClick={() => setView('dashboard')}>Dashboard</a>
                    <a className={`nav-link ${view === 'about' ? 'active' : ''}`} onClick={() => setView('about')}>About</a>
                </div>
                <button className="theme-toggle" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
                    {theme === 'light' ? '🌙' : '☀️'}
                </button>
            </nav>

            <div className="container">
                {view === 'upload' && (
                    <div className="main-card fade-in">
                        <Upload
                            skus={skus}
                            setSkus={setSkus}
                            setData={handleDataReceived}
                            setLoading={setLoading}
                            loading={loading}
                            onUploadComplete={handleUploadComplete}
                        />
                    </div>
                )}

                {view === 'dashboard' && (
                    <Dashboard
                        data={data}
                        skus={skus}
                        globalStats={globalStats}
                        reset={() => { setData(null); setView('upload'); }}
                    />
                )}

                {view === 'about' && (
                    <div className="main-card fade-in">
                        <h2 style={{ marginBottom: '1rem' }}>About InventoryIQ</h2>
                        <p style={{ lineHeight: '1.6', color: 'var(--text-muted)' }}>
                            InventoryIQ is a professional demand forecasting suite designed for MSMEs.
                            Built with zero external dependencies, it leverages high-fidelity Holt-Winters
                            Exponential Smoothing to provide accurate, business-ready insights.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
