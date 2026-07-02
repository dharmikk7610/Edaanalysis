import pandas as pd
import numpy as np

def calculate_quality_score(df: pd.DataFrame) -> dict:
    """
    Computes a Data Quality Score out of 100 and returns
    stars rating, status label, and a list of improving suggestions.
    """
    total_rows = len(df)
    total_cols = len(df.columns)
    
    if total_rows == 0 or total_cols == 0:
        return {
            "score": 0,
            "stars": 0,
            "label": "Empty Dataset",
            "suggestions": ["Upload a non-empty dataset to start analysis."]
        }

    total_cells = total_rows * total_cols
    missing_cells = int(df.isna().sum().sum())
    missing_ratio = (missing_cells / total_cells) * 100
    
    duplicate_rows = int(df.duplicated().sum())
    duplicate_ratio = (duplicate_rows / total_rows) * 100
    
    empty_cols = [col for col in df.columns if df[col].isna().all()]
    constant_cols = [col for col in df.columns if df[col].nunique(dropna=True) <= 1]
    
    # Simple outlier estimation (IQR based)
    outliers_count = 0
    numeric_cols = df.select_dtypes(include=[np.number]).columns
    for col in numeric_cols:
        col_series = df[col].dropna()
        if len(col_series) >= 3:
            q1 = col_series.quantile(0.25)
            q3 = col_series.quantile(0.75)
            iqr = q3 - q1
            low = q1 - 1.5 * iqr
            high = q3 + 1.5 * iqr
            outliers_count += ((col_series < low) | (col_series > high)).sum()
            
    outliers_ratio = (outliers_count / total_cells) * 100 if total_cells > 0 else 0

    # Score calculation logic
    # Deductions:
    # 1. Missing cells: max 30 points
    deduct_missing = min(30.0, missing_ratio * 1.5)
    # 2. Duplicates: max 20 points
    deduct_duplicates = min(20.0, duplicate_ratio * 2.0)
    # 3. Empty columns: 10 points per empty col, max 15 points
    deduct_empty_cols = min(15.0, len(empty_cols) * 7.5)
    # 4. Constant columns: 5 points per col, max 15 points
    deduct_constant_cols = min(15.0, len(constant_cols) * 5.0)
    # 5. Outliers: max 20 points
    deduct_outliers = min(20.0, outliers_ratio * 3.0)

    total_deduction = deduct_missing + deduct_duplicates + deduct_empty_cols + deduct_constant_cols + deduct_outliers
    score = max(0, min(100, int(round(100 - total_deduction))))

    # Map score to label & stars
    if score >= 90:
        label = "Excellent"
        stars = 5
    elif score >= 75:
        label = "Good"
        stars = 4
    elif score >= 50:
        label = "Fair"
        stars = 3
    elif score >= 30:
        label = "Needs Review"
        stars = 2
    else:
        label = "Poor"
        stars = 1

    # Suggestions list compiler
    suggestions = []
    if duplicate_rows > 0:
        suggestions.append({
            "code": "duplicates",
            "text": f"Remove duplicate rows: Found {duplicate_rows:,} duplicate records ({duplicate_ratio:.1f}% of dataset).",
            "impact": "Improves data storage efficiency and prevents bias in analysis."
        })
    if len(empty_cols) > 0:
        suggestions.append({
            "code": "empty_cols",
            "text": f"Drop empty columns: Identified {len(empty_cols)} completely blank variables ({', '.join(empty_cols[:3])}{'...' if len(empty_cols) > 3 else ''}).",
            "impact": "Cleans up column namespace and reduces memory consumption."
        })
    if missing_cells > 0:
        suggestions.append({
            "code": "missing_values",
            "text": f"Impute missing values: Found {missing_cells:,} missing cells ({missing_ratio:.2f}% of total dataset cells).",
            "impact": "Allows variables to be fully plotted and utilized in modeling."
        })
    if outliers_count > 0:
        suggestions.append({
            "code": "outliers",
            "text": f"Handle outliers: Detected {outliers_count:,} outlier values in numerical fields ({outliers_ratio:.2f}% of cells).",
            "impact": "Stabilizes descriptive metrics (mean, std dev) and linear predictions."
        })
    if len(constant_cols) > len(empty_cols):
        # constant columns that are NOT empty
        constants_only = [c for c in constant_cols if c not in empty_cols]
        if constants_only:
            suggestions.append({
                "code": "constant_cols",
                "text": f"Remove constant columns: Identified {len(constants_only)} columns with only 1 unique value ({', '.join(constants_only[:3])}{'...' if len(constants_only) > 3 else ''}).",
                "impact": "Prunes features that hold no variance and provide no modeling value."
            })
            
    # Check date column casting
    non_date_time_names = [col for col in df.columns if ('date' in col.lower() or 'time' in col.lower()) and not pd.api.types.is_datetime64_any_dtype(df[col])]
    if non_date_time_names:
        suggestions.append({
            "code": "date_casting",
            "text": f"Convert datetime columns: Columns like {', '.join(non_date_time_names[:3])} contain date keywords but are stored as text.",
            "impact": "Enables continuous time-series plotting and window functions."
        })

    if not suggestions:
        suggestions.append({
            "code": "none",
            "text": "Your dataset is perfectly clean! No suggestions needed.",
            "impact": "Ready for production models."
        })

    return {
        "score": score,
        "stars": stars,
        "label": label,
        "suggestions": suggestions
    }
