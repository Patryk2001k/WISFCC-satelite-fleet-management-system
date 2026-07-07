# WISFCC (Web-based International Satellite Fleet Communication Center)

A distributed CMS/HMI system designed for monitoring, mission scheduling, and preventive collision avoidance (CAS) for a simulated satellite constellation.

## System Architecture

The project is based on a microservices architecture and consists of three independent services connected via a container network:

*   **Frontend (React + CesiumJS):** Interactive 3D map and operator dashboard with dynamic orbit rendering directly in the browser using WebGL.
*   **Main Backend (Java Spring Boot + PostgreSQL):** The central orchestrator of business logic. It handles relational database management, asynchronous background task scheduling, and Role-Based Access Control (RBAC).
*   **Physics Engine (Python FastAPI + NumPy):** A stateless, highly efficient mathematical module. Based on SGP4 models and Kepler's laws, it calculates satellite positions, computes Delta-V maneuver parameters, and detects orbital close approaches (Time of Closest Approach - TCA).

---

## Quick Start (Docker)

The system is fully containerized, allowing it to run without any local configuration of Java, Python, or database environments.

### Prerequisites
*   **Docker Desktop** (or Docker Engine with Docker Compose) installed and running.

### Installation & Setup

**1. Download the repository**  
Clone the project using GitHub Desktop, the `git clone` command, or download it as a ZIP file and extract it to your preferred location.

**2. Run the environment**  
Open your terminal (CMD / PowerShell / Bash) directly in the root directory of the project (where the `docker-compose.yaml` file is located) and execute the following command:

```bash
docker compose up -d --build
```

**3. Database Initialization (Auto-Seeding)**  
After executing the command, wait for about **15–20 seconds**. During this time, the system automates the startup processes:
* The Spring Boot server automatically creates table schemas in the PostgreSQL database.
* A Python script (Seeder) clears and populates the database with test data (100 simulated satellites, collisions, and pre-configured user accounts).

**4. Access the application**  
Once the containers are successfully up and running, the application will be available in your browser at:  
[http://localhost](http://localhost)

---

## Test Environment Login

To test the full functionality of the system, you can use one of the pre-generated accounts:

| Role | Username | Password |
| :--- | :--- | :--- |
| **Administrator (Full Access)** | `admin` | `admin12` |
| **Guest (Read-only)** | `guest` | `guest12` |

---

## Stopping the System

To safely shut down all services, stop the containers, and free up your computer's RAM, run the following command in the project directory:

```bash
docker compose down
```
