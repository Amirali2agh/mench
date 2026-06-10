# Mensch Game - Backend Integration & Architecture Guide

This document defines the WebSocket communication protocols, query parameters, events, and data schemas required for the Frontend developer to integrate the React + TypeScript application with this FastAPI + Redis backend.

---

## 1. Running the Backend Service

To run the backend and its Redis database locally using Docker, execute this command in the project root:
```bash
docker compose up --build

API Base URL: http://localhost:8000
WS Base URL: ws://localhost:8000
Health Check Endpoint: http://localhost:8000/health (Returns database connection health status).