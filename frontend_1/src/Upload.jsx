import React, { useState } from 'react';

export default function Upload(props) {
    const { skus, setSkus, setData, setLoading, loading, onUploadComplete } = props;
    const [file, setFile] = useState(null);
    const [sku, setSku] = useState('');
    const [days, setDays] = useState(14);

    const onUpload = async () => {
        if (!file) return alert("Select a CSV file first");
        setLoading(true);
        const fd = new FormData(); fd.append('file', file);
        try {
            const r = await fetch('http://localhost:8000/upload', { method: 'POST', body: fd });
            const d = await r.json();
            if (r.ok) {
                setSkus(d.skus);
                if (onUploadComplete) onUploadComplete(d);
            }
            else alert(d.error || 'Upload failed');
        } catch (e) { alert('Backend not connected'); }
        setLoading(false);
    };

    const getForecast = async () => {
        if (!sku) return alert("Select an SKU");
        setLoading(true);
        try {
            const r = await fetch('http://localhost:8000/forecast', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sku, forecast_days: parseInt(days) })
            });
            const d = await r.json();
            if (r.ok) {
                d.sku = sku;
                setData(d);
            }
            else alert(d.error || 'Forecast failed');
        } catch (e) { alert('Forecast failed'); }
        setLoading(false);
    };

    return (
        <div className="fade-in">
            <div className="upload-hero">
                <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>AI-Powered Demand Intelligence</h1>
                <p style={{ color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto' }}>
                    Transform your messy spreadsheets into precise inventory forecasts with one click.
                </p>
            </div>

            <div className="dashboard-grid">
                <div className="main-card">
                    <div className="summary-label">Step 1: Ingest Data</div>
                    <div className="upload-zone" onClick={() => document.getElementById('csv-file').click()}>
                        <div style={{ fontSize: '3rem' }}>📂</div>
                        <div style={{ textAlign: 'center' }}>
                            <p style={{ fontWeight: '700' }}>{file ? file.name : 'Click to Upload CSV'}</p>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Supports: Date, SKU, Units_Sold</p>
                        </div>
                        <input id="csv-file" type="file" accept=".csv" hidden onChange={e => setFile(e.target.files[0])} />
                    </div>
                    <button className="btn-primary" onClick={onUpload} style={{ width: '100%', marginTop: '1.5rem' }} disabled={loading}>
                        {loading ? 'Processing...' : 'Analyze Historical Sales'}
                    </button>
                </div>

                {skus.length > 0 && (
                    <div className="main-card fade-in">
                        <div className="summary-label">Step 2: Generate Intelligence</div>
                        <div className="sku-selector-card">
                            <div className="input-group">
                                <label className="input-label">Target Inventory Point (SKU)</label>
                                <select value={sku} onChange={e => setSku(e.target.value)} style={{ width: '100%' }}>
                                    <option value="">Select an item...</option>
                                    {skus.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            <div className="input-group">
                                <label className="input-label">Forecast Horizon (Days)</label>
                                <input type="number" value={days} onChange={e => setDays(e.target.value)} style={{ width: '100%' }} />
                            </div>
                            <button className="btn-primary" onClick={getForecast} style={{ width: '100%', background: 'linear-gradient(135deg, var(--secondary), var(--primary))' }} disabled={loading}>
                                {loading ? 'Thinking...' : 'Compute AI Forecast'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
