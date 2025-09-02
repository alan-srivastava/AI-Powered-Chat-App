import amqp from 'amqplib';

let channel;
let connection;

export const connectRabbitMQ = async () => {
    const host = process.env.Rabbitmq_Host;
    const user = process.env.Rabbitmq_User;
    const password = process.env.Rabbitmq_Password;

    if (!host || !user || !password) {
        console.error('❌ RabbitMQ configuration missing in .env file');
        console.log('💡 Please check Rabbitmq_Host, Rabbitmq_User, and Rabbitmq_Password');
        throw new Error('RabbitMQ configuration incomplete');
    }

    console.log('🔗 Attempting to connect to RabbitMQ...');
    console.log(`📝 Host: ${host}, User: ${user}`);

    try {
        connection = await amqp.connect({
            protocol: "amqp",
            hostname: host,
            port: 5672,
            username: user,
            password: password,
            heartbeat: 60, // 60 second heartbeat
        });
        
        channel = await connection.createChannel();
        console.log('✅ Connected to RabbitMQ successfully');
        
        // Add event listeners for better debugging
        connection.on('error', (err) => {
            console.error('❌ RabbitMQ connection error:', err.message);
        });
        
        connection.on('close', () => {
            console.log('⚠️ RabbitMQ connection closed');
        });
        
    } catch (error) {
        console.error('❌ Error connecting to RabbitMQ:');
        console.error('   - Check if RabbitMQ server is running');
        console.error('   - Verify credentials in .env file');
        console.error('   - Ensure network connectivity to RabbitMQ host');
        console.error('   - Error details:', error.message);
        throw error;
    }
};

export const publishToQueue = async (queueName, message) => {
    if (!channel) {
        console.error('❌ RabbitMQ channel is not established');
        throw new Error('RabbitMQ channel is not established');
    }
    
    try {
        await channel.assertQueue(queueName, { durable: true });
        const success = channel.sendToQueue(
            queueName, 
            Buffer.from(JSON.stringify(message)), 
            { persistent: true }
        );
        
        if (success) {
            console.log(`✅ Message sent to queue: ${queueName}`);
        } else {
            console.error(`❌ Failed to send message to queue: ${queueName}`);
            throw new Error('Failed to send message to RabbitMQ');
        }
    } catch (error) {
        console.error(`❌ Error publishing to queue ${queueName}:`, error.message);
        throw error;
    }
};

// Graceful shutdown
export const closeRabbitMQ = async () => {
    if (channel) {
        await channel.close();
        console.log('✅ RabbitMQ channel closed');
    }
    if (connection) {
        await connection.close();
        console.log('✅ RabbitMQ connection closed');
    }
};
