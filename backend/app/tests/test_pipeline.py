import pandas as pd
import numpy as np
import sys
import os

# Adjust path to find the app module
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from app.services.data_cleaning import auto_clean_dataset
from app.services.outliers import detect_outliers, remove_outliers_from_dataset
from app.services.feature_engineering import apply_scaling, apply_encoding
from app.services.eda import generate_eda_report
from app.services.visualizations import generate_plot
from app.services.insights import generate_ai_insights
from app.services.pdf_report import create_pdf_report

# New service imports
from app.services.data_quality import calculate_quality_score
from app.services.recommendations import generate_cleaning_recommendations, generate_graph_recommendations
from app.services.chat_ai import answer_dataset_query
from app.services.export_zip import create_export_zip

def run_pipeline_test():
    print("====================================================")
    print("STARTING INSIGHTAI BACKEND PIPELINE VERIFICATION")
    print("====================================================")

    # 1. Construct dirty mock dataset
    print("[1/11] Generating mock dirty dataset...")
    data = {
        "Name": [" John Doe ", "Jane Smith", "Jane Smith", "Bob Jones", "Alice Cooper", "Charlie Brown", None],
        "Age": [28.0, 32.0, 32.0, 150.0, 19.0, np.nan, np.nan],  # Outlier 150, duplicate row, missing values
        "Salary": ["$50,000", "$60,000", "$60,000", "$15,000", "$200,000", "$45,000", None],  # Formatted text numbers, duplicate, missing
        "Join Date": ["2020-01-15", "2019-05-10", "2019-05-10", "2021-09-01", "2022-11-30", "2018-02-28", None],
        "Country": ["USA", "Canada", "Canada", "USA", "USA", "UK", None],
        "ConstantCol": [42, 42, 42, 42, 42, 42, None]  # Constant column
    }
    df = pd.DataFrame(data)
    print(f"Original shape: {df.shape}")

    # 2. Test Data Quality Score
    print("\n[2/11] Testing Data Quality Score calculation...")
    quality_res = calculate_quality_score(df)
    print(f"Original Quality Score: {quality_res['score']}/100 (Stars: {quality_res['stars']}, Label: {quality_res['label']})")
    print("Actionable Suggestions:")
    for sug in quality_res["suggestions"]:
        print(f" - [{sug['code'].upper()}] {sug['text']}")
    assert quality_res["score"] < 80, "Expected a lower quality score due to duplicates, nulls, and outliers"
    print("OK: Quality Score verification passed!")

    # 3. Test Recommendations
    print("\n[3/11] Testing Recommendations generation...")
    cleaning_recs = generate_cleaning_recommendations(df)
    graph_recs = generate_graph_recommendations(df)
    print(f"Generated {len(cleaning_recs)} Cleaning Recommendations:")
    for rec in cleaning_recs[:3]:
        print(f" - [{rec['category']}] {rec['title']}: {rec['description']}")
    print(f"Generated {len(graph_recs)} Graph Recommendations:")
    for rec in graph_recs[:3]:
        print(f" - Recommend '{rec['type']}' for: {rec['title']}")
        
    assert len(cleaning_recs) > 0, "Expected at least one cleaning recommendation"
    assert len(graph_recs) > 0, "Expected at least one graph recommendation"
    print("OK: Recommendations verification passed!")

    # 4. Test Automated Data Cleaning
    print("\n[4/11] Testing automated data cleaning service...")
    cleaning_options = {
        "remove_duplicates": True,
        "remove_duplicate_cols": True,
        "handle_missing": "auto",
        "remove_null_rows": True,
        "remove_empty_cols": True,
        "clean_text": True,
        "convert_types": True,
        "remove_constant_cols": True,
        "remove_unwanted_symbols": True,
        "corr_threshold": 0.90
    }
    cleaned_df, logs = auto_clean_dataset(df, cleaning_options)
    print(f"Cleaned shape: {cleaned_df.shape}")
    
    assert len(cleaned_df) == 5, f"Expected 5 rows, got {len(cleaned_df)}"
    assert "ConstantCol" not in cleaned_df.columns, "ConstantCol was not dropped"
    
    # Recalculate Quality Score after cleaning
    cleaned_quality = calculate_quality_score(cleaned_df)
    print(f"Cleaned Quality Score: {cleaned_quality['score']}/100 (Stars: {cleaned_quality['stars']}, Label: {cleaned_quality['label']})")
    assert cleaned_quality["score"] > quality_res["score"], "Quality score should improve after cleaning"
    print("OK: Cleaning verification passed!")

    # 5. Test Outlier Detection and Removal
    print("\n[5/11] Testing outlier detection and removal...")
    outlier_report = detect_outliers(cleaned_df, method="iqr", threshold=1.5)
    assert outlier_report["total_outlier_rows"] >= 1
    
    no_outliers_df, removed_count = remove_outliers_from_dataset(cleaned_df, method="iqr", threshold=1.5, target_cols=["Age"])
    print(f"Removed {removed_count} outlier rows. New shape: {no_outliers_df.shape}")
    assert removed_count == 2
    print("OK: Outliers verification passed!")

    # 6. Test Feature Engineering
    print("\n[6/11] Testing feature engineering scale & encode...")
    scaled_df, scale_logs = apply_scaling(no_outliers_df, ["Salary", "Age"], method="standardize")
    encoded_df, encode_logs = apply_encoding(scaled_df, ["Country"], method="label")
    print("OK: Feature engineering verification passed!")

    # 7. Test EDA Statistics
    print("\n[7/11] Testing EDA statistics calculations...")
    eda_data = generate_eda_report(no_outliers_df)
    assert eda_data["overview"]["rows"] == 3
    print("OK: EDA calculations verification passed!")

    # 8. Test Visualizations Generator
    print("\n[8/11] Testing visualizations (Matplotlib/Seaborn to Base64)...")
    scatter_b64 = generate_plot(no_outliers_df, "scatter", x="Age", y="Salary")
    assert scatter_b64.startswith("data:image/png;base64,")
    print("OK: Visualizations verification passed!")

    # 9. Test AI Insights
    print("\n[9/11] Testing AI Insights generation...")
    insights = generate_ai_insights(no_outliers_df, target_col="Salary")
    assert "markdown" in insights
    print("OK: AI Insights verification passed!")

    # 10. Test AI Scientist Conversational Chat
    print("\n[10/11] Testing AI Scientist chat answers...")
    # Test descriptive stats
    ans_avg = answer_dataset_query(no_outliers_df, "test_session", "what is the average Age?")
    print("Chat Answer (Avg Age):", ans_avg["answer"])
    assert "average" in ans_avg["answer"] or "mean" in ans_avg["answer"]
    
    # Test top records
    ans_top = answer_dataset_query(no_outliers_df, "test_session", "show top 3 rows")
    assert ans_top["type"] == "table"
    assert len(ans_top["table_data"]) == 3
    
    # Test plot chart
    ans_plot = answer_dataset_query(no_outliers_df, "test_session", "plot a histogram for Age")
    assert ans_plot["type"] == "chart"
    assert ans_plot["chart_image"].startswith("data:image/png;base64,")
    print("OK: AI Scientist Chat verification passed!")

    # 11. Test PDF and ZIP Report Exporters
    print("\n[11/11] Testing PDF and ZIP Report exporters...")
    pdf_bytes = create_pdf_report(no_outliers_df, target_col="Salary")
    assert len(pdf_bytes) > 1000
    
    zip_bytes = create_export_zip(no_outliers_df, "test_file.csv", target_col="Salary")
    print(f"Generated ZIP package size: {len(zip_bytes)} bytes")
    assert len(zip_bytes) > 5000, "ZIP packaging failed"
    print("OK: Export verifications passed!")

    print("\n====================================================")
    print("ALL PIPELINE VERIFICATIONS PASSED SUCCESSFULLY!")
    print("====================================================")

if __name__ == "__main__":
    run_pipeline_test()
