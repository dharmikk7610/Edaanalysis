import pandas as pd
import numpy as np

def generate_eda_report(df: pd.DataFrame) -> dict:
    """
    Computes statistical data and dataset summaries for the EDA dashboard.
    """
    total_rows = len(df)
    total_cols = len(df.columns)
    
    # 1. Dataset Overview
    memory_usage_bytes = int(df.memory_usage(deep=True).sum())
    memory_usage_str = f"{memory_usage_bytes / 1024:.2f} KB" if memory_usage_bytes < 1024 * 1024 else f"{memory_usage_bytes / (1024 * 1024):.2f} MB"
    
    missing_cells = int(df.isna().sum().sum())
    total_cells = total_rows * total_cols
    missing_percentage = round((missing_cells / total_cells) * 100, 2) if total_cells > 0 else 0.0
    
    duplicate_rows = int(df.duplicated().sum())
    duplicate_percentage = round((duplicate_rows / total_rows) * 100, 2) if total_rows > 0 else 0.0

    overview = {
        "rows": total_rows,
        "columns": total_cols,
        "memory_usage": memory_usage_str,
        "memory_bytes": memory_usage_bytes,
        "missing_cells": missing_cells,
        "missing_percentage": missing_percentage,
        "duplicate_rows": duplicate_rows,
        "duplicate_percentage": duplicate_percentage
    }

    # 2. Columns Metadata & Details
    columns_info = []
    for col in df.columns:
        col_series = df[col]
        dtype = str(col_series.dtype)
        null_count = int(col_series.isna().sum())
        null_pct = round((null_count / total_rows) * 100, 2) if total_rows > 0 else 0.0
        unique_count = int(col_series.nunique())
        
        col_type = "Text"
        if pd.api.types.is_numeric_dtype(col_series):
            col_type = "Numeric"
        elif pd.api.types.is_datetime64_any_dtype(col_series):
            col_type = "DateTime"
        elif pd.api.types.is_bool_dtype(col_series):
            col_type = "Boolean"

        col_data = {
            "name": col,
            "dtype": dtype,
            "type": col_type,
            "missing_count": null_count,
            "missing_percentage": null_pct,
            "unique_values": unique_count,
        }

        # Add statistical details if numeric
        if col_type == "Numeric" and len(col_series.dropna()) > 0:
            clean_series = col_series.dropna()
            mode_series = clean_series.mode()
            mode_val = float(mode_series[0]) if not mode_series.empty else np.nan
            
            col_data["stats"] = {
                "mean": float(clean_series.mean()),
                "median": float(clean_series.median()),
                "mode": mode_val,
                "variance": float(clean_series.var()) if len(clean_series) > 1 else 0.0,
                "std_dev": float(clean_series.std()) if len(clean_series) > 1 else 0.0,
                "min": float(clean_series.min()),
                "max": float(clean_series.max()),
                "q1": float(clean_series.quantile(0.25)),
                "q3": float(clean_series.quantile(0.75)),
                "skewness": float(clean_series.skew()) if len(clean_series) > 2 else 0.0,
                "kurtosis": float(clean_series.kurt()) if len(clean_series) > 2 else 0.0
            }
        elif col_type == "Text" or col_type == "Boolean":
            clean_series = col_series.dropna()
            if len(clean_series) > 0:
                mode_series = clean_series.mode()
                mode_val = str(mode_series[0]) if not mode_series.empty else "N/A"
                mode_freq = int(clean_series.value_counts().iloc[0]) if not clean_series.empty else 0
                col_data["stats"] = {
                    "mode": mode_val,
                    "mode_frequency": mode_freq,
                    "mode_percentage": round((mode_freq / len(clean_series)) * 100, 2)
                }

        columns_info.append(col_data)

    # 3. Correlation Matrix & Covariance Matrix (Numeric Columns only)
    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    correlation_matrix = []
    covariance_matrix = []
    
    if len(numeric_cols) > 0:
        # Fill NA temporarily with mean for correlation calculation to avoid blank results
        df_numeric = df[numeric_cols].fillna(df[numeric_cols].mean())
        
        corr_df = df_numeric.corr()
        cov_df = df_numeric.cov()
        
        # Format as list of dicts for frontend rendering
        # E.g. [{"x": "ColA", "y": "ColB", "value": 0.8}, ...]
        for col_y in numeric_cols:
            for col_x in numeric_cols:
                val_corr = corr_df.loc[col_y, col_x]
                val_cov = cov_df.loc[col_y, col_x]
                correlation_matrix.append({
                    "x": col_x,
                    "y": col_y,
                    "value": 0.0 if pd.isna(val_corr) else round(float(val_corr), 4)
                })
                covariance_matrix.append({
                    "x": col_x,
                    "y": col_y,
                    "value": 0.0 if pd.isna(val_cov) else round(float(val_cov), 4)
                })

    return {
        "overview": overview,
        "columns": columns_info,
        "numeric_columns": numeric_cols,
        "correlation_matrix": correlation_matrix,
        "covariance_matrix": covariance_matrix
    }
