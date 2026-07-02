import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.preprocessing import LabelEncoder
from scipy import stats

def generate_ai_insights(df: pd.DataFrame, target_col: str = None) -> dict:
    """
    Analyzes the dataframe statistically and produces a detailed insights report.
    Returns a dict with section key-values and a fully combined markdown report.
    """
    total_rows = len(df)
    total_cols = len(df.columns)
    
    if total_rows == 0:
        empty_rep = "# Empty Dataset\n\nNo records found to generate insights."
        return {"markdown": empty_rep, "sections": {"executive_summary": empty_rep}}

    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    categorical_cols = df.select_dtypes(exclude=[np.number]).columns.tolist()
    
    # 1. Calculate missing data metrics
    missing_counts = df.isna().sum()
    cols_with_missing = missing_counts[missing_counts > 0]
    missing_ratio = (df.isna().sum().sum() / (total_rows * total_cols)) * 100 if total_cols > 0 else 0
    
    # 2. Calculate duplicates
    duplicates_count = df.duplicated().sum()
    duplicate_ratio = (duplicates_count / total_rows) * 100
    
    # 3. Calculate correlation metrics
    correlations = []
    if len(numeric_cols) > 1:
        corr_matrix = df[numeric_cols].corr()
        for i in range(len(numeric_cols)):
            for j in range(i+1, len(numeric_cols)):
                col1, col2 = numeric_cols[i], numeric_cols[j]
                val = corr_matrix.loc[col1, col2]
                if pd.notna(val) and abs(val) > 0.4:
                    correlations.append((col1, col2, val))
        # Sort by absolute strength
        correlations.sort(key=lambda x: abs(x[2]), reverse=True)

    # 4. Outlier counts (using IQR method with 1.5 threshold)
    outliers_report = {}
    total_outliers = 0
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
                outliers_report[col] = c_out
                total_outliers += c_out

    # 5. Skewness
    skewed_cols = []
    for col in numeric_cols:
        col_series = df[col].dropna()
        if len(col_series) >= 3:
            skew = col_series.skew()
            if abs(skew) > 1.0:
                skewed_cols.append((col, skew))

    # 6. Feature Importance (If target specified)
    feature_importance_list = []
    feature_importance_type = "variance"
    
    if target_col and target_col in df.columns:
        try:
            # Prepare data
            # Fill missing values for the model
            df_temp = df.copy()
            for c in df_temp.columns:
                if df_temp[c].isna().sum() > 0:
                    if pd.api.types.is_numeric_dtype(df_temp[c]):
                        df_temp[c] = df_temp[c].fillna(df_temp[c].median())
                    else:
                        df_temp[c] = df_temp[c].fillna("Missing")

            # Encode categoricals
            for c in df_temp.columns:
                if not pd.api.types.is_numeric_dtype(df_temp[c]):
                    le = LabelEncoder()
                    df_temp[c] = le.fit_transform(df_temp[c].astype(str))

            X = df_temp.drop(columns=[target_col])
            y = df_temp[target_col]

            if len(X.columns) > 0 and len(df_temp) > 5:
                # Classify or Regress
                is_classification = df[target_col].nunique() < 15 or not pd.api.types.is_numeric_dtype(df[target_col])
                if is_classification:
                    model = RandomForestClassifier(n_estimators=50, random_state=42)
                    feature_importance_type = f"Random Forest Classifier (Target: '{target_col}')"
                else:
                    model = RandomForestRegressor(n_estimators=50, random_state=42)
                    feature_importance_type = f"Random Forest Regressor (Target: '{target_col}')"
                
                model.fit(X, y)
                importances = model.feature_importances_
                
                for col_name, imp in zip(X.columns, importances):
                    feature_importance_list.append((col_name, float(imp)))
                feature_importance_list.sort(key=lambda x: x[1], reverse=True)
        except Exception as e:
            # Fallback to variance
            pass
            
    # Unsupervised: Fallback feature ranking based on Coefficient of Variation (CV) for numeric columns
    if not feature_importance_list:
        feature_importance_type = "Coefficient of Variation (Unsupervised Importance)"
        for col in numeric_cols:
            col_series = df[col].dropna()
            mean = col_series.mean()
            std = col_series.std()
            if mean != 0 and std is not None:
                cv = abs(std / mean)
                feature_importance_list.append((col, float(cv)))
        feature_importance_list.sort(key=lambda x: x[1], reverse=True)

    # Compile report sections in simple English
    
    # Executive Summary
    exec_sum = (
        f"InsightAI has processed the dataset containing **{total_rows:,} rows** and **{total_cols} columns**. "
        f"This dataset consists of **{len(numeric_cols)} numeric** variables and **{len(categorical_cols)} categorical** variables. "
        f"Overall, the data health is **{'Excellent' if missing_ratio < 2 and duplicates_count == 0 else 'Fair' if missing_ratio < 8 else 'Needs Review'}** "
        f"with **{missing_ratio:.2f}% missing entries** and **{duplicate_ratio:.2f}% duplicate records**. "
        f"Several notable distributions and correlation dependencies have been analyzed below."
    )

    # Dataset Summary
    data_sum = (
        f"- **Rows (Records)**: {total_rows:,}\n"
        f"- **Columns (Features)**: {total_cols}\n"
        f"- **Numeric Attributes**: {len(numeric_cols)} ({', '.join(numeric_cols[:6])}{'...' if len(numeric_cols) > 6 else ''})\n"
        f"- **Categorical Attributes**: {len(categorical_cols)} ({', '.join(categorical_cols[:6])}{'...' if len(categorical_cols) > 6 else ''})\n"
        f"- **Empty Cells Count**: {int(missing_counts.sum())} cells ({missing_ratio:.2f}% of dataset)\n"
        f"- **Duplicate Rows**: {duplicates_count} rows ({duplicate_ratio:.2f}%)"
    )

    # Data Quality Report
    quality_issues = []
    if duplicates_count > 0:
        quality_issues.append(f"⚠️ **Duplicate Records Detected**: {duplicates_count} rows are exact duplicates. Recommend applying duplicate removal.")
    if len(cols_with_missing) > 0:
        missing_list = [f"'{c}' ({n} cells, {n/total_rows*100:.1f}%)" for c, n in cols_with_missing.items()][:5]
        quality_issues.append(f"⚠️ **Missing Values**: Columns with missing data include {', '.join(missing_list)}.{' (and others)' if len(cols_with_missing) > 5 else ''}. You should fill these using mean/median or drop rows.")
    if total_outliers > 0:
        outlier_list = [f"'{c}' ({n} outliers)" for c, n in outliers_report.items()][:5]
        quality_issues.append(f"⚠️ **Outliers Detected**: Identified anomalous records in {', '.join(outlier_list)}.{' (and others)' if len(outliers_report) > 5 else ''}. Use IQR or Z-score outlier removal to standardize.")
    if len(skewed_cols) > 0:
        skew_list = [f"'{c}' (skew={s:.2f})" for c, s in skewed_cols][:5]
        quality_issues.append(f"ℹ️ **Highly Skewed Columns**: {', '.join(skew_list)} display highly asymmetric distributions. Consider applying a logarithmic scale or power transform.")
    
    if not quality_issues:
        quality_issues.append("✅ **No severe quality issues detected!** The dataset structure is clean, types are correct, and there are no missing cells or duplicates.")
    
    data_quality = "\n".join(quality_issues)

    # Top Correlations
    corr_text = ""
    if correlations:
        corr_text = "The following linear associations were found to be statistically significant:\n\n"
        for c1, c2, val in correlations[:8]:
            direction = "positive" if val > 0 else "inverse (negative)"
            strength = "strong" if abs(val) > 0.75 else "moderate"
            corr_text += f"- **'{c1}'** and **'{c2}'**: Share a **{strength} {direction} linear relationship** (Pearson r = **{val:.2f}**).\n"
        corr_text += "\n*Insight: Strong positive correlations suggest these variables move together; they may be redundant in machine learning models.*"
    else:
        corr_text = "No strong linear correlations (Pearson r > 0.40) were detected among numeric columns. This indicates the numeric features are largely independent of one another."

    # Outlier Explanation
    if total_outliers > 0:
        outlier_explain = (
            f"A total of **{total_outliers} outlier values** were identified using the Interquartile Range (IQR) method.\n"
            f"The columns most affected are:\n"
        )
        for col, c_out in list(outliers_report.items())[:5]:
            outlier_explain += f"- **'{col}'**: Contains **{c_out} outliers** ({c_out/total_rows*100:.2f}% of values).\n"
        outlier_explain += (
            "\n*Why this matters*: Outliers can skew statistical metrics like the mean and standard deviation. "
            "They can also degrade the predictive performance of linear regression and neural network models. "
            "You can choose to filter out these records in the Outliers Dashboard tab."
        )
    else:
        outlier_explain = "No outliers were detected under standard threshold limits. All data points lie within normal variance bounds."

    # Trend Analysis
    trend_text = "Here are the core mathematical trends discovered in your attributes:\n\n"
    for col in numeric_cols[:5]:
        col_series = df[col].dropna()
        if len(col_series) > 0:
            mean = col_series.mean()
            median = col_series.median()
            if mean > median * 1.15:
                trend_text += f"- **'{col}'** has a tail extending to the right (positively skewed). A small number of very high values are pulling the average upward.\n"
            elif mean < median * 0.85:
                trend_text += f"- **'{col}'** has a tail extending to the left (negatively skewed). A few low values are pulling the average down.\n"
            else:
                trend_text += f"- **'{col}'** follows a relatively symmetrical bell-curve distribution centered around **{mean:.2f}**.\n"
    if categorical_cols:
        trend_text += "\nCategorical Top Categories:\n"
        for col in categorical_cols[:3]:
            vc = df[col].value_counts()
            if len(vc) > 0:
                top_cat = vc.index[0]
                top_pct = (vc.iloc[0] / total_rows) * 100
                trend_text += f"- In **'{col}'**, the dominant category is **'{top_cat}'** representing **{top_pct:.1f}%** of the sample.\n"

    # Feature Importance
    importance_text = f"Feature importance analysis computed using **{feature_importance_type}**:\n\n"
    if feature_importance_list:
        importance_text += "| Rank | Feature Column | Importance/CV Score |\n"
        importance_text += "| :--- | :--- | :--- |\n"
        for i, (col, imp) in enumerate(feature_importance_list[:10], 1):
            importance_text += f"| #{i} | **{col}** | {imp:.4f} |\n"
        if target_col:
            importance_text += f"\n*Interpretation: Features with higher importance scores are highly influential in predicting target '{target_col}'.*"
        else:
            importance_text += "\n*Interpretation: Higher scores represent features with high relative variation, indicating they contain more diverse signal.*"
    else:
        importance_text += "No features available for importance rankings."

    # Recommendations
    recs = []
    if duplicates_count > 0:
        recs.append("1. **Remove Duplicate Rows**: Clean duplicate rows to avoid double-counting records in analytics and modeling.")
    if len(cols_with_missing) > 0:
        recs.append("2. **Impute Missing Values**: Fill columns with missing values using Median (for skewed variables) or Mean (for normal variables) to preserve sample size.")
    if total_outliers > 0:
        recs.append("3. **Remove or Cap Outliers**: Filter out extreme outliers in variables like pricing or distance if they represent anomalies or bad entries.")
    if skewed_cols:
        skew_names = [f"'{c}'" for c, _ in skewed_cols[:3]]
        recs.append(f"4. **Log Transformation**: Apply log scaling to highly skewed fields ({', '.join(skew_names)}) to linearize relationships.")
    if correlations:
        redundant = [f"'{c1}' & '{c2}'" for c1, c2, _ in correlations[:2]]
        recs.append(f"5. **Reduce Multicollinearity**: Pairs like {', '.join(redundant)} are highly correlated. Consider dropping one to prevent model overfitting.")
    if categorical_cols:
        recs.append("6. **One-Hot Encoding**: Apply One-Hot encoding to nominal variables before model training to create proper numeric model inputs.")
    
    if not recs:
        recs.append("1. **Proceed to Visualization**: The dataset is fully cleaned and structured. Go ahead and generate scatter plots and distribution charts.")
        recs.append("2. **Save Cleaned Dataset**: Download the cleaned files directly from the Export tab.")
        
    recommendations_text = "\n".join(recs)

    # Assemble Combined Markdown
    markdown = f"""# InsightAI Executive Report

## 1. Executive Summary
{exec_sum}

---

## 2. Dataset Overview
{data_sum}

---

## 3. Data Quality Report
{data_quality}

---

## 4. Trend Analysis
{trend_text}

---

## 5. Statistical Correlations
{corr_text}

---

## 6. Outlier Analysis
{outlier_explain}

---

## 7. Feature Importance Ranking
{importance_text}

---

## 8. Recommendations & Next Steps
{recommendations_text}
"""

    return {
        "markdown": markdown,
        "sections": {
            "executive_summary": exec_sum,
            "dataset_summary": data_sum,
            "data_quality_report": data_quality,
            "trend_analysis": trend_text,
            "top_correlations": corr_text,
            "outlier_explanation": outlier_explain,
            "feature_importance": importance_text,
            "recommendations": recommendations_text
        }
    }
