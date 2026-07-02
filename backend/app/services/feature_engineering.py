import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler, MinMaxScaler, LabelEncoder

def apply_scaling(df: pd.DataFrame, columns: list[str], method: str = "standardize") -> tuple[pd.DataFrame, list[str]]:
    """
    Applies Min-Max Normalization or Z-Score Standardization to the specified numeric columns.
    Returns the modified DataFrame and a log list.
    """
    engineered_df = df.copy()
    logs = []
    
    if not columns:
        return engineered_df, ["No columns selected for scaling."]
        
    numeric_cols = engineered_df.select_dtypes(include=[np.number]).columns
    cols_to_scale = [col for col in columns if col in numeric_cols]
    
    if not cols_to_scale:
        return engineered_df, ["No numeric columns found among selected columns for scaling."]

    if method == "normalize":
        scaler = MinMaxScaler()
        # Handle columns individually to avoid issues with NaN values
        for col in cols_to_scale:
            # We fit on non-NaN values
            non_null_vals = engineered_df[col].dropna().values.reshape(-1, 1)
            if len(non_null_vals) > 0:
                scaler.fit(non_null_vals)
                # Transform whole column (keeps NaN as NaN)
                engineered_df[col] = engineered_df[col].apply(
                    lambda x: float(scaler.transform([[x]])[0][0]) if pd.notna(x) else np.nan
                )
        logs.append(f"Applied Min-Max Normalization (scaled to [0,1]) to: {', '.join(cols_to_scale)}.")
        
    elif method == "standardize":
        scaler = StandardScaler()
        for col in cols_to_scale:
            non_null_vals = engineered_df[col].dropna().values.reshape(-1, 1)
            if len(non_null_vals) > 0:
                scaler.fit(non_null_vals)
                engineered_df[col] = engineered_df[col].apply(
                    lambda x: float(scaler.transform([[x]])[0][0]) if pd.notna(x) else np.nan
                )
        logs.append(f"Applied Z-Score Standardization (mean=0, std=1) to: {', '.join(cols_to_scale)}.")
        
    return engineered_df, logs

def apply_encoding(df: pd.DataFrame, columns: list[str], method: str = "onehot") -> tuple[pd.DataFrame, list[str]]:
    """
    Applies One-Hot Encoding or Label Encoding to the specified categorical columns.
    Returns the modified DataFrame and a log list.
    """
    engineered_df = df.copy()
    logs = []
    
    if not columns:
        return engineered_df, ["No columns selected for encoding."]
        
    # We can encode columns that are text/object or categorical
    cols_to_encode = [col for col in columns if col in engineered_df.columns]
    
    if not cols_to_encode:
        return engineered_df, ["No matching columns found in dataset for encoding."]

    if method == "label":
        le = LabelEncoder()
        encoded_cols = []
        for col in cols_to_encode:
            # Fill NaN values temporarily to encode, then put them back or leave them as encoded
            series_filled = engineered_df[col].astype(str).fillna("Missing")
            engineered_df[col] = le.fit_transform(series_filled)
            encoded_cols.append(col)
        logs.append(f"Applied Label Encoding (text -> category integers) to: {', '.join(encoded_cols)}.")
        
    elif method == "onehot":
        # pandas get_dummies is extremely simple and robust
        # Let's keep track of original columns to see what got added
        original_cols = set(engineered_df.columns)
        
        # Drop columns to encode from engineered_df and join dummy columns
        dummies = pd.get_dummies(engineered_df[cols_to_encode], prefix=cols_to_encode, drop_first=False, dtype=int)
        
        engineered_df = engineered_df.drop(columns=cols_to_encode)
        engineered_df = pd.concat([engineered_df, dummies], axis=1)
        
        new_cols = set(engineered_df.columns) - original_cols
        logs.append(f"Applied One-Hot Encoding to columns: {', '.join(cols_to_encode)}. Created {len(new_cols)} new indicator variables.")
        
    return engineered_df, logs
