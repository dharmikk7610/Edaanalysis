import os
import uuid
import io
import json
from datetime import datetime
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, Response
from pydantic import BaseModel
import pandas as pd
import numpy as np

# Import services
from app.services.data_cleaning import auto_clean_dataset
from app.services.outliers import detect_outliers, remove_outliers_from_dataset
from app.services.feature_engineering import apply_scaling, apply_encoding
from app.services.eda import generate_eda_report
from app.services.visualizations import generate_plot
from app.services.insights import generate_ai_insights
from app.services.pdf_report import create_pdf_report

# Import new enhanced services
from app.services.data_quality import calculate_quality_score
from app.services.recommendations import generate_cleaning_recommendations, generate_graph_recommendations
from app.services.chat_ai import answer_dataset_query
from app.services.export_zip import create_export_zip

app = FastAPI(title="InsightAI EDA Platform Backend", version="1.1.0")

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For local dev ease
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory dataset storage (session_id -> dict)
datasets_cache = {}

def get_session_df(session_id: str) -> pd.DataFrame:
    if session_id not in datasets_cache:
        raise HTTPException(status_code=404, detail="Dataset session not found. Please upload the file again.")
    return datasets_cache[session_id]["current"]

def set_session_df(session_id: str, df: pd.DataFrame, log_msg: str = None):
    if session_id not in datasets_cache:
        raise HTTPException(status_code=404, detail="Dataset session not found.")
    datasets_cache[session_id]["current"] = df
    if log_msg:
        datasets_cache[session_id]["cleaning_log"].append(log_msg)

def log_history_event(session_id: str, event: str, details: str):
    if session_id in datasets_cache:
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        datasets_cache[session_id]["history"].append({
            "time": now_str,
            "event": event,
            "details": details
        })

def prune_cache_if_needed():
    if len(datasets_cache) > 20:
        oldest_key = list(datasets_cache.keys())[0]
        del datasets_cache[oldest_key]

class CleaningOptions(BaseModel):
    session_id: str
    remove_duplicates: bool = True
    remove_duplicate_cols: bool = True
    handle_missing: str = "auto"
    remove_null_rows: bool = True
    remove_empty_cols: bool = True
    clean_text: bool = True
    convert_types: bool = True
    remove_constant_cols: bool = True
    remove_unwanted_symbols: bool = True
    corr_threshold: float = 0.90

class OutlierRequest(BaseModel):
    session_id: str
    method: str = "iqr"
    threshold: float = 1.5
    columns: list[str] | None = None
    action: str = "detect"

class ScalingRequest(BaseModel):
    session_id: str
    method: str = "standardize"
    columns: list[str]

class EncodingRequest(BaseModel):
    session_id: str
    method: str = "onehot"
    columns: list[str]

class ChatRequest(BaseModel):
    session_id: str
    query: str

@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    prune_cache_if_needed()
    
    filename = file.filename
    content = await file.read()
    file_extension = os.path.splitext(filename)[1].lower()
    
    try:
        if file_extension == '.csv':
            df = pd.read_csv(io.BytesIO(content))
        elif file_extension == '.txt':
            try:
                first_line = content[:1000].decode('utf-8', errors='ignore')
                sep = '\t' if '\t' in first_line else ',' if ',' in first_line else r'\s+'
                df = pd.read_csv(io.BytesIO(content), sep=sep, engine='python')
            except Exception:
                df = pd.read_csv(io.BytesIO(content), sep=',')
        elif file_extension in ['.xlsx', '.xls']:
            df = pd.read_excel(io.BytesIO(content))
        elif file_extension == '.json':
            try:
                df = pd.read_json(io.BytesIO(content))
            except Exception:
                data = json.loads(content.decode('utf-8'))
                if isinstance(data, dict):
                    df = pd.json_normalize(data)
                else:
                    df = pd.DataFrame(data)
        elif file_extension == '.xml':
            df = pd.read_xml(io.BytesIO(content))
        else:
            raise HTTPException(
                status_code=400, 
                detail=f"Unsupported file format '{file_extension}'."
            )
            
    except Exception as e:
        raise HTTPException(
            status_code=422,
            detail=f"Failed to parse data file: {str(e)}"
        )

    df = df.replace([np.inf, -np.inf], np.nan)
    
    session_id = str(uuid.uuid4())
    
    # Initialize history list
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    history = [
        {"time": now_str, "event": "Dataset Uploaded", "details": f"Loaded '{filename}' in-memory ({len(df):,} rows × {len(df.columns)} cols)."}
    ]
    
    datasets_cache[session_id] = {
        "original": df.copy(),
        "current": df.copy(),
        "filename": filename,
        "cleaning_log": ["File uploaded successfully."],
        "history": history
    }
    
    preview_data = df.head(100).replace({np.nan: None}).to_dict(orient="records")
    columns_list = list(df.columns)
    
    dtypes_map = {}
    for col in df.columns:
        if pd.api.types.is_numeric_dtype(df[col]):
            dtypes_map[col] = "Numeric"
        elif pd.api.types.is_datetime64_any_dtype(df[col]):
            dtypes_map[col] = "DateTime"
        else:
            dtypes_map[col] = "Text"
            
    return {
        "session_id": session_id,
        "filename": filename,
        "rows": len(df),
        "columns_count": len(df.columns),
        "columns": columns_list,
        "column_types": dtypes_map,
        "preview": preview_data
    }

@app.post("/api/clean")
async def clean_dataset(options: CleaningOptions):
    session_id = options.session_id
    if session_id not in datasets_cache:
        raise HTTPException(status_code=404, detail="Session expired or not found.")
        
    df = datasets_cache[session_id]["current"]
    
    cleaning_args = options.model_dump()
    cleaning_args.pop("session_id")
    
    cleaned_df, logs = auto_clean_dataset(df, cleaning_args)
    
    datasets_cache[session_id]["current"] = cleaned_df
    for log in logs:
        datasets_cache[session_id]["cleaning_log"].append(log)
        
    log_history_event(
        session_id, "Data Cleaned", 
        f"Applied cleaning heuristics. Shape shifted from {len(df):,}x{len(df.columns)} to {len(cleaned_df):,}x{len(cleaned_df.columns)}."
    )
        
    preview_data = cleaned_df.head(100).replace({np.nan: None}).to_dict(orient="records")
    
    return {
        "rows_before": len(df),
        "rows_after": len(cleaned_df),
        "cols_before": len(df.columns),
        "cols_after": len(cleaned_df.columns),
        "logs": logs,
        "full_history": datasets_cache[session_id]["cleaning_log"],
        "preview": preview_data,
        "columns": list(cleaned_df.columns)
    }

@app.post("/api/outliers")
async def outliers_endpoint(req: OutlierRequest):
    df = get_session_df(req.session_id)
    
    if req.action == "detect":
        report = detect_outliers(df, method=req.method, threshold=req.threshold)
        return report
    
    elif req.action == "remove":
        cleaned_df, removed_count = remove_outliers_from_dataset(
            df, method=req.method, threshold=req.threshold, target_cols=req.columns
        )
        set_session_df(
            req.session_id, cleaned_df, 
            f"Removed {removed_count} outliers using {req.method.upper()} (threshold={req.threshold})."
        )
        log_history_event(
            req.session_id, "Outliers Handled", 
            f"Dropped {removed_count} outlier values using {req.method.upper()}."
        )
        preview_data = cleaned_df.head(100).replace({np.nan: None}).to_dict(orient="records")
        return {
            "rows_removed": removed_count,
            "new_rows_count": len(cleaned_df),
            "preview": preview_data
        }
    else:
        raise HTTPException(status_code=400, detail="Invalid action.")

@app.post("/api/scale")
async def scale_endpoint(req: ScalingRequest):
    df = get_session_df(req.session_id)
    scaled_df, logs = apply_scaling(df, req.columns, method=req.method)
    set_session_df(req.session_id, scaled_df, logs[0] if logs else None)
    log_history_event(
        req.session_id, "Features Scaled", 
        f"Applied {req.method.lower()} scaling to columns: {', '.join(req.columns)}."
    )
    
    preview_data = scaled_df.head(100).replace({np.nan: None}).to_dict(orient="records")
    return {
        "logs": logs,
        "preview": preview_data,
        "columns": list(scaled_df.columns)
    }

@app.post("/api/encode")
async def encode_endpoint(req: EncodingRequest):
    df = get_session_df(req.session_id)
    encoded_df, logs = apply_encoding(df, req.columns, method=req.method)
    set_session_df(req.session_id, encoded_df, logs[0] if logs else None)
    log_history_event(
        req.session_id, "Features Encoded", 
        f"Applied {req.method.lower()} encoding to columns: {', '.join(req.columns)}."
    )
    
    preview_data = encoded_df.head(100).replace({np.nan: None}).to_dict(orient="records")
    return {
        "logs": logs,
        "preview": preview_data,
        "columns": list(encoded_df.columns)
    }

@app.get("/api/eda")
async def get_eda(session_id: str = Query(...)):
    df = get_session_df(session_id)
    log_history_event(session_id, "EDA Generated", "Compiled statistical descriptives and correlation tables.")
    return generate_eda_report(df)

@app.get("/api/plot")
async def get_plot_endpoint(
    session_id: str = Query(...),
    plot_type: str = Query(...),
    x: str = Query(None),
    y: str = Query(None),
    hue: str = Query(None)
):
    df = get_session_df(session_id)
    plot_base64 = generate_plot(df, plot_type, x=x, y=y, hue=hue)
    log_history_event(session_id, "Charts Generated", f"Rendered exploratory graph type: '{plot_type}' in-memory.")
    return {"image": plot_base64}

@app.get("/api/insights")
async def get_insights(session_id: str = Query(...), target_col: str = Query(None)):
    df = get_session_df(session_id)
    return generate_ai_insights(df, target_col=target_col)

@app.post("/api/reset")
async def reset_dataset(body: dict):
    session_id = body.get("session_id")
    if not session_id or session_id not in datasets_cache:
        raise HTTPException(status_code=404, detail="Dataset session not found.")
        
    orig_df = datasets_cache[session_id]["original"].copy()
    datasets_cache[session_id]["current"] = orig_df
    datasets_cache[session_id]["cleaning_log"] = ["Dataset reset to original upload state."]
    log_history_event(session_id, "Dataset Reset", "Reverted all modifications back to upload state.")
    
    preview_data = orig_df.head(100).replace({np.nan: None}).to_dict(orient="records")
    
    dtypes_map = {}
    for col in orig_df.columns:
        if pd.api.types.is_numeric_dtype(orig_df[col]):
            dtypes_map[col] = "Numeric"
        elif pd.api.types.is_datetime64_any_dtype(orig_df[col]):
            dtypes_map[col] = "DateTime"
        else:
            dtypes_map[col] = "Text"
            
    return {
        "rows": len(orig_df),
        "columns": list(orig_df.columns),
        "column_types": dtypes_map,
        "preview": preview_data,
        "logs": datasets_cache[session_id]["cleaning_log"]
    }

# ====================================================
# NEW ROUTES FOR ADVANCED ENHANCEMENTS
# ====================================================

@app.post("/api/chat")
async def chat_endpoint(req: ChatRequest):
    df = get_session_df(req.session_id)
    response = answer_dataset_query(df, req.session_id, req.query)
    log_history_event(req.session_id, "AI Conversation", f"User queried: '{req.query[:40]}{'...' if len(req.query) > 40 else ''}'")
    return response

@app.get("/api/quality")
async def quality_endpoint(session_id: str = Query(...)):
    df = get_session_df(session_id)
    return calculate_quality_score(df)

@app.get("/api/recommendations")
async def recommendations_endpoint(session_id: str = Query(...)):
    df = get_session_df(session_id)
    cleaning_recs = generate_cleaning_recommendations(df)
    graph_recs = generate_graph_recommendations(df)
    return {
        "cleaning": cleaning_recs,
        "graphs": graph_recs
    }

@app.get("/api/history")
async def history_endpoint(session_id: str = Query(...)):
    if session_id not in datasets_cache:
        raise HTTPException(status_code=404, detail="Dataset session not found.")
    return datasets_cache[session_id]["history"]

@app.get("/api/export/zip")
async def export_zip(session_id: str = Query(...), target_col: str = Query(None)):
    df = get_session_df(session_id)
    filename = datasets_cache[session_id]["filename"]
    base_name = os.path.splitext(filename)[0]
    
    zip_bytes = create_export_zip(df, filename, target_col=target_col)
    log_history_event(session_id, "ZIP Archive Exported", "Bundled cleaned files, PDF, and plots into ZIP.")
    
    return Response(
        content=zip_bytes,
        media_type="application/zip",
        headers={
            "Content-Disposition": f"attachment; filename={base_name}_Archive.zip"
        }
    )

# ====================================================
# PRE-EXISTING EXPORT ENDPOINTS
# ====================================================

@app.get("/api/export/csv")
async def export_csv(session_id: str = Query(...)):
    df = get_session_df(session_id)
    filename = datasets_cache[session_id]["filename"]
    base_name = os.path.splitext(filename)[0]
    
    stream = io.StringIO()
    df.to_csv(stream, index=False)
    log_history_event(session_id, "Report Exported", "Downloaded cleaned CSV document.")
    
    response = StreamingResponse(
        io.BytesIO(stream.getvalue().encode("utf-8")),
        media_type="text/csv"
    )
    response.headers["Content-Disposition"] = f"attachment; filename={base_name}_cleaned.csv"
    return response

@app.get("/api/export/excel")
async def export_excel(session_id: str = Query(...)):
    df = get_session_df(session_id)
    filename = datasets_cache[session_id]["filename"]
    base_name = os.path.splitext(filename)[0]
    
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='Cleaned Data')
    output.seek(0)
    log_history_event(session_id, "Report Exported", "Downloaded cleaned Excel workbook.")
    
    response = StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )
    response.headers["Content-Disposition"] = f"attachment; filename={base_name}_cleaned.xlsx"
    return response

@app.get("/api/export/pdf")
async def export_pdf(session_id: str = Query(...), target_col: str = Query(None)):
    df = get_session_df(session_id)
    filename = datasets_cache[session_id]["filename"]
    base_name = os.path.splitext(filename)[0]
    
    pdf_bytes = create_pdf_report(df, target_col=target_col)
    log_history_event(session_id, "Report Exported", "Downloaded PDF analytical report.")
    
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename={base_name}_EDA_Report.pdf"
        }
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
