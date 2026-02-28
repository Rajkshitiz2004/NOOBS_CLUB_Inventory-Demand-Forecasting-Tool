import React, { useState, useEffect, useMemo } from 'react';

const Skeleton = ({ width = '100%', height = '20px', margin = '0' }) => (
    <div className="skeleton" style={{ width, height, margin }} />
);

const CountUp = ({ end, duration = 1000, suffix = "" }) => {
    const [count, setCount] = useState(0);
    useEffect(() => {
        let start = 0;
        const target = parseFloat(end);
        if (isNaN(target) || target === 0) {
            setCount(0);
            return;
        }
        const increment = target / (duration / 16);
        const timer = setInterval(() => {
            start += increment;
            if (start >= target) {
                setCount(target);
                clearInterval(timer);
            } else {
                setCount(start);
            }
        }, 16);
        return () => clearInterval(timer);
    }, [end]);
    return <span className="kpi-value">{Math.round(count).toLocaleString()}{suffix}</span>;
};

const MiniChart = ({ data, color = "#6366f1" }) => {
    if (!data || data.length === 0) return <div style={{ height: '40px' }} />;
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    const points = data.map((v, i) => `${(i * 100) / (data.length - 1)},${40 - ((v - min) * 35) / range}`).join(' ');

    return (
        <svg className="mini-chart" viewBox="0 0 100 40" preserveAspectRatio="none" style={{ width: '100%', height: '40px', overflow: 'visible' }}>
            <polyline points={points} fill="none" stroke={color} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
        </svg>
    );
};

const SvgChart = ({ hist, fore, up, lo, compareData = null }) => {
    const histData = hist || [];
    const foreData = fore || [];
    const upData = up || [];
    const loData = lo || [];

    const all = [...histData, ...foreData, ...(compareData ? [...compareData.hist, ...compareData.fore] : [])];
    const filteredAll = all.filter(v => !isNaN(v));
    const maxVal = Math.max(...filteredAll, ...upData.filter(v => !isNaN(v))) * 1.2 || 100;

    const totalPoints = Math.max(histData.length + foreData.length, (compareData ? compareData.hist.length + compareData.fore.length : 0));
    const w = 800, h = 350, pTop = 30, pBottom = 50, pSides = 60;

    const gX = i => pSides + (i * (w - 2 * pSides) / Math.max(1, totalPoints - 1));
    const gY = v => h - pBottom - (v * (h - pTop - pBottom) / maxVal);

    const renderLine = (data, startIdx, color, dashed = false) => {
        if (!data || data.length < 2) return null;
        const p = data.map((v, i) => `${gX(startIdx + i)},${gY(v)}`).join(' ');
        return <polyline points={p} fill="none" stroke={color} strokeWidth="3" strokeDasharray={dashed ? "6,6" : "0"} strokeLinecap="round" strokeLinejoin="round" />;
    };

    return (
        <div style={{ width: '100%', height: '350px', background: 'rgba(0,0,0,0.02)', borderRadius: '16px', overflow: 'hidden', position: 'relative' }}>
            <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="100%" preserveAspectRatio="none">
                {[0, 0.25, 0.5, 0.75, 1].map(f => {
                    const y = gY(maxVal * f / 1.2);
                    return (
                        <g key={f}>
                            <line x1={pSides} y1={y} x2={w - pSides} y2={y} stroke="var(--border-color)" strokeWidth="1" strokeDasharray="4,4" />
                            <text x={pSides - 10} y={y + 4} textAnchor="end" fontSize="10" fill="var(--text-muted)">{Math.round(maxVal * f / 1.2)}</text>
                        </g>
                    );
                })}

                {upData.length > 0 && loData.length > 0 && (
                    <polygon
                        points={[...upData.map((v, i) => `${gX(histData.length + i)},${gY(v)}`), ...loData.map((v, i) => `${gX(histData.length + (loData.length - 1 - i))},${gY(v)}`).reverse()].join(' ')}
                        fill="var(--primary)" opacity="0.1"
                    />
                )}

                {renderLine(histData, 0, "var(--primary)")}
                {foreData.length > 0 && renderLine([histData[histData.length - 1], ...foreData], histData.length - 1, "var(--secondary)", true)}

                {compareData && (
                    <>
                        {renderLine(compareData.hist, 0, "#f43f5e")}
                        {renderLine([compareData.hist[compareData.hist.length - 1], ...compareData.fore], compareData.hist.length - 1, "#f43f5e", true)}
                    </>
                )}
            </svg>

            <div style={{ position: 'absolute', bottom: '10px', left: '60px', display: 'flex', gap: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-muted)' }}>
                    <div style={{ width: '12px', height: '3px', background: 'var(--primary)' }} /> Historic
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-muted)' }}>
                    <div style={{ width: '12px', height: '3px', background: 'var(--secondary)', borderBottom: '2px dashed var(--secondary)' }} /> Forecast
                </div>
                {compareData && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-muted)' }}>
                        <div style={{ width: '12px', height: '3px', background: '#f43f5e' }} /> Comparison
                    </div>
                )}
            </div>
        </div>
    );
};

export default function Dashboard({ data, skus, globalStats, reset }) {
    const [loading, setLoading] = useState(false);
    const [horizon, setHorizon] = useState(data ? data.forecast.length : 30);
    const [showTable, setShowTable] = useState(false);
    const [compareSku, setCompareSku] = useState('');
    const [compareData, setCompareData] = useState(null);
    const [localData, setLocalData] = useState(data);

    const updateForecast = async (h, skuOverride = null) => {
        setLoading(true);
        try {
            const r = await fetch('http://localhost:8000/forecast', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sku: skuOverride || localData.sku, forecast_days: h })
            });
            const res = await r.json();
            if (skuOverride) { setLoading(false); return res; }
            setLocalData(res);
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    const [liveSkus, setLiveSkus] = useState(skus || []);
    const [liveStats, setLiveStats] = useState(globalStats || null);

    useEffect(() => {
        if (!data && (!skus || skus.length === 0)) {
            fetch('http://localhost:8000/skus')
                .then(r => r.json())
                .then(d => {
                    if (d.skus) setLiveSkus(d.skus);
                    if (d.global_stats) setLiveStats(d.global_stats);
                })
                .catch(console.error);
        } else {
            setLiveSkus(skus);
            setLiveStats(globalStats);
        }
    }, [skus, data, globalStats]);

    const handleCompare = async (sku) => {
        if (!sku) { setCompareSku(''); setCompareData(null); return; }
        const res = await updateForecast(horizon, sku);
        if (!localData) {
            setLocalData(res);
            setCompareSku('');
        } else {
            setCompareSku(sku);
            setCompareData({ hist: res.historical, fore: res.forecast });
        }
    };

    if (!localData) return (
        <div className="fade-in">
            <div className="summary-overview">
                <div className="summary-card">
                    <div className="summary-label">Total SKUs Tracked</div>
                    <div className="summary-value">{liveStats?.total_skus || liveSkus.length || 0}</div>
                </div>
                <div className="summary-card">
                    <div className="summary-label">Total Sales (30D)</div>
                    <div className="summary-value">{(liveStats?.total_sales_30d || 0).toLocaleString()}</div>
                </div>
                <div className="summary-card">
                    <div className="summary-label">System Status</div>
                    <div className="summary-value" style={{ color: liveSkus.length ? 'var(--success)' : 'var(--accent)' }}>
                        {liveSkus.length ? 'Ready' : 'No Data'}
                    </div>
                </div>
            </div>

            <div className="main-card" style={{ textAlign: 'center', padding: '5rem 2rem' }}>
                <div style={{ fontSize: '4rem', marginBottom: '1.5rem' }}>📊</div>
                <h1 style={{ marginBottom: '1rem' }}>Intelligence Engine Ready</h1>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '2.5rem', maxWidth: '500px', margin: '0 auto 2.5rem' }}>
                    Please select an SKU to begin detailed demand analysis and stock-out prevention.
                </p>

                {liveSkus.length > 0 && (
                    <div style={{ maxWidth: '340px', margin: '0 auto' }}>
                        <select className="input-group" onChange={e => handleCompare(e.target.value)} style={{ width: '100%', marginBottom: '2rem' }}>
                            <option value="">Choose an SKU...</option>
                            {liveSkus.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                )}

                {!liveSkus.length && (
                    <button className="btn-primary" onClick={reset}>Go to Data Upload</button>
                )}
            </div>
        </div>
    );

    return (
        <div className="fade-in">
            <div className="summary-overview">
                <div className="summary-card">
                    <div className="summary-label">SKU Tracking</div>
                    <div className="summary-value">{localData.sku || 'N/A'}</div>
                </div>
                <div className="summary-card">
                    <div className="summary-label">Model Accuracy</div>
                    <div className="summary-value" style={{ color: 'var(--success)' }}>
                        <CountUp end={localData.accuracy} suffix="%" />
                    </div>
                </div>
                <div className="summary-card">
                    <div className="summary-label">Risk Exposure</div>
                    <div className="summary-value" style={{
                        color: localData.risk === 'Critical' ? 'var(--accent)' :
                            localData.risk === 'High' ? '#f59e0b' :
                                localData.risk === 'Moderate' ? 'var(--secondary)' : 'var(--text-primary)'
                    }}>
                        {localData.risk || 'Low'}
                    </div>
                </div>
            </div>

            <div className="main-card">
                <div className="card-header">
                    <div>
                        <h2 style={{ background: 'linear-gradient(135deg, var(--primary), var(--secondary))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', display: 'inline-block' }}>Demand Analysis</h2>
                    </div>
                    <div className="toggle-group">
                        {[7, 30, 90].map(h => (
                            <button key={h} className={`toggle-btn ${horizon === h ? 'active' : ''}`} onClick={() => { setHorizon(h); updateForecast(h); }}>{h}D</button>
                        ))}
                    </div>
                </div>

                <div className="dashboard-grid">
                    <div className="svg-chart-container">
                        {loading ? <div style={{ height: '350px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Thinking...</div> : (
                            <SvgChart
                                hist={localData.historical.slice(-30)}
                                fore={localData.forecast}
                                up={localData.upper_ci}
                                lo={localData.lower_ci}
                                compareData={compareData}
                            />
                        )}

                        <div className="metrics-grid">
                            <div className="metric-card"><div className="summary-label">Expected Sales ({horizon}D)</div><div className="summary-value" style={{ color: 'var(--primary)' }}><CountUp end={localData.forecast.reduce((a, b) => a + b, 0)} /></div></div>
                            <div className="metric-card"><div className="summary-label">Daily Demand</div><div className="summary-value"><CountUp end={localData.avg_demand} /></div></div>
                            <div className="metric-card"><div className="summary-label">Reorder Pt</div><div className="summary-value"><CountUp end={localData.reorder_point} /></div></div>
                            <div className="metric-card"><div className="summary-label">Safety Stock</div><div className="summary-value"><CountUp end={localData.safety_stock} /></div></div>
                        </div>
                    </div>

                    <div className="sidebar-panels" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div className="summary-card">
                            <div className="summary-label">Stock-out Health</div>
                            <div className="progress-bar-bg" style={{ marginBottom: '0.5rem' }}>
                                <div className="progress-bar-fill" style={{
                                    width: `${localData.health_pct}%`,
                                    background: localData.health_pct < 30 ? 'var(--accent)' :
                                        localData.health_pct < 70 ? '#f59e0b' : 'linear-gradient(90deg, var(--primary), var(--secondary))',
                                    transition: 'width 1s cubic-bezier(0.19, 1, 0.22, 1)'
                                }} />
                            </div>
                            <div style={{ textAlign: 'right', fontWeight: '800', fontSize: '1.2rem' }}>
                                <CountUp end={localData.health_pct} suffix="%" />
                            </div>
                        </div>

                        <div className="summary-card">
                            <div className="summary-label">AI Components</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div><div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: '700' }}>TREND</div><MiniChart data={localData.trend_line} /></div>
                                <div><div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: '700' }}>SEASONALITY</div><MiniChart data={localData.seasonal_line} color="var(--secondary)" /></div>
                            </div>
                        </div>

                        <div className="summary-card">
                            <div className="summary-label">SKU Comparison</div>
                            <select value={compareSku} onChange={e => handleCompare(e.target.value)} style={{ width: '100%', padding: '0.5rem', background: 'none', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>
                                <option value="">Select SKU...</option>
                                {liveSkus.filter(s => s !== localData.sku).map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                <div style={{ background: localData.should_restock ? 'rgba(244, 63, 94, 0.1)' : 'rgba(16, 185, 129, 0.1)', padding: '2rem', borderRadius: '20px', marginTop: '3rem', borderLeft: `6px solid ${localData.should_restock ? 'var(--accent)' : 'var(--success)'}` }}>
                    <h3 style={{ color: localData.should_restock ? 'var(--accent)' : 'var(--success)', marginBottom: '0.5rem' }}>{localData.should_restock ? 'Critical Inventory Alert' : 'Healthy Inventory Status'}</h3>
                    <p style={{ fontWeight: '500', opacity: 0.9 }}>{localData.recommendation}</p>
                </div>

                <div style={{ marginTop: '3rem', display: 'flex', gap: '1rem' }}>
                    <button className="btn-primary" onClick={() => setShowTable(!showTable)} style={{ background: 'var(--card-bg)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', boxShadow: 'none' }}>
                        {showTable ? 'Hide Intelligence Table' : 'Show Detailed Data'}
                    </button>
                    <button className="btn-primary" onClick={() => window.print()}>Export Executive PDF</button>
                </div>

                {showTable && (
                    <div className="fade-in" style={{ marginTop: '2rem', overflow: 'hidden', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead style={{ background: 'rgba(0,0,0,0.02)' }}>
                                <tr><th style={{ padding: '1rem' }}>Period</th><th style={{ padding: '1rem' }}>Demand Units</th><th style={{ padding: '1rem' }}>State</th></tr>
                            </thead>
                            <tbody>
                                {localData.historical.slice(-14).map((v, i) => (
                                    <tr key={i} style={{ borderTop: '1px solid var(--border-color)' }}>
                                        <td style={{ padding: '1rem' }}>Day -{14 - i}</td>
                                        <td style={{ padding: '1rem', fontWeight: '700' }}>{v}</td>
                                        <td style={{ padding: '1rem' }}><span className="badge" style={{ background: 'var(--border-color)', color: 'var(--text-secondary)' }}>SAMPLED</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
