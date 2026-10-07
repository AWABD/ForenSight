import subprocess
import sys
import time
import os
import webbrowser

def main():
    print("=" * 65)
    print("      FORENSIGHT AI PLATFORM - ONE-CLICK SYSTEM LAUNCHER     ")
    print("=" * 65)

    base_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.join(base_dir, "backend")
    frontend_dir = os.path.join(base_dir, "frontend")

    print("\n[1/3] Starting ForenSight FastAPI Backend Server (Port 8000)...")
    backend_process = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000", "--reload"],
        cwd=backend_dir
    )

    print("[2/3] Starting ForenSight React Frontend Server (Port 5173)...")
    npm_cmd = "npm.cmd" if os.name == "nt" else "npm"
    frontend_process = subprocess.Popen(
        [npm_cmd, "run", "dev"],
        cwd=frontend_dir
    )

    print("[3/3] Waiting for services to initialize...")
    time.sleep(3)
    webbrowser.open("http://localhost:5173")

    print("\n" + "=" * 65)
    print("  FORENSIGHT PLATFORM ACTIVE & READY!")
    print("  - Backend Endpoint:  http://127.0.0.1:8000/api/v1")
    print("  - Frontend Portal:    http://localhost:5173")
    print("  - Default Credentials: Admin (admin_root / sysadminsecret)")
    print("  Press Ctrl+C in this console to stop all services.")
    print("=" * 65 + "\n")

    try:
        backend_process.wait()
        frontend_process.wait()
    except KeyboardInterrupt:
        print("\nShutting down ForenSight services...")
        backend_process.terminate()
        frontend_process.terminate()
        print("ForenSight shutdown complete.")

if __name__ == "__main__":
    main()
