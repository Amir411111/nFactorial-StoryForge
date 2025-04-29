const mongoose = require('mongoose'); // Библиотека для работы с MongoDB
const dotenv = require('dotenv'); // Модуль для загрузки переменных окружения из файла .env
// Загрузка переменных окружения из файла .env 
dotenv.config({ path: './.env' });

// Асинхронная функция для подключения к базе данных MongoDB.
const connectDB = async () => {
    try {
        // Подключение к MongoDB с использованием строки подключения из переменных окружения
        const conn = await mongoose.connect(process.env.MONGO_URI);
        // Вывод сообщения об успешном подключении в консоль
        console.log(`MongoDB подключена: ${conn.connection.host}`);
    } catch (error) {
        // Обработка ошибки подключения
        console.error(`Ошибка подключения к MongoDB: ${error.message}`);
        // Завершение процесса Node.js с кодом ошибки 1
        process.exit(1);
    }
};

// Экспорт функции подключения для использования в других частях приложения (например, в server.js)
module.exports = connectDB;