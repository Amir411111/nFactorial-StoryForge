// backend/services/aiService.js
const OpenAI = require('openai');
const dotenv = require('dotenv');

// Загрузка переменных окружения ( OPENAI_API_KEY)
dotenv.config({ path: './.env' });

let openai; // Переменная для хранения клиента OpenAI

// Проверка наличия API ключа OpenAI при запуске
if (!process.env.OPENAI_API_KEY) {
    console.error("КРИТИЧЕСКАЯ ОШИБКА: Переменная OPENAI_API_KEY не найдена в файле .env.");
} else {
    // Инициализация клиента OpenAI
    try {
         openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
         });
         console.log("Клиент OpenAI успешно инициализирован.");
    } catch (error) {
         // Обработка ошибки инициализации (невалидный ключ или еще что-то)
         console.error("Ошибка инициализации клиента OpenAI:", error.message);
         openai = null; // Убедимся, что клиент не будет использоваться
    }
}

// Запрашиваем у OpenAI продолжение для заданного текста главы.
 
async function continueChapterText(currentText) {
    // Проверка, был ли клиент успешно инициализирован
    if (!openai) {
         console.error("Попытка вызова continueChapterText без инициализированного клиента OpenAI.");
        throw new Error("Клиент OpenAI не инициализирован.");
    }

    try {
       // Формирование и отправка запроса к OpenAI API
       const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo", // Используемая модель
        messages: [
            // Системная инструкция для AI
            { role: "system", content: "Ты - помощник в написании интерактивных историй. Продолжи текст главы кратко и интересно." },
            // Пользовательский ввод (текущий текст)
            { role: "user", content: `Вот начало главы:\n\n${currentText}\n\nПродолжи его:` }
        ],
        max_tokens: 500, // Максимальное количество токенов в ответе
        temperature: 1, // Уровень случайности ответа (0 - детерминированный, >1 - более креативный)
    });

        // Обработка ответа от OpenAI
        const continuedText = completion.choices[0]?.message?.content?.trim(); // Извлечение текста ответа

        // Проверка, что ответ не пустой
        if (!continuedText) {
             console.warn("Ответ OpenAI (continue) не содержит текста:", completion);
             throw new Error("ИИ не предоставил продолжение.");
         }

         return continuedText; // Возвращение полученного продолжение

    } catch (error) {
        // Обработка ошибок при вызове API OpenAI
        console.error('Ошибка вызова OpenAI API (continue):', error.response ? JSON.stringify(error.response.data) : error.message);
        // Выброс стандартизированной ошибки для передачи выше
        throw new Error('Не удалось получить продолжение от ИИ');
    }
}

// Запрос у OpenAI варианты действий для заданной главы.

async function suggestChapterActions(chapterText) {
    // Проверка инициализации клиента
    if (!openai) {
         console.error("Попытка вызова suggestChapterActions без инициализированного клиента OpenAI.");
         throw new Error("Клиент OpenAI не инициализирован.");
    }

    try {
        // Отправка запроса к OpenAI API
        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo", // Используемая модель
            messages: [
                // Системная инструкция для AI
                { role: "system", content: "Ты - геймдизайнер, создающий варианты выбора для интерактивной истории. На основе текста главы предложи ровно 3 различных, логичных и кратких варианта действий для главного героя, сформулированных от первого лица (например, \"Осмотреть стол\"). Ответь ТОЛЬКО списком этих трех действий, каждое действие на новой строке, без нумерации, маркеров или каких-либо других пояснений." },
                // Пользовательский ввод (текст главы)
                { role: "user", content: `Текст главы:\n\n${chapterText}` }
            ],
            max_tokens: 75, // Ограничение токенов 
            temperature: 0.6, // Умеренная креативность
        });

         // Обработка ответа
         const suggestions = completion.choices[0]?.message?.content?.trim(); // Извлечение текста ответа

         // Проверка, что ответ не пустой
         if (!suggestions) {
             console.warn("Ответ OpenAI (suggest actions) не содержит текста:", completion);
             throw new Error("ИИ не предложил варианты действий.");
         }

        // Преобразование ответа (строки с переносами) в массив действий
        const actionsArray = suggestions.split('\n') // Разделить по переносу строки
                                       .map(action => action.trim()) // Убрать пробелы по краям
                                       .filter(action => action); // Убрать пустые строки
        return actionsArray; // Вернуть массив предложений

    } catch (error) {
         // Обработка ошибок API
        console.error('Ошибка вызова OpenAI API (suggest actions):', error.response ? JSON.stringify(error.response.data) : error.message);
        // Выброс стандартизированной ошибки
        throw new Error('Не удалось получить предложения действий от ИИ');
    }
}

// Экспорт функций для использования в других модулях
module.exports = {
    continueChapterText,
    suggestChapterActions
};