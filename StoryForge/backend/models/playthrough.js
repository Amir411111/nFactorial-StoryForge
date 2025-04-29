const mongoose = require('mongoose');

// Схема для Прохождения Истории 
const PlaythroughSchema = new mongoose.Schema({
    // _id (ObjectId) будет создан Mongoose автоматически

    storyId: { // Ссылка на оригинальную историю
        type: mongoose.Schema.Types.ObjectId, // Тип данных - ссылка на ID другого документа
        ref: 'Story', // Показывается, что ID ссылается на документ из коллекции 'stories' (модель 'Story')
        required: true // Поле обязательно для заполнения
    },
    readerNickname: { // Никнейм игрока, проходившего историю
        type: String,
        required: [true, 'Необходимо указать никнейм игрока']
    },
    path: { // Запись пути прохождения
        type: mongoose.Schema.Types.Mixed, // Тип данных позволяет хранить массив сложной структуры, например [[chapterId, actionIndex], ...]
        required: true // Путь обязателен
    },
    finalChapterId: { // ID главы, на которой завершилось прохождение
        type: String, // Хранится как строка
        default: null // По умолчанию null (если финал не связан с конкретной главой или не достигнут)
    }
}, {
    // Опции схемы
    timestamps: true // Автоматически добавляются поля createdAt (время создания) и updatedAt (время обновления)
});

// Экспортируется модель 'Playthrough', созданную на основе PlaythroughSchema
module.exports = mongoose.model('Playthrough', PlaythroughSchema);