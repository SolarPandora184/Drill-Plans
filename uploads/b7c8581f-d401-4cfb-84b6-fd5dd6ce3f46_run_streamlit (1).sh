#!/bin/bash

# Stop any existing processes on port 5000
pkill -f "streamlit run"
sleep 2

# Start Streamlit on port 5000 for Replit compatibility
streamlit run streamlit_app.py --server.port 5000 --server.address 0.0.0.0 --server.headless true --browser.gatherUsageStats false