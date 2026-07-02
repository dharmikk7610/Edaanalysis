import matplotlib
matplotlib.use('Agg')  # Non-interactive backend, thread-safe
import matplotlib.pyplot as plt
import seaborn as sns
import io
import base64
import pandas as pd
import numpy as np
import missingno as msno

# Setup styling
plt.rcParams['figure.facecolor'] = '#ffffff'
plt.rcParams['axes.facecolor'] = '#ffffff'
plt.rcParams['font.sans-serif'] = 'Arial'
plt.rcParams['font.family'] = 'sans-serif'
plt.rcParams['text.color'] = '#1e293b'
plt.rcParams['axes.labelcolor'] = '#1e293b'
plt.rcParams['xtick.color'] = '#475569'
plt.rcParams['ytick.color'] = '#475569'

# Tailwind colors for graphing
THEME_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f43f5e']

def get_base64_img():
    """Converts the current matplotlib figure to a base64 encoded PNG string."""
    buf = io.BytesIO()
    plt.savefig(buf, format='png', bbox_inches='tight', dpi=120)
    plt.close('all')
    buf.seek(0)
    img_b64 = base64.b64encode(buf.read()).decode('utf-8')
    return f"data:image/png;base64,{img_b64}"

def generate_plot(df: pd.DataFrame, plot_type: str, x: str = None, y: str = None, hue: str = None) -> str:
    """
    Generates a Seaborn/Matplotlib plot based on the request parameters.
    Returns a Base64 encoded PNG image URI.
    """
    plt.figure(figsize=(10, 6))
    sns.set_theme(style="whitegrid", rc={"axes.facecolor": "#fafaf9", "figure.facecolor": "#ffffff"})
    
    # Avoid crash on empty dataframe
    if len(df) == 0:
        plt.text(0.5, 0.5, "Empty Dataset", ha='center', va='center', fontsize=14)
        return get_base64_img()

    try:
        # 1. Bar Chart
        if plot_type == "bar":
            if not x:
                x = df.columns[0]
            # If x is high cardinality categorical, take top 15 categories to avoid overcrowding
            if df[x].nunique() > 15:
                top_cats = df[x].value_counts().head(15).index
                plot_df = df[df[x].isin(top_cats)]
                title = f"Bar Chart: Top 15 categories of '{x}'"
            else:
                plot_df = df
                title = f"Bar Chart: '{x}'"
                
            if y:
                sns.barplot(data=plot_df, x=x, y=y, hue=hue, palette="viridis" if hue else THEME_COLORS)
                title += f" vs '{y}'"
            else:
                sns.countplot(data=plot_df, x=x, hue=hue, palette="viridis" if hue else THEME_COLORS)
                title += " count"
            plt.xticks(rotation=45, ha='right')
            plt.title(title, fontsize=14, fontweight='bold', pad=15)

        # 2. Line Chart
        elif plot_type == "line":
            if not x:
                x = df.columns[0]
            if not y:
                # find first numeric column
                numeric_cols = df.select_dtypes(include=[np.number]).columns
                y = numeric_cols[0] if len(numeric_cols) > 0 else df.columns[-1]
            
            # Sort by x if it's a date or numeric to make line plot coherent
            plot_df = df.copy()
            try:
                plot_df = plot_df.sort_values(by=x)
            except Exception:
                pass
                
            sns.lineplot(data=plot_df, x=x, y=y, hue=hue, marker='o', palette="viridis" if hue else THEME_COLORS)
            plt.xticks(rotation=45, ha='right')
            plt.title(f"Line Chart: '{x}' vs '{y}'", fontsize=14, fontweight='bold', pad=15)

        # 3. Histogram
        elif plot_type == "histogram":
            target = x if x else (df.select_dtypes(include=[np.number]).columns[0] if len(df.select_dtypes(include=[np.number]).columns) > 0 else df.columns[0])
            sns.histplot(data=df, x=target, hue=hue, kde=True, palette="viridis" if hue else THEME_COLORS)
            plt.title(f"Histogram of '{target}'", fontsize=14, fontweight='bold', pad=15)

        # 4. Pie Chart
        elif plot_type == "pie":
            target = x if x else df.select_dtypes(exclude=[np.number]).columns[0]
            val_counts = df[target].value_counts()
            if len(val_counts) > 10:
                # Group other categories
                top_vals = val_counts.head(9)
                other_sum = val_counts.iloc[9:].sum()
                top_vals['Other'] = other_sum
                val_counts = top_vals
            
            plt.pie(val_counts, labels=val_counts.index, autopct='%1.1f%%', startangle=90, colors=sns.color_palette("pastel"))
            plt.title(f"Distribution of '{target}'", fontsize=14, fontweight='bold', pad=15)

        # 5. Scatter Plot
        elif plot_type == "scatter":
            numeric_cols = df.select_dtypes(include=[np.number]).columns
            x_target = x if x else (numeric_cols[0] if len(numeric_cols) > 0 else df.columns[0])
            y_target = y if y else (numeric_cols[1] if len(numeric_cols) > 1 else df.columns[-1])
            
            sns.scatterplot(data=df, x=x_target, y=y_target, hue=hue, palette="viridis" if hue else THEME_COLORS, alpha=0.8)
            plt.title(f"Scatter Plot: '{x_target}' vs '{y_target}'", fontsize=14, fontweight='bold', pad=15)

        # 6. Box Plot
        elif plot_type == "box":
            numeric_cols = df.select_dtypes(include=[np.number]).columns
            y_target = y if y else (numeric_cols[0] if len(numeric_cols) > 0 else df.columns[0])
            x_target = x  # Optional categorical grouping
            
            sns.boxplot(data=df, x=x_target, y=y_target, hue=hue, palette="Set3")
            if x_target:
                plt.xticks(rotation=45, ha='right')
            plt.title(f"Box Plot: '{y_target}'" + (f" grouped by '{x_target}'" if x_target else ""), fontsize=14, fontweight='bold', pad=15)

        # 7. Heatmap (Correlation or Custom Pivoted data)
        elif plot_type == "heatmap":
            numeric_cols = df.select_dtypes(include=[np.number]).columns
            if len(numeric_cols) > 1:
                corr_matrix = df[numeric_cols].corr()
                sns.heatmap(corr_matrix, annot=True, cmap="coolwarm", fmt=".2f", linewidths=0.5)
                plt.title("Correlation Heatmap", fontsize=14, fontweight='bold', pad=15)
            else:
                plt.text(0.5, 0.5, "Heatmap requires at least 2 numeric columns", ha='center', va='center')

        # 8. Count Plot
        elif plot_type == "count":
            target = x if x else df.columns[0]
            if df[target].nunique() > 25:
                # top categories
                top_cats = df[target].value_counts().head(20).index
                plot_df = df[df[target].isin(top_cats)]
                plt.title(f"Count Plot: Top 20 of '{target}'", fontsize=14, fontweight='bold', pad=15)
            else:
                plot_df = df
                plt.title(f"Count Plot: '{target}'", fontsize=14, fontweight='bold', pad=15)
                
            sns.countplot(data=plot_df, x=target, hue=hue, palette="viridis" if hue else THEME_COLORS)
            plt.xticks(rotation=45, ha='right')

        # 9. Pair Plot
        elif plot_type == "pair":
            numeric_cols = df.select_dtypes(include=[np.number]).columns
            # Restrict columns to avoid crash/timeout on large datasets
            target_cols = list(numeric_cols[:4])
            if len(target_cols) >= 2:
                # Pairplot uses multiple subplots, adjust size
                plt.close()
                g = sns.pairplot(df[target_cols + ([hue] if hue and hue in df.columns else [])], hue=hue, palette="viridis" if hue else THEME_COLORS)
                g.fig.suptitle("Pair Plot Matrix", fontsize=16, fontweight='bold', y=1.02)
                # Save and return immediately since we recreated the figure
                buf = io.BytesIO()
                g.savefig(buf, format='png', bbox_inches='tight', dpi=120)
                plt.close('all')
                buf.seek(0)
                img_b64 = base64.b64encode(buf.read()).decode('utf-8')
                return f"data:image/png;base64,{img_b64}"
            else:
                plt.text(0.5, 0.5, "Pair Plot requires at least 2 numeric columns", ha='center', va='center')

        # 10. Violin Plot
        elif plot_type == "violin":
            numeric_cols = df.select_dtypes(include=[np.number]).columns
            y_target = y if y else (numeric_cols[0] if len(numeric_cols) > 0 else df.columns[0])
            x_target = x  # Optional grouping variable
            
            sns.violinplot(data=df, x=x_target, y=y_target, hue=hue, split=True if hue else False, palette="muted")
            if x_target:
                plt.xticks(rotation=45, ha='right')
            plt.title(f"Violin Plot: '{y_target}' distribution" + (f" by '{x_target}'" if x_target else ""), fontsize=14, fontweight='bold', pad=15)

        # 11. Density Plot (KDE Plot)
        elif plot_type == "density":
            target = x if x else (df.select_dtypes(include=[np.number]).columns[0] if len(df.select_dtypes(include=[np.number]).columns) > 0 else df.columns[0])
            sns.kdeplot(data=df, x=target, hue=hue, fill=True, palette="viridis" if hue else THEME_COLORS, alpha=0.5)
            plt.title(f"Density Plot: '{target}'", fontsize=14, fontweight='bold', pad=15)

        # 12. Area Chart
        elif plot_type == "area":
            if not x:
                x = df.columns[0]
            if not y:
                numeric_cols = df.select_dtypes(include=[np.number]).columns
                y = numeric_cols[0] if len(numeric_cols) > 0 else df.columns[-1]
            
            plot_df = df.copy()
            try:
                plot_df = plot_df.sort_values(by=x)
            except Exception:
                pass
                
            plt.fill_between(plot_df[x].astype(str), plot_df[y], alpha=0.4, color='#3b82f6')
            plt.plot(plot_df[x].astype(str), plot_df[y], color='#2563eb', alpha=0.8)
            plt.xticks(rotation=45, ha='right')
            plt.title(f"Area Chart: '{x}' vs '{y}'", fontsize=14, fontweight='bold', pad=15)

        # 13. Correlation Heatmap
        elif plot_type == "correlation_heatmap":
            numeric_cols = df.select_dtypes(include=[np.number]).columns
            if len(numeric_cols) > 1:
                corr_matrix = df[numeric_cols].corr()
                sns.heatmap(corr_matrix, annot=True, cmap="coolwarm", fmt=".2f", linewidths=0.5, vmin=-1, vmax=1)
                plt.title("Correlation Heatmap", fontsize=14, fontweight='bold', pad=15)
            else:
                plt.text(0.5, 0.5, "Correlation Heatmap requires at least 2 numeric columns", ha='center', va='center')

        # 14. Distribution Plot
        elif plot_type == "distribution_plot":
            target = x if x else (df.select_dtypes(include=[np.number]).columns[0] if len(df.select_dtypes(include=[np.number]).columns) > 0 else df.columns[0])
            sns.displot(data=df, x=target, hue=hue, kde=True, palette="viridis" if hue else THEME_COLORS, aspect=1.5, height=5)
            # displot returns a FacetGrid, adjust title and capture
            g = plt.gcf()
            g.suptitle(f"Distribution Plot: '{target}'", fontsize=14, fontweight='bold', y=1.02)
            buf = io.BytesIO()
            plt.savefig(buf, format='png', bbox_inches='tight', dpi=120)
            plt.close('all')
            buf.seek(0)
            img_b64 = base64.b64encode(buf.read()).decode('utf-8')
            return f"data:image/png;base64,{img_b64}"

        # 15. Missing Value Heatmap
        elif plot_type == "missing_value_heatmap":
            if df.isna().sum().sum() > 0:
                # Draw missingno heatmap
                plt.close()
                ax = msno.heatmap(df, figsize=(10, 6), fontsize=10, labels=True, cmap="Blues")
                plt.title("Missing Value Correlation Heatmap", fontsize=14, fontweight='bold', pad=25)
                buf = io.BytesIO()
                plt.savefig(buf, format='png', bbox_inches='tight', dpi=120)
                plt.close('all')
                buf.seek(0)
                img_b64 = base64.b64encode(buf.read()).decode('utf-8')
                return f"data:image/png;base64,{img_b64}"
            else:
                plt.text(0.5, 0.5, "No missing values found in the dataset!", ha='center', va='center', fontsize=14, color='green')

        # 16. Boxplot for Outliers
        elif plot_type == "boxplot_outliers":
            numeric_cols = df.select_dtypes(include=[np.number]).columns
            if len(numeric_cols) > 0:
                # scale numeric columns slightly to fit them in one comparative plot
                scaled_df = df[numeric_cols].copy()
                for col in scaled_df.columns:
                    mean = scaled_df[col].mean()
                    std = scaled_df[col].std()
                    if std > 0:
                        scaled_df[col] = (scaled_df[col] - mean) / std
                
                # Limit to top 8 columns to avoid layout crush
                target_cols = scaled_df.columns[:8]
                sns.boxplot(data=scaled_df[target_cols], palette="Set2")
                plt.xticks(rotation=45, ha='right')
                plt.title("Standardized Columns Outlier Boxplot (Z-Scores Comparison)", fontsize=14, fontweight='bold', pad=15)
            else:
                plt.text(0.5, 0.5, "No numeric columns for outlier boxplot", ha='center', va='center')

        # 17. Categorical Analysis
        elif plot_type == "categorical_analysis":
            categorical_cols = df.select_dtypes(exclude=[np.number]).columns
            if len(categorical_cols) > 0:
                target = x if x else categorical_cols[0]
                val_counts = df[target].value_counts().head(10)
                sns.barplot(x=val_counts.values, y=val_counts.index.astype(str), palette="mako")
                plt.title(f"Top 10 Frequencies in Column '{target}'", fontsize=14, fontweight='bold', pad=15)
                plt.xlabel("Frequency Count")
            else:
                plt.text(0.5, 0.5, "No categorical columns found in the dataset", ha='center', va='center')

        # 18. Time Series Graph
        elif plot_type == "time_series":
            # Search for date column
            date_col = None
            for col in df.columns:
                if pd.api.types.is_datetime64_any_dtype(df[col]):
                    date_col = col
                    break
            
            if not date_col:
                # try to find string column with Date in its name
                for col in df.columns:
                    if 'date' in col.lower() or 'time' in col.lower():
                        date_col = col
                        break
            
            if date_col:
                # Try to cast to datetime if not already
                plot_df = df.copy()
                if not pd.api.types.is_datetime64_any_dtype(plot_df[date_col]):
                    plot_df[date_col] = pd.to_datetime(plot_df[date_col], errors='coerce')
                
                plot_df = plot_df.dropna(subset=[date_col]).sort_values(by=date_col)
                
                if y:
                    y_target = y
                else:
                    numeric_cols = plot_df.select_dtypes(include=[np.number]).columns
                    y_target = numeric_cols[0] if len(numeric_cols) > 0 else plot_df.columns[-1]
                
                # Resample or plot directly
                sns.lineplot(data=plot_df, x=date_col, y=y_target, hue=hue, palette="viridis" if hue else THEME_COLORS)
                plt.title(f"Time Series: '{date_col}' vs '{y_target}'", fontsize=14, fontweight='bold', pad=15)
                plt.xticks(rotation=45, ha='right')
            else:
                plt.text(0.5, 0.5, "Time Series requires a datetime column or column containing 'date' in its name", ha='center', va='center')

        else:
            plt.text(0.5, 0.5, f"Plot type '{plot_type}' not implemented yet.", ha='center', va='center')

    except Exception as e:
        plt.clf()
        plt.text(0.5, 0.5, f"Error generating chart: {str(e)}", ha='center', va='center', color='red', fontsize=12)

    return get_base64_img()
