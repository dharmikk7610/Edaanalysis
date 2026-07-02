import pandas as pd
import numpy as np
import re

def auto_clean_dataset(df: pd.DataFrame, options: dict) -> tuple[pd.DataFrame, list[str]]:
    """
    Performs data cleaning operations on a pandas DataFrame based on user options.
    Returns the cleaned DataFrame and a log list of strings describing actions taken.
    """
    cleaned_df = df.copy()
    logs = []

    # 1. Strip whitespaces from column names
    initial_cols = list(cleaned_df.columns)
    cleaned_df.columns = [str(col).strip() for col in cleaned_df.columns]
    renamed_cols = [c for c, orig in zip(cleaned_df.columns, initial_cols) if c != orig]
    if renamed_cols:
        logs.append(f"Standardized column names: trimmed whitespaces from {len(renamed_cols)} columns.")

    # 2. Remove unwanted symbols from numerical columns represented as text
    if options.get("remove_unwanted_symbols", True):
        symbol_pattern = re.compile(r'[\$\s,%€£¥]')
        cleaned_count = 0
        for col in cleaned_df.columns:
            if cleaned_df[col].dtype == 'object':
                # Sample non-null values to see if they look like formatted numbers: e.g., "$1,234.50" or "95%"
                sample = cleaned_df[col].dropna().head(10).astype(str)
                if len(sample) > 0 and all(re.match(r'^\s*[-+]?[\d,\.\$\s%€£¥]+\s*$', val) for val in sample):
                    # Clean the symbols
                    cleaned_df[col] = cleaned_df[col].astype(str).apply(
                        lambda x: symbol_pattern.sub('', x) if pd.notna(x) and x != 'nan' else np.nan
                    )
                    # Try to convert to float
                    try:
                        cleaned_df[col] = pd.to_numeric(cleaned_df[col], errors='coerce')
                        cleaned_count += 1
                    except Exception:
                        pass
        if cleaned_count > 0:
            logs.append(f"Removed currency symbols, commas, and percentage signs, converting {cleaned_count} columns to numeric.")

    # 3. Remove duplicate rows
    if options.get("remove_duplicates", True):
        dup_count = cleaned_df.duplicated().sum()
        if dup_count > 0:
            cleaned_df = cleaned_df.drop_duplicates()
            logs.append(f"Removed {dup_count} duplicate rows.")

    # 4. Remove duplicate columns
    if options.get("remove_duplicate_cols", True):
        # Transpose and find duplicates
        duplicated_cols = []
        # Compare columns pairwise
        cols = cleaned_df.columns
        for i in range(len(cols)):
            for j in range(i + 1, len(cols)):
                col1 = cols[i]
                col2 = cols[j]
                if col2 not in duplicated_cols and cleaned_df[col1].equals(cleaned_df[col2]):
                    duplicated_cols.append(col2)
        if duplicated_cols:
            cleaned_df = cleaned_df.drop(columns=duplicated_cols)
            logs.append(f"Detected and removed duplicate columns: {', '.join(duplicated_cols)}")

    # 5. Remove constant columns
    if options.get("remove_constant_cols", True):
        constant_cols = [col for col in cleaned_df.columns if cleaned_df[col].nunique(dropna=True) <= 1]
        if constant_cols:
            cleaned_df = cleaned_df.drop(columns=constant_cols)
            logs.append(f"Removed constant columns (single unique value): {', '.join(constant_cols)}")

    # 6. Auto-convert data types
    if options.get("convert_types", True):
        converted_cols = []
        for col in cleaned_df.columns:
            orig_dtype = cleaned_df[col].dtype
            # Skip columns already numeric or datetime
            if pd.api.types.is_numeric_dtype(cleaned_df[col]) or pd.api.types.is_datetime64_any_dtype(cleaned_df[col]):
                continue
            
            # Try numeric first
            converted_numeric = pd.to_numeric(cleaned_df[col], errors='coerce')
            # If numeric conversion results in <= 20% NaN (from initially non-NaN values), we convert it
            initial_nans = cleaned_df[col].isna().sum()
            numeric_nans = converted_numeric.isna().sum()
            if len(cleaned_df) - numeric_nans > 0 and (numeric_nans - initial_nans) / (len(cleaned_df) - initial_nans + 1e-9) < 0.2:
                cleaned_df[col] = converted_numeric
                converted_cols.append(f"{col} (Text -> Numeric)")
                continue

            # Try date/datetime
            # If length is reasonable and looks like a date, we try to convert it
            sample = cleaned_df[col].dropna().head(10).astype(str)
            if len(sample) > 0 and any(re.search(r'\d{2,4}[-/]\d{2}[-/]\d{2,4}', val) for val in sample):
                try:
                    converted_date = pd.to_datetime(cleaned_df[col], errors='coerce')
                    date_nans = converted_date.isna().sum()
                    if (date_nans - initial_nans) / (len(cleaned_df) - initial_nans + 1e-9) < 0.2:
                        cleaned_df[col] = converted_date
                        converted_cols.append(f"{col} (Text -> DateTime)")
                except Exception:
                    pass
        if converted_cols:
            logs.append(f"Auto-converted data types: {', '.join(converted_cols)}")

    # 7. Clean text strings (unnecessary spaces, case folding, special chars)
    if options.get("clean_text", True):
        text_cols = cleaned_df.select_dtypes(include=['object']).columns
        text_cleaned_count = 0
        for col in text_cols:
            # Check if actual string elements
            if cleaned_df[col].apply(lambda x: isinstance(x, str)).any():
                # Strip spaces, resolve internal multiple spaces to single space
                cleaned_df[col] = cleaned_df[col].apply(
                    lambda x: " ".join(str(x).strip().split()) if pd.notna(x) and x != 'nan' else np.nan
                )
                text_cleaned_count += 1
        if text_cleaned_count > 0:
            logs.append(f"Standardized text formatting (stripped outer and merged inner spaces) in {text_cleaned_count} text columns.")

    # 8. Empty column drop
    if options.get("remove_empty_cols", True):
        null_cols = [col for col in cleaned_df.columns if cleaned_df[col].isna().all()]
        if null_cols:
            cleaned_df = cleaned_df.drop(columns=null_cols)
            logs.append(f"Dropped completely empty columns: {', '.join(null_cols)}")

    # 9. Null rows drop (where all entries are null or missing)
    if options.get("remove_null_rows", True):
        initial_len = len(cleaned_df)
        cleaned_df = cleaned_df.dropna(how='all')
        dropped_rows = initial_len - len(cleaned_df)
        if dropped_rows > 0:
            logs.append(f"Dropped {dropped_rows} empty rows (all columns were missing).")

    # 10. Handle missing values
    missing_strategy = options.get("handle_missing", "auto")
    if missing_strategy != "none":
        filled_cols = []
        for col in cleaned_df.columns:
            missing_count = cleaned_df[col].isna().sum()
            if missing_count == 0:
                continue

            if missing_strategy == "drop":
                cleaned_df = cleaned_df.dropna(subset=[col])
                logs.append(f"Dropped rows with missing values in column '{col}' ({missing_count} rows).")
            else:
                # auto, mean, median, mode
                if pd.api.types.is_numeric_dtype(cleaned_df[col]):
                    if missing_strategy == "mean" or (missing_strategy == "auto" and cleaned_df[col].skew() < 1.0):
                        fill_value = float(cleaned_df[col].mean())
                        strategy_used = "mean"
                    else:  # median is robust to outliers
                        fill_value = float(cleaned_df[col].median())
                        strategy_used = "median"
                    
                    cleaned_df[col] = cleaned_df[col].fillna(fill_value)
                    filled_cols.append(f"'{col}' with {strategy_used} ({fill_value:.2f})")
                
                elif pd.api.types.is_datetime64_any_dtype(cleaned_df[col]):
                    # Fill with mode or forward fill
                    if not cleaned_df[col].mode().empty:
                        fill_value = cleaned_df[col].mode()[0]
                        cleaned_df[col] = cleaned_df[col].fillna(fill_value)
                        filled_cols.append(f"'{col}' with mode datetime ({fill_value})")
                
                else:  # Categorical/text
                    if not cleaned_df[col].mode().empty:
                        fill_value = cleaned_df[col].mode()[0]
                    else:
                        fill_value = "Unknown"
                    cleaned_df[col] = cleaned_df[col].fillna(fill_value)
                    filled_cols.append(f"'{col}' with mode ('{fill_value}')")
        
        if filled_cols:
            logs.append(f"Imputed missing values in: {', '.join(filled_cols)}.")

    # 11. Highly correlated columns detection
    corr_threshold = options.get("corr_threshold", 0.90)
    # Select only numeric columns for correlation check
    numeric_cols = cleaned_df.select_dtypes(include=[np.number]).columns
    if len(numeric_cols) > 1:
        corr_matrix = cleaned_df[numeric_cols].corr().abs()
        upper = corr_matrix.where(np.triu(np.ones(corr_matrix.shape), k=1).astype(bool))
        high_corr_cols = [column for column in upper.columns if any(upper[column] > corr_threshold)]
        if high_corr_cols:
            logs.append(f"Flagged highly correlated columns (r > {corr_threshold}): {', '.join(high_corr_cols)}. These columns could be redundant.")

    if not logs:
        logs.append("Dataset evaluated. No cleaning actions were required.")

    return cleaned_df, logs


def get_column_metrics(df: pd.DataFrame, col: str) -> dict:
    """
    Computes statistical and count metrics for a single column.
    """
    if col not in df.columns:
        # Check if there are dummy encoded columns prefix-matched
        dummy_cols = [c for c in df.columns if c.startswith(f"{col}_")]
        if dummy_cols:
            return {
                "rows": len(df),
                "missing": 0,
                "duplicates": int(df[dummy_cols].duplicated().sum()),
                "dtype": "Encoded (Dummy Variables)",
                "unique": len(dummy_cols)
            }
        return {
            "rows": 0,
            "missing": 0,
            "duplicates": 0,
            "dtype": "N/A",
            "unique": 0
        }
    
    series = df[col]
    
    # Calculate duplicates for this column specifically
    try:
        dup_count = int(series.duplicated().sum())
    except Exception:
        dup_count = 0
        
    try:
        uniq_count = int(series.nunique(dropna=True))
    except Exception:
        uniq_count = 0

    return {
        "rows": len(df),
        "missing": int(series.isna().sum()),
        "duplicates": dup_count,
        "dtype": str(series.dtype),
        "unique": uniq_count
    }


def apply_column_operation(df: pd.DataFrame, col: str, op: str, params: dict = None) -> tuple[pd.DataFrame, int, int, str]:
    """
    Applies a specific data cleaning or transformation operation on a single column of the DataFrame.
    """
    if params is None:
        params = {}
    
    modified_df = df.copy()
    affected_rows = 0
    modified_values = 0
    msg = ""

    # Ensure column exists for operations except rename
    if op != "rename_column" and col not in modified_df.columns:
        raise ValueError(f"Column '{col}' not found in dataset.")

    from sklearn.preprocessing import MinMaxScaler, StandardScaler, LabelEncoder

    if op == "remove_missing":
        before_len = len(modified_df)
        modified_df = modified_df.dropna(subset=[col])
        after_len = len(modified_df)
        affected_rows = before_len - after_len
        modified_values = affected_rows
        msg = f"Removed {affected_rows} rows with missing values in column '{col}'."

    elif op == "fill_missing_mean":
        if not pd.api.types.is_numeric_dtype(modified_df[col]):
            raise ValueError(f"Column '{col}' must be numeric to fill with mean.")
        mean_val = float(modified_df[col].mean())
        missing_count = int(modified_df[col].isna().sum())
        modified_df[col] = modified_df[col].fillna(mean_val)
        affected_rows = missing_count
        modified_values = missing_count
        msg = f"Filled {missing_count} missing values in column '{col}' with mean ({mean_val:.2f})."

    elif op == "fill_missing_median":
        if not pd.api.types.is_numeric_dtype(modified_df[col]):
            raise ValueError(f"Column '{col}' must be numeric to fill with median.")
        median_val = float(modified_df[col].median())
        missing_count = int(modified_df[col].isna().sum())
        modified_df[col] = modified_df[col].fillna(median_val)
        affected_rows = missing_count
        modified_values = missing_count
        msg = f"Filled {missing_count} missing values in column '{col}' with median ({median_val:.2f})."

    elif op == "fill_missing_mode":
        missing_count = int(modified_df[col].isna().sum())
        if not modified_df[col].mode().empty:
            mode_val = modified_df[col].mode()[0]
        else:
            mode_val = "Unknown"
        modified_df[col] = modified_df[col].fillna(mode_val)
        affected_rows = missing_count
        modified_values = missing_count
        msg = f"Filled {missing_count} missing values in column '{col}' with mode ({mode_val})."

    elif op == "fill_missing_custom":
        custom_val = params.get("custom_value", "")
        missing_count = int(modified_df[col].isna().sum())
        
        # Try to convert custom_val to numeric if column is numeric
        if pd.api.types.is_numeric_dtype(modified_df[col]):
            try:
                if '.' in str(custom_val):
                    custom_val = float(custom_val)
                else:
                    custom_val = int(custom_val)
            except Exception:
                pass
        
        modified_df[col] = modified_df[col].fillna(custom_val)
        affected_rows = missing_count
        modified_values = missing_count
        msg = f"Filled {missing_count} missing values in column '{col}' with custom value '{custom_val}'."

    elif op == "remove_duplicate_values":
        before_len = len(modified_df)
        modified_df = modified_df.drop_duplicates(subset=[col])
        after_len = len(modified_df)
        affected_rows = before_len - after_len
        modified_values = affected_rows
        msg = f"Removed {affected_rows} rows containing duplicate values in column '{col}'."

    elif op == "trim_whitespaces":
        non_null_mask = modified_df[col].notna()
        str_series = modified_df[col].astype(str)
        trimmed = str_series.str.strip()
        change_mask = (str_series != trimmed) & non_null_mask
        modified_count = int(change_mask.sum())
        
        modified_df[col] = modified_df[col].apply(lambda x: str(x).strip() if pd.notna(x) else x)
        affected_rows = modified_count
        modified_values = modified_count
        msg = f"Trimmed whitespace in {modified_count} values in column '{col}'."

    elif op == "convert_numeric":
        non_null_count = int(modified_df[col].notna().sum())
        modified_df[col] = pd.to_numeric(modified_df[col], errors='coerce')
        affected_rows = non_null_count
        modified_values = non_null_count
        msg = f"Converted column '{col}' to numeric."

    elif op == "convert_integer":
        non_null_count = int(modified_df[col].notna().sum())
        modified_df[col] = pd.to_numeric(modified_df[col], errors='coerce').astype('Int64')
        affected_rows = non_null_count
        modified_values = non_null_count
        msg = f"Converted column '{col}' to integer type."

    elif op == "convert_float":
        non_null_count = int(modified_df[col].notna().sum())
        modified_df[col] = pd.to_numeric(modified_df[col], errors='coerce').astype(float)
        affected_rows = non_null_count
        modified_values = non_null_count
        msg = f"Converted column '{col}' to float type."

    elif op == "convert_datetime":
        non_null_count = int(modified_df[col].notna().sum())
        modified_df[col] = pd.to_datetime(modified_df[col], errors='coerce')
        affected_rows = non_null_count
        modified_values = non_null_count
        msg = f"Converted column '{col}' to datetime type."

    elif op == "convert_string":
        non_null_count = int(modified_df[col].notna().sum())
        modified_df[col] = modified_df[col].astype(str)
        affected_rows = non_null_count
        modified_values = non_null_count
        msg = f"Converted column '{col}' to string type."

    elif op == "remove_special_characters":
        non_null_mask = modified_df[col].notna()
        str_series = modified_df[col].astype(str)
        cleaned = str_series.apply(lambda x: re.sub(r'[^a-zA-Z0-9\s]', '', x))
        change_mask = (str_series != cleaned) & non_null_mask
        modified_count = int(change_mask.sum())
        
        modified_df[col] = modified_df[col].apply(lambda x: re.sub(r'[^a-zA-Z0-9\s]', '', str(x)) if pd.notna(x) else x)
        affected_rows = modified_count
        modified_values = modified_count
        msg = f"Removed special characters from {modified_count} values in column '{col}'."

    elif op == "replace_values":
        old_val = params.get("old_value", "")
        new_val = params.get("new_value", "")
        
        # Match types if numeric
        if pd.api.types.is_numeric_dtype(modified_df[col]):
            try:
                old_val = float(old_val) if '.' in str(old_val) else int(old_val)
            except Exception:
                pass
            try:
                new_val = float(new_val) if '.' in str(new_val) else int(new_val)
            except Exception:
                pass

        match_mask = modified_df[col] == old_val
        modified_count = int(match_mask.sum())
        
        modified_df[col] = modified_df[col].replace(old_val, new_val)
        affected_rows = modified_count
        modified_values = modified_count
        msg = f"Replaced '{old_val}' with '{new_val}' in {modified_count} cells of column '{col}'."

    elif op == "rename_column":
        new_name = params.get("new_name", "").strip()
        if not new_name:
            raise ValueError("New column name cannot be empty.")
        if new_name in modified_df.columns:
            raise ValueError(f"A column named '{new_name}' already exists.")
        
        modified_df = modified_df.rename(columns={col: new_name})
        affected_rows = 0
        modified_values = 0
        msg = f"Renamed column '{col}' to '{new_name}'."

    elif op == "remove_outliers_iqr":
        if not pd.api.types.is_numeric_dtype(modified_df[col]):
            raise ValueError(f"Column '{col}' must be numeric to filter outliers.")
        col_series = modified_df[col].dropna()
        if len(col_series) < 3:
            affected_rows = 0
            modified_values = 0
            msg = f"Not enough numeric data in '{col}' to calculate IQR outliers."
        else:
            q1 = col_series.quantile(0.25)
            q3 = col_series.quantile(0.75)
            iqr = q3 - q1
            lower_bound = q1 - 1.5 * iqr
            upper_bound = q3 + 1.5 * iqr
            outlier_mask = (modified_df[col] < lower_bound) | (modified_df[col] > upper_bound)
            outlier_mask = outlier_mask & modified_df[col].notna()
            
            affected_rows = int(outlier_mask.sum())
            modified_values = affected_rows
            modified_df = modified_df[~outlier_mask]
            msg = f"Removed {affected_rows} rows containing IQR outliers in column '{col}'."

    elif op == "remove_outliers_zscore":
        if not pd.api.types.is_numeric_dtype(modified_df[col]):
            raise ValueError(f"Column '{col}' must be numeric to filter outliers.")
        col_series = modified_df[col].dropna()
        if len(col_series) < 3 or col_series.std() == 0:
            affected_rows = 0
            modified_values = 0
            msg = f"Not enough numeric variance in '{col}' to calculate Z-score outliers."
        else:
            mean = col_series.mean()
            std = col_series.std()
            z_scores = (modified_df[col] - mean) / std
            outlier_mask = z_scores.abs() > 3
            outlier_mask = outlier_mask & modified_df[col].notna()
            
            affected_rows = int(outlier_mask.sum())
            modified_values = affected_rows
            modified_df = modified_df[~outlier_mask]
            msg = f"Removed {affected_rows} rows containing Z-score outliers (|z| > 3) in column '{col}'."

    elif op == "normalize_column":
        if not pd.api.types.is_numeric_dtype(modified_df[col]):
            raise ValueError(f"Column '{col}' must be numeric to normalize.")
        non_nulls = modified_df[col].dropna().values.reshape(-1, 1)
        if len(non_nulls) > 0:
            scaler = MinMaxScaler()
            scaler.fit(non_nulls)
            modified_df[col] = modified_df[col].apply(
                lambda x: float(scaler.transform([[x]])[0][0]) if pd.notna(x) else np.nan
            )
            count = int(modified_df[col].notna().sum())
            affected_rows = count
            modified_values = count
            msg = f"Normalized values in column '{col}' to [0, 1] range."
        else:
            msg = f"No non-null values in column '{col}' to normalize."

    elif op == "standardize_column":
        if not pd.api.types.is_numeric_dtype(modified_df[col]):
            raise ValueError(f"Column '{col}' must be numeric to standardize.")
        non_nulls = modified_df[col].dropna().values.reshape(-1, 1)
        if len(non_nulls) > 0:
            scaler = StandardScaler()
            scaler.fit(non_nulls)
            modified_df[col] = modified_df[col].apply(
                lambda x: float(scaler.transform([[x]])[0][0]) if pd.notna(x) else np.nan
            )
            count = int(modified_df[col].notna().sum())
            affected_rows = count
            modified_values = count
            msg = f"Standardized values in column '{col}' (mean=0, std=1)."
        else:
            msg = f"No non-null values in column '{col}' to standardize."

    elif op == "label_encode":
        non_null_count = int(modified_df[col].notna().sum())
        le = LabelEncoder()
        series_filled = modified_df[col].astype(str).fillna("Missing")
        modified_df[col] = le.fit_transform(series_filled)
        affected_rows = non_null_count
        modified_values = non_null_count
        msg = f"Label encoded categorical column '{col}'."

    elif op == "one_hot_encode":
        non_null_count = int(modified_df[col].notna().sum())
        original_cols = set(modified_df.columns)
        
        modified_df = pd.get_dummies(modified_df, columns=[col], prefix=col, drop_first=False, dtype=int)
        
        new_cols = set(modified_df.columns) - original_cols
        affected_rows = non_null_count
        modified_values = non_null_count
        msg = f"One-hot encoded column '{col}', generating dummy variables: {', '.join(new_cols)}."

    else:
        raise ValueError(f"Unsupported operation: {op}")

    return modified_df, affected_rows, modified_values, msg

