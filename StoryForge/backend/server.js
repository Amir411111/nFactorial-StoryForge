const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db'); // Подключение к БД
const storyRoutes = require('./routes/stories'); // Маршруты для историй
const playthroughRoutes = require('./routes/playthroughs'); // Маршруты для прохождений
const aiRoutes = require('./routes/ai'); // Маршруты для AI

// Загрузка переменных окружения (из файла .env)
dotenv.config({ path: './.env' });

// Подключение к базе данных MongoDB
connectDB();

const app = express();

// Middleware для обработки CORS-запросов 
app.use(cors());
// Middleware для парсинга JSON-тела запросов
app.use(express.json());

// Регистрация маршрутов API
app.use('/api/stories', storyRoutes);           // Маршруты для работы с историями
app.use('/api/playthroughs', playthroughRoutes);  // Маршруты для работы с прохождениями
app.use('/api/ai', aiRoutes);                   // Маршруты для взаимодействия с AI

// Настройка раздачи статических файлов (frontend)
const publicDirectoryPath = path.join(__dirname, '../public'); // Путь к папке public
app.use(express.static(publicDirectoryPath)); // Раздача статики из папки public

// Определение порта для сервера
const PORT = process.env.PORT || 5000;

// Запуск сервера
app.listen(PORT, () => {
    // Вывод сообщения в консоль при успешном запуске
    console.log(`Сервер запущен в режиме ${process.env.NODE_ENV || 'development'} на порту ${PORT}`);
});