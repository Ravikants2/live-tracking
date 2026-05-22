# Live Tracking UI Scaffold

Simple frontend scaffold for an iON Live streaming venue tracking UI. This initial step adds a top navigation with four tabs:

- Dashboard
- TC Status
- Upload
- Managed Users

To view locally, open `index.html` in a browser (no build step required).

Run a lightweight dev server with Server-Sent Events (SSE) that serves the frontend and emits simulated live updates:

```bash
node server/server.js
```

Then open http://localhost:3000 in your browser. The dashboard will receive live demo updates automatically.

### Fully automated AWS deployment

A deployment script is included so the entire AWS stack can be created from code without manual AWS Console steps. Set the required AWS environment variables and run:

```bash
export AWS_ACCESS_KEY_ID=...
export AWS_SECRET_ACCESS_KEY=...
export AWS_REGION=us-east-1
export S3_BUCKET=your-unique-lambda-bucket
export STACK_NAME=ion-live-streaming-stack
export DDB_TABLE=iON_TC_Table
./scripts/deploy.sh
```

This script will:
- install Lambda dependencies
- package the Lambda function
- upload the package to S3
- deploy the CloudFormation stack including Lambda, API Gateway, and DynamoDB

Next suggested steps:
- Add backend endpoints for live status
- Integrate real-time updates (extend SSE or switch to WebSockets)
- Add charts and maps for venues

Deployment and AWS integration

This project includes a Lambda handler (`/lambda/handler.js`) which accepts a JSON array of rows (objects with keys matching the CSV headers) and writes each row into a DynamoDB table. The DynamoDB table uses `TCCode` (mapped from the CSV "TC Code") as the primary (hash) key.

GitHub Actions

A GitHub Actions workflow is included at `.github/workflows/deploy.yml` that packages the Lambda, uploads it to S3, and deploys a CloudFormation stack from `template.yaml`.
The stack provisions:
- an AWS Lambda function for upload processing
- a DynamoDB table keyed by `TCCode`
- an API Gateway REST API for `/upload`

Required repository secrets for the workflow:
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION`
- `S3_BUCKET` (S3 bucket for Lambda packaging)
- `STACK_NAME` (CloudFormation stack name)
- `DDB_TABLE` (DynamoDB table name, e.g. `iON_TC_Table`)

How uploads work

- The frontend validates and previews CSV files in the `Upload` tab.
- For production, the frontend should POST a JSON array of rows to your API Gateway endpoint which routes to the Lambda.
- In development, the included dev server accepts `POST /upload` and saves the JSON payload under `uploads/` for testing.

# live-tracking