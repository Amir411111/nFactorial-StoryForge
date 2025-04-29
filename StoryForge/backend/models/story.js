const mongoose = require('mongoose');

// Вложенная схема для Действий внутри Главы 
const ActionSchema = new mongoose.Schema({
    text: { // Текст, отображаемый на кнопке действия
        type: String,
        required: [true, 'Текст действия обязателен']
    },
    nextChapterId: { // ID главы, к которой ведет действие
        type: String,
        default: null // пустая строка означает финал истории
    }
}, { _id: false }); // Отключаем создание _id для вложенных действий

// Вложенная схема для Главы 
// ID главы будет использоваться как ключ в Map, поэтому здесь его нет
const ChapterSchema = new mongoose.Schema({
    text: { // Текст самой главы
        type: String,
        required: [true, 'Текст главы обязателен']
    },
    actions: { // Массив возможных действий в этой главе
        type: [ActionSchema], // Используется схема ActionSchema
        default: [] // По умолчанию действий нет
    }
}, { _id: false }); // Отключение создания _id для вложенных глав

// Основная Схема Истории 
const StorySchema = new mongoose.Schema({
    // _id (ObjectId) будет создан Mongoose автоматически

    title: { // Название истории
        type: String,
        required: [true, 'Название истории обязательно'],
        trim: true // Убирание пробелов по краям
    },
    authorNickname: { // Никнейм автора
        type: String,
        required: [true, 'Никнейм автора обязателен']
    },
    startChapterId: { // ID главы, с которой начинается история
        type: String,
        required: [true, 'Необходимо указать ID стартовой главы']
    },
    chapters: { // Главы истории, хранящиеся в виде Map
        type: Map,
        of: ChapterSchema, // Значения в Map должны соответствовать ChapterSchema
        required: true,
        // Пользовательская валидация в истории должна быть хотя бы одна глава
        validate: [chaptersMap => chaptersMap.size > 0, 'История должна содержать хотя бы одну главу']
    }
}, {
    // Опции схемы
    timestamps: true // Автоматически добавляет поля createdAt и updatedAt
});

// Экспортирование модели 'Story', созданной на основе StorySchema
module.exports = mongoose.model('Story', StorySchema);