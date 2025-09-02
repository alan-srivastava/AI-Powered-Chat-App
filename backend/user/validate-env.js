import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

console.log('🔍 Validating environment configuration...\n');

const requiredEnvVars = [
  'MONGO_URI',
  'REDIS_URL', 
  'Rabbitmq_Host',
  'Rabbitmq_User',
  'Rabbitmq_Password',
  'JWT_SECRET',
  'PORT'
];

let allValid = true;

console.log('📋 Required Environment Variables:');
console.log('='.repeat(50));

requiredEnvVars.forEach(envVar => {
  const value = process.env[envVar];
  const isValid = value && value.trim() !== '';
  
  console.log(`${envVar}: ${isValid ? '✅' : '❌'} ${isValid ? 'Set' : 'Missing'}`);
  
  if (!isValid) {
    allValid = false;
    console.log(`   💡 Please set ${envVar} in your .env file`);
  } else if (envVar.includes('PASSWORD') || envVar.includes('SECRET')) {
    console.log(`   Value: ${value.substring(0, 3)}...${value.substring(value.length - 3)}`);
  } else if (envVar === 'MONGO_URI' || envVar === 'REDIS_URL') {
    const masked = value.replace(/:[^:]*@/, ':****@');
    console.log(`   Value: ${masked}`);
  } else {
    console.log(`   Value: ${value}`);
  }
  console.log('');
});

console.log('='.repeat(50));

if (allValid) {
  console.log('🎉 All required environment variables are set correctly!');
  console.log('🚀 You can now start your application.');
} else {
  console.log('❌ Some environment variables are missing or empty.');
  console.log('💡 Please check your .env file and ensure all variables are set.');
}

console.log('\n🔗 Connection Tests:');
console.log('='.repeat(50));

// Test MongoDB URI format
const mongoUri = process.env.MONGO_URI;
if (mongoUri) {
  if (mongoUri.includes('mongodb+srv://')) {
    console.log('✅ MongoDB URI uses SRV format (good for Atlas)');
  } else if (mongoUri.includes('mongodb://')) {
    console.log('ℹ️  MongoDB URI uses standard format');
  } else {
    console.log('❌ MongoDB URI format unrecognized');
  }
}

// Test Redis URL format
const redisUrl = process.env.REDIS_URL;
if (redisUrl) {
  if (redisUrl.startsWith('rediss://')) {
    console.log('✅ Redis URL uses SSL (rediss://)');
  } else if (redisUrl.startsWith('redis://')) {
    console.log('ℹ️  Redis URL uses standard format (redis://)');
  } else {
    console.log('❌ Redis URL format unrecognized');
  }
}

console.log('='.repeat(50));
