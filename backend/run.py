import uvicorn
import os
from dotenv import load_dotenv

if __name__ == "__main__":
    # Load dotenv from current directory
    load_dotenv()
    
    # Read host and port from environment or default
    host = os.getenv("HOST", "127.0.0.1")
    port = int(os.getenv("PORT", "8000"))
    environment = os.getenv("ENVIRONMENT", "development")
    
    # Reload server automatically if in development environment
    reload = True if environment == "development" else False
    
    print(f"Starting ForenSight Backend Server on {host}:{port} (reload={reload})...")
    uvicorn.run("app.main:app", host=host, port=port, reload=reload)
