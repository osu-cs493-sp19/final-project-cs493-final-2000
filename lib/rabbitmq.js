const amqp = require('amqplib');

const rabbitmqHost = process.env.RABBITMQ_HOST;
const rabbitmqUrl = `amqp://${rabbitmqHost}`;

let connection = null;
let channel = null;

exports.connectToRabbitMQ = async function (queue) {
    try {
	connection = await amqp.connect(rabbitmqUrl);
    channel = await connection.createChannel();
    await channel.assertQueue(queue);
	} catch (err) {
		if (err.code == 'ECONNREFUSED'){
			await exports.connectToRabbitMQ(queue);
		}
		else {
			throw err;
		}
	}
};

exports.getChannel = function () {
  return channel;
};
