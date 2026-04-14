#!/usr/bin/env node

/**
 * PolyMarket Data Fetcher
 * 用于GitHub Actions的独立脚本
 */

import COS from 'cos-nodejs-sdk-v5';
import https from 'https';
import http from 'http';
import fs from 'fs';

// COS配置（通过环境变量传入）
const COS_CONFIG = {
  secretId: process.env.COS_SECRET_ID,
  secretKey: process.env.COS_SECRET_KEY,
  bucket: process.env.COS_BUCKET,
  region: process.env.COS_REGION
};

console.log('=== PolyMarket Data Fetcher ===');
console.log('Bucket:', COS_CONFIG.bucket);
console.log('Region:', COS_CONFIG.region);

// 验证配置
if (!COS_CONFIG.secretId || !COS_CONFIG.secretKey || !COS_CONFIG.bucket || !COS_CONFIG.region) {
  console.error('❌ Missing required environment variables!');
  console.error('Required: COS_SECRET_ID, COS_SECRET_KEY, COS_BUCKET, COS_REGION');
  process.exit(1);
}

// PolyMarket API端点
const POLYMARKET_ENDPOINTS = [
  'https://gamma-api.polymarket.com/events?active=true&closed=false&limit=100',
  'https://gamma-api.polymarket.com/markets?active=true&closed=false&limit=100'
];

/**
 * 使用原生http模块获取数据
 */
function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    console.log(`Fetching: ${url}`);
    
    const client = url.startsWith('https') ? https : http;
    
    const req = client.get(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 30000
    }, (res) => {
      let data = '';
      
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json);
        } catch (e) {
          reject(new Error(`Failed to parse JSON: ${e.message}`));
        }
      });
    });
    
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

/**
 * 转换PolyMarket数据格式
 */
function transformData(rawData) {
  let markets = [];
  
  if (Array.isArray(rawData)) {
    markets = rawData;
  } else if (rawData.events) {
    markets = rawData.events;
  } else if (rawData.markets) {
    markets = rawData.markets;
  }
  
  return markets.map(item => {
    const yesPrice = parseFloat(item.outcomePrices?.[0]) || parseFloat(item.outcomePrices?.[1]) || 0.5;
    return {
      id: item.id || item.conditionId || String(Date.now() + Math.random()),
      question: item.question || item.title || 'Unknown',
      description: item.description || '',
      outcomes: item.outcomes || ['NO', 'YES'],
      outcomePrices: item.outcomePrices || ['0.5', '0.5'],
      probability: Math.round(yesPrice * 100),
      volume: parseFloat(item.volume || '0'),
      liquidity: parseFloat(item.liquidity || '0'),
      active: item.active !== false,
      closed: item.closed === true,
      tags: Array.isArray(item.tags) ? item.tags : [],
      slug: item.slug || '',
      createdAt: item.creationTime || new Date().toISOString(),
      expiresAt: item.expirationTime || '',
      updatedAt: new Date().toISOString()
    };
  });
}

/**
 * 上传到腾讯云COS
 */
async function uploadToCOS(data) {
  const { secretId, secretKey, bucket, region } = COS_CONFIG;
  
  console.log('Initializing COS client...');
  
  return new Promise((resolve, reject) => {
    const cos = new COS({
      SecretId: secretId,
      SecretKey: secretKey
    });
    
    const body = JSON.stringify(data);
    
    console.log('Uploading to COS...');
    console.log('Bucket:', bucket);
    console.log('Region:', region);
    
    cos.putObject({
      Bucket: bucket,
      Region: region,
      Key: 'polymarket-data.json',
      Body: Buffer.from(body),
      ContentType: 'application/json',
      ACL: 'public-read'
    }, (err, data) => {
      if (err) {
        console.error('❌ COS Error:', err);
        reject(err);
      } else {
        console.log('✅ Upload successful!');
        console.log('ETag:', data.ETag);
        console.log('Location:', data.Location);
        resolve(data);
      }
    });
  });
}

/**
 * 主函数
 */
async function main() {
  try {
    console.log('\n--- Step 1: Fetching PolyMarket Data ---');
    
    let rawData = null;
    for (const endpoint of POLYMARKET_ENDPOINTS) {
      try {
        console.log(`Trying: ${endpoint}`);
        rawData = await fetchUrl(endpoint);
        if (rawData && (Array.isArray(rawData) || rawData.events || rawData.markets)) {
          console.log('✅ Successfully fetched data!');
          break;
        }
      } catch (error) {
        console.log(`❌ Failed: ${error.message}`);
      }
    }
    
    if (!rawData) {
      throw new Error('Failed to fetch data from all endpoints');
    }
    
    console.log('\n--- Step 2: Transforming Data ---');
    const markets = transformData(rawData);
    console.log(`Transformed ${markets.length} markets`);
    
    const result = {
      markets: markets,
      total: markets.length,
      fetchedAt: new Date().toISOString(),
      source: 'polymarket-gamma-api'
    };
    
    // 保存到本地文件
    fs.writeFileSync('polymarket-data.json', JSON.stringify(result, null, 2));
    console.log('Data saved to polymarket-data.json');
    
    console.log('\n--- Step 3: Uploading to COS ---');
    await uploadToCOS(result);
    
    console.log('\n=== ✅ All steps completed successfully! ===');
    console.log(`\n📊 Data URL: https://${COS_CONFIG.bucket}.cos.${COS_CONFIG.region}.myqcloud.com/polymarket-data.json`);
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

main();
