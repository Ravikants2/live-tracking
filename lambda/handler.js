const { DynamoDBClient, PutItemCommand } = require('@aws-sdk/client-dynamodb')
const { marshall } = require('@aws-sdk/util-dynamodb')

const REGION = process.env.AWS_REGION || 'us-east-1'
const TABLE = process.env.DDB_TABLE || 'iON_TC_Table'
const ddb = new DynamoDBClient({ region: REGION })

function normalizeRow(row){
  // map various possible header names to consistent keys
  return {
    TCCode: row['TC Code'] || row['TCCode'] || row.TCCode || row.tcCode,
    Zone: row['Zone'] || row.Zone || '',
    State: row['State'] || row.State || '',
    City: row['City'] || row.City || '',
    TCType: row['TC Type'] || row['TCType'] || row.TCType || '',
    TCName: row['TC Name'] || row.TCName || row['TC name'] || '',
    CandidateCount: Number(row['Candidate count'] || row.CandidateCount || 0)
  }
}

exports.handler = async function(event){
  let payload
  try{
    if(event.isBase64Encoded){
      payload = Buffer.from(event.body, 'base64').toString('utf8')
    } else {
      payload = event.body
    }
    const rows = JSON.parse(payload)
    if(!Array.isArray(rows)) throw new Error('Expected JSON array of rows')

    const results = []
    for(const r of rows){
      const item = normalizeRow(r)
      if(!item.TCCode){ results.push({ status: 'error', reason: 'missing TCCode', row: r }); continue }
      item.updatedAt = new Date().toISOString()
      const cmd = new PutItemCommand({ TableName: TABLE, Item: marshall(item) })
      await ddb.send(cmd)
      results.push({ status: 'ok', key: item.TCCode })
    }

    return { statusCode: 200, body: JSON.stringify({ results }) }
  }catch(err){
    console.error('handler error', err)
    return { statusCode: 500, body: JSON.stringify({ error: String(err) }) }
  }
}
