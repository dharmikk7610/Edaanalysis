import pandas as pd
import numpy as np

def detect_outliers(df: pd.DataFrame, method: str = "iqr", threshold: float = 1.5) -> dict:
    """
    Detects outliers in all numeric columns of a DataFrame.
    Returns a dictionary with summary statistics and per-column outlier masks/counts.
    """
    numeric_cols = df.select_dtypes(include=[np.number]).columns
    report = {
        "method": method,
        "threshold": threshold,
        "total_outlier_rows": 0,
        "outlier_percentage": 0.0,
        "affected_columns": {},
        "summary": []
    }

    if len(df) == 0 or len(numeric_cols) == 0:
        return report

    # Keep track of row indices that contain at least one outlier
    outlier_row_indices = set()
    total_rows = len(df)

    for col in numeric_cols:
        col_series = df[col].dropna()
        if len(col_series) < 3:
            continue

        col_outliers = pd.Series(False, index=df.index)

        if method == "iqr":
            q1 = col_series.quantile(0.25)
            q3 = col_series.quantile(0.75)
            iqr = q3 - q1
            lower_bound = q1 - threshold * iqr
            upper_bound = q3 + threshold * iqr
            
            # Mask for all values (including those that were NaN, which are not outliers)
            outlier_mask = (df[col] < lower_bound) | (df[col] > upper_bound)
            # Filter to keep only those which are not NaN
            outlier_mask = outlier_mask & df[col].notna()
        
        elif method == "zscore":
            mean = col_series.mean()
            std = col_series.std()
            if std == 0:
                continue
            z_scores = (df[col] - mean) / std
            outlier_mask = z_scores.abs() > threshold
            outlier_mask = outlier_mask & df[col].notna()
        
        else:
            continue

        outlier_indices = df.index[outlier_mask].tolist()
        outlier_count = len(outlier_indices)
        
        if outlier_count > 0:
            outlier_row_indices.update(outlier_indices)
            percentage = (outlier_count / total_rows) * 100
            
            report["affected_columns"][col] = {
                "count": outlier_count,
                "percentage": round(percentage, 2),
                "indices": outlier_indices[:200]  # limit indices returned to UI to avoid bloating
            }
            
            report["summary"].append({
                "column": col,
                "outlier_count": outlier_count,
                "outlier_percentage": round(percentage, 2),
                "min_value": float(col_series.min()),
                "max_value": float(col_series.max())
            })

    total_outlier_count = len(outlier_row_indices)
    report["total_outlier_rows"] = total_outlier_count
    report["outlier_percentage"] = round((total_outlier_count / total_rows) * 100, 2)
    
    return report

def remove_outliers_from_dataset(df: pd.DataFrame, method: str = "iqr", threshold: float = 1.5, target_cols: list[str] = None) -> tuple[pd.DataFrame, int]:
    """
    Removes rows containing outliers in the specified target_cols (or all numeric columns if None).
    Returns the cleaned DataFrame and the number of rows removed.
    """
    numeric_cols = df.select_dtypes(include=[np.number]).columns
    if target_cols:
        cols_to_check = [col for col in target_cols if col in numeric_cols]
    else:
        cols_to_check = numeric_cols

    if len(df) == 0 or len(cols_to_check) == 0:
        return df, 0

    initial_row_count = len(df)
    outlier_mask = pd.Series(False, index=df.index)

    for col in cols_to_check:
        col_series = df[col].dropna()
        if len(col_series) < 3:
            continue

        if method == "iqr":
            q1 = col_series.quantile(0.25)
            q3 = col_series.quantile(0.75)
            iqr = q3 - q1
            lower_bound = q1 - threshold * iqr
            upper_bound = q3 + threshold * iqr
            col_outlier_mask = (df[col] < lower_bound) | (df[col] > upper_bound)
            col_outlier_mask = col_outlier_mask & df[col].notna()
            
        elif method == "zscore":
            mean = col_series.mean()
            std = col_series.std()
            if std == 0:
                continue
            z_scores = (df[col] - mean) / std
            col_outlier_mask = z_scores.abs() > threshold
            col_outlier_mask = col_outlier_mask & df[col].notna()
        else:
            continue

        outlier_mask = outlier_mask | col_outlier_mask

    cleaned_df = df[~outlier_mask]
    removed_rows_count = initial_row_count - len(cleaned_df)
    
    return cleaned_df, removed_rows_count
