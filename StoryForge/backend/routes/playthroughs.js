const express = require('express');
const router = express.Router();
const Playthrough = require('../models/playthrough'); // Модель прохождения
const Story = require('../models/story'); // Модель истории (для проверки ID)
const mongoose = require('mongoose'); // Для работы с MongoDB ObjectId

// Маршрут для получения одного прохождения по его ID.
 
router.get('/:id', async (req, res) => {
    try {
        const playthroughId = req.params.id; // Получаем ID из URL

        // Проверка валидности формата MongoDB ObjectId
        if (!mongoose.Types.ObjectId.isValid(playthroughId)) {
            return res.status(400).json({ error: 'Некорректный формат ID прохождения' });
        }

        // Поиск прохождение по ID и "подтягиваем" название связанной истории
        const playthrough = await Playthrough.findById(playthroughId)
                                             .populate('storyId', 'title'); // Получаем только поле 'title' из Story

        // Если прохождение не найдено
        if (!playthrough) {
            return res.status(404).json({ error: 'Прохождение не найдено' });
        }

        // Отправка найденного прохождения
        res.json(playthrough);

    } catch (err) {
        console.error(`Ошибка при получении прохождения ${req.params.id}:`, err);
        res.status(500).json({ error: 'Ошибка сервера при получении прохождения' });
    }
});


//Маршрут для сохранения нового прохождения.
 
router.post('/', async (req, res) => {
    try {
        // Получаем данные из тела запроса
        const { storyId, readerNickname, path, finalChapterId } = req.body;

        // --- Валидация входных данных ---
        if (!storyId || !readerNickname || !path || !Array.isArray(path)) {
             return res.status(400).json({ error: 'Не хватает обязательных полей: storyId, readerNickname, path (массив).' });
        }
        if (!mongoose.Types.ObjectId.isValid(storyId)) {
            return res.status(400).json({ error: 'Некорректный формат ID истории' });
        }
        // --- Конец валидации ---

        // Опциональная проверка: существует ли история с таким ID
        const storyExists = await Story.findById(storyId);
        if (!storyExists) {
            return res.status(404).json({ error: `История с ID ${storyId} не найдена.` });
        }

        // Создание нового документа прохождения
        const newPlaythrough = new Playthrough({
            storyId,
            readerNickname,
            path,
            finalChapterId 
        });

        // Сохранение в базу данных
        const savedPlaythrough = await newPlaythrough.save();

        // Отправка успешного ответа с созданным прохождением
        res.status(201).json(savedPlaythrough);

    } catch (err) {
        console.error("Ошибка при сохранении прохождения:", err);
         // Обработка ошибок валидации Mongoose
         if (err.name === 'ValidationError') {
            res.status(400).json({ error: 'Ошибка валидации', details: err.message });
        } else {
            // Другие ошибки сервера
            res.status(500).json({ error: 'Ошибка сервера при сохранении прохождения' });
        }
    }
});

module.exports = router;