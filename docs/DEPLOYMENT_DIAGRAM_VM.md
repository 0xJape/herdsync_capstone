```mermaid
flowchart TB
    users[Farm Managers<br>Veterinarians<br>Farm Aides]
    browser[Web Browser<br>Desktop / Mobile / PWA]

    subgraph aws[AWS Cloud]
        route53[Amazon Route 53<br>DNS]
        alb[Application Load Balancer<br>HTTPS / TLS]

        subgraph vpc[AWS VPC]
            subgraph publicSubnet[Public Subnets]
                nat[NAT Gateway]
            end
            subgraph appSubnets[Private Application Subnets]
                ec2a[EC2 VM 01<br>HerdSync Next.js]
                ec2b[EC2 VM 02<br>HerdSync Next.js Standby / Scale Out]
                worker[EC2 VM 03<br>Scheduled Worker]
            end
            subgraph dataSubnets[Private Data Subnets]
                rds[(Amazon RDS<br>PostgreSQL)]
                s3[(Amazon S3<br>Protected Uploads)]
            end
        end

        ecr[Amazon ECR<br>Container Images]
        secrets[AWS Secrets Manager<br>Database Credentials]
        cloudwatch[Amazon CloudWatch<br>Logs and Monitoring]
        backup[Amazon S3<br>Encrypted Backups]
    end

    users --> browser
    browser -->|HTTPS| route53
    route53 --> alb
    alb --> ec2a
    alb --> ec2b
    ec2a -->|Next.js UI and API Routes| rds
    ec2b -->|Next.js UI and API Routes| rds
    ec2a -->|Authorized Uploads| s3
    ec2b -->|Authorized Uploads| s3
    worker -->|Alerts, Due Dates, Quarantine Checks| rds
    worker -->|Existing Workflow Logic| ec2a
    ec2a -.->|Pull Image| ecr
    ec2b -.->|Pull Image| ecr
    ec2a -.->|Read Secrets| secrets
    ec2b -.->|Read Secrets| secrets
    worker -.->|Read Secrets| secrets
    ec2a -.->|Application, Audit, Error Logs| cloudwatch
    ec2b -.->|Application, Audit, Error Logs| cloudwatch
    worker -.->|Worker Logs| cloudwatch
    rds -->|Automated Encrypted Backup| backup
    ec2a --> nat
    ec2b --> nat
    worker --> nat

    classDef user fill:#f5e9e7,stroke:#a33e37,stroke-width:1px,color:#571d18
    classDef awsService fill:#fff4d6,stroke:#b7791f,stroke-width:2px,color:#573b08
    classDef compute fill:#e8f1ff,stroke:#2563eb,stroke-width:2px,color:#172554
    classDef data fill:#edf8f1,stroke:#277044,stroke-width:2px,color:#14351f
    classDef network fill:#f0e8ff,stroke:#7048a8,stroke-width:2px,color:#32145f

    class users,browser user
    class route53,alb,ecr,secrets,cloudwatch,backup awsService
    class ec2a,ec2b,worker compute
    class rds,s3 data
    class vpc,publicSubnet,appSubnets,dataSubnets,nat network
```
```

## VM responsibilities

- **VM-01 — Edge:** Terminates HTTPS and forwards browser traffic to the application VM.
- **VM-02 — Application:** Runs the existing Next.js application, API routes, authentication, cattle workflows, breeding, pregnancy, calving, health, reports, alerts, and uploads.
- **VM-03 — Database:** Runs PostgreSQL. Keep database access private; do not expose PostgreSQL directly to users.
- **Operations host:** Runs deployment commands, database migrations, monitoring, and log collection.

## Logic-preservation rules

1. Keep current Next.js App Router and API route boundaries.
2. Keep authentication and role checks inside existing application logic.
3. Keep PostgreSQL schema, migrations, transactions, and audit records unchanged.
4. Keep uploads behind application authorization; do not expose upload directories as unrestricted public storage.
5. Run scheduled alerts, pregnancy checks, treatment follow-ups, withdrawal checks, and quarantine checks through the existing workflow rules.
6. Run database migrations before starting a new application version.
7. Use private VM networking between application and database tiers.
8. Back up PostgreSQL separately from application files.
9. Use HTTPS at the reverse proxy and forward only required headers to Next.js.
10. Use process supervision such as systemd, Windows service hosting, or a supported Node.js process manager to restart the application after failure.

## Request flow

```mermaid
sequenceDiagram
    participant U as User Browser
    participant P as Reverse Proxy VM
    participant N as Next.js VM
    participant D as PostgreSQL VM
    participant F as Protected File Storage

    U->>P: HTTPS request
    P->>N: Forward page or API request
    N->>D: Read or write authorized data
    D-->>N: Query result
    N->>F: Store or retrieve authorized image
    F-->>N: File result
    N-->>P: HTML, JSON, or protected media response
    P-->>U: HTTPS response
```
