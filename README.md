# 🚀 InsightAI – AI-Powered EDA & Visualization Platform

> Transform Raw Data into Actionable Business Intelligence using Artificial Intelligence.

![License](https://img.shields.io/badge/License-MIT-blue.svg)
![Python](https://img.shields.io/badge/Python-3.11-blue)
![React](https://img.shields.io/badge/React-19-61DAFB)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-green)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Docker](https://img.shields.io/badge/Docker-Enabled-2496ED)

---

# 📖 Overview

InsightAI is an AI-powered Exploratory Data Analysis (EDA) platform designed to automate data understanding and business intelligence.

The platform enables users to upload datasets and instantly receive:

- Automated Data Cleaning
- Statistical Analysis
- Missing Value Detection
- Outlier Detection
- Feature Engineering
- AI-generated Business Insights
- Interactive Visualizations
- Executive Dashboard
- PDF Report Generation

Instead of manually writing Python scripts or SQL queries, users receive intelligent insights within seconds.

---

# 🎯 Problem Statement

**OPS 8: AI for Industrial Knowledge Intelligence: Unified Asset & Operations Brain**

Organizations generate massive amounts of structured data but struggle to extract meaningful insights efficiently. InsightAI addresses this challenge by transforming raw datasets into an intelligent knowledge platform powered by AI.

---

# ✨ Features

## 📂 Dataset Upload

- CSV Upload
- Excel Upload
- JSON Upload
- TXT Upload
- XML Upload

---

## 🧹 Automated Data Cleaning

- Missing Value Detection
- Duplicate Removal
- Null Value Handling
- Data Type Conversion
- Automatic Encoding
- Feature Scaling

---

## 📊 Exploratory Data Analysis

- Dataset Overview
- Shape
- Data Types
- Summary Statistics
- Correlation Matrix
- Distribution Analysis
- Skewness
- Kurtosis

---

## 📈 Interactive Visualizations

- Line Chart
- Bar Chart
- Scatter Plot
- Pie Chart
- Histogram
- Heatmap
- Box Plot
- Area Chart
- Bubble Chart
- Pair Plot

---

## 🤖 AI Intelligence

- AI Generated Insights
- Trend Analysis
- Pattern Recognition
- Data Quality Suggestions
- Predictive Recommendations
- Executive Summary
- Automated Business Reports

---

## 📋 Executive Cockpit

- KPI Dashboard
- Data Quality Score
- Business Metrics
- AI Recommendations
- Dataset Health
- Analysis Summary

---

## 📄 Report Generation

Generate professional reports in PDF format including

- Dataset Summary
- Charts
- Statistics
- AI Insights
- Recommendations

---

## 🕒 Analysis History

- Save Previous Analyses
- Reload Reports
- Track Uploaded Datasets
- Compare Results

---

# 🏗️ System Architecture

```
                +---------------------+
                |     User Upload     |
                +----------+----------+
                           |
                           |
                    Dataset Upload
                           |
                           ▼
                 +------------------+
                 |   React Frontend |
                 +------------------+
                           |
                      REST API
                           |
                           ▼
               +-----------------------+
               |    FastAPI Backend    |
               +-----------------------+
                           |
      --------------------------------------------
      |             |             |              |
      ▼             ▼             ▼              ▼
Data Cleaning   AI Analysis   Visualization   PDF Report
      |             |             |              |
      --------------------------------------------
                           |
                           ▼
                    PostgreSQL Database
```

---

# 💻 Tech Stack

## Frontend

- React.js
- TypeScript
- Tailwind CSS
- Vite
- Axios
- Plotly.js

---

## Backend

- FastAPI
- Python
- Pandas
- NumPy
- Scikit-learn
- Matplotlib

---

## Database

- PostgreSQL

---

## Deployment

- Docker
- Docker Compose

---

# 📁 Project Structure

```
InsightAI
│
├── frontend/
│   ├── src/
│   ├── components/
│   ├── pages/
│   ├── services/
│   └── assets/
│
├── backend/
│   ├── app/
│   ├── api/
│   ├── services/
│   ├── models/
│   ├── utils/
│   └── main.py
│
├── uploads/
│
├── reports/
│
├── docker-compose.yml
│
├── README.md
│
└── requirements.txt
```

---

# ⚙️ Installation

## Clone Repository

```bash
git clone https://github.com/yourusername/InsightAI.git
```

```bash
cd InsightAI
```

---

## Backend

```bash
cd backend
```

Create Virtual Environment

```bash
python -m venv venv
```

Activate Environment

Windows

```bash
venv\Scripts\activate
```

Linux/Mac

```bash
source venv/bin/activate
```

Install Packages

```bash
pip install -r requirements.txt
```

Run Backend

```bash
uvicorn main:app --reload
```

---

## Frontend

```bash
cd frontend
```

Install Packages

```bash
npm install
```

Run

```bash
npm run dev
```

---

# 🐳 Docker

Build

```bash
docker-compose build
```

Run

```bash
docker-compose up
```

---

# 📊 Workflow

```
Upload Dataset
       │
       ▼
Data Cleaning
       │
       ▼
EDA Analysis
       │
       ▼
Visualization
       │
       ▼
AI Insights
       │
       ▼
Executive Dashboard
       │
       ▼
Generate PDF Report
```

---

# 📷 Screenshots

Add screenshots here.

```
screenshots/
├── Dashboard.png
├── Upload.png
├── Visualization.png
├── ExecutiveCockpit.png
├── AIInsights.png
└── Reports.png
```

---

# 🚀 Future Enhancements

- Chat with Dataset
- Natural Language Querying
- AI Copilot
- Predictive Forecasting
- Auto ML
- Time Series Analysis
- Anomaly Detection
- LLM Integration
- Multi-user Authentication
- Cloud Deployment
- Real-time Dashboard
- Model Recommendation System

---

# 🎯 Use Cases

- Manufacturing Analytics
- Finance
- Healthcare
- Retail
- Education
- Banking
- Supply Chain
- Government
- Smart Cities
- Business Intelligence

---

# 📈 Business Benefits

- 80% Faster Data Analysis
- Reduced Manual Work
- Better Decision Making
- AI-Powered Recommendations
- Improved Data Quality
- Interactive Dashboards
- Executive Reporting
- Knowledge Centralization

---

# 👨‍💻 Contributors

**Dharmik Prajapati**

- Java Full Stack Developer
- AI Enthusiast
- Data Analytics Developer

GitHub: https://github.com/dharmikk7610

---

# 📄 License

This project is licensed under the MIT License.

---

# ⭐ Support

If you found this project useful, don't forget to ⭐ the repository.

---

## 💡 Quote

> **"Turning Raw Data into Intelligent Decisions with AI."**
