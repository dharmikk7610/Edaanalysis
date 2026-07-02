import os
import tempfile
import base64
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
import pandas as pd
from app.services.eda import generate_eda_report
from app.services.insights import generate_ai_insights
from app.services.visualizations import generate_plot

def create_pdf_report(df: pd.DataFrame, target_col: str = None) -> bytes:
    """
    Generates a professional PDF report containing the dataset summaries,
    data cleaning logs, AI insights, and visual graphs.
    Returns the raw PDF byte string.
    """
    # 1. Compute stats & insights
    eda_data = generate_eda_report(df)
    insights_data = generate_ai_insights(df, target_col=target_col)
    
    overview = eda_data["overview"]
    cols_info = eda_data["columns"]
    
    # 2. Set up document
    pdf_fd, pdf_path = tempfile.mkstemp(suffix=".pdf")
    os.close(pdf_fd)
    
    # Page templates & margin setup
    margin = 54  # 0.75 inch
    doc = SimpleDocTemplate(
        pdf_path,
        pagesize=letter,
        leftMargin=margin,
        rightMargin=margin,
        topMargin=margin,
        bottomMargin=margin
    )
    
    # 3. Create Styles
    styles = getSampleStyleSheet()
    
    # Define primary theme colors
    c_primary = colors.HexColor("#1e3a8a")  # Deep Blue
    c_secondary = colors.HexColor("#0f766e")  # Teal
    c_dark = colors.HexColor("#1e293b")  # Charcoal
    c_light = colors.HexColor("#f8fafc")  # Warm Light Gray
    c_accent = colors.HexColor("#ef4444")  # Red Warning
    
    # Custom Typography Styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=28,
        textColor=c_primary,
        spaceAfter=15
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=12,
        leading=16,
        textColor=colors.HexColor("#64748b"),
        spaceAfter=30
    )
    
    h1_style = ParagraphStyle(
        'SectionH1',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=16,
        leading=20,
        textColor=c_primary,
        spaceBefore=15,
        spaceAfter=10,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'SectionH2',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=c_secondary,
        spaceBefore=10,
        spaceAfter=8,
        keepWithNext=True
    )
    
    body_style = ParagraphStyle(
        'ReportBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=c_dark,
        spaceAfter=8
    )
    
    bullet_style = ParagraphStyle(
        'ReportBullet',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=13.5,
        textColor=c_dark,
        leftIndent=15,
        firstLineIndent=-10,
        spaceAfter=6
    )
    
    table_cell_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=11,
        textColor=c_dark
    )
    
    table_header_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=11,
        textColor=colors.white
    )
    
    story = []
    
    # --- PAGE 1: COVER HEADER & SUMMARY ---
    story.append(Paragraph("InsightAI Analytics Report", title_style))
    story.append(Paragraph("Automated Exploratory Data Analysis & Quality Audit Summary", subtitle_style))
    story.append(Spacer(1, 10))
    
    story.append(Paragraph("1. Executive Summary", h1_style))
    story.append(Paragraph(insights_data["sections"]["executive_summary"], body_style))
    story.append(Spacer(1, 15))
    
    # Dataset Overview Table
    story.append(Paragraph("Dataset High-Level Metrics", h2_style))
    overview_data = [
        [Paragraph("Metric", table_header_style), Paragraph("Value", table_header_style)],
        [Paragraph("Total Rows (Records)", table_cell_style), Paragraph(f"{overview['rows']:,}", table_cell_style)],
        [Paragraph("Total Columns (Variables)", table_cell_style), Paragraph(f"{overview['columns']}", table_cell_style)],
        [Paragraph("Memory Occupancy", table_cell_style), Paragraph(f"{overview['memory_usage']}", table_cell_style)],
        [Paragraph("Missing Data Cells", table_cell_style), Paragraph(f"{overview['missing_cells']:,} ({overview['missing_percentage']}%)", table_cell_style)],
        [Paragraph("Duplicate Rows", table_cell_style), Paragraph(f"{overview['duplicate_rows']:,} ({overview['duplicate_percentage']}%)", table_cell_style)],
    ]
    
    t_overview = Table(overview_data, colWidths=[2.5*inch, 3.5*inch])
    t_overview.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (1,0), c_primary),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('BOTTOMPADDING', (0,0), (-1,0), 6),
        ('TOPPADDING', (0,0), (-1,0), 6),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, c_light]),
        ('TOPPADDING', (0,1), (-1,-1), 5),
        ('BOTTOMPADDING', (0,1), (-1,-1), 5),
    ]))
    story.append(t_overview)
    
    story.append(Spacer(1, 20))
    
    # --- PAGE 2: COLUMNS SCHEMA AUDIT ---
    story.append(PageBreak())
    story.append(Paragraph("2. Attributes Schema Details", h1_style))
    story.append(Paragraph("This table details the variable names, data types, missing ratios, and uniqueness checks calculated across columns.", body_style))
    story.append(Spacer(1, 10))
    
    col_table_data = [
        [
            Paragraph("Column Name", table_header_style),
            Paragraph("Type", table_header_style),
            Paragraph("Storage DType", table_header_style),
            Paragraph("Missing %", table_header_style),
            Paragraph("Uniques", table_header_style)
        ]
    ]
    
    # We display at most 25 columns to avoid huge lists in PDF.
    max_cols_show = 25
    for col_meta in cols_info[:max_cols_show]:
        col_table_data.append([
            Paragraph(col_meta["name"], table_cell_style),
            Paragraph(col_meta["type"], table_cell_style),
            Paragraph(col_meta["dtype"], table_cell_style),
            Paragraph(f"{col_meta['missing_percentage']}%", table_cell_style),
            Paragraph(f"{col_meta['unique_values']:,}", table_cell_style),
        ])
    
    # If truncated
    if len(cols_info) > max_cols_show:
        col_table_data.append([
            Paragraph(f"... and {len(cols_info) - max_cols_show} more columns", table_cell_style),
            Paragraph("", table_cell_style),
            Paragraph("", table_cell_style),
            Paragraph("", table_cell_style),
            Paragraph("", table_cell_style),
        ])
        
    t_cols = Table(col_table_data, colWidths=[2.2*inch, 1.0*inch, 1.2*inch, 0.9*inch, 0.9*inch])
    t_cols.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), c_secondary),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('BOTTOMPADDING', (0,0), (-1,0), 6),
        ('TOPPADDING', (0,0), (-1,0), 6),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, c_light]),
        ('TOPPADDING', (0,1), (-1,-1), 4),
        ('BOTTOMPADDING', (0,1), (-1,-1), 4),
    ]))
    story.append(t_cols)
    
    # --- PAGE 3: DATA QUALITY & RECOMMENDATIONS ---
    story.append(PageBreak())
    story.append(Paragraph("3. Data Quality & Next Steps", h1_style))
    
    story.append(Paragraph("Quality Issues Checklist", h2_style))
    issues = insights_data["sections"]["data_quality_report"].split("\n")
    for issue in issues:
        if issue.strip():
            story.append(Paragraph(issue.strip(), bullet_style))
            
    story.append(Spacer(1, 15))
    story.append(Paragraph("Strategic Actions & Recommendations", h2_style))
    recs = insights_data["sections"]["recommendations"].split("\n")
    for rec in recs:
        if rec.strip():
            story.append(Paragraph(rec.strip(), bullet_style))

    # --- PAGE 4: DETAILED STATISTICAL CORRELATIONS & GRAPHS ---
    story.append(PageBreak())
    story.append(Paragraph("4. Linear Relationship & Statistical Correlations", h1_style))
    story.append(Paragraph(insights_data["sections"]["top_correlations"], body_style))
    story.append(Spacer(1, 15))
    
    # Generate and embed Heatmap chart in PDF!
    # Let's save a temp file for heatmap
    heatmap_b64 = generate_plot(df, "correlation_heatmap")
    temp_img_files = []
    
    if "base64," in heatmap_b64:
        try:
            b64_data = heatmap_b64.split("base64,")[1]
            h_fd, h_path = tempfile.mkstemp(suffix=".png")
            os.close(h_fd)
            with open(h_path, "wb") as fh:
                fh.write(base64.b64decode(b64_data))
            temp_img_files.append(h_path)
            
            # Embed image in Story
            # Letter page width is 8.5inch = 612 points. Margins are 54*2 = 108. Usable width is 504 points = 7 inches.
            story.append(Image(h_path, width=5.5*inch, height=3.3*inch))
            story.append(Paragraph("<font color='#64748b'><b>Figure 4.1:</b> Correlation Coefficient Matrix (Pearson Correlation R)</font>", subtitle_style))
        except Exception as e:
            story.append(Paragraph(f"Error rendering Figure 4.1: {str(e)}", body_style))

    # --- PAGE 5: OUTLIERS & MISSING VALUES HEATMAP ---
    story.append(PageBreak())
    story.append(Paragraph("5. Outliers & Missingness Analysis", h1_style))
    story.append(Paragraph(insights_data["sections"]["outlier_explanation"], body_style))
    story.append(Spacer(1, 15))
    
    # Missing Value Heatmap
    missing_b64 = generate_plot(df, "missing_value_heatmap")
    if "base64," in missing_b64:
        try:
            b64_data = missing_b64.split("base64,")[1]
            m_fd, m_path = tempfile.mkstemp(suffix=".png")
            os.close(m_fd)
            with open(m_path, "wb") as fh:
                fh.write(base64.b64decode(b64_data))
            temp_img_files.append(m_path)
            
            story.append(Image(m_path, width=5.5*inch, height=3.3*inch))
            story.append(Paragraph("<font color='#64748b'><b>Figure 5.1:</b> Missing Values Heatmap (Correlations of nulls)</font>", subtitle_style))
        except Exception as e:
            pass

    # Build document
    doc.build(story)
    
    # Read PDF to bytes
    with open(pdf_path, "rb") as fh:
        pdf_bytes = fh.read()
        
    # Cleanup temp files
    try:
        os.remove(pdf_path)
        for img_path in temp_img_files:
            if os.path.exists(img_path):
                os.remove(img_path)
    except Exception:
        pass
        
    return pdf_bytes
