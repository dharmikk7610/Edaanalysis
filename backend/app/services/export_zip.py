import io
import os
import zipfile
import base64
import pandas as pd
from app.services.pdf_report import create_pdf_report
from app.services.visualizations import generate_plot

def create_export_zip(df: pd.DataFrame, filename: str, target_col: str = None) -> bytes:
    """
    Creates an in-memory ZIP file containing:
      - cleaned.csv
      - cleaned.xlsx
      - eda_report.pdf
      - charts/correlation_heatmap.png
      - charts/missing_value_heatmap.png
      - charts/boxplot_outliers.png
      - charts/distribution_plot.png
    """
    base_name = os.path.splitext(filename)[0]
    zip_buffer = io.BytesIO()
    
    with zipfile.ZipFile(zip_buffer, "a", zipfile.ZIP_DEFLATED, False) as zip_file:
        # 1. Cleaned CSV
        csv_buffer = io.StringIO()
        df.to_csv(csv_buffer, index=False)
        zip_file.writestr(f"{base_name}_cleaned.csv", csv_buffer.getvalue())
        
        # 2. Cleaned Excel
        excel_buffer = io.BytesIO()
        with pd.ExcelWriter(excel_buffer, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name='Cleaned Data')
        excel_buffer.seek(0)
        zip_file.writestr(f"{base_name}_cleaned.xlsx", excel_buffer.getvalue())
        
        # 3. PDF Report
        pdf_bytes = create_pdf_report(df, target_col=target_col)
        zip_file.writestr(f"{base_name}_EDA_Report.pdf", pdf_bytes)
        
        # 4. Generate and package charts
        charts_to_generate = [
            ("correlation_heatmap", "charts/correlation_heatmap.png"),
            ("missing_value_heatmap", "charts/missing_value_heatmap.png"),
            ("boxplot_outliers", "charts/boxplot_outliers.png")
        ]
        
        # Add a distribution plot for the first numeric column
        numeric_cols = df.select_dtypes(include=['number']).columns
        if len(numeric_cols) > 0:
            charts_to_generate.append(("distribution_plot", "charts/feature_distribution.png"))
            
        for plot_type, zip_path in charts_to_generate:
            try:
                # generate_plot returns "data:image/png;base64,..."
                img_data = generate_plot(df, plot_type)
                if "base64," in img_data:
                    b64_str = img_data.split("base64,")[1]
                    img_bytes = base64.b64decode(b64_str)
                    zip_file.writestr(zip_path, img_bytes)
            except Exception:
                # If a plot fails, skip it silently to prevent crashing the whole download
                pass
                
    zip_buffer.seek(0)
    return zip_buffer.getvalue()
