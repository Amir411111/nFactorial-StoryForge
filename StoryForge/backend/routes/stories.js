const mongoose = require('mongoose');
const express = require('express');
const router = express.Router();
const Story = require('../models/story'); // Импорт модели Story

// Получить список всех историй (только основную информацию).
router.get('/', async (req, res) => {
    try {
        // Запрос к БД: найти все истории, выбрать только указанные поля, отсортировать по дате создания (новые сверху)
        const stories = await Story.find()
                                     .select('title authorNickname startChapterId createdAt') // Выбор только нужных полей
                                     .sort({ createdAt: -1 }); // Сортировка по убыванию даты создания

        res.json(stories); // Отправление списка историй пользователю
    } catch (err) {
        console.error("Ошибка при получении списка историй:", err);
        res.status(500).json({ error: 'Ошибка сервера при получении списка историй' });
    }
});

// Создание новой истории.

router.post('/', async (req, res) => {
    try {
        // Получание данных новой истории из тела запроса
        const { title, authorNickname, startChapterId, chapters } = req.body;

        //  Базовая валидация входных данных 
        if (!title || !authorNickname || !startChapterId || !chapters || typeof chapters !== 'object' || Object.keys(chapters).length === 0) {
            return res.status(400).json({ error: 'Не хватает обязательных полей: title, authorNickname, startChapterId, chapters (минимум 1 глава).' });
        }
        // Проверка, что указанная стартовая глава существует в переданном объекте глав
        if (!chapters[startChapterId]) {
             return res.status(400).json({ error: `Указанный startChapterId ('${startChapterId}') отсутствует в переданных главах.` });
        }
        // --- Конец валидации ---

        // Создание нового документа Story с помощью Mongoose модели
        const newStory = new Story({
            title,
            authorNickname,
            startChapterId,
            chapters // Mongoose автоматически преобразует объект в Map, если тип схемы Map
        });

        // Сохранение нового документа в базе данных
        const savedStory = await newStory.save();

        // Отправка успешного ответа (201 Created) с данными сохраненной истории (включая _id)
        res.status(201).json(savedStory);

    } catch (err) {
        console.error("Ошибка при создании истории:", err);
        // Обработка ошибок валидации Mongoose
        if (err.name === 'ValidationError') {
            res.status(400).json({ error: 'Ошибка валидации', details: err.message });
        } else {
            // Другие ошибки сервера
            res.status(500).json({ error: 'Ошибка сервера при создании истории' });
        }
    }
});

// Получение полной информации об истории по её ID.

router.get('/:id', async (req, res) => {
    try {
        const storyId = req.params.id; // Получаем ID из параметров маршрута

        // Проверка, является ли ID валидным MongoDB ObjectId
        if (!mongoose.Types.ObjectId.isValid(storyId)) {
            return res.status(400).json({ error: 'Некорректный формат ID истории' });
        }

        // Поиск истории в БД по ID
        const story = await Story.findById(storyId);

        // Если история с таким ID не найдена
        if (!story) {
            return res.status(404).json({ error: 'История не найдена' });
        }

        // Отправляем найденную историю (со всеми главами и действиями) клиенту
        res.json(story);

    } catch (err) {
        console.error(`Ошибка при получении истории ${req.params.id}:`, err);
        res.status(500).json({ error: 'Ошибка сервера при получении истории' });
    }
});


module.exports = router; // Экспортируем роутер для использования в server.js