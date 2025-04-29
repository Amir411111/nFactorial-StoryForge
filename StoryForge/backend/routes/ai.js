// backend/routes/ai.js
const express = require('express');
const router = express.Router();
// Импорт функций для взаимодействия с AI из сервиса
const { continueChapterText, suggestChapterActions } = require('../services/aiService');

// Маршрут для получения продолжения текста главы от AI.
router.post('/continue', async (req, res) => {
    const { text } = req.body; // Получение текста из тела запроса

    // Валидация проверка на наличие текста
    if (!text) {
        return res.status(400).json({ error: 'Отсутствует поле "text" в теле запроса' });
    }

    try {
        // Вызов сервисной функции для получения продолжения
        const continuation = await continueChapterText(text);
        // Отправка успешного ответа с продолжением
        res.json({ continuation });
    } catch (error) {
        // Обработка ошибок от сервиса AI или других проблем
        console.error("Ошибка в маршруте /api/ai/continue:", error.message);
        res.status(500).json({ error: error.message || 'Ошибка сервера при получении продолжения от ИИ' });
    }
});

//Маршрут для получения предложенных действий для главы от AI.
router.post('/suggest-actions', async (req, res) => {
    const { text } = req.body; // Получение текста главы из тела запроса

    // Валидация проверка на наличие текста
    if (!text) {
        return res.status(400).json({ error: 'Отсутствует поле "text" в теле запроса' });
    }

    try {
        // Вызов сервисной функции для получения предложений
        const actions = await suggestChapterActions(text);
        // Отправка успешного ответа с массивом предложенных действий
        res.json({ actions });
    } catch (error) {
         // Обработка ошибок от сервиса AI или других проблем
         console.error("Ошибка в маршруте /api/ai/suggest-actions:", error.message);
        res.status(500).json({ error: error.message || 'Ошибка сервера при получении предложений действий от ИИ' });
    }
});

module.exports = router; // Экспортирование роутера