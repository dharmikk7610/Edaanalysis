import pandas as pd
import numpy as np
import re
from app.services.visualizations import generate_plot
from app.services.insights import generate_ai_insights

def to_markdown_custom(sub_df: pd.DataFrame, include_index: bool = False) -> str:
    """
    Custom pure-Python markdown table builder for DataFrames.
    Bypasses the 'tabulate' optional pandas dependency.
    """
    cols = list(sub_df.columns)
    if include_index:
        header = "| Index | " + " | ".join(cols) + " |\n"
        sep = "| --- | " + " | ".join(["---"] * len(cols)) + " |\n"
    else:
        header = "| " + " | ".join(cols) + " |\n"
        sep = "| " + " | ".join(["---"] * len(cols)) + " |\n"
        
    rows_str = ""
    for idx, row in sub_df.iterrows():
        elements = [str(x).replace('|', '\\|') for x in row]
        if include_index:
            rows_str += f"| **{idx}** | " + " | ".join(elements) + " |\n"
        else:
            rows_str += "| " + " | ".join(elements) + " |\n"
    return header + sep + rows_str

def answer_dataset_query(df: pd.DataFrame, session_id: str, query: str) -> dict:
    """
    Interprets a natural language query about the dataset and computes the answer.
    Returns a dictionary with 'answer' (markdown), 'type' (text/table/chart), and optional payloads.
    """
    q_lower = query.lower().strip()
    
    # 1. Helper to find columns from query text
    def find_column_in_query(text: str):
        sorted_cols = sorted(df.columns, key=len, reverse=True)
        for col in sorted_cols:
            pattern = re.compile(r'\b' + re.escape(str(col).lower()) + r'\b')
            if pattern.search(text):
                return col
        for col in sorted_cols:
            if str(col).lower() in text:
                return col
        return None

    def find_all_columns_in_query(text: str):
        found = []
        sorted_cols = sorted(df.columns, key=len, reverse=True)
        for col in sorted_cols:
            pattern = re.compile(r'\b' + re.escape(str(col).lower()) + r'\b')
            if pattern.search(text) and col not in found:
                found.append(col)
        return found

    # 2. INTENT PATTERNS MATCHING

    # A. Top / Head records
    match_top = re.search(r'(show|display|get|print)?\s*(top|first|head|preview)\s*(\d+)?\s*(records|rows|lines|data)?', q_lower)
    if match_top or "preview" in q_lower or "rows" in q_lower and ("show" in q_lower or "display" in q_lower):
        n = 10
        if match_top and match_top.group(3):
            n = int(match_top.group(3))
        
        sub = df.head(n)
        markdown_table = to_markdown_custom(sub, include_index=False)
        return {
            "answer": f"Here are the top **{n}** records of the dataset:\n\n{markdown_table}",
            "type": "table",
            "table_data": sub.replace({np.nan: None}).to_dict(orient="records")
        }

    # B. Average / Mean query
    if "average" in q_lower or "mean" in q_lower:
        col = find_column_in_query(q_lower)
        if col:
            if pd.api.types.is_numeric_dtype(df[col]):
                val = df[col].mean()
                return {
                    "answer": f"The average (mean) of **'{col}'** is **{val:,.2f}**.",
                    "type": "text"
                }
            else:
                return {
                    "answer": f"The column **'{col}'** is categorical ({str(df[col].dtype)}). Averages can only be computed on numerical columns.",
                    "type": "text"
                }
        else:
            num_cols = df.select_dtypes(include=[np.number]).columns
            if len(num_cols) > 0:
                summary_df = df[num_cols].mean().to_frame("Average")
                summary = to_markdown_custom(summary_df, include_index=True)
                return {
                    "answer": f"Here are the average values for all numerical features in the dataset:\n\n{summary}",
                    "type": "table"
                }

    # C. Missing values / nulls
    if "missing" in q_lower or "null" in q_lower or "nan" in q_lower:
        if "most" in q_lower or "highest" in q_lower or "worst" in q_lower:
            null_series = df.isna().sum()
            max_col = null_series.idxmax()
            max_val = null_series.max()
            if max_val == 0:
                return {
                    "answer": "Great news! **There are no missing values** anywhere in this dataset.",
                    "type": "text"
                }
            return {
                "answer": f"The column with the most missing values is **'{max_col}'** with **{max_val:,} missing cells** ({max_val/len(df)*100:.1f}% of its records).",
                "type": "text"
            }
        else:
            null_series = df.isna().sum()
            null_cols = null_series[null_series > 0]
            if len(null_cols) == 0:
                return {
                    "answer": "This dataset is fully complete. **No columns contain missing values**.",
                    "type": "text"
                }
            summary = null_cols.to_frame("Missing Count").copy()
            summary["Percentage"] = (summary["Missing Count"] / len(df) * 100).round(2).astype(str) + "%"
            return {
                "answer": f"Here is the missing values audit for all columns containing null cells:\n\n{to_markdown_custom(summary, include_index=True)}",
                "type": "table"
            }

    # D. Maximum / Highest query
    if "highest" in q_lower or "maximum" in q_lower or "max" in q_lower or "largest" in q_lower:
        cols_found = find_all_columns_in_query(q_lower)
        if len(cols_found) >= 2:
            cat_col = None
            num_col = None
            for col in cols_found:
                if pd.api.types.is_numeric_dtype(df[col]):
                    num_col = col
                else:
                    cat_col = col
            
            if cat_col and num_col:
                agg = df.groupby(cat_col)[num_col].sum().sort_values(ascending=False).to_frame(f"Total {num_col}")
                top_name = agg.index[0]
                top_val = agg.iloc[0, 0]
                
                return {
                    "answer": f"The **'{cat_col}'** with the highest cumulative **'{num_col}'** is **'{top_name}'** with a total of **{top_val:,.2f}**.\n\nHere is the top ranking:\n\n{to_markdown_custom(agg.head(5), include_index=True)}",
                    "type": "table"
                }
        
        col = find_column_in_query(q_lower)
        if col:
            if pd.api.types.is_numeric_dtype(df[col]):
                max_val = df[col].max()
                idx = df[col].idxmax()
                row_desc = ""
                text_cols = df.select_dtypes(exclude=[np.number]).columns
                if len(text_cols) > 0:
                    row_desc = f" (associated with '{text_cols[0]}' = '{df.loc[idx, text_cols[0]]}')"
                
                return {
                    "answer": f"The maximum value of **'{col}'** is **{max_val:,.2f}**{row_desc}.",
                    "type": "text"
                }

    # E. Highly correlated
    if "correlat" in q_lower:
        num_cols = df.select_dtypes(include=[np.number]).columns
        if len(num_cols) < 2:
            return {
                "answer": "Correlation analysis requires at least 2 numerical features in the dataset.",
                "type": "text"
            }
        
        corr_matrix = df[num_cols].corr()
        strong_pairs = []
        for i in range(len(num_cols)):
            for j in range(i+1, len(num_cols)):
                c1, c2 = num_cols[i], num_cols[j]
                val = corr_matrix.loc[c1, c2]
                if pd.notna(val) and abs(val) > 0.5:
                    strong_pairs.append((c1, c2, val))
        
        strong_pairs.sort(key=lambda x: abs(x[2]), reverse=True)
        if not strong_pairs:
            return {
                "answer": "There are no strongly correlated features (r > 0.50) in this dataset.",
                "type": "text"
            }
        
        table_rows = "| Feature 1 | Feature 2 | Correlation (r) | Strength |\n| :--- | :--- | :--- | :--- |\n"
        for c1, c2, val in strong_pairs[:8]:
            strength = "Strong Positive" if val > 0.75 else "Moderate Positive" if val > 0.5 else "Moderate Negative" if val < -0.5 else "Strong Negative"
            table_rows += f"| **{c1}** | **{c2}** | {val:.4f} | {strength} |\n"
            
        return {
            "answer": f"Here are the strongest linear relationships in your dataset:\n\n{table_rows}",
            "type": "table"
        }

    # F. Generate / plot chart
    if "plot" in q_lower or "chart" in q_lower or "graph" in q_lower or "histogram" in q_lower:
        cols_found = find_all_columns_in_query(q_lower)
        x_axis = cols_found[0] if len(cols_found) > 0 else df.columns[0]
        y_axis = cols_found[1] if len(cols_found) > 1 else None
        
        chart_type = "histogram"
        if "scatter" in q_lower:
            chart_type = "scatter"
        elif "box" in q_lower:
            chart_type = "box"
        elif "bar" in q_lower:
            chart_type = "bar"
        elif "line" in q_lower:
            chart_type = "line"
        elif "heatmap" in q_lower or "correlation" in q_lower:
            chart_type = "correlation_heatmap"
        elif "missing" in q_lower:
            chart_type = "missing_value_heatmap"
            x_axis = None
            y_axis = None
            
        img_b64 = generate_plot(df, chart_type, x=x_axis, y=y_axis)
        
        desc = f"I have generated a **{chart_type.upper().replace('_', ' ')}** "
        if x_axis:
            desc += f"for **'{x_axis}'**"
            if y_axis:
                desc += f" vs **'{y_axis}'**"
        
        return {
            "answer": f"{desc}. You can view the rendered plot below.",
            "type": "chart",
            "chart_image": img_b64
        }

    # G. Which column should be removed
    if "remove" in q_lower or "drop" in q_lower or "delete" in q_lower:
        constant_cols = [col for col in df.columns if df[col].nunique(dropna=True) <= 1]
        null_series = df.isna().sum()
        high_null_cols = null_series[null_series / len(df) > 0.8].index.tolist()
        
        recs = []
        if constant_cols:
            recs.append(f"- **Constant columns**: {', '.join(constant_cols)} (contain only 1 unique value and hold no variance).")
        if high_null_cols:
            recs.append(f"- **High missingness**: {', '.join(high_null_cols)} (contain over 80% missing cells).")
            
        if recs:
            return {
                "answer": "Based on statistical analysis, the following columns are redundant and should be removed:\n\n" + "\n".join(recs),
                "type": "text"
            }
        else:
            return {
                "answer": "All columns contain meaningful variance and low missingness ratios. **No columns are recommended for removal** at this time.",
                "type": "text"
            }

    # H. Explain / Summarize / Insights
    if "explain" in q_lower or "summarize" in q_lower or "summary" in q_lower or "insight" in q_lower or "recommend" in q_lower:
        insights = generate_ai_insights(df)
        
        if "insight" in q_lower:
            text = f"### Key Business Insights\n\n{insights['sections']['trend_analysis']}\n\n### Relationships & Correlations\n\n{insights['sections']['top_correlations']}"
        elif "recommend" in q_lower:
            text = f"### Data Cleaning Recommendations\n\n{insights['sections']['recommendations']}"
        else:
            text = insights["markdown"]
            
        return {
            "answer": text,
            "type": "text"
        }

    return {
        "answer": f"I couldn't match a specific statistics command for your query: *\"{query}\"*. \n\n"
                  f"**Try asking questions like:**\n"
                  f"- *\"What is the average of {df.columns[0]}?\"*\n"
                  f"- *\"Which column has the most missing values?\"*\n"
                  f"- *\"Show the first 5 records\"*\n"
                  f"- *\"Generate a histogram for {df.columns[0]}\"*",
        "type": "text"
    }
