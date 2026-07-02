import pandas as pd
import numpy as np

def generate_cleaning_recommendations(df: pd.DataFrame) -> list[dict]:
    """
    Analyzes the dataframe and returns a checklist of suggested cleaning operations.
    Each item has: id, title, description, checked, and action metadata.
    """
    recs = []
    total_rows = len(df)

    # 1. Duplicates
    dup_count = df.duplicated().sum()
    if dup_count > 0:
        recs.append({
            "id": "remove_duplicates",
            "title": "Remove Duplicate Rows",
            "description": f"Deduplicate {dup_count} identical records ({dup_count/total_rows*100:.1f}% of dataset).",
            "checked": True,
            "category": "Redundancy"
        })

    # 2. Duplicate columns check
    cols = df.columns
    duplicated_cols = []
    for i in range(len(cols)):
        for j in range(i + 1, len(cols)):
            if cols[j] not in duplicated_cols and df[cols[i]].equals(df[cols[j]]):
                duplicated_cols.append(cols[j])
    if duplicated_cols:
        recs.append({
            "id": "remove_duplicate_cols",
            "title": f"Remove Duplicate Columns",
            "description": f"Drop redundant duplicated features: {', '.join(duplicated_cols)}.",
            "checked": True,
            "category": "Redundancy"
        })

    # 3. Missing values per column
    for col in df.columns:
        null_count = df[col].isna().sum()
        if null_count > 0:
            null_pct = (null_count / total_rows) * 100
            
            # Suggest strategy based on data type and skew
            if pd.api.types.is_numeric_dtype(df[col]):
                skew = df[col].skew()
                strategy = "Median" if abs(skew) > 1.0 else "Mean"
                desc = f"Fill {null_count} missing cells ({null_pct:.1f}%) in '{col}' with column {strategy.lower()}."
            else:
                strategy = "Mode"
                desc = f"Fill {null_count} missing cells ({null_pct:.1f}%) in '{col}' with most frequent category (mode)."
                
            recs.append({
                "id": f"fill_missing_{col}",
                "title": f"Fill Missing '{col}' Values",
                "description": desc,
                "checked": True,
                "category": "Imputation",
                "column": col,
                "strategy": strategy.lower()
            })

    # 4. Outliers
    numeric_cols = df.select_dtypes(include=[np.number]).columns
    outlier_cols = []
    for col in numeric_cols:
        col_series = df[col].dropna()
        if len(col_series) >= 3:
            q1 = col_series.quantile(0.25)
            q3 = col_series.quantile(0.75)
            iqr = q3 - q1
            low = q1 - 1.5 * iqr
            high = q3 + 1.5 * iqr
            c_out = ((col_series < low) | (col_series > high)).sum()
            if c_out > 0:
                outlier_cols.append((col, c_out))
                
    if outlier_cols:
        outliers_desc = ", ".join([f"'{c}' ({n} values)" for c, n in outlier_cols[:3]])
        if len(outlier_cols) > 3:
            outliers_desc += " and others"
        recs.append({
            "id": "remove_outliers",
            "title": "Remove Extreme Outliers",
            "description": f"Drop statistical anomalies from: {outliers_desc} using IQR (1.5x) method.",
            "checked": False,
            "category": "Distribution"
        })

    # 5. Datetime columns check
    non_date_time_names = [col for col in df.columns if ('date' in col.lower() or 'time' in col.lower()) and not pd.api.types.is_datetime64_any_dtype(df[col])]
    if non_date_time_names:
        recs.append({
            "id": "convert_dates",
            "title": "Convert Date Columns to DateTime",
            "description": f"Cast text date columns {', '.join(non_date_time_names[:2])} to DateTime format.",
            "checked": True,
            "category": "Schema"
        })

    # 6. Constant columns check
    constant_cols = [col for col in df.columns if df[col].nunique(dropna=True) <= 1]
    if constant_cols:
        recs.append({
            "id": "remove_constant_cols",
            "title": "Remove Constant Columns",
            "description": f"Remove {', '.join(constant_cols[:2])} since they have no variance.",
            "checked": True,
            "category": "Pruning"
        })

    # 7. Unwanted symbols check (currencies/commas)
    symbol_cols = []
    import re
    for col in df.columns:
        if df[col].dtype == 'object':
            sample = df[col].dropna().head(10).astype(str)
            if len(sample) > 0 and all(re.match(r'^\s*[-+]?[\d,\.\$\s%€£¥]+\s*$', val) for val in sample):
                symbol_cols.append(col)
    if symbol_cols:
        recs.append({
            "id": "clean_symbols",
            "title": "Clean Formatted Numbers",
            "description": f"Strip currency symbols, commas, percent signs from: {', '.join(symbol_cols[:2])} to convert them to numbers.",
            "checked": True,
            "category": "Schema"
        })

    # 8. Scaling suggestion
    if len(numeric_cols) > 0:
        recs.append({
            "id": "normalize_numeric",
            "title": "Normalize Numerical Features",
            "description": "Standardize numerical variables to have mean=0 and variance=1 to help model convergence.",
            "checked": False,
            "category": "Engineering"
        })

    return recs

def generate_graph_recommendations(df: pd.DataFrame) -> list[dict]:
    """
    Analyzes the columns and metadata to suggest the 4-6 most appropriate visualizations.
    Returns a list of recommendations, each having: type, title, x, y, hue, and reason.
    """
    recs = []
    
    # Identify column categories
    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    categorical_cols = df.select_dtypes(exclude=[np.number]).columns.tolist()
    
    # 1. Date/Time Series Column suggestion
    date_col = None
    for col in df.columns:
        if pd.api.types.is_datetime64_any_dtype(df[col]):
            date_col = col
            break
    if not date_col:
        for col in df.columns:
            if 'date' in col.lower() or 'time' in col.lower():
                date_col = col
                break
                
    if date_col and len(numeric_cols) > 0:
        target_num = numeric_cols[0]
        recs.append({
            "type": "time_series",
            "title": f"Time Series Trend: '{date_col}' vs '{target_num}'",
            "x": date_col,
            "y": target_num,
            "hue": None,
            "reason": "Plotting numeric features over a temporal axis highlights chronological trends, spikes, and seasonal behaviors."
        })

    # 2. Categorical distribution (Bar / Count Plot)
    if len(categorical_cols) > 0:
        cat_col = categorical_cols[0]
        recs.append({
            "type": "bar",
            "title": f"Categorical Distribution of '{cat_col}'",
            "x": cat_col,
            "y": None,
            "hue": None,
            "reason": "A bar chart highlights category distribution frequencies and helps spot class imbalances."
        })

    # 3. Numeric Distribution suggestion
    if len(numeric_cols) > 0:
        num_col = numeric_cols[0]
        recs.append({
            "type": "distribution_plot",
            "title": f"Numerical Distribution of '{num_col}'",
            "x": num_col,
            "y": None,
            "hue": None,
            "reason": "The combination of a histogram and Kernel Density Estimation (KDE) reveals skewness, kurtosis, and modal peaks."
        })

    # 4. Correlation Heatmap suggestion
    if len(numeric_cols) >= 2:
        recs.append({
            "type": "correlation_heatmap",
            "title": "Linear Correlation Matrix (Heatmap)",
            "x": None,
            "y": None,
            "hue": None,
            "reason": "A correlation matrix displays positive and negative linear Pearson R factors between numeric variables."
        })

        # Scatter Plot relationship suggestion
        recs.append({
            "type": "scatter",
            "title": f"Scatter Plot: '{numeric_cols[0]}' vs '{numeric_cols[1]}'",
            "x": numeric_cols[0],
            "y": numeric_cols[1],
            "hue": categorical_cols[0] if len(categorical_cols) > 0 else None,
            "reason": "A scatter plot plots bivariate values, exposing outliers, non-linear patterns, or category-grouped clustering."
        })

    # 5. Outliers Comparative Boxplot suggestion
    if len(numeric_cols) > 0:
        recs.append({
            "type": "boxplot_outliers",
            "title": "Standardized Outlier Boxplot comparison",
            "x": None,
            "y": None,
            "hue": None,
            "reason": "Standardizing columns to Z-Scores and displaying them as comparative boxplots reveals extreme variance outliers."
        })

    return recs
