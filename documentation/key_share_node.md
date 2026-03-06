# Running a key share node

## Before you begin

The key share node is a crucial component of the distributed signature
generation scheme. Please read the Oko documentation first to learn how the
system works.

## [1/3] System Requirements

### Hardware Requirements

| Component                     | Min requirements                | Recommended Spec                  |
| ----------------------------- | ------------------------------- | --------------------------------- |
| Server                        | 1 vCPU, 2 GB RAM                | 8 vCPU, 32 GB RAM                 |
| Database (If you use your DB) | 1 vCPU, 2 GB RAM, 50 GB storage | 8 vCPU, 32 GB RAM, 300 GB Storage |

### Software Requirements

- Mac OS or Linux operating system
- Docker 27+

If you plan to use your own database,

- Postgres 17+

## [2/3] Installation

We officially support launching the application suite using Docker Compose. The
system includes both the Key Share Node server and PostgreSQL database.

### Prerequisites

1. Clone repository and setup:

```bash
git clone https://github.com/chainapsis/oko.git
cd oko
git fetch && git checkout <version>
cd key_share_node/docker
```

2. Prepare the encryption secret file:

Create a secure encryption secret file at your desired location. This file will
be used to encrypt user key shares within the Key Share Node. **You can use any
random value you choose** - this will be referenced later in the
`ENCRYPTION_SECRET_FILE_PATH` environment variable.

**Example encryption secret (32-byte hex string):**

```
104c88b9a580415161f640e7efb1b3c73d2aad859cd02dd4a1ab35da0afe12bb
```

### Environment Configuration

1. Copy the environment template and configure your settings:

```bash
cp env.example .env
```

2. Edit the `.env` file with your preferred values:

```bash
# Database Configuration
## PostgreSQL database username
DB_USER=postgres
## PostgreSQL database password
DB_PASSWORD=your_secure_password
## PostgreSQL database name
DB_NAME=key_share_node
## Host directory path for PostgreSQL data persistence (mounted to container)
PG_DATA_DIR=/opt/key_share_node/pg_data
## Host directory path for database dump files storage (mounted to container)
## **NOTE: This directory must be writable by the Node.js user (UID:1000, GID:1000)**
## **Example: chown -R 1000:1000 /opt/key_share_node/dump**
DUMP_DIR=/opt/key_share_node/dump
## Host directory path for log files storage (mounted to container)
## **NOTE: This directory must be writable by the Node.js user (UID:1000, GID:1000)**
## **Example: chown -R 1000:1000 /opt/key_share_node/logs**
LOG_DIR=/opt/key_share_node/logs

# Server Configuration
## Port number for the Key Share Node server
SERVER_PORT=4201
## Admin password for database dump/restore operations authentication
ADMIN_PASSWORD=admin_password
## Host file path to encryption secret file (used to create docker secret)
ENCRYPTION_SECRET_FILE_PATH=/opt/key_share_node/encryption_secret.txt
## Telegram bot token for Telegram login authentication
TELEGRAM_BOT_TOKEN=telegram_bot_token
## Base URL of the Oko API server for telemetry reporting
OKO_API_BASE_URL="http://localhost:4200"
## Password for authenticating telemetry reports sent to Oko API
KS_NODE_REPORT_PASSWORD="ks-node-report-password"
```

### Starting the Services

1. Create required directories and set proper permissions:

```bash
# Create directories for data persistence
sudo mkdir -p ${PG_DATA_DIR}
sudo mkdir -p ${DUMP_DIR}
sudo mkdir -p ${LOG_DIR}

# Set proper permissions for Node.js user (UID:1000, GID:1000)
sudo chown -R 1000:1000 ${DUMP_DIR}
sudo chown -R 1000:1000 ${LOG_DIR}
```

2. Start the services using Docker Compose:

```bash
docker compose up -d
```

3. Verify the services are running:

```bash
docker compose ps
```

4. Check the logs if needed:

```bash
docker compose logs key_share_node
docker compose logs key_share_node_pg
```

### SSL and Reverse Proxy Configuration

The Key Share Node should be accessed via HTTPS for security. You can set up SSL
and reverse proxy using one of the following options:

**Option 1: Self-managed Reverse Proxy (Nginx, Apache, etc.)**

Set up a reverse proxy server (e.g., Nginx) on the same host or a separate
server:

1. Install and configure your preferred reverse proxy solution
2. Configure SSL certificates (Let's Encrypt, commercial certificates, etc.)
3. Set up reverse proxy rules to forward HTTPS traffic to your Key Share Node
4. Configure the reverse proxy to listen on port 443 (HTTPS) and forward to
   `localhost:${SERVER_PORT}`

**Option 2: Managed Load Balancer (AWS ALB, Google Cloud Load Balancer, etc.)**

Use cloud-provided load balancer services:

1. Create a load balancer in your cloud provider's console
2. Configure SSL/TLS at the load balancer level
3. Set up target groups to forward traffic to your Key Share Node server
4. Configure health checks to monitor your Key Share Node status

**Final Steps:**

1. Test your HTTPS configuration by accessing your Key Share Node via the
   domain:

   ```bash
   curl https://your-domain.com/status
   ```

2. Provide your deployed server URL to the Keplr team.

### Set up Firewall

#### Firewall Options

**Option 1: Cloud Firewall Services**

If you plan to use cloud-provided firewall services (AWS Security Groups, Google
Cloud Firewall, Azure NSG, etc.), configure your ingress rules to allow only:

- **SSH (22)**: For remote access
- **HTTPS (443)**: For Key Share Node access via reverse proxy/load balancer
- **SERVER_PORT**: Your Key Share Node server port (default: 4201) - _Only if
  using managed load balancer or external reverse proxy_

Block all other ports including PostgreSQL (5432) to maintain security.

**Option 2: iptables-based Firewall**

When using Docker Compose, **firewall tools like UFW are bypassed** for
published container ports. As documented in the
[Docker official documentation](https://docs.docker.com/engine/network/packet-filtering-firewalls/#integration-with-firewalld),
Docker routes container traffic in the `nat` table before it reaches the `INPUT`
and `OUTPUT` chains that UFW uses, effectively ignoring your firewall
configuration.

#### Default Port Exposure

By default, when you run the Key Share Node with Docker Compose:

- **Server Port (e.g., 4201)**: Accessible from all IP addresses
  (`0.0.0.0:SERVER_PORT`)
- **Database Port (5432)**: Accessible from all IP addresses (`0.0.0.0:5432`)

> **Note**: The actual server port is determined by the `SERVER_PORT`
> environment variable in your `.env` file (default: 4201).

This means your PostgreSQL database is **publicly accessible** by default, which
poses a security risk.

#### Recommended Security Configuration

We strongly recommend implementing a comprehensive firewall strategy that allows
only essential services while blocking unnecessary access. The following
configuration allows SSH and HTTPS access, while restricting direct access to
your Key Share Node server port and PostgreSQL appropriately.

#### 1. Check existing rules

```bash
sudo iptables -S DOCKER-USER
```

#### 2. Configure comprehensive firewall rules

Replace `{YOUR_WHITELIST_IP}` with your PostgreSQL whitelisted IP address,
`{YOUR_REVERSE_PROXY_IP}` with your reverse proxy IP address, and
`${SERVER_PORT}` with your server port value:

**For host services (SSH and HTTPS):**

```bash
# Allow SSH (22) from anywhere (adjust as needed for your security requirements)
sudo iptables -I INPUT 1 -p tcp --dport 22 -j ACCEPT

# Allow HTTPS (443) from anywhere (for reverse proxy/load balancer access)
sudo iptables -I INPUT 2 -p tcp --dport 443 -j ACCEPT

# Deny all other traffic to host services
sudo iptables -A INPUT -j DROP
```

**For Docker services (Key Share Node and PostgreSQL):**

```bash
# Allow localhost access to PostgreSQL (default)
sudo iptables -I DOCKER-USER 1 -p tcp --dport 5432 -s 127.0.0.1 -j ACCEPT

# (Optional) Allow PostgreSQL (5432) from whitelisted IP only
sudo iptables -I DOCKER-USER 2 -p tcp --dport 5432 -s {YOUR_WHITELIST_IP} -j ACCEPT

# Deny all other access to PostgreSQL
sudo iptables -A DOCKER-USER -p tcp --dport 5432 -j DROP

# Restrict Key Share Node server port to localhost only (for reverse proxy access)
sudo iptables -I DOCKER-USER 3 -p tcp --dport ${SERVER_PORT} -s 127.0.0.1 -j ACCEPT

# (Optional) Allow Key Share Node server port from external reverse proxy IP
# sudo iptables -I DOCKER-USER 4 -p tcp --dport ${SERVER_PORT} -s {YOUR_REVERSE_PROXY_IP} -j ACCEPT

# Deny all other access to Key Share Node server port
sudo iptables -A DOCKER-USER -p tcp --dport ${SERVER_PORT} -j DROP
```

> **Explanation:**
>
> - **INPUT chain**: Blocks all host services except SSH and HTTPS
> - **DOCKER-USER chain**: Restricts PostgreSQL and Key Share Node server port
>   access appropriately
> - `-I` inserts the ACCEPT rules at the top so they are matched first
> - `-A` appends the DROP rule at the bottom
> - SSH (22) and HTTPS (443) are allowed from anywhere for remote access and
>   reverse proxy
> - PostgreSQL (5432) is restricted to localhost by default, with optional
>   whitelisted IP access for database management
> - Key Share Node server port is restricted to localhost by default (for local
>   reverse proxy access), with optional external reverse proxy IP access
> - All other services are blocked by the respective DROP rules

#### 3. Make firewall rules persistent

On Ubuntu/Debian:

```bash
# Install persistence package
sudo apt-get update
sudo apt-get install -y iptables-persistent

# Save current rules
sudo netfilter-persistent save
```

With this configuration, the iptables rules you set will be automatically
applied even after future (unexpected) reboots.

#### 4. Verify rules

```bash
sudo iptables -L DOCKER-USER -n --line-numbers
```

You should see your rules in the following order:

**INPUT chain:**

1. SSH (22) - ACCEPT
2. HTTPS (443) - ACCEPT
3. All other traffic - DROP

**DOCKER-USER chain:**

1. PostgreSQL (5432) from localhost - ACCEPT
2. PostgreSQL (5432) from whitelisted IP - ACCEPT (if needed)
3. Key Share Node server port from localhost - ACCEPT
4. Key Share Node server port from external reverse proxy IP - ACCEPT (if
   needed)
5. PostgreSQL (5432) - DROP
6. Key Share Node server port - DROP

> **Note**: The Key Share Node server port is restricted to localhost by default
> for local reverse proxy access. If using an external reverse proxy (separate
> server), uncomment and configure the `{YOUR_REVERSE_PROXY_IP}` rule for
> security.

## Optional: Using Your Own Database

If you prefer to use your own PostgreSQL database instead of the included one:

1. Update the `.env` file with your database connection details:

```bash
DB_HOST=your_database_host
DB_PORT=5432
DB_USER=your_username
DB_PASSWORD=your_password
DB_NAME=your_database_name
DB_SSL=true  # or false
```

2. **Important**: Update the `docker-compose.yml` file to use your database
   settings:

```yaml
environment:
  DB_HOST: ${DB_HOST} # Use your external database host
  DB_PORT: ${DB_PORT} # Use your database port (usually 5432)
  DB_SSL: ${DB_SSL} # Enable/disable SSL as needed
  # ... other environment variables
```

3. Remove or comment out the `key_share_node_pg` service in `docker-compose.yml`

4. Ensure your database is accessible from the Docker container and has the
   required schema

## [3/3] Maintenance

### DevOps responsibilities

1. Run the node all time (or at least over 99%). During the test period, the
   system allows new user sign-ups (distributed key generation) only when all
   key share nodes are live in the network - key share node uptime is thus
   critical in maintaining the system. Keplr will check the liveness of all
   nodes constantly and may reach out when we do not receive 'pong' for an
   extended period of time.
2. Data backup happens regularly in each node. So you do not have to define an
   independent task to take the snapshots of the database. If you experience any
   malfunctioning and would like to roll back to previous state of the storage,
   please reach out to Keplr. (instruction will be described in this document
   down the road)

### System failure handling

1. If the system experiences incidents, and does not recover by itself for over
   15 mins, please reach out to Keplr.
2. Keplr may give an instruction to retrieve the server log to analyze the cause
   of the error, in which case, coordination will be appreciated.

### Log management

The Key Share Node automatically manages log files with the following
configuration:

- **Log location**: Configured via `LOG_DIR` environment variable (default:
  `/opt/key_share_node/logs`)
- **File rotation**: Daily rotation with date pattern `ksnode-YYYY-MM-DD.log`
- **Retention policy**: **7-day rolling retention** - logs older than 7 days are
  automatically deleted
- **Log format**: Timestamped logs with different levels (debug, info, warn,
  error)

**Accessing logs:**

```bash
# View current day's log
tail -f /opt/key_share_node/logs/ksnode-$(date +%Y-%m-%d).log

# View all available log files
ls -la /opt/key_share_node/logs/
```

### Server status monitoring

You can monitor the health and status of your Key Share Node using the `/status`
endpoint. This API provides real-time information about the server's operational
state.

**Check server status:**

```bash
curl http://localhost:${SERVER_PORT}/status
```

**Response includes:**

- `is_db_connected`: Database connection status (boolean)
- `is_db_backup_checked`: Whether database backup verification is complete
  (boolean)
- `latest_backup_time`: Timestamp of the most recent successful backup (ISO
  string or null)
- `ks_node_public_key`: Public key of the Key Share Node (string) - _Currently
  returns temporary value, will be updated in future releases_
- `launch_time`: Server startup timestamp (ISO string)
- `git_hash`: Git commit hash of the deployed version (string)
- `version`: Application version (string)

**Example response:**

```json
{
  "is_db_connected": true,
  "is_db_backup_checked": true,
  "latest_backup_time": "2024-01-15T10:30:00.000Z",
  "ks_node_public_key": "to-be-upgraded",
  "launch_time": "2024-01-15T09:00:00.000Z",
  "git_hash": "abc123def456",
  "version": "1.0.0"
}
```

### Overall workload

1. We will roll the new versions periodically. At times, minor updates may take
   place several times a day. We will contact those correspondents directly when
   an urgent upgrade is needed. (instruction will soon be described)
2. Other than you staying updated through our communication channel, the scope
   of involement from your side will be constrained at a reasonable level.

## Automatic backups

The key share node automatically saves backups at regular intervals, ensuring
recovery in case of failure. (7-day rolling)

### Backup Configuration

- **Backup frequency**: Daily
- **Retention period**: 7 days
- **Storage location**: Configured via `DUMP_DIR` environment variable

### Backup Management

The Key Share Node provides both automatic and manual backup capabilities.

#### Automatic Backups

Backups are automatically created daily and stored in the directory specified by
the `DUMP_DIR` environment variable in your `.env` file. The system maintains a
7-day rolling backup retention policy.

#### Checking Backup History

You can check available backups using the REST API:

```bash
# Get all backups
curl -X POST http://localhost:${SERVER_PORT}/pg_dump/v1/get_backup_history

# Get backups from the last 7 days
curl -X POST http://localhost:${SERVER_PORT}/pg_dump/v1/get_backup_history \
  -H "Content-Type: application/json" \
  -d '{"days": 7}'
```

## Upgrade

See [Node Upgrade Guide](./node_upgrade.md) for detailed upgrade instructions.

## Security

TBD
