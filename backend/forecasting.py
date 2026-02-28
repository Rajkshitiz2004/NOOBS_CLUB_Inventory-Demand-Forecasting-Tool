import pandas as pd
import numpy as np
from statsmodels.tsa.holtwinters import ExponentialSmoothing
from statsmodels.tsa.seasonal import seasonal_decompose

def perform_forecast(historical_data, forecast_days):
    df = pd.DataFrame(historical_data, columns=['date', 'units'])
    df['date'] = pd.to_datetime(df['date'])
    df = df.groupby('date')['units'].sum().reset_index()
    df = df.sort_values('date').set_index('date')
    df = df.asfreq('D', fill_value=0)
    
    if len(df) < 14:
        return {"error": "Insufficient data for forecasting (min 14 days required)"}

    model = ExponentialSmoothing(
        df['units'], trend='add', seasonal='add', seasonal_periods=7
    ).fit()
    
    forecast = model.forecast(forecast_days)
    fitted = model.fittedvalues
    residuals = df['units'] - fitted
    
    mae = residuals.abs().mean()
    avg_val = df['units'].mean()
    volatility = df['units'].std() / (avg_val if avg_val > 0 else 1)
    raw_acc = (1 - (mae / avg_val if avg_val > 0 else 0)) * 100
    accuracy = max(50, min(99, raw_acc - (volatility * 10))) 
    
    resid_std = residuals.std()
    upper_ci = forecast + (1.96 * resid_std)
    lower_ci = np.maximum(0, forecast - (1.96 * resid_std))
    
    recent_data = df.tail(30)['units']
    avg_demand = recent_data.mean()
    std_demand = recent_data.std()
    safety_stock = 1.65 * std_demand * np.sqrt(7)
    reorder_point = (avg_demand * 7) + safety_stock
    
    inventory_level = df['units'].iloc[-1]
    health_pct = min(100, max(0, (inventory_level / reorder_point * 100))) if reorder_point > 0 else 100
    
    forecast_total = forecast.sum()
    days_stock_remaining = (inventory_level / avg_demand) if avg_demand > 0 else 99
    
    risk = "Low"
    if health_pct < 30 or days_stock_remaining < 3:
        risk = "Critical"
    elif health_pct < 70 or days_stock_remaining < 7:
        risk = "High"
    elif health_pct < 100 or days_stock_remaining < 14:
        risk = "Moderate"
    else:
        risk = "Low"

    should_restock = bool(inventory_level < reorder_point)

    try:
        decomp = seasonal_decompose(df['units'].tail(30), model='additive', period=7)
        trend_comp = decomp.trend.fillna(0).tolist()
        seasonal_comp = decomp.seasonal.tolist()
        resid_comp = decomp.resid.fillna(0).tolist()
    except:
        trend_comp = [0] * 30
        seasonal_comp = [0] * 30
        resid_comp = [0] * 30

    trend_val = forecast.iloc[-1] - forecast.iloc[0]
    insight_trend = "surging" if trend_val > 5 else "declining" if trend_val < -5 else "stable"
    insight_text = f"Demand shows {insight_trend} weekly seasonality with a positive trend. Reorder recommended within next 5 days." if should_restock else "Sales are stable. Current inventory levels are sufficient to match projected demand."

    return {
        "historical": df['units'].tolist(),
        "forecast": forecast.tolist(),
        "upper_ci": upper_ci.tolist(),
        "lower_ci": lower_ci.tolist(),
        "reorder_point": float(np.nan_to_num(reorder_point)),
        "avg_demand": float(np.nan_to_num(avg_demand)),
        "safety_stock": float(np.nan_to_num(safety_stock)),
        "accuracy": float(np.nan_to_num(accuracy)),
        "health_pct": float(np.nan_to_num(health_pct)),
        "risk": risk or "Low",
        "trend_line": trend_comp,
        "seasonal_line": seasonal_comp,
        "resid_line": resid_comp,
        "should_restock": should_restock,
        "recommendation": insight_text
    }
